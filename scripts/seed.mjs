#!/usr/bin/env node
// Seed two demo users directly into Supabase auth + user_profiles,
// plus a starter set of deals, criteria, and matches. Lets you skip
// the signup UI while developing.
//
// Run with: pnpm db:seed

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const url = process.env.SUPABASE_DB_URL;
if (!url || url.includes('[YOUR-PASSWORD]')) {
  console.error('SUPABASE_DB_URL missing in .env');
  process.exit(1);
}

const BROKER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'broker@plynth.test',
  password: 'TestBroker2026!',
  brokerage: 'Northbridge Mortgage Partners',
  first: 'Marcus',
  last: 'Chen',
};
const LENDER = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'lender@plynth.test',
  password: 'TestLender2026!',
  firm: 'Fortress MIC',
};

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function upsertAuthUser({ id, email, password }) {
  // Supabase GoTrue reads several token columns with strict (non-null)
  // regex; leaving them NULL produces "Database error querying schema"
  // on login. Default them to '' explicitly. Password is hashed via
  // pgcrypto's crypt() to avoid a node-bcrypt dep.
  await client.query(
    `
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, aud, role,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change_token_current,
      email_change, phone_change_token, reauthentication_token
    ) VALUES (
      $1::uuid,
      '00000000-0000-0000-0000-000000000000',
      $2,
      crypt($3, gen_salt('bf')),
      now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(),
      '', '', '', '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          encrypted_password = EXCLUDED.encrypted_password,
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
          updated_at = now(),
          confirmation_token = COALESCE(auth.users.confirmation_token, ''),
          recovery_token = COALESCE(auth.users.recovery_token, ''),
          email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
          email_change_token_current = COALESCE(auth.users.email_change_token_current, ''),
          email_change = COALESCE(auth.users.email_change, ''),
          phone_change_token = COALESCE(auth.users.phone_change_token, ''),
          reauthentication_token = COALESCE(auth.users.reauthentication_token, '')
    `,
    [id, email, password]
  );

  // Required for new auth versions — identity row for the email provider.
  await client.query(
    `
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      $1::uuid, $1::uuid, $2::text,
      jsonb_build_object('sub', $1::text, 'email', $2::text),
      'email',
      now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING
    `,
    [id, email]
  );
}

async function run() {
  await client.connect();
  console.log('Connected. Seeding…\n');

  // Patch any pre-existing auth.users rows missing the empty-string
  // token defaults — left NULL they break the login flow with
  // "Database error querying schema".
  await client.query(`
    UPDATE auth.users SET
      confirmation_token         = COALESCE(confirmation_token, ''),
      recovery_token             = COALESCE(recovery_token, ''),
      email_change_token_new     = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      email_change               = COALESCE(email_change, ''),
      phone_change_token         = COALESCE(phone_change_token, ''),
      reauthentication_token     = COALESCE(reauthentication_token, '')
    WHERE confirmation_token IS NULL
       OR recovery_token IS NULL
       OR email_change_token_new IS NULL
       OR email_change_token_current IS NULL
       OR email_change IS NULL
       OR phone_change_token IS NULL
       OR reauthentication_token IS NULL
  `);

  // --- Auth users ---
  await upsertAuthUser(BROKER);
  await upsertAuthUser(LENDER);
  console.log('✓ auth.users (broker, lender)');

  // --- user_profiles ---
  await client.query(
    `
    INSERT INTO user_profiles (
      id, role, email, brokerage_name, fsra_license_number, fsra_province,
      first_name, last_name, is_verified, verification_status
    ) VALUES ($1, 'broker', $2, $3, 'M08009124', 'ON', $4, $5, true, 'approved')
    ON CONFLICT (id) DO UPDATE
      SET brokerage_name = EXCLUDED.brokerage_name,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          is_verified = true,
          verification_status = 'approved'
    `,
    [BROKER.id, BROKER.email, BROKER.brokerage, BROKER.first, BROKER.last]
  );

  await client.query(
    `
    INSERT INTO user_profiles (
      id, role, email, firm_name, lender_type, tier,
      is_verified, verification_status
    ) VALUES ($1, 'lender', $2, $3, 'mic', 'professional', true, 'approved')
    ON CONFLICT (id) DO UPDATE
      SET firm_name = EXCLUDED.firm_name,
          is_verified = true,
          verification_status = 'approved'
    `,
    [LENDER.id, LENDER.email, LENDER.firm]
  );
  console.log('✓ user_profiles (broker, lender — both pre-approved)');

  // --- Lender criteria (so matching has something to chew on) ---
  await client.query(
    `
    INSERT INTO lender_criteria (
      lender_id, asset_classes, provinces, cities,
      loan_min_cents, loan_max_cents,
      ltv_max_first_position, ltv_max_second_position,
      term_min_months, term_max_months,
      min_beacon_score, accept_bfs_borrowers,
      monthly_deployment_target_cents, available_capital_cents,
      close_speed_days_min, close_speed_days_max,
      exclusion_flags
    ) VALUES (
      $1,
      ARRAY['Residential 1st','Residential 2nd']::asset_class[],
      ARRAY['ON','QC']::province_code[],
      ARRAY['Toronto','Ottawa','Montréal']::text[],
      15000000, 200000000, 75, 80, 6, 24, 640, true,
      500000000, 1800000000, 7, 10,
      ARRAY['Rural','Cannabis-related','Hospitality']::text[]
    )
    ON CONFLICT (lender_id) DO NOTHING
    `,
    [LENDER.id]
  );
  console.log('✓ lender_criteria for Fortress MIC');

  // --- Sample deals ---
  const deals = [
    { num: '0247', city: 'Toronto', prov: 'ON', amt: 42_500_000, ltv: 72.0, pos: 'first', term: 12, beacon: 700, asset: 'Residential 1st' },
    { num: '0251', city: 'Ottawa', prov: 'ON', amt: 68_000_000, ltv: 65.0, pos: 'first', term: 12, beacon: 720, asset: 'Residential 1st' },
    { num: '0244', city: 'Burnaby', prov: 'BC', amt: 89_000_000, ltv: 78.0, pos: 'second', term: 9, beacon: 680, asset: 'Residential 2nd' },
    { num: '0239', city: 'Calgary', prov: 'AB', amt: 340_000_000, ltv: 60.0, pos: 'first', term: 24, beacon: 710, asset: 'Commercial' },
    { num: '0236', city: 'London', prov: 'ON', amt: 31_200_000, ltv: 80.0, pos: 'second', term: 12, beacon: 660, asset: 'Residential 2nd' },
  ];

  for (const d of deals) {
    await client.query(
      `
      INSERT INTO deals (
        broker_id, deal_number, city, province, neighbourhood,
        asset_class, loan_amount_cents, estimated_value_cents,
        ltv, position, term_months, rate_min, rate_max,
        beacon_score, is_self_employed, status, submitted_at
      ) VALUES (
        $1::uuid, $2::text, $3::text, $4::province_code, NULL,
        $5::asset_class, $6::bigint,
        ROUND($6::numeric / ($7::numeric / 100.0))::bigint,
        $7::numeric, $8::loan_position, $9::int, 8.5, 11.0,
        $10::int, false, 'active', now()
      )
      ON CONFLICT (broker_id, deal_number) DO NOTHING
      `,
      [
        BROKER.id, d.num, d.city, d.prov, d.asset,
        d.amt, d.ltv, d.pos, d.term, d.beacon,
      ]
    );
  }
  console.log(`✓ ${deals.length} sample deals`);

  // --- Trigger matching for the lender now that data exists ---
  await client.query(`SELECT compute_lender_matches($1::uuid)`, [LENDER.id]);
  const { rows: matchCount } = await client.query(
    `SELECT COUNT(*)::int AS n FROM lender_deal_interactions WHERE lender_id = $1::uuid`,
    [LENDER.id]
  );
  console.log(`✓ matching computed → ${matchCount[0].n} matches recorded`);

  await client.end();

  console.log('\n────────────────────────────────────────');
  console.log('Demo credentials');
  console.log('────────────────────────────────────────');
  console.log('Broker portal — http://localhost:5173');
  console.log(`  Email:    ${BROKER.email}`);
  console.log(`  Password: ${BROKER.password}`);
  console.log('');
  console.log('Lender portal — http://localhost:5174');
  console.log(`  Email:    ${LENDER.email}`);
  console.log(`  Password: ${LENDER.password}`);
  console.log('────────────────────────────────────────');
}

run().catch((err) => {
  console.error('\nSeed failed:', err.message);
  console.error(err);
  process.exit(1);
});
