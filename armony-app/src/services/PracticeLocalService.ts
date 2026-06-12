import { getAllSQL, getDB, runSQL } from "../database/db";

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const PracticeLocalService = {
  addSession: async (payload: {
    type: string;
    durationSeconds: number;
    createdAt?: Date;
    lessonName?: string;
    temaId?: number;
    bpmStart?: number | null;
    bpmEnd?: number | null;
    meta?: any;
  }) => {
    const db = await getDB();
    const id = generateId();

    await runSQL(
      db,
      "INSERT INTO practice_sessions (id, type, duration_seconds, lesson_name, tema_id, bpm_start, bpm_end, meta, is_deleted, created_at, sync_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        payload.type,
        Math.max(0, Math.floor(payload.durationSeconds)),
        payload.lessonName ?? null,
        payload.temaId ?? null,
        payload.bpmStart ?? null,
        payload.bpmEnd ?? null,
        payload.meta ? JSON.stringify(payload.meta) : null,
        0,
        payload.createdAt?.toISOString() ?? new Date().toISOString(),
        "pending",
      ],
    );

    return id;
  },

  addPlace: async (payload: {
    lat: number;
    lng: number;
    address?: string | null;
    createdAt?: Date;
  }) => {
    const db = await getDB();
    const id = generateId();

    await runSQL(
      db,
      "INSERT INTO practice_places (id, lat, lng, address, created_at, sync_state) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        payload.lat,
        payload.lng,
        payload.address ?? null,
        payload.createdAt?.toISOString() ?? new Date().toISOString(),
        "pending",
      ],
    );

    return id;
  },

  upsertDailyChallenges: async (payload: {
    dateKey: string;
    challenges: any[];
  }) => {
    const db = await getDB();
    await runSQL(
      db,
      "INSERT OR REPLACE INTO daily_challenges (date_key, challenges_json, sync_state) VALUES (?, ?, 'pending')",
      [payload.dateKey, JSON.stringify(payload.challenges)],
    );
  },

  getLastPlaces: async (limit = 5) => {
    const db = await getDB();
    const rows: any[] = await getAllSQL(
      db,
      `SELECT * FROM practice_places ORDER BY created_at DESC LIMIT ${limit}`,
    );
    return rows.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      address: p.address ?? null,
      createdAt: new Date(p.created_at),
    }));
  },

  getLastSessions: async (limit = 3) => {
    const db = await getDB();
    const rows: any[] = await getAllSQL(
      db,
      `SELECT * FROM practice_sessions ORDER BY created_at DESC LIMIT ${limit}`,
    );
    return rows.map((s) => ({
      id: s.id,
      type: s.type,
      durationSeconds: s.duration_seconds,
      createdAt: new Date(s.created_at),
      lessonName: s.lesson_name ?? null,
    }));
  },

  getProgress: async (minSecondsForDay = 5 * 60) => {
    const db = await getDB();
    const rows: any[] = await getAllSQL(db, "SELECT * FROM practice_sessions");

    let totalSeconds = 0;
    let weekSeconds = 0;
    const dayTotals = new Map<string, number>();

    const pad2 = (n: number) => String(n).padStart(2, "0");
    const dayKeyLocal = (d: Date) =>
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const s of rows) {
      const secs = Number(s.duration_seconds ?? 0);
      if (!Number.isFinite(secs) || secs <= 0) continue;
      const createdAt = s.created_at ? new Date(s.created_at) : null;
      if (!createdAt) continue;

      totalSeconds += secs;
      const key = dayKeyLocal(createdAt);
      dayTotals.set(key, (dayTotals.get(key) ?? 0) + secs);

      const diff = Math.round(
        (now.getTime() - createdAt.setHours(0, 0, 0, 0)) / 86400000,
      );
      if (diff >= 0 && diff < 7) {
        weekSeconds += secs;
      }
    }

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (true) {
      const key = dayKeyLocal(cursor);
      const daySec = dayTotals.get(key) ?? 0;
      if (daySec >= minSecondsForDay) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    return { totalSeconds, streakDays: streak, weekSeconds };
  },
};
