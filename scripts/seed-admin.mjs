// Seeds one admin user (auth.users + identity + user_profiles role='admin').
//   node scripts/seed-admin.mjs
// Run AFTER apply-admin-migrations.mjs (needs the 'admin' enum value).
// Login: admin@plynth.test / TestAdmin2026!
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

const ADMIN = { id: '33333333-3333-3333-3333-333333333333', email: 'admin@plynth.test', password: 'TestAdmin2026!' };

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query(
    `INSERT INTO auth.users (
       id, instance_id, email, encrypted_password, email_confirmed_at, aud, role,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new,
       email_change_token_current, email_change, phone_change_token, reauthentication_token
     ) VALUES (
       $1::uuid, '00000000-0000-0000-0000-000000000000', $2, crypt($3, gen_salt('bf')),
       now(), 'authenticated', 'authenticated',
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', '', '', '', ''
     )
     ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, updated_at = now()`,
    [ADMIN.id, ADMIN.email, ADMIN.password]
  );
  await c.query(
    `INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     VALUES ($1::uuid, $1::uuid, $2::text, jsonb_build_object('sub',$1::text,'email',$2::text), 'email', now(), now(), now())
     ON CONFLICT (provider, provider_id) DO NOTHING`,
    [ADMIN.id, ADMIN.email]
  );
  // DO NOTHING on conflict: never UPDATE privileged columns (would trip the
  // self-escalation trigger from 0008 on a direct connection).
  await c.query(
    `INSERT INTO user_profiles (id, role, email, first_name, last_name, is_verified, verification_status)
     VALUES ($1, 'admin', $2, 'Plynth', 'Operations', true, 'approved')
     ON CONFLICT (id) DO NOTHING`,
    [ADMIN.id, ADMIN.email]
  );
  const role = (await c.query('SELECT role FROM user_profiles WHERE id=$1', [ADMIN.id])).rows[0]?.role;
  console.log(`✓ admin seeded: ${ADMIN.email} / ${ADMIN.password} (role=${role})`);
} catch (e) {
  console.error('SEED ADMIN FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
