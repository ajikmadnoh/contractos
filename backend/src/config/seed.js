/**
 * ContractOS — Development Seed Script
 * Creates a demo tenant + users for all 13 roles so you can log in and test.
 *
 * Run: node src/config/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./database');

const TENANT = {
  company_name:  'Demo Construction Sdn Bhd',
  ssm_number:    '1234567-D',
  subscription_tier: 'business',
};

const USERS = [
  { name: 'Ahmad Razif (Director)',  email: 'director@demo.com',  role: 'director'    },
  { name: 'Siti Admin',              email: 'admin@demo.com',     role: 'admin'       },
  { name: 'Hafiz PM',                email: 'pm@demo.com',        role: 'pm'          },
  { name: 'Zulaikha QS',             email: 'qs@demo.com',        role: 'qs'          },
  { name: 'Rajan Finance',           email: 'finance@demo.com',   role: 'finance'     },
  { name: 'Nurul HR',                email: 'hr@demo.com',        role: 'hr'          },
  { name: 'Keong Engineer',          email: 'engineer@demo.com',  role: 'engineer'    },
  { name: 'Ali Technician',          email: 'tech@demo.com',      role: 'technician'  },
  { name: 'Mei Officer',             email: 'officer@demo.com',   role: 'officer'     },
  { name: 'Raj Internal',            email: 'internal@demo.com',  role: 'internal'    },
  { name: 'Subcon Sdn Bhd',          email: 'subcon@demo.com',    role: 'subcon'      },
  { name: 'Client Corp',             email: 'client@demo.com',    role: 'client'      },
  { name: 'Supplier Trading',        email: 'supplier@demo.com',  role: 'supplier'    },
];

const PASSWORD      = 'Demo1234!';
const SEED_EMAIL    = 'director@demo.com'; // quick-login default

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Remove old demo data ─────────────────────────────────────────────────
    const { rows: existing } = await client.query(
      `SELECT id FROM tenants WHERE company_name = $1`, [TENANT.company_name]
    );
    if (existing.length) {
      const tid = existing[0].id;
      await client.query(`DELETE FROM users   WHERE tenant_id = $1`, [tid]);
      await client.query(`DELETE FROM tenants WHERE id        = $1`, [tid]);
      console.log('  ↻  Removed old demo tenant');
    }

    // ── Create tenant ────────────────────────────────────────────────────────
    const { rows: [tenant] } = await client.query(`
      INSERT INTO tenants (company_name, ssm_number, subscription_tier)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [TENANT.company_name, TENANT.ssm_number, TENANT.subscription_tier]);
    console.log(`  ✓  Tenant created: ${TENANT.company_name} (${tenant.id})`);

    // ── Create all users ─────────────────────────────────────────────────────
    const hash = await bcrypt.hash(PASSWORD, 12);
    for (const u of USERS) {
      await client.query(`
        INSERT INTO users (tenant_id, name, email, password_hash, role, email_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, true, true)
      `, [tenant.id, u.name, u.email, hash, u.role]);
      console.log(`  ✓  ${u.role.padEnd(12)} → ${u.email}`);
    }

    // ── Finance: bonds & insurance ───────────────────────────────────────────
    const BONDS = [
      ['PVDH-T3', 'Performance Bond', 'AmBank Islamic',  9225000,   '5% contract',   '2026-12-15', 'ok'],
      ['PVDH-T3', 'CAR Insurance',    'Allianz General', 184500000, '100% contract', '2026-09-15', 'ok'],
      ['ISKP-2',  'Performance Bond', 'Maybank',         4810000,   '5% contract',   '2026-09-30', 'expiring'],
      ['KLCC-EB', 'Performance Bond', 'CIMB Bank',       2395000,   '5% contract',   '2026-11-04', 'ok'],
      ['PNS-HUB', 'Performance Bond', 'HSBC Amanah',     10920000,  '5% contract',   '2028-03-20', 'ok'],
      ['KKM-RES', 'DLP Bond',         'Maybank',         1410000,   '2.5% contract', '2027-05-30', 'ok'],
    ];
    for (const [code, kind, issuer, amount, cover, expires, state] of BONDS) {
      await client.query(
        `INSERT INTO bonds (tenant_id, code, kind, issuer, amount, cover, expires_date, state)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tenant.id, code, kind, issuer, amount, cover, expires, state]
      );
    }
    console.log(`  ✓  ${BONDS.length} bonds/insurance records`);

    // ── Finance: statutory ledger ────────────────────────────────────────────
    const STATUTORY = [
      ['SST',       'SST 8% (Service Tax)',          'Apr 2026', '2026-05-30', 1420000, 'due',  'C20881234560'],
      ['CIDB Levy', 'CIDB Levy 0.125%',              'Q1 2026',  '2026-05-31', 184000,  'due',  'G7-PB-1500-95'],
      ['EPF',       'EPF (KWSP) — 13% employer',     'Apr 2026', '2026-05-15', 412000,  'paid', 'KWSP 4128-991'],
      ['SOCSO',     'SOCSO (PERKESO)',               'Apr 2026', '2026-05-15', 38400,   'paid', 'PERKESO 22841'],
      ['EIS',       'EIS (Employment Insurance)',    'Apr 2026', '2026-05-15', 9600,    'paid', 'EIS 22841'],
      ['PCB',       'PCB (MTD) Income Tax',          'Apr 2026', '2026-05-15', 184200,  'paid', 'LHDN 7184-021'],
      ['HRDF',      'HRD Corp Levy 1%',              'Apr 2026', '2026-05-15', 32400,   'paid', 'HRDF 1241'],
    ];
    for (const [code, label, period, due, amount, status, reference] of STATUTORY) {
      await client.query(
        `INSERT INTO statutory_filings (tenant_id, code, label, period, due_date, amount, status, reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tenant.id, code, label, period, due, amount, status, reference]
      );
    }
    console.log(`  ✓  ${STATUTORY.length} statutory filings`);

    await client.query('COMMIT');

    console.log('\n' + '─'.repeat(52));
    console.log('  SEED COMPLETE — use any account below:');
    console.log('─'.repeat(52));
    console.log('  Password for ALL accounts:  Demo1234!');
    console.log('─'.repeat(52));
    USERS.forEach(u => console.log(`  ${u.role.padEnd(12)} ${u.email}`));
    console.log('─'.repeat(52));
    console.log(`\n  Quick start → director@demo.com / Demo1234!\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n  ✗  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
