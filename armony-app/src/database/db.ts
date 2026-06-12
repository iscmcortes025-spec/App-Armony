import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";

let databaseInstance: any = null;
let dbInitialized = false;

const openDatabase = async () => {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (typeof SQLite.openDatabaseAsync === "function") {
    databaseInstance = await SQLite.openDatabaseAsync("armony.db");
  } else if (typeof SQLite.openDatabaseSync === "function") {
    databaseInstance = SQLite.openDatabaseSync("armony.db");
  } else {
    throw new Error("expo-sqlite no está disponible en este entorno");
  }

  return databaseInstance;
};

const execSQL = async (db: any, sql: string, params: any[] = []) => {
  if (params.length === 0 && typeof db.execAsync === "function") {
    try {
      return await db.execAsync(sql);
    } catch (error) {
      console.warn("execAsync failed, falling back to runAsync:", error);
    }
  }

  return runSQL(db, sql, params);
};

const runSQL = async (db: any, sql: string, params: any[] = []) => {
  if (typeof db.runAsync === "function") {
    try {
      return await db.runAsync(sql, ...params);
    } catch (error) {
      console.warn("runAsync failed, falling back to transaction:", error);
    }
  }

  if (typeof db.withTransactionAsync === "function") {
    let result: any;
    await db.withTransactionAsync(async (txn: any) => {
      if (params.length === 0 && typeof txn.execAsync === "function") {
        result = await txn.execAsync(sql);
      } else if (typeof txn.runAsync === "function") {
        result = await txn.runAsync(sql, ...params);
      } else {
        throw new Error("SQLite transaction API no soporta execAsync/runAsync");
      }
    });
    return result;
  }

  throw new Error("SQLite no tiene métodos async compatibles");
};

const getFirstSQL = async <T = any>(
  db: any,
  sql: string,
  params: any[] = [],
) => {
  if (typeof db.getFirstAsync === "function") {
    try {
      return (await db.getFirstAsync(sql, ...params)) as T | null;
    } catch (error) {
      console.warn("getFirstAsync failed, falling back to transaction:", error);
    }
  }

  if (typeof db.withTransactionAsync === "function") {
    let value: T | null = null;
    await db.withTransactionAsync(async (txn: any) => {
      if (typeof txn.getFirstAsync !== "function") {
        throw new Error("SQLite transaction API no soporta getFirstAsync");
      }
      value = await txn.getFirstAsync(sql, ...params);
    });
    return value;
  }

  throw new Error("SQLite no tiene métodos async compatibles para getFirstSQL");
};

const getAllSQL = async <T = any>(db: any, sql: string, params: any[] = []) => {
  if (typeof db.getAllAsync === "function") {
    try {
      return (await db.getAllAsync(sql, ...params)) as T[];
    } catch (error) {
      console.warn("getAllAsync failed, falling back to transaction:", error);
    }
  }

  if (typeof db.withTransactionAsync === "function") {
    let rows: T[] = [];
    await db.withTransactionAsync(async (txn: any) => {
      if (typeof txn.getAllAsync !== "function") {
        throw new Error("SQLite transaction API no soporta getAllAsync");
      }
      rows = await txn.getAllAsync(sql, ...params);
    });
    return rows;
  }

  throw new Error("SQLite no tiene métodos async compatibles para getAllSQL");
};

export { runSQL, getFirstSQL, getAllSQL };

// Abre o crea la base de datos local
export const getDB = async () => {
  const db = await openDatabase();
  if (!dbInitialized) {
    await initDB(db);
  }
  return db;
};

// Función para crear las tablas si no existen
export const initDB = async (db?: any) => {
  try {
    const database = db || (await openDatabase());

    await execSQL(database, "PRAGMA journal_mode = WAL;");

    const statements = [
      `CREATE TABLE IF NOT EXISTS local_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backend_id TEXT UNIQUE,
        email TEXT,
        name TEXT,
        session_token TEXT,
        is_logged_in INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS practice_sessions (
        id TEXT PRIMARY KEY,
        type TEXT,
        duration_seconds INTEGER,
        lesson_name TEXT,
        tema_id TEXT,
        bpm_start INTEGER,
        bpm_end INTEGER,
        meta TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT,
        sync_state TEXT DEFAULT 'pending'
      );`,
      `CREATE TABLE IF NOT EXISTS daily_challenges (
        date_key TEXT PRIMARY KEY,
        challenges_json TEXT,
        sync_state TEXT DEFAULT 'pending'
      );`,
      `CREATE TABLE IF NOT EXISTS practice_places (
        id TEXT PRIMARY KEY,
        lat REAL,
        lng REAL,
        address TEXT,
        created_at TEXT,
        sync_state TEXT DEFAULT 'pending'
      );`,
    ];

    for (const statement of statements) {
      await execSQL(database, statement);
    }

    dbInitialized = true;
    console.log(
      "✅ Base de datos SQLite inicializada correctamente con tablas de sincronización",
    );
  } catch (error) {
    console.error("❌ Error al inicializar SQLite:", error);
  }
};

// --- Helpers para local_user (Login Offline)
export const getLocalUser = async () => {
  try {
    const db = await getDB();
    const user: any = await getFirstSQL(
      db,
      "SELECT * FROM local_user WHERE is_logged_in = 1",
    );
    return user || null;
  } catch (error) {
    console.error("getLocalUser error:", error);
    return null;
  }
};

export const setLocalUser = async (
  backend_id: string | null,
  email: string,
  session_token: string,
) => {
  try {
    await initDB();
    const db = await getDB();
    await runSQL(db, "DELETE FROM local_user");
    await runSQL(
      db,
      "INSERT INTO local_user (backend_id, email, session_token, is_logged_in) VALUES (?, ?, ?, ?)",
      [backend_id, email, session_token, 1],
    );
    return true;
  } catch (error) {
    console.error("setLocalUser error:", error);
    return false;
  }
};

export const clearLocalUser = async () => {
  try {
    await initDB();
    const db = await getDB();
    await runSQL(db, "UPDATE local_user SET is_logged_in = 0");
    return true;
  } catch (error) {
    console.error("clearLocalUser error:", error);
    return false;
  }
};

// --- Helpers para Practice Sessions (Fase 2)
export const saveLocalPracticeSession = async (
  type: string,
  durationSeconds: number,
  lessonName: string | null = null,
  temaId: string | null = null,
  bpmStart: number | null = null,
  bpmEnd: number | null = null,
  meta: any = null,
) => {
  try {
    const db = await getDB();
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const metaString = meta ? JSON.stringify(meta) : null;

    await runSQL(
      db,
      `INSERT INTO practice_sessions 
      (id, type, duration_seconds, lesson_name, tema_id, bpm_start, bpm_end, meta, created_at, sync_state) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        type,
        durationSeconds,
        lessonName,
        temaId,
        bpmStart,
        bpmEnd,
        metaString,
        createdAt,
      ],
    );

    console.log(`✅ Sesión guardada local en SQLite ID: ${id}`);
    return id;
  } catch (error) {
    console.error("❌ Error al guardar sesión local:", error);
    throw error;
  }
};
