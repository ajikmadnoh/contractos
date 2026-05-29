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
