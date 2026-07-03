import { createClient, type Client, type InValue } from '@libsql/client';
import path from 'path';
import bcrypt from 'bcryptjs';

const url = process.env.TURSO_DATABASE_URL
  ? process.env.TURSO_DATABASE_URL
  : `file:${path.resolve(process.cwd(), process.env.DB_PATH || './data/hisaab.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) _client = createClient({ url, authToken });
  return _client;
}

interface Stmt {
  get(...args: InValue[]): Promise<any>;
  all(...args: InValue[]): Promise<any[]>;
  run(...args: InValue[]): Promise<{ lastInsertRowid: bigint | undefined; changes: number }>;
}

function prepare(sql: string): Stmt {
  const client = getClient();
  return {
    async get(...args) {
      const res = await client.execute({ sql, args });
      return res.rows[0];
    },
    async all(...args) {
      const res = await client.execute({ sql, args });
      return res.rows;
    },
    async run(...args) {
      const res = await client.execute({ sql, args });
      return { lastInsertRowid: res.lastInsertRowid, changes: res.rowsAffected };
    },
  };
}

interface Db {
  prepare(sql: string): Stmt;
}

let _ready: Promise<void> | null = null;

export async function getDb(): Promise<Db> {
  if (!_ready) _ready = init();
  await _ready;
  return { prepare };
}

async function init() {
  const client = getClient();

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ironing_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sent_date TEXT NOT NULL,
      sent_count INTEGER NOT NULL,
      received_date TEXT,
      received_count INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      resolution_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milk_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      session TEXT NOT NULL,
      quantity REAL NOT NULL,
      vendor TEXT NOT NULL DEFAULT 'default',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, session, vendor)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      service TEXT NOT NULL,
      total_quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      settled INTEGER NOT NULL DEFAULT 0,
      settled_date TEXT,
      notes TEXT,
      UNIQUE(year, month, service)
    );
  `);

  await seedData();
}

async function seedData() {
  const user = await prepare('SELECT id FROM users WHERE username = ?').get('Akshat');
  if (!user) {
    const hash = bcrypt.hashSync('Akshat', 10);
    await prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('Akshat', hash);
  }

  const ins = prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  await ins.run('ironing_rate', '0');
  await ins.run('milk_rate', '0');
}
