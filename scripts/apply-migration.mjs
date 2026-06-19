#!/usr/bin/env node
// Apply ONE migration file by name (does not touch the others).
// Usage: node scripts/apply-migration.mjs 0013_app_write_rls_fix.sql
// Reads SUPABASE_DB_URL from .env at the repo root.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Minimal .env loader (no dotenv dep).
try {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
} catch { /* env may come from the shell */ }

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <filename.sql>');
  process.exit(1);
}
const url = process.env.SUPABASE_DB_URL;
if (!url || url.includes('[YOUR-PASSWORD]')) {
  console.error('SUPABASE_DB_URL is missing or a placeholder in .env');
  process.exit(1);
}

const path = join(ROOT, 'supabase', 'migrations', file);
const sql = readFileSync(path, 'utf8');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`→ Applying ${file} (${sql.length.toLocaleString()} bytes)…`);
  await client.query('BEGIN');
  await client.query(sql);
  await client.query(
    `CREATE TABLE IF NOT EXISTS _plynth_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`
  );
  await client.query(
    'INSERT INTO _plynth_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
    [file]
  );
  await client.query('COMMIT');
  console.log(`  ✓ ${file} applied`);
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`  ✗ ${file} failed:`, err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
