// Applies the admin-portal migrations (0007, 0008) to the live DB.
//   node scripts/apply-admin-migrations.mjs
//
// Why this exists instead of `migrate.mjs`: migrate.mjs wraps every file in a
// transaction, but 0007 (`ALTER TYPE user_role ADD VALUE 'admin'`) CANNOT run
// inside a transaction. So 0007 is applied in autocommit, 0008 in a txn. Both
// are recorded in _plynth_migrations so future migrate.mjs runs skip them.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(join(ROOT, '.env'), 'utf8');
for (const l of env.split('\n')) {
  const t = l.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query(`CREATE TABLE IF NOT EXISTS _plynth_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`);
const applied = new Set((await c.query('SELECT filename FROM _plynth_migrations')).rows.map((r) => r.filename));

async function applyAutocommit(file) {
  if (applied.has(file)) return console.log(`• ${file} (already applied)`);
  await c.query(readFileSync(join(ROOT, 'supabase', 'migrations', file), 'utf8')); // no txn wrapper
  await c.query('INSERT INTO _plynth_migrations(filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
  console.log(`  ✓ ${file} (autocommit)`);
}
async function applyTxn(file) {
  if (applied.has(file)) return console.log(`• ${file} (already applied)`);
  const sql = readFileSync(join(ROOT, 'supabase', 'migrations', file), 'utf8');
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query('INSERT INTO _plynth_migrations(filename) VALUES ($1)', [file]);
    await c.query('COMMIT');
    console.log(`  ✓ ${file} (txn)`);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  }
}

try {
  await applyAutocommit('0007_admin_role.sql');
  await applyTxn('0008_admin_rls_and_rpc.sql');
  const enumvals = (await c.query(`select enumlabel from pg_enum e join pg_type t on e.enumtypid=t.oid where t.typname='user_role' order by enumsortorder`)).rows.map((r) => r.enumlabel);
  const fns = (await c.query(`select proname from pg_proc where proname like 'admin\\_%' order by proname`)).rows.map((r) => r.proname);
  const pol = (await c.query(`select count(*) n from pg_policies where schemaname='public' and policyname like 'admin%'`)).rows[0].n;
  console.log('\nuser_role enum:', enumvals.join(', '));
  console.log('admin RPCs:', fns.join(', '));
  console.log('admin policies:', pol);
} catch (e) {
  console.error('APPLY FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
