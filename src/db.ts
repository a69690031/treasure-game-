import initSqlJs, { Database } from 'sql.js';

export interface ScoreEntry {
  playerName: string;
  score: number;
  date: string;
}

const DB_KEY = 'treasure_game_db';
let db: Database | null = null;

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm` });

  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT    NOT NULL,
      score       INTEGER NOT NULL,
      played_at   TEXT    NOT NULL
    )
  `);

  saveDb();
}

function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem(DB_KEY, base64);
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function registerUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: '資料庫未就緒' };
  try {
    const hashed = await hashPassword(password);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);
    saveDb();
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE constraint failed')) {
      return { success: false, error: '此帳號已存在' };
    }
    return { success: false, error: '註冊失敗，請稍後再試' };
  }
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: '資料庫未就緒' };
  const hashed = await hashPassword(password);
  const result = db.exec(
    'SELECT id FROM users WHERE username = ? AND password = ?',
    [username, hashed]
  );
  if (result.length && result[0].values.length > 0) {
    return { success: true };
  }
  return { success: false, error: '帳號或密碼錯誤' };
}

export function insertScore(playerName: string, score: number): void {
  if (!db) return;
  const date = new Date().toISOString().split('T')[0];
  db.run('INSERT INTO leaderboard (player_name, score, played_at) VALUES (?, ?, ?)', [playerName, score, date]);
  saveDb();
}

export function getLeaderboard(): ScoreEntry[] {
  if (!db) return [];
  const result = db.exec('SELECT player_name, score, played_at FROM leaderboard ORDER BY score DESC LIMIT 10');
  if (!result.length) return [];
  return result[0].values.map(row => ({
    playerName: row[0] as string,
    score: row[1] as number,
    date: row[2] as string,
  }));
}
