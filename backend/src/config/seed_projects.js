/**
 * ContractOS — Project Seed Script
 * Populates rich demo data: profiles, 4 projects, milestones, tasks,
 * claims, payment certs, invoices, BQ docs, RFIs, risks, change orders,
 * site diaries, fleet vehicles, safety incidents, and CRM leads.
 *
 * Run: node src/config/seed_projects.js
 * Requires the demo tenant to exist (run seed.js first).
 */

require('dotenv').config();
const { pool } = require('./database');

// ─── helpers ────────────────────────────────────────────────────────────────
const ago  = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]; };
const fwd  = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0]; };
const rand = (arr)  => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
  const client = await pool.connect();
  const q = (text, params) => client.query(text, params);

  try {
    await q('BEGIN');

    // ── 1. Resolve demo tenant + users ───────────────────────────────────────
    const { rows: tenants } = await q(
      `SELECT id FROM tenants WHERE company_name = 'Demo Construction Sdn Bhd' LIMIT 1`
    );
    if (!tenants.length) throw new Error('Demo tenant not found — run seed.js first');
    const tenantId = tenants[0].id;

    const { rows: users } = await q(
      `SELECT id, role FROM users WHERE tenant_id = $1`, [tenantId]
    );
    const byRole = (role) => users.find(u => u.role === role)?.id;

    const directorId   = byRole('director');
    const pmId         = byRole('pm');
    const qsId         = byRole('qs');
    const financeId    = byRole('finance');
    const engineerId   = byRole('engineer');
    const techId       = byRole('technician');

    console.log(`  ✓  Tenant: ${tenantId}`);

    // ── 2. Clean previous project seed data ──────────────────────────────────
    await q(`DELETE FROM site_diary_photos   WHERE diary_id IN (SELECT id FROM site_diaries   WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM site_diary_entries  WHERE diary_id IN (SELECT id FROM site_diaries   WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM site_diaries        WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM project_scope       WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM project_risks       WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM project_submittals  WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM project_rfis        WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM project_change_orders WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM project_tasks       WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM project_milestones  WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM project_members     WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM invoice_items       WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM invoices            WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM payment_certificates WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM claims              WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM bq_items            WHERE bq_id IN (SELECT id FROM bq_documents WHERE tenant_id = $1)`, [tenantId]);
    await q(`DELETE FROM bq_documents        WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM rfis                WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM change_orders       WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM safety_incidents    WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM fleet_vehicles      WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM crm_leads           WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM inventory_items     WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM projects            WHERE tenant_id = $1`, [tenantId]);
    await q(`DELETE FROM profiles            WHERE tenant_id = $1`, [tenantId]);

    console.log('  ↻  Cleared old project seed data');

    // ── 3. Profiles ──────────────────────────────────────────────────────────
    const insertProfile = async (data) => {
      const { rows } = await q(
        `INSERT INTO profiles (tenant_id, profile_type, company_name, registration_number,
           contact_person, email, phone, address, bank_name, bank_account_number, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [tenantId, data.type, data.name, data.reg, data.contact, data.email,
         data.phone, data.address, data.bank, data.acct, directorId]
      );
      return rows[0].id;
    };

    const clientMegaId   = await insertProfile({ type:'client',   name:'Mega Development Sdn Bhd',    reg:'0987654-M', contact:'Dato Sri Lim',     email:'dato@megadev.com',      phone:'03-21234567', address:'Menara Mega, KL City Centre, 50000 KL', bank:'Maybank', acct:'5641-2345-6789' });
    const clientUrbanId  = await insertProfile({ type:'client',   name:'Urban Living Bhd',            reg:'1122334-U', contact:'Pn. Rashidah',      email:'rashidah@urbanliving.my', phone:'03-79876543', address:'Level 12, Jalan Duta, 50480 KL',       bank:'CIMB',    acct:'8001-2233-4455' });
    const clientGovId    = await insertProfile({ type:'client',   name:'JKR Wilayah Persekutuan',     reg:'GOVT-0012',  contact:'Ir. Azman',         email:'azman@jkr.gov.my',      phone:'03-26174000', address:'Jalan Sultan Salahuddin, 50480 KL',    bank:'RHB',     acct:'2133-4455-6677' });

    const subconCivilId  = await insertProfile({ type:'subcon',   name:'Bina Teguh Sdn Bhd',          reg:'0011223-B', contact:'Ah Kow',            email:'ahkow@binateg.com',     phone:'012-3456789', address:'Lot 5, Jalan Kilang, Shah Alam',        bank:'Public Bank', acct:'3123-4444-5555' });
    const subconMEId     = await insertProfile({ type:'subcon',   name:'Elektra ME Works Sdn Bhd',    reg:'0099887-E', contact:'Ravi Kumar',         email:'ravi@elektrame.com',    phone:'016-7654321', address:'No 8, Jalan Teknologi, PJ',             bank:'Maybank', acct:'5641-9988-7766' });
    const subconFinishId = await insertProfile({ type:'subcon',   name:'Prima Interior Works Bhd',    reg:'0055443-P', contact:'Siti Nor',           email:'siti@primainterior.com', phone:'019-1234567', address:'Taman Industri, Klang',                bank:'CIMB',    acct:'8001-5566-7788' });

    const supplierSteelId= await insertProfile({ type:'supplier', name:'KL Steel Trading Sdn Bhd',    reg:'0033221-K', contact:'Mr. Tan',            email:'sales@klsteel.com',     phone:'03-33456789', address:'Jalan Industri, Port Klang',            bank:'Maybank', acct:'5641-1122-3344' });
    const supplierCemId  = await insertProfile({ type:'supplier', name:'Holcim Malaysia Bhd',         reg:'0044332-H', contact:'Ms. Preeta',         email:'preeta@holcim.com',     phone:'03-55667788', address:'Jalan Cement, Rawang',                 bank:'HSBC',    acct:'400-123456-001' });

    console.log('  ✓  8 profiles created (3 clients, 3 subcons, 2 suppliers)');

    // ── 4. Projects ──────────────────────────────────────────────────────────
    const insertProject = async (data) => {
      const { rows } = await q(
        `INSERT INTO projects
           (tenant_id, project_number, name, description, status, client_id, pm_id,
            site_address, contract_sum, start_date, end_date, retention_percentage,
            project_type, current_phase, progress_pct, crew_count, loa_received_date, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id`,
        [tenantId, data.number, data.name, data.desc, data.status, data.clientId, pmId,
         data.address, data.sum, data.start, data.end, data.retention ?? 10,
         data.type, data.phase, data.progress, data.crew, data.loa, directorId]
      );
      return rows[0].id;
    };

    // Project A — active, well underway
    const projAId = await insertProject({
      number: 'PRJ-2024-001', name: 'Residensi Harmoni Tower A & B',
      desc: '32-storey residential twin towers with basement parking, 480 units, Gombak, KL.',
      status: 'live', clientId: clientMegaId,
      address: 'Lot 1234, Jalan Gombak, 53100 Kuala Lumpur',
      sum: 48500000, start: ago(420), end: fwd(540),
      type: 'building', phase: 'construction', progress: 38, crew: 124, loa: ago(430),
    });

    // Project B — near completion
    const projBId = await insertProject({
      number: 'PRJ-2023-008', name: 'Urban Loft Petaling Jaya Phase 2',
      desc: '18-storey serviced apartment, 220 units, commercial podium G-3.',
      status: 'live', clientId: clientUrbanId,
      address: 'Seksyen 14, 46100 Petaling Jaya, Selangor',
      sum: 29200000, start: ago(730), end: fwd(90),
      type: 'building', phase: 'finishing', progress: 87, crew: 63, loa: ago(750),
    });

    // Project C — government road project
    const projCId = await insertProject({
      number: 'PRJ-2025-003', name: 'Naik Taraf Jalan Persekutuan FT012',
      desc: 'Road upgrade 14.2 km, widening + resurfacing + drainage improvement, Federal Territory.',
      status: 'live', clientId: clientGovId,
      address: 'Jalan Persekutuan FT012, Kepong – Batu Caves, WP',
      sum: 18750000, start: ago(60), end: fwd(300),
      type: 'civil', phase: 'pre_construction', progress: 8, crew: 37, loa: ago(70),
    });

    // Project D — on hold
    const projDId = await insertProject({
      number: 'PRJ-2024-005', name: 'Pusat Perniagaan Setia Alam Blok C',
      desc: '10-storey commercial office block, 45,000 sqft NLA, Shah Alam.',
      status: 'on_hold', clientId: clientMegaId,
      address: 'Seksyen U13, 40170 Shah Alam, Selangor',
      sum: 22100000, start: ago(180), end: fwd(450),
      type: 'building', phase: 'pre_construction', progress: 5, crew: 0, loa: ago(190),
      retention: 10,
    });

    console.log('  ✓  4 projects created');

    // ── 5. Project members ───────────────────────────────────────────────────
    const addMember = (pid, uid, role) =>
      q(`INSERT INTO project_members (project_id, user_id, role_in_project) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [pid, uid, role]);

    for (const pid of [projAId, projBId, projCId, projDId]) {
      await addMember(pid, pmId,       'Project Manager');
      await addMember(pid, qsId,       'Quantity Surveyor');
      await addMember(pid, engineerId, 'Site Engineer');
    }
    await addMember(projAId, techId, 'Site Supervisor');
    await addMember(projBId, techId, 'Site Supervisor');

    console.log('  ✓  Project members assigned');

    // ── 6. Milestones & Tasks ────────────────────────────────────────────────
    const insertMilestone = async (pid, title, dueDate, done, status) => {
      const { rows } = await q(
        `INSERT INTO project_milestones (project_id, title, due_date, is_completed, status, is_critical)
         VALUES ($1,$2,$3,$4,$5, true) RETURNING id`,
        [pid, title, dueDate, done, status]
      );
      return rows[0].id;
    };

    // Project A milestones
    const msA1 = await insertMilestone(projAId, 'Substructure Complete',     ago(200), true,  'done');
    const msA2 = await insertMilestone(projAId, 'Superstructure Floor 15',   ago(30),  true,  'done');
    const msA3 = await insertMilestone(projAId, 'Superstructure Topping Out', fwd(120), false, 'in_progress');
    const msA4 = await insertMilestone(projAId, 'M&E Rough-in Complete',      fwd(180), false, 'pending');
    const msA5 = await insertMilestone(projAId, 'Practical Completion',       fwd(540), false, 'pending');

    // Project B milestones (near completion)
    const msB1 = await insertMilestone(projBId, 'Structure Complete',         ago(300), true,  'done');
    const msB2 = await insertMilestone(projBId, 'M&E Rough-in Complete',      ago(120), true,  'done');
    const msB3 = await insertMilestone(projBId, 'Internal Finishes 80%',      ago(14),  true,  'done');
    const msB4 = await insertMilestone(projBId, 'Defect Rectification',       fwd(45),  false, 'in_progress');
    const msB5 = await insertMilestone(projBId, 'CPC Issuance',               fwd(90),  false, 'pending');

    // Project C milestones
    const msC1 = await insertMilestone(projCId, 'Site Possession',            ago(55),  true,  'done');
    const msC2 = await insertMilestone(projCId, 'Earthworks & Drainage Km 0–5', fwd(60), false, 'in_progress');
    const msC3 = await insertMilestone(projCId, 'Pavement Km 0–7',           fwd(150), false, 'pending');
    const msC4 = await insertMilestone(projCId, 'Full Completion',            fwd(300), false, 'pending');

    // Tasks for Project A
    const insertTask = (pid, mid, title, status, assignee, priority, progress) =>
      q(`INSERT INTO project_tasks (project_id, milestone_id, title, status, assigned_to, assignee_id, priority, progress_pct, created_by)
         VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8)`,
        [pid, mid, title, status, assignee, priority, progress, directorId]);

    await insertTask(projAId, msA3, 'Formwork installation FL16',        'in_progress', engineerId, 'high',   65);
    await insertTask(projAId, msA3, 'Rebar placement FL16',               'in_progress', techId,     'high',   40);
    await insertTask(projAId, msA3, 'Concrete pour FL15 complete',        'done',        engineerId, 'high',   100);
    await insertTask(projAId, msA3, 'Post-pour inspection FL15',          'done',        engineerId, 'medium', 100);
    await insertTask(projAId, msA4, 'M&E coordination drawing review',    'in_progress', engineerId, 'medium', 30);
    await insertTask(projAId, msA4, 'Conduit first-fix below FL10',       'todo',        techId,     'medium', 0);
    await insertTask(projAId, msA1, 'As-built substructure drawing',      'done',        engineerId, 'low',    100);

    await insertTask(projBId, msB4, 'Unit defect walk FL1–5',             'done',        techId,     'high',   100);
    await insertTask(projBId, msB4, 'Unit defect walk FL6–12',            'in_progress', techId,     'high',   60);
    await insertTask(projBId, msB4, 'Common area touch-up',               'todo',        techId,     'medium', 0);
    await insertTask(projBId, msB5, 'Prepare CPC supporting docs',        'in_progress', engineerId, 'high',   25);

    await insertTask(projCId, msC2, 'Earthwork cut-fill chainage 0+000',  'done',        engineerId, 'high',   100);
    await insertTask(projCId, msC2, 'Earthwork cut-fill chainage 1+000',  'in_progress', engineerId, 'high',   55);
    await insertTask(projCId, msC2, 'Side drain installation km 0–2',     'in_progress', techId,     'medium', 40);
    await insertTask(projCId, msC2, 'Compaction testing reports',         'todo',        engineerId, 'medium', 0);

    console.log('  ✓  Milestones & tasks created');

    // ── 7. BQ Documents & Items ──────────────────────────────────────────────
    const insertBQ = async (pid, title, total) => {
      const { rows } = await q(
        `INSERT INTO bq_documents (tenant_id, project_id, title, status, total_amount, created_by)
         VALUES ($1,$2,$3,'approved',$4,$5) RETURNING id`,
        [tenantId, pid, title, total, qsId]
      );
      return rows[0].id;
    };

    const insertBQItem = (bqId, code, desc, unit, qty, rate, section) => {
      const amount = qty * rate;
      return q(
        `INSERT INTO bq_items (bq_id, item_code, description, unit, quantity, unit_rate, amount, section, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [bqId, code, desc, unit, qty, rate, amount, section, 0]
      );
    };

    const bqAId = await insertBQ(projAId, 'BQ Rev 3 — Residensi Harmoni Tower A&B', 48500000);
    await insertBQItem(bqAId, 'A1.01', 'Excavation & earthworks (basement 2 levels)', 'm³', 18500, 45,   'A - Substructure');
    await insertBQItem(bqAId, 'A1.02', 'Reinforced concrete pile cap & ground beam',   'm³', 2800,  1850, 'A - Substructure');
    await insertBQItem(bqAId, 'A1.03', 'RC basement walls & slabs',                    'm³', 4200,  1650, 'A - Substructure');
    await insertBQItem(bqAId, 'B1.01', 'RC columns & shear walls (per floor)',          'm³', 420,   1750, 'B - Superstructure');
    await insertBQItem(bqAId, 'B1.02', 'RC flat slab (per floor, avg)',                 'm²', 2100,  95,   'B - Superstructure');
    await insertBQItem(bqAId, 'B1.03', 'RC staircase & lift shaft',                    'item', 8,   185000,'B - Superstructure');
    await insertBQItem(bqAId, 'C1.01', 'Brick wall partition',                         'm²', 28000, 85,   'C - Architecture');
    await insertBQItem(bqAId, 'C1.02', 'Aluminium windows & doors',                    'm²', 9500,  320,  'C - Architecture');
    await insertBQItem(bqAId, 'C1.03', 'Internal plaster & paint',                     'm²', 55000, 42,   'C - Architecture');
    await insertBQItem(bqAId, 'D1.01', 'Electrical installation (full)',                'lot', 1,   4200000,'D - M&E');
    await insertBQItem(bqAId, 'D1.02', 'Plumbing & sanitary (full)',                    'lot', 1,   2100000,'D - M&E');
    await insertBQItem(bqAId, 'D1.03', 'Fire protection system',                        'lot', 1,   1450000,'D - M&E');
    await insertBQItem(bqAId, 'D1.04', 'Lift installation (8 units)',                   'unit', 8,  380000, 'D - M&E');
    await insertBQItem(bqAId, 'E1.01', 'Landscaping & external works',                  'lot', 1,   1800000,'E - External');

    const bqBId = await insertBQ(projBId, 'BQ Final — Urban Loft PJ Phase 2', 29200000);
    await insertBQItem(bqBId, 'A1.01', 'Foundation & substructure',       'lot', 1, 3500000, 'A - Substructure');
    await insertBQItem(bqBId, 'B1.01', 'RC frame complete',               'lot', 1, 8200000, 'B - Superstructure');
    await insertBQItem(bqBId, 'C1.01', 'External facade & cladding',      'm²', 6800, 420,   'C - Architecture');
    await insertBQItem(bqBId, 'C1.02', 'Internal finishes (full)',         'lot', 1, 5600000, 'C - Architecture');
    await insertBQItem(bqBId, 'D1.01', 'M&E complete package',            'lot', 1, 4800000, 'D - M&E');

    const bqCId = await insertBQ(projCId, 'BQ — Naik Taraf Jalan FT012', 18750000);
    await insertBQItem(bqCId, 'R1.01', 'Clearing & grubbing',             'ha',   14.2, 8500,  'R - Roadworks');
    await insertBQItem(bqCId, 'R1.02', 'Earthwork cut & fill',            'm³',  95000, 38,    'R - Roadworks');
    await insertBQItem(bqCId, 'R1.03', 'Sub-base (150mm compacted)',       'm²',  85000, 22,    'R - Roadworks');
    await insertBQItem(bqCId, 'R1.04', 'Road base (200mm compacted)',      'm²',  85000, 35,    'R - Roadworks');
    await insertBQItem(bqCId, 'R1.05', 'Asphaltic concrete wearing 50mm', 'm²',  85000, 52,    'R - Roadworks');
    await insertBQItem(bqCId, 'D1.01', 'Box culvert & side drain',        'm',   8500,  380,   'D - Drainage');
    await insertBQItem(bqCId, 'D1.02', 'Slope protection & retaining',    'm²',  12000, 145,   'D - Drainage');
    await insertBQItem(bqCId, 'S1.01', 'Road markings & signage',         'lot',  1, 680000,   'S - Signing');

    console.log('  ✓  BQ documents & items created');

    // ── 8. Project Scope (materialised BQ lines) ─────────────────────────────
    const { rows: bqItemsA } = await q(`SELECT * FROM bq_items WHERE bq_id = $1`, [bqAId]);
    for (const item of bqItemsA) {
      const pct = item.section.startsWith('A') ? 100 :
                  item.section.startsWith('B') ? 48 :
                  item.section.startsWith('C') ? 15 : 8;
      const done = (item.quantity || 0) * pct / 100;
      await q(
        `INSERT INTO project_scope (tenant_id, project_id, bq_id, bq_item_id, item_code, section,
           description, unit, contract_qty, unit_rate, amount, qty_done, pct_complete, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0)`,
        [tenantId, projAId, bqAId, item.id, item.item_code, item.section,
         item.description, item.unit, item.quantity, item.unit_rate, item.amount, done, pct]
      );
    }

    const { rows: bqItemsC } = await q(`SELECT * FROM bq_items WHERE bq_id = $1`, [bqCId]);
    for (const item of bqItemsC) {
      const pct = item.item_code === 'R1.01' ? 100 :
                  item.item_code === 'R1.02' ? 35 : 0;
      const done = (item.quantity || 0) * pct / 100;
      await q(
        `INSERT INTO project_scope (tenant_id, project_id, bq_id, bq_item_id, item_code, section,
           description, unit, contract_qty, unit_rate, amount, qty_done, pct_complete, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0)`,
        [tenantId, projCId, bqCId, item.id, item.item_code, item.section,
         item.description, item.unit, item.quantity, item.unit_rate, item.amount, done, pct]
      );
    }

    console.log('  ✓  Project scope (materialised BQ) created');

    // ── 9. Claims & Payment Certificates ─────────────────────────────────────
    const insertClaim = async (pid, num, type, date, amount, status, submitter) => {
      const retention = amount * 0.10;
      const net = amount - retention;
      const { rows } = await q(
        `INSERT INTO claims (tenant_id, project_id, claim_number, claim_type, claim_date,
           amount, retention_amount, net_amount, status, source, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual',$10) RETURNING id`,
        [tenantId, pid, num, type, date, amount, retention, net, status, submitter]
      );
      return rows[0].id;
    };

    const insertCert = async (pid, claimId, num, date, certAmt, status, dueDate, paidDate) => {
      const { rows } = await q(
        `INSERT INTO payment_certificates (tenant_id, project_id, claim_id, cert_number, cert_date,
           certified_amount, status, due_date, paid_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [tenantId, pid, claimId, num, date, certAmt, status, dueDate, paidDate || null]
      );
      return rows[0].id;
    };

    // Project A — 5 progress claims
    const clA1 = await insertClaim(projAId, 'PC-A-001', 'progress', ago(360), 1850000, 'paid',      qsId);
    const clA2 = await insertClaim(projAId, 'PC-A-002', 'progress', ago(300), 2400000, 'paid',      qsId);
    const clA3 = await insertClaim(projAId, 'PC-A-003', 'progress', ago(240), 2950000, 'paid',      qsId);
    const clA4 = await insertClaim(projAId, 'PC-A-004', 'progress', ago(180), 3100000, 'certified', qsId);
    const clA5 = await insertClaim(projAId, 'PC-A-005', 'progress', ago(30),  3450000, 'submitted', qsId);

    await insertCert(projAId, clA1, 'CERT-A-001', ago(340), 1665000, 'paid',    ago(310), ago(300));
    await insertCert(projAId, clA2, 'CERT-A-002', ago(280), 2160000, 'paid',    ago(250), ago(240));
    await insertCert(projAId, clA3, 'CERT-A-003', ago(220), 2655000, 'paid',    ago(190), ago(180));
    await insertCert(projAId, clA4, 'CERT-A-004', ago(160), 2790000, 'overdue', ago(130), null);
    await insertCert(projAId, clA5, 'CERT-A-005', ago(10),  3105000, 'pending', fwd(20),  null);

    // Project B — 8 claims (nearing full)
    const clB1 = await insertClaim(projBId, 'PC-B-001', 'progress', ago(600), 2100000, 'paid',      qsId);
    const clB2 = await insertClaim(projBId, 'PC-B-002', 'progress', ago(540), 2800000, 'paid',      qsId);
    const clB3 = await insertClaim(projBId, 'PC-B-003', 'progress', ago(480), 3200000, 'paid',      qsId);
    const clB4 = await insertClaim(projBId, 'PC-B-004', 'progress', ago(420), 3100000, 'paid',      qsId);
    const clB5 = await insertClaim(projBId, 'PC-B-005', 'progress', ago(360), 2950000, 'paid',      qsId);
    const clB6 = await insertClaim(projBId, 'PC-B-006', 'progress', ago(240), 2600000, 'paid',      qsId);
    const clB7 = await insertClaim(projBId, 'PC-B-007', 'progress', ago(120), 3800000, 'certified', qsId);
    const clB8 = await insertClaim(projBId, 'PC-B-008', 'progress', ago(20),  4200000, 'submitted', qsId);

    await insertCert(projBId, clB1, 'CERT-B-001', ago(580), 1890000, 'paid',    ago(550), ago(540));
    await insertCert(projBId, clB2, 'CERT-B-002', ago(520), 2520000, 'paid',    ago(490), ago(480));
    await insertCert(projBId, clB3, 'CERT-B-003', ago(460), 2880000, 'paid',    ago(430), ago(420));
    await insertCert(projBId, clB4, 'CERT-B-004', ago(400), 2790000, 'paid',    ago(370), ago(360));
    await insertCert(projBId, clB5, 'CERT-B-005', ago(340), 2655000, 'paid',    ago(310), ago(300));
    await insertCert(projBId, clB6, 'CERT-B-006', ago(220), 2340000, 'paid',    ago(190), ago(180));
    await insertCert(projBId, clB7, 'CERT-B-007', ago(100), 3420000, 'overdue', ago(70),  null);

    // Project C — 1 early claim
    const clC1 = await insertClaim(projCId, 'PC-C-001', 'progress', ago(14), 620000, 'submitted', qsId);

    console.log('  ✓  Claims & payment certificates created');

    // ── 10. Invoices ──────────────────────────────────────────────────────────
    const insertInvoice = async (pid, clientId, num, date, items, status, claimId) => {
      let subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
      const taxRate = 0; // SST exempt for construction
      const total = subtotal;
      const { rows } = await q(
        `INSERT INTO invoices (tenant_id, project_id, client_id, invoice_number, invoice_date,
           due_date, subtotal, tax_rate, tax_amount, total, status, claim_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [tenantId, pid, clientId, num, date, fwd(30), subtotal, taxRate, 0, total, status, claimId || null, financeId]
      );
      const invId = rows[0].id;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await q(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [invId, item.desc, item.qty, item.price, item.qty * item.price, i]
        );
      }
      return invId;
    };

    // Project A invoices
    await insertInvoice(projAId, clientMegaId, 'INV-A-001', ago(340), [
      { desc: 'Progress Claim No.1 — Substructure works', qty: 1, price: 1665000 },
    ], 'paid', clA1);
    await insertInvoice(projAId, clientMegaId, 'INV-A-002', ago(280), [
      { desc: 'Progress Claim No.2 — Superstructure up to FL6', qty: 1, price: 2160000 },
    ], 'paid', clA2);
    await insertInvoice(projAId, clientMegaId, 'INV-A-003', ago(220), [
      { desc: 'Progress Claim No.3 — Superstructure up to FL11', qty: 1, price: 2655000 },
    ], 'paid', clA3);
    await insertInvoice(projAId, clientMegaId, 'INV-A-004', ago(160), [
      { desc: 'Progress Claim No.4 — Superstructure up to FL15', qty: 1, price: 2790000 },
    ], 'overdue', clA4);
    await insertInvoice(projAId, clientMegaId, 'INV-A-005', ago(10), [
      { desc: 'Progress Claim No.5 — Superstructure FL16 ongoing', qty: 1, price: 3105000 },
    ], 'unpaid', clA5);

    // Project B invoices
    await insertInvoice(projBId, clientUrbanId, 'INV-B-007', ago(100), [
      { desc: 'Progress Claim No.7 — Internal finishes 87%', qty: 1, price: 3420000 },
    ], 'overdue', clB7);
    await insertInvoice(projBId, clientUrbanId, 'INV-B-008', ago(18), [
      { desc: 'Progress Claim No.8 — Defects & commissioning', qty: 1, price: 4200000 },
    ], 'unpaid', clB8);

    // Standalone invoices (variation orders / extras)
    await insertInvoice(projAId, clientMegaId, 'INV-A-V01', ago(90), [
      { desc: 'Variation Order VO-001 — Additional basement waterproofing', qty: 1, price: 185000 },
      { desc: 'Variation Order VO-002 — Facade design revision', qty: 1, price: 92500 },
    ], 'unpaid', null);

    console.log('  ✓  Invoices & line items created');

    // ── 11. RFIs ──────────────────────────────────────────────────────────────
    const insertRFI = (pid, num, subject, desc, urgency, status, response, directedTo) =>
      q(`INSERT INTO project_rfis (project_id, rfi_number, subject, description, directed_to,
           urgency, status, response, due_date, raised_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [pid, num, subject, desc, directedTo, urgency, status, response, fwd(7), engineerId]);

    await insertRFI(projAId,'RFI-A-001','Column rebar lapping length FL16','Design shows 40d lapping but BQ shows 35d for T25 bars — which governs?','Architect / SE','responded','Confirm 40d per RC detail drawing SD-RC-006. BQ error. Proceed with 40d.','Perunding Arkitek Sdn Bhd');
    await insertRFI(projAId,'RFI-A-002','Lift lobby tile spec change','Client requests porcelain tile 600x1200 instead of 600x600 as specified.','Architect','under_review',null,'Perunding Arkitek Sdn Bhd');
    await insertRFI(projAId,'RFI-A-003','External facade sealant color','Drawing ref FA-EXT-012 shows "grey" — RAL code not specified.','Architect','submitted',null,'Perunding Arkitek Sdn Bhd');
    await insertRFI(projBId,'RFI-B-001','Hacking required for pipe routing FL12','As-built differs from M&E drawing — penetration location clashes with beam.','M&E Consultant','responded','Approve alternative routing as shown in RFI sketch. Structural check done.','Jurutera Mekanikal');
    await insertRFI(projCId,'RFI-C-001','Box culvert invert level discrepancy','Survey shows existing invert at RL 42.5m but drawing shows 41.8m.','Civil Engineer','under_review',null,'JKR Design Unit');

    console.log('  ✓  RFIs created');

    // ── 12. Change Orders ─────────────────────────────────────────────────────
    const insertCO = (pid, num, title, desc, reason, cost, days, status) =>
      q(`INSERT INTO project_change_orders (project_id, co_number, title, description, reason,
           cost_change, time_change, status, raised_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [pid, num, title, desc, reason, cost, days, status, engineerId]);

    await insertCO(projAId,'VO-A-001','Additional basement waterproofing — B2 level','Extend crystalline waterproofing to B2 slab soffit as instructed by SO.','Ground water ingress observed during construction.',185000,0,'approved');
    await insertCO(projAId,'VO-A-002','Facade design revision — tower A east elevation','Change from aluminium panel to unitised curtain wall system per client request.','Client aesthetic requirement change.',92500,14,'pending_approval');
    await insertCO(projAId,'VO-A-003','Additional fire refuge area FL16 & FL32','JBM requires additional refuge area per latest UBBL amendment.','Regulatory compliance.',38000,7,'approved');
    await insertCO(projBId,'VO-B-001','M&E rerouting FL12 — clash resolution','Reroute ACMV duct to avoid structural beam clash found during site coordination.','Design coordination issue.',45000,0,'approved');
    await insertCO(projCId,'VO-C-001','Additional retaining wall chainage 8+500','Slope failure risk identified during earthworks — add MSE retaining wall.','Site condition differs from soil investigation report.',320000,21,'pending_approval');

    console.log('  ✓  Change orders created');

    // ── 13. Submittals ────────────────────────────────────────────────────────
    const insertSubmittal = (pid, num, title, type, status) =>
      q(`INSERT INTO project_submittals (project_id, submittal_number, title, submittal_type,
           revision_number, status, submitted_by, due_date)
         VALUES ($1,$2,$3,$4,'Rev 2',$5,$6,$7)`,
        [pid, num, title, type, status, engineerId, fwd(14)]);

    await insertSubmittal(projAId,'SUB-A-001','RC Mix Design for 35MPa Concrete',    'technical_data', 'approved');
    await insertSubmittal(projAId,'SUB-A-002','Aluminium Window Shop Drawing Series 3','shop_drawing',   'approved');
    await insertSubmittal(projAId,'SUB-A-003','Waterproofing System — Crystalline',   'material_sample', 'under_review');
    await insertSubmittal(projAId,'SUB-A-004','Lift Installation Method Statement',    'method_statement','submitted');
    await insertSubmittal(projBId,'SUB-B-001','Curtain Wall System — Unitised',        'shop_drawing',   'approved');
    await insertSubmittal(projBId,'SUB-B-002','ACMV Duct Rerouting — FL12',           'shop_drawing',   'approved');
    await insertSubmittal(projCId,'SUB-C-001','Geotextile Material Specification',    'material_sample', 'under_review');
    await insertSubmittal(projCId,'SUB-C-002','MSE Retaining Wall Design',            'shop_drawing',   'submitted');

    console.log('  ✓  Submittals created');

    // ── 14. Risk Register ─────────────────────────────────────────────────────
    const insertRisk = (pid, title, category, likelihood, impact, mitigation, trend, status) =>
      q(`INSERT INTO project_risks (project_id, title, category, likelihood, impact,
           mitigation, trend, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pid, title, category, likelihood, impact, mitigation, trend, status]);

    await insertRisk(projAId,'Tower crane downtime during monsoon season','Weather',    3,4,'Pre-order critical concrete pours; maintain float buffer in schedule.','flat','active');
    await insertRisk(projAId,'Steel rebar price escalation',              'Commercial', 4,3,'Price lock agreement with KL Steel Trading for 3 months forward purchase.','up','active');
    await insertRisk(projAId,'Skilled formwork labour shortage',          'Resources',  3,4,'Engaged backup subcon Bina Teguh with committed headcount schedule.','flat','monitor');
    await insertRisk(projAId,'Client variation requests increasing',      'Scope',      4,3,'Formal VO process enforced; no instruction without written SO order.','up','active');
    await insertRisk(projBId,'Defect list growing — handover risk',       'Quality',    4,5,'Weekly defect audit; rectification tracked on dashboard.','down','active');
    await insertRisk(projBId,'CPC delayed by TNB meter connection',       'Regulatory', 3,4,'Expedite TNB application; parallel path with client utilities team.','flat','active');
    await insertRisk(projCId,'Unexpected utility services below road',    'Technical',  4,4,'Pre-construction utility mapping with TMX/TNB/SAJ; contingency RM80k.','flat','active');
    await insertRisk(projCId,'Monsoon season affecting earthworks',       'Weather',    5,4,'Schedule earthworks before Oct; temporary drainage bund plan in place.','up','active');

    console.log('  ✓  Risk register created');

    // ── 15. Site Diaries ──────────────────────────────────────────────────────
    const insertDiary = async (pid, date, weather, manpower, notes) => {
      const { rows } = await q(
        `INSERT INTO site_diaries (tenant_id, project_id, diary_date, weather, manpower, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [tenantId, pid, date, weather, manpower, notes, engineerId]
      );
      return rows[0].id;
    };

    // Project A — 7 recent diary entries
    for (let i = 6; i >= 0; i--) {
      const weather = i % 3 === 0 ? 'Light rain AM, sunny PM' : i % 3 === 1 ? 'Sunny' : 'Overcast';
      const mp = 110 + Math.floor(Math.random() * 20);
      const d = await insertDiary(projAId, ago(i), weather, mp,
        `Formwork FL${16+Math.floor(i/2)} progressing. Rebar placement ongoing. Safety briefing conducted morning.`);
    }

    // Project B — 5 recent diary entries
    for (let i = 4; i >= 0; i--) {
      const d = await insertDiary(projBId, ago(i), 'Sunny', 55 + Math.floor(Math.random() * 12),
        `Defect rectification units FL${6 + i}. Touch-up painting and grouting. Minor items on defect list resolved.`);
    }

    // Project C — 3 recent diary entries
    for (let i = 2; i >= 0; i--) {
      const d = await insertDiary(projCId, ago(i), i === 0 ? 'Sunny' : 'Partly cloudy', 34 + i,
        `Earthworks chainage 1+${(i*200).toString().padStart(3,'0')}. Compaction layer ${4-i}. Side drain shuttering set.`);
    }

    console.log('  ✓  Site diaries created');

    // ── 16. Safety Incidents ──────────────────────────────────────────────────
    await q(`INSERT INTO safety_incidents
      (tenant_id, project_id, incident_type, severity, incident_date, location, description,
       investigation_notes, corrective_actions, status, reported_by)
     VALUES
       ($1,$2,'near_miss','minor',$3,'FL8 formwork area','Worker nearly struck by falling timber offcut from FL9. Hard hat worn — no injury.',
        'Formwork debris not cleared promptly after pour. No designated drop zone marked.',
        'Implemented tool-box netting at all open floor edges. Debris clearance SOP updated.',
        'closed',$4)`,
      [tenantId, projAId, ago(45), engineerId]);

    await q(`INSERT INTO safety_incidents
      (tenant_id, project_id, incident_type, severity, incident_date, location, description,
       investigation_notes, corrective_actions, status, reported_by)
     VALUES
       ($1,$2,'accident','moderate',$3,'Site entrance hoist area','Worker sustained minor laceration on right hand during hoist cage loading. First aid administered.',
        'No gloves worn during hoist loading. PTW not observed.',
        'Mandatory glove policy reinforced. PTW checklist revised. Site safety officer re-briefed all hoist operators.',
        'closed',$4)`,
      [tenantId, projAId, ago(18), techId]);

    await q(`INSERT INTO safety_incidents
      (tenant_id, project_id, incident_type, severity, incident_date, location, description,
       status, reported_by)
     VALUES
       ($1,$2,'near_miss','minor',$3,'Chainage 0+800 road shoulder','Excavator operating too close to shoulder edge. Near-miss with passing light vehicle.',
        'investigating',$4)`,
      [tenantId, projCId, ago(3), engineerId]);

    console.log('  ✓  Safety incidents created');

    // ── 17. Fleet Vehicles ────────────────────────────────────────────────────
    const insertVehicle = (type, reg, make, model, yr, proj, insExp, rtExp, status) =>
      q(`INSERT INTO fleet_vehicles (tenant_id, vehicle_type, registration_number, make, model,
           year, assigned_project_id, insurance_expiry, roadtax_expiry, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tenantId, type, reg, make, model, yr, proj, insExp, rtExp, status]);

    await insertVehicle('truck',     'WA1234B', 'Isuzu',      'NPS 75',      2021, projAId, fwd(180), fwd(90),  'active');
    await insertVehicle('lorry',     'WB5678C', 'Hino',       'WU300',       2020, projAId, fwd(240), fwd(120), 'active');
    await insertVehicle('machinery', 'EX-001',  'Komatsu',    'PC200',       2019, projAId, fwd(60),  null,     'active');
    await insertVehicle('machinery', 'EX-002',  'Caterpillar','320',         2022, projCId, fwd(300), null,     'active');
    await insertVehicle('machinery', 'GD-001',  'Caterpillar','120K Grader', 2021, projCId, fwd(150), null,     'active');
    await insertVehicle('car',       'WC9012D', 'Toyota',     'Hilux',       2023, projAId, fwd(330), fwd(330), 'active');
    await insertVehicle('car',       'WD3456E', 'Toyota',     'Hilux',       2022, projBId, fwd(45),  fwd(45),  'active');
    await insertVehicle('truck',     'WE7890F', 'Isuzu',      'ELF 250',     2018, null,    ago(15),  ago(10),  'maintenance');

    console.log('  ✓  Fleet vehicles created');

    // ── 18. Inventory ─────────────────────────────────────────────────────────
    const insertItem = (name, type, unit, qty, threshold, cost, location) =>
      q(`INSERT INTO inventory_items (tenant_id, name, item_type, unit, quantity,
           low_stock_threshold, unit_cost, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tenantId, name, type, unit, qty, threshold, cost, location]);

    await insertItem('OPC Cement (50kg)',          'consumable', 'bag',  420, 100, 24.50, 'Store A - Site Gombak');
    await insertItem('River Sand',                 'consumable', 'm³',   85,  20,  65,    'Store A - Site Gombak');
    await insertItem('20mm Aggregate',             'consumable', 'm³',   60,  15,  58,    'Store A - Site Gombak');
    await insertItem('T12 Rebar (12m)',            'consumable', 'tonne',22,  5,   3200,  'Store A - Site Gombak');
    await insertItem('T25 Rebar (12m)',            'consumable', 'tonne',38,  8,   3350,  'Store A - Site Gombak');
    await insertItem('Safety Helmet (white)',      'returnable', 'unit', 65,  10,  18,    'Safety Store');
    await insertItem('Safety Harness Full Body',   'returnable', 'unit', 30,  5,   185,   'Safety Store');
    await insertItem('Formwork Plywood 18mm',      'returnable', 'sheet',210, 30,  42,    'Store A - Site Gombak');
    await insertItem('Scaffolding Pipe (6m)',      'returnable', 'piece',850, 50,  28,    'Store A - Site Gombak');
    await insertItem('Generator Set 20kVA',        'returnable', 'unit', 3,   1,   8500,  'Equipment Store');
    await insertItem('Diesel (storage)',            'consumable', 'litre',2400,500, 3.85,  'Fuel Store');
    await insertItem('Asphalt Mix (hot)',           'consumable', 'tonne',180, 50,  185,   'Store C - Site FT012');

    console.log('  ✓  Inventory items created');

    // ── 19. CRM Leads ─────────────────────────────────────────────────────────
    const insertLead = (company, contact, email, projectType, value, source, status) =>
      q(`INSERT INTO crm_leads (tenant_id, company_name, contact_person, email, project_type,
           estimated_value, source, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [tenantId, company, contact, email, projectType, value, source, status, directorId]);

    await insertLead('Perdana Properties Bhd',  'Encik Farouk',  'farouk@perdana.com',   '22-storey serviced apartment, Setapak',  35000000, 'referral',   'qualified');
    await insertLead('Duta Land Development',   'Ms. Vivien',    'vivien@dutaland.com',  'Industrial park, 40-acre, Semenyih',     85000000, 'networking', 'tender_submitted');
    await insertLead('Perbadanan PR1MA',        'En. Hazwan',    'hazwan@prima.gov.my',  'Affordable housing 500 units, Rawang',   42000000, 'government', 'qualified');
    await insertLead('KL Metro Holdings',       'Dato Syed',     'syed@klmetro.com',     'Commercial tower 25-storey, Bangsar',    78000000, 'direct',     'contacted');
    await insertLead('TechnoPark SDN Bhd',      'Mr. Johnson',   'johnson@technopark.my','IT hub fitout & M&E, Cyberjaya',          9500000, 'tender_ad',  'new');
    await insertLead('Amanah Raya Developers',  'Pn. Halimah',   'halimah@amanah.com',   'Mixed dev — retail podium + SOHO units', 52000000, 'referral',   'won');
    await insertLead('Sime Darby Property',     'Cik Nurul',     'nurul@simeproperty.com','Township roads & infrastructure, Nilai', 18500000, 'networking', 'lost');

    console.log('  ✓  CRM leads created');

    // ── Done ─────────────────────────────────────────────────────────────────
    await q('COMMIT');

    console.log('\n' + '─'.repeat(60));
    console.log('  PROJECT SEED COMPLETE');
    console.log('─'.repeat(60));
    console.log('  4 projects    │ Residensi Harmoni, Urban Loft,');
    console.log('                │ Jalan FT012, Setia Alam Blok C');
    console.log('  8 profiles    │ 3 clients, 3 subcons, 2 suppliers');
    console.log('  3 BQ docs     │ with 27 line items + scope tracking');
    console.log('  13 claims     │ with payment certificates');
    console.log('  9 invoices    │ paid, overdue, unpaid');
    console.log('  5 RFIs        │ across 3 projects');
    console.log('  5 COs         │ approved & pending');
    console.log('  8 submittals  │ drawings & materials');
    console.log('  8 risks       │ across 3 active projects');
    console.log('  15 diaries    │ last 7 days per active site');
    console.log('  3 incidents   │ near-miss, accident, investigating');
    console.log('  8 vehicles    │ trucks, machinery, cars');
    console.log('  12 inventory  │ consumables & returnables');
    console.log('  7 CRM leads   │ pipeline & won/lost');
    console.log('─'.repeat(60));

  } catch (err) {
    await q('ROLLBACK').catch(() => {});
    console.error('\n  ✗  Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
