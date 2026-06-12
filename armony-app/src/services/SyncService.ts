import { getAllSQL, getFirstSQL, getDB, runSQL } from "../database/db";

const API_URL = "https://app-armony.onrender.com";

const buildServerSyncError = async (
  response: Response,
  fallbackMessage: string,
) => {
  let bodyText = "";

  try {
    bodyText = await response.text();
  } catch {
    bodyText = "<no response body>";
  }

  return new Error(
    `${fallbackMessage} (${response.status} ${response.statusText}): ${bodyText}`,
  );
};

export const SyncService = {
  // ---------------------------
  // 1) SINCRONIZAR SESIONES DE PRÁCTICA
  // ---------------------------
  syncPracticeSessions: async (token: string) => {
    const db = await getDB();
    let uploaded = 0;
    let failed = 0;
    let pendingSessions: any[] | null = null;

    try {
      pendingSessions = await getAllSQL(
        db,
        "SELECT * FROM practice_sessions WHERE sync_state = 'pending'",
      );

      if (!pendingSessions || pendingSessions.length === 0) {
        return { uploaded: 0, failed: 0 };
      }

      const practicesToUpload = pendingSessions.map((s: any) => ({
        id: s.id,
        type: s.type,
        duration_seconds: s.duration_seconds,
        lesson_name: s.lesson_name,
        tema_id: s.tema_id,
        bpm_start: s.bpm_start,
        bpm_end: s.bpm_end,
        meta: s.meta ? JSON.parse(s.meta) : null,
        is_deleted: s.is_deleted === 1,
        created_at: s.created_at,
      }));

      const response = await fetch(`${API_URL}/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ practices: practicesToUpload }),
      });

      if (!response.ok)
        throw await buildServerSyncError(
          response,
          "Error al sincronizar sesiones con el servidor",
        );

      const placeholders = pendingSessions.map(() => "?").join(",");
      await runSQL(
        db,
        `UPDATE practice_sessions SET sync_state = 'synced' WHERE id IN (${placeholders})`,
        pendingSessions.map((s: any) => s.id),
      );

      uploaded = pendingSessions.length;
    } catch (error) {
      console.error("Fallo la sincronización de sesiones:", error);
      failed = pendingSessions?.length || 0;
    }

    return { uploaded, failed };
  },

  // ---------------------------
  // 2) SINCRONIZAR RETOS DIARIOS
  // ---------------------------
  syncDailyChallenges: async (token: string) => {
    const db = await getDB();
    let uploaded = 0;
    let failed = 0;
    let pendingDailies: any[] | null = null;

    try {
      pendingDailies = await getAllSQL(
        db,
        "SELECT * FROM daily_challenges WHERE sync_state = 'pending'",
      );

      for (const daily of pendingDailies || []) {
        const response = await fetch(`${API_URL}/sync/challenges/daily`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date_key: daily.date_key,
            challenges: JSON.parse(daily.challenges_json),
          }),
        });

        if (response.ok) {
          await runSQL(
            db,
            "UPDATE daily_challenges SET sync_state = 'synced' WHERE date_key = ?",
            [daily.date_key],
          );
          uploaded++;
        } else {
          const error = await buildServerSyncError(
            response,
            "Error al sincronizar retos diarios",
          );
          console.error(error);
          failed++;
        }
      }
    } catch (error) {
      console.error("Fallo la sincronización de retos:", error);
      failed = pendingDailies?.length || 0;
    }

    return { uploaded, failed };
  },

  // ---------------------------
  // 3) SINCRONIZAR LUGARES GPS
  // ---------------------------
  syncPracticePlaces: async (token: string) => {
    const db = await getDB();
    let uploaded = 0;
    let failed = 0;
    let pendingPlaces: any[] | null = null;

    try {
      pendingPlaces = await getAllSQL(
        db,
        "SELECT * FROM practice_places WHERE sync_state = 'pending'",
      );

      if (!pendingPlaces || pendingPlaces.length === 0) {
        return { uploaded: 0, failed: 0 };
      }

      const placesToUpload = pendingPlaces.map((p: any) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        created_at: p.created_at,
        is_deleted: p.is_deleted === 1,
      }));

      const response = await fetch(`${API_URL}/sync/practice-places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ places: placesToUpload }),
      });

      if (!response.ok)
        throw await buildServerSyncError(
          response,
          "Error al sincronizar lugares con el servidor",
        );

      const placeholders = pendingPlaces.map(() => "?").join(",");
      await runSQL(
        db,
        `UPDATE practice_places SET sync_state = 'synced' WHERE id IN (${placeholders})`,
        pendingPlaces.map((p: any) => p.id),
      );

      uploaded = pendingPlaces.length;
    } catch (error) {
      console.error("Fallo la sincronización de lugares:", error);
      failed = pendingPlaces?.length || 0;
    }

    return { uploaded, failed };
  },

  // ---------------------------
  // 4) BAJAR DATOS DEL SERVIDOR (pull)
  // ---------------------------
  pullFromServer: async (token: string) => {
    const db = await getDB();

    const response = await fetch(`${API_URL}/sync/pull`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await buildServerSyncError(
        response,
        "Error al bajar datos del servidor",
      );
    }

    const data = await response.json();
    let restored = 0;

    // Restaurar sesiones de práctica
    for (const p of data.practices ?? []) {
      const existing = await getFirstSQL(
        db,
        "SELECT id FROM practice_sessions WHERE id = ?",
        [p.id],
      );
      if (!existing) {
        await runSQL(
          db,
          `INSERT INTO practice_sessions 
          (id, type, duration_seconds, lesson_name, tema_id, bpm_start, bpm_end, meta, created_at, sync_state)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [
            p.id,
            p.type,
            p.duration_seconds,
            p.lesson_name,
            p.tema_id,
            p.bpm_start,
            p.bpm_end,
            p.meta ? JSON.stringify(p.meta) : null,
            p.created_at,
          ],
        );
        restored++;
      }
    }

    // Restaurar lugares GPS
    for (const pl of data.places ?? []) {
      const existing = await getFirstSQL(
        db,
        "SELECT id FROM practice_places WHERE id = ?",
        [pl.id],
      );
      if (!existing) {
        await runSQL(
          db,
          `INSERT INTO practice_places (id, lat, lng, address, created_at, sync_state)
          VALUES (?, ?, ?, ?, ?, 'synced')`,
          [pl.id, pl.lat, pl.lng, pl.address, pl.created_at],
        );
        restored++;
      }
    }

    // Restaurar retos diarios
    for (const c of data.challenges ?? []) {
      const existing = await getFirstSQL(
        db,
        "SELECT date_key FROM daily_challenges WHERE date_key = ?",
        [c.date_key],
      );
      if (!existing) {
        await runSQL(
          db,
          `INSERT INTO daily_challenges (date_key, challenges_json, sync_state)
          VALUES (?, ?, 'synced')`,
          [c.date_key, JSON.stringify(c.challenges)],
        );
        restored++;
      }
    }

    return { restored };
  },
};
