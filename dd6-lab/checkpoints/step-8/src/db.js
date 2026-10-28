// The database: real Postgres (PGlite, Postgres compiled to WebAssembly) with the pgvector extension switched on.
// Nothing to install. In production the same SQL runs on Azure Database for PostgreSQL (flexible server) with pgvector.
// Lab fixture: please leave it alone.
//
// Use it like this:
//   const { pg, close } = await openDb();          // runs migrations/*.sql in order, once each
//   const { rows } = await pg.query('SELECT ...', [params]);
//   await close();                                  // always close it: the folder is locked while it is open
//
// PGlite is a single-process database: only one process may open the data folder at a time, and a lock file enforces that.
// If a script says the folder is in use, another script of yours is still running (or the last one did not close it).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { ROOT, config } from './config.js';

const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function acquireLock(dir) {
  const lockPath = `${dir}.lock`;
  mkdirSync(path.dirname(lockPath), { recursive: true });
  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath, 'utf8'));
    if (pid && pid !== process.pid && pidAlive(pid)) {
      throw new Error(`The database folder is in use by another process (pid ${pid}). Wait for it to finish, or stop it, then run this again.`);
    }
    rmSync(lockPath, { force: true }); // a stale lock from a crashed process
  }
  writeFileSync(lockPath, String(process.pid));
  return () => rmSync(lockPath, { force: true });
}

export async function openDb({ dataDir = config.dataDir } = {}) {
  const inMemory = dataDir.startsWith('memory://');
  const dir = inMemory ? null : dataDir;
  const release = inMemory ? () => {} : acquireLock(dir);
  if (dir) mkdirSync(path.dirname(dir), { recursive: true });

  const pg = new PGlite(inMemory ? 'memory://' : dir, { extensions: { vector } });
  await pg.waitReady;
  await pg.exec('CREATE EXTENSION IF NOT EXISTS vector');
  await pg.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const applied = await applyMigrations(pg);

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    // Closing PGlite (Postgres compiled to WebAssembly) resets the process exit code to 0. A script that has said
    // `process.exitCode = 1` and then closes the database would exit 0, so the exit code is kept across the close.
    const exitCode = process.exitCode;
    await pg.close();
    process.exitCode = exitCode;
    release();
  };
  process.once('exit', release);
  return { pg, close, applied };
}

/** Opens the database, runs `fn(pg)`, and closes it again, even if `fn` throws. */
export async function withDb(fn, options) {
  const db = await openDb(options);
  try {
    return await fn(db.pg);
  } finally {
    await db.close();
  }
}

async function applyMigrations(pg) {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  const done = new Set((await pg.query('SELECT name FROM schema_migrations')).rows.map(r => r.name));
  const applied = [];
  for (const file of readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    await pg.exec(readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
    await pg.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    applied.push(file);
  }
  return applied;
}
