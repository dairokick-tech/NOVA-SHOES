import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Configura DIRECT_URL (preferido) o DATABASE_URL para ejecutar migraciones.');
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 15000
});
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function applyFile(filename, fullPath) {
  const already = await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
  if (already.rowCount) {
    console.log('Ya aplicada:', filename);
    return;
  }
  const sql = await readFile(fullPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
    await client.query('COMMIT');
    console.log('Aplicada:', filename);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  // Always establish the base schema before applying incremental migrations.
  await applyFile('001_nova_shoes.sql', path.join(root, 'database', '001_nova_shoes.sql'));

  const migrationsDir = path.join(root, 'database', 'migrations');
  const migrations = (await readdir(migrationsDir))
    .filter(name => /^\d+.*\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  for (const filename of migrations) {
    await applyFile(filename, path.join(migrationsDir, filename));
  }
  console.log('Migraciones completadas correctamente.');
} catch (error) {
  console.error('Error de migración:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
