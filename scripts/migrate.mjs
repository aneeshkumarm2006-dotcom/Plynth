#!/usr/bin/env node
// Apply all SQL files in supabase/migrations/ in lexical order.
// Run with: node scripts/migrate.mjs
// Reads SUPABASE_DB_URL from .env at the repo root.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Minimal .env loader — avoids adding a dotenv dep.
function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env optional if vars already present in shell.
  }
}

loadEnv();

const url = process.env.SUPABASE_DB_URL;
if (!url || url.includes('[YOUR-PASSWORD]')) {
  console.error(
    '\nSUPABASE_DB_URL is missing or still contains a placeholder.\n' +
      'Edit .env at the repo root and replace [YOUR-PASSWORD] with your\n' +
      "Supabase project's database password.\n"
  );
  process.exit(1);
}

const dir = join(ROOT, 'supabase', 'migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.error('No .sql files found in', dir);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log(`Connecting to ${redactedUrl(url)}…`);
  await client.connect();
  console.log('Connected.\n');

  // Tracking table so re-runs only apply new migrations.
  await client.query(`
    CREATE TABLE IF NOT EXISTS _plynth_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  const { rows: applied } = await client.query(
    'SELECT filename FROM _plynth_migrations'
  );
  const appliedSet = new Set(applied.map((r) => r.filename));

  // Bootstrap: if user_profiles already exists, the schema migration ran
  // in a previous attempt before the tracking table did. Record it so we
  // don't try to re-apply.
  const schemaProbe = await client.query(`
    SELECT to_regclass('public.user_profiles') AS t
  `);
  if (schemaProbe.rows[0].t && !appliedSet.has('0001_initial_schema.sql')) {
    await client.query(
      "INSERT INTO _plynth_migrations (filename) VALUES ('0001_initial_schema.sql') ON CONFLICT DO NOTHING"
    );
    appliedSet.add('0001_initial_schema.sql');
    console.log('• 0001_initial_schema.sql (detected pre-existing schema)');
  }

  let appliedThisRun = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`• ${file} (already applied, skipping)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), 'utf8');
    console.log(`→ Applying ${file} (${sql.length.toLocaleString()} bytes)`);
    try {
      // Wrap each migration in a transaction so a partial failure rolls back.
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO _plynth_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`  ✓ ${file}`);
      appliedThisRun++;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`  ✗ ${file} failed:`, err.message);
      throw err;
    }
  }

  await client.end();
  if (appliedThisRun === 0) {
    console.log('\nDatabase is up to date — nothing to do.');
  } else {
    console.log(`\nApplied ${appliedThisRun} migration(s).`);
  }
}

function redactedUrl(u) {
  return u.replace(/:([^:@/]+)@/, ':****@');
}

run().catch((err) => {
  console.error('\nMigration failed.');
  console.error(err);
  process.exit(1);
});
