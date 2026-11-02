// Persistencia del estado de JobTrack: PostgreSQL si hay DATABASE_URL; si no, un archivo JSON local.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

export async function createStore(env = process.env) {
  if (env.DATABASE_URL) return pgStore(env);
  return fileStore(env.DATA_FILE || path.join(DIR, 'state.json'));
}

async function pgStore(env) {
  const { default: pg } = await import('pg');
  const local = /(localhost|127\.0\.0\.1|::1)/.test(env.DATABASE_URL);
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: local || env.PGSSL === '0' ? false : { rejectUnauthorized: false }, max: 4 });
  await pool.query(`CREATE TABLE IF NOT EXISTS jobtrack_state (
    id TEXT PRIMARY KEY, data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  return {
    kind: 'postgres',
    async get() {
      const r = await pool.query("SELECT data, version, updated_at FROM jobtrack_state WHERE id = 'main'");
      return r.rows[0] ? { version: r.rows[0].version, updatedAt: r.rows[0].updated_at, data: r.rows[0].data } : { version: 0, updatedAt: null, data: null };
    },
    // Control de concurrencia optimista: solo guarda si baseVersion coincide con la versión del servidor.
    async put(data, baseVersion) {
      if (baseVersion === 0) {
        const ins = await pool.query("INSERT INTO jobtrack_state (id, data, version) VALUES ('main', $1, 1) ON CONFLICT (id) DO NOTHING RETURNING version", [JSON.stringify(data)]);
        if (ins.rows[0]) return { ok: true, version: 1 };
      } else {
        const up = await pool.query("UPDATE jobtrack_state SET data = $1, version = version + 1, updated_at = now() WHERE id = 'main' AND version = $2 RETURNING version", [JSON.stringify(data), baseVersion]);
        if (up.rows[0]) return { ok: true, version: up.rows[0].version };
      }
      const cur = await this.get(); return { ok: false, conflict: true, version: cur.version, updatedAt: cur.updatedAt, data: cur.data };
    },
    async close() { await pool.end(); }
  };
}

async function fileStore(file) {
  let lock = Promise.resolve();
  const read = async () => { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return { version: 0, updatedAt: null, data: null }; } };
  return {
    kind: 'file',
    get: read,
    put(data, baseVersion) {
      const run = async () => {
        const cur = await read();
        if (cur.version !== baseVersion) return { ok: false, conflict: true, ...cur };
        const next = { version: cur.version + 1, updatedAt: new Date().toISOString(), data };
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file + '.tmp', JSON.stringify(next)); await fs.rename(file + '.tmp', file);
        return { ok: true, version: next.version };
      };
      return (lock = lock.then(run, run));
    },
    async close() { }
  };
}
