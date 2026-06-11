// Plynth DB utility — check / migrate / seed against SUPABASE_DB_URL.
//
//   node scripts/db.mjs check     # list public tables (read-only)
//   node scripts/db.mjs migrate   # apply migrations 0001..NNNN if schema absent
//   node scripts/db.mjs seed       # insert demo data (idempotent on fixed UUIDs)
//
// Reads SUPABASE_DB_URL from the root .env. Uses SSL (Supabase requires it).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Minimal .env loader (no extra deps).
function loadEnv() {
  const txt = readFileSync(join(ROOT, '.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const CONN = process.env.SUPABASE_DB_URL;
if (!CONN) {
  console.error('SUPABASE_DB_URL not set in .env');
  process.exit(1);
}

const client = new pg.Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });

async function listTables() {
  const { rows } = await client.query(
    `select table_name from information_schema.tables where table_schema='public' order by table_name`
  );
  return rows.map((r) => r.table_name);
}

async function check() {
  const tables = await listTables();
  console.log('public tables (' + tables.length + '):', tables.join(', ') || '(none)');
  return tables;
}

async function migrate() {
  const tables = await listTables();
  if (tables.includes('deals')) {
    console.log('Schema already present (found `deals`). Skipping migrations.');
    return;
  }
  const dir = join(ROOT, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');
    process.stdout.write(`applying ${f} … `);
    await client.query(sql);
    console.log('ok');
  }
  console.log('All migrations applied.');
}

async function seed() {
  const sql = readFileSync(join(ROOT, 'scripts', 'seed.sql'), 'utf8');
  await client.query(sql);
  const { rows } = await client.query(
    `select
       (select count(*) from user_profiles) as profiles,
       (select count(*) from deals) as deals,
       (select count(*) from lender_criteria) as criteria,
       (select count(*) from offers) as offers,
       (select count(*) from fundings) as fundings`
  );
  console.log('Seed complete. Row counts:', rows[0]);
}

const cmd = process.argv[2];
try {
  await client.connect();
  if (cmd === 'check') await check();
  else if (cmd === 'migrate') {
    await migrate();
    await check();
  } else if (cmd === 'seed') await seed();
  else {
    console.error('usage: node scripts/db.mjs check|migrate|seed');
    process.exitCode = 1;
  }
} catch (e) {
  console.error('DB error:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
