const express = require('express');
const router = express.Router();

const authRoutes          = require('./auth.routes');
const projectRoutes       = require('./projects.routes');
const trackingRoutes      = require('./tracking.routes');
const invoiceRoutes       = require('./invoices.routes');
const hrRoutes            = require('./hr.routes');
const financeRoutes       = require('./finance.routes');
const profileRoutes       = require('./profiles.routes');
const userRoutes          = require('./users.routes');
const bqRoutes            = require('./bq.routes');
const notificationRoutes  = require('./notifications.routes');
const safetyRoutes        = require('./safety.routes');
const crmRoutes           = require('./crm.routes');
const fleetRoutes         = require('./fleet.routes');
const ratesRoutes         = require('./rates.routes');
const inventoryRoutes     = require('./inventory.routes');
const documentsRoutes     = require('./documents.routes');
const automationRoutes    = require('./automation.routes');

router.use('/auth',          authRoutes);
router.use('/projects',      projectRoutes);
router.use('/projects',      trackingRoutes);
router.use('/invoices',      invoiceRoutes);
router.use('/hr',            hrRoutes);
router.use('/finance',       financeRoutes);
router.use('/profiles',      profileRoutes);
router.use('/users',         userRoutes);
router.use('/bq',            bqRoutes);
router.use('/notifications', notificationRoutes);
router.use('/safety',        safetyRoutes);
router.use('/crm',           crmRoutes);
router.use('/fleet',         fleetRoutes);
router.use('/rates',         ratesRoutes);
router.use('/inventory',     inventoryRoutes);
router.use('/documents',     documentsRoutes);
router.use('/automation',    automationRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: 'ContractOS', version: '1.0.0', timestamp: new Date().toISOString() });
});

// DEV-ONLY: run project seeder via API (remove after use)
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/seed-projects', async (req, res) => {
    try {
      // Inline seed logic — avoids file path issues
      const { pool } = require('../config/database');
      const client = await pool.connect();
      const q = (text, params) => client.query(text, params);
      const ago = (d) => { const x = new Date(); x.setDate(x.getDate()-d); return x.toISOString().split('T')[0]; };
      const fwd = (d) => { const x = new Date(); x.setDate(x.getDate()+d); return x.toISOString().split('T')[0]; };
      const log = [];

      try {
        await q('BEGIN');

        const { rows: tenants } = await q(`SELECT id FROM tenants WHERE company_name = 'Demo Construction Sdn Bhd' LIMIT 1`);
        if (!tenants.length) throw new Error('Demo tenant not found');
        const tenantId = tenants[0].id;

        const { rows: users } = await q(`SELECT id, role FROM users WHERE tenant_id = $1`, [tenantId]);
        const byRole = (r) => users.find(u => u.role === r)?.id;
        const directorId = byRole('director'), pmId = byRole('pm'), qsId = byRole('qs');
        const financeId = byRole('finance'), engineerId = byRole('engineer'), techId = byRole('technician');

        // Clean old data
        await q(`DELETE FROM site_diary_photos WHERE diary_id IN (SELECT id FROM site_diaries WHERE tenant_id=$1)`,[tenantId]);
        await q(`DELETE FROM site_diary_entries WHERE diary_id IN (SELECT id FROM site_diaries WHERE tenant_id=$1)`,[tenantId]);
        await q(`DELETE FROM site_diaries WHERE tenant_id=$1`,[tenantId]);
        await q(`DELETE FROM project_scope WHERE tenant_id=$1`,[tenantId]);
        for (const t of ['project_risks','project_submittals','project_rfis','project_change_orders','project_tasks','project_milestones','project_members']) {
          await q(`DELETE FROM ${t} WHERE project_id IN (SELECT id FROM projects WHERE tenant_id=$1)`,[tenantId]);
        }
        await q(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id=$1)`,[tenantId]);
        for (const t of ['invoices','payment_certificates','claims']) await q(`DELETE FROM ${t} WHERE tenant_id=$1`,[tenantId]);
        await q(`DELETE FROM bq_items WHERE bq_id IN (SELECT id FROM bq_documents WHERE tenant_id=$1)`,[tenantId]);
        for (const t of ['bq_documents','rfis','change_orders','safety_incidents','fleet_vehicles','crm_leads','inventory_items','projects','profiles']) {
          await q(`DELETE FROM ${t} WHERE tenant_id=$1`,[tenantId]);
        }
        log.push('Cleared old data');

        // Profiles
        const ip = async (d) => {
          const {rows} = await q(`INSERT INTO profiles (tenant_id,profile_type,company_name,registration_number,contact_person,email,phone,address,bank_name,bank_account_number,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [tenantId,d.type,d.name,d.reg,d.contact,d.email,d.phone,d.address,d.bank,d.acct,directorId]);
          return rows[0].id;
        };
        const clientMegaId  = await ip({type:'client',  name:'Mega Development Sdn Bhd',  reg:'0987654-M',contact:'Dato Sri Lim', email:'dato@megadev.com',   phone:'03-21234567',address:'Menara Mega, KL',      bank:'Maybank',    acct:'5641-2345-6789'});
        const clientUrbanId = await ip({type:'client',  name:'Urban Living Bhd',           reg:'1122334-U',contact:'Pn. Rashidah',email:'rashidah@urban.my',  phone:'03-79876543',address:'Jalan Duta, KL',       bank:'CIMB',       acct:'8001-2233-4455'});
        const clientGovId   = await ip({type:'client',  name:'JKR Wilayah Persekutuan',    reg:'GOVT-0012', contact:'Ir. Azman',   email:'azman@jkr.gov.my',  phone:'03-26174000',address:'Jalan Sultan Salah, KL',bank:'RHB',        acct:'2133-4455-6677'});
        const subconCivilId = await ip({type:'subcon',  name:'Bina Teguh Sdn Bhd',         reg:'0011223-B',contact:'Ah Kow',     email:'ahkow@binateg.com',  phone:'012-3456789',address:'Shah Alam',             bank:'Public Bank',acct:'3123-4444-5555'});
        const subconMEId    = await ip({type:'subcon',  name:'Elektra ME Works Sdn Bhd',   reg:'0099887-E',contact:'Ravi Kumar', email:'ravi@elektrame.com', phone:'016-7654321',address:'PJ',                    bank:'Maybank',    acct:'5641-9988-7766'});
        const supSteelId    = await ip({type:'supplier',name:'KL Steel Trading Sdn Bhd',   reg:'0033221-K',contact:'Mr. Tan',    email:'sales@klsteel.com',  phone:'03-33456789',address:'Port Klang',            bank:'Maybank',    acct:'5641-1122-3344'});
        log.push('8 profiles created');

        // Projects
        const iproj = async (d) => {
          const {rows} = await q(`INSERT INTO projects (tenant_id,project_number,name,description,status,client_id,pm_id,site_address,contract_sum,start_date,end_date,retention_percentage,project_type,current_phase,progress_pct,crew_count,loa_received_date,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
            [tenantId,d.num,d.name,d.desc,d.status,d.cid,pmId,d.addr,d.sum,d.start,d.end,10,d.type,d.phase,d.pct,d.crew,d.loa,directorId]);
          return rows[0].id;
        };
        const projAId = await iproj({num:'PRJ-2024-001',name:'Residensi Harmoni Tower A & B',desc:'32-storey residential twin towers, 480 units, Gombak KL.',status:'live',cid:clientMegaId,addr:'Lot 1234, Jalan Gombak, 53100 KL',sum:48500000,start:ago(420),end:fwd(540),type:'building',phase:'construction',pct:38,crew:124,loa:ago(430)});
        const projBId = await iproj({num:'PRJ-2023-008',name:'Urban Loft Petaling Jaya Phase 2',desc:'18-storey serviced apartment, 220 units.',status:'live',cid:clientUrbanId,addr:'Seksyen 14, 46100 PJ',sum:29200000,start:ago(730),end:fwd(90),type:'building',phase:'finishing',pct:87,crew:63,loa:ago(750)});
        const projCId = await iproj({num:'PRJ-2025-003',name:'Naik Taraf Jalan Persekutuan FT012',desc:'Road upgrade 14.2 km, widening + resurfacing.',status:'live',cid:clientGovId,addr:'FT012, Kepong – Batu Caves, WP',sum:18750000,start:ago(60),end:fwd(300),type:'civil',phase:'pre_construction',pct:8,crew:37,loa:ago(70)});
        const projDId = await iproj({num:'PRJ-2024-005',name:'Pusat Perniagaan Setia Alam Blok C',desc:'10-storey commercial office, Shah Alam.',status:'on_hold',cid:clientMegaId,addr:'Shah Alam, Selangor',sum:22100000,start:ago(180),end:fwd(450),type:'building',phase:'pre_construction',pct:5,crew:0,loa:ago(190)});
        log.push('4 projects created');

        // Members
        for (const pid of [projAId,projBId,projCId,projDId]) {
          for (const [uid,role] of [[pmId,'Project Manager'],[qsId,'Quantity Surveyor'],[engineerId,'Site Engineer']]) {
            await q(`INSERT INTO project_members (project_id,user_id,role_in_project) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,[pid,uid,role]);
          }
        }

        // Milestones
        const ims = async (pid,title,due,done,status) => {
          const {rows} = await q(`INSERT INTO project_milestones (project_id,title,due_date,is_completed,status,is_critical) VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,[pid,title,due,done,status]);
          return rows[0].id;
        };
        const msA1=await ims(projAId,'Substructure Complete',ago(200),true,'done');
        const msA2=await ims(projAId,'Superstructure Floor 15',ago(30),true,'done');
        const msA3=await ims(projAId,'Superstructure Topping Out',fwd(120),false,'in_progress');
        const msA4=await ims(projAId,'M&E Rough-in Complete',fwd(180),false,'pending');
        await ims(projAId,'Practical Completion',fwd(540),false,'pending');
        await ims(projBId,'Structure Complete',ago(300),true,'done');
        await ims(projBId,'M&E Rough-in Complete',ago(120),true,'done');
        await ims(projBId,'Internal Finishes 80%',ago(14),true,'done');
        const msB4=await ims(projBId,'Defect Rectification',fwd(45),false,'in_progress');
        await ims(projBId,'CPC Issuance',fwd(90),false,'pending');
        await ims(projCId,'Site Possession',ago(55),true,'done');
        const msC2=await ims(projCId,'Earthworks & Drainage Km 0–5',fwd(60),false,'in_progress');
        await ims(projCId,'Pavement Km 0–7',fwd(150),false,'pending');
        await ims(projCId,'Full Completion',fwd(300),false,'pending');

        // Tasks
        const it = (pid,mid,title,status,uid,priority,pct) =>
          q(`INSERT INTO project_tasks (project_id,milestone_id,title,status,assigned_to,assignee_id,priority,progress_pct,created_by) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8)`,[pid,mid,title,status,uid,priority,pct,directorId]);
        await it(projAId,msA3,'Formwork installation FL16','in_progress',engineerId,'high',65);
        await it(projAId,msA3,'Rebar placement FL16','in_progress',techId,'high',40);
        await it(projAId,msA3,'Concrete pour FL15 complete','done',engineerId,'high',100);
        await it(projAId,msA4,'M&E coordination drawing review','in_progress',engineerId,'medium',30);
        await it(projBId,msB4,'Unit defect walk FL1–5','done',techId,'high',100);
        await it(projBId,msB4,'Unit defect walk FL6–12','in_progress',techId,'high',60);
        await it(projBId,msB4,'Common area touch-up','todo',techId,'medium',0);
        await it(projCId,msC2,'Earthwork cut-fill chainage 0+000','done',engineerId,'high',100);
        await it(projCId,msC2,'Earthwork cut-fill chainage 1+000','in_progress',engineerId,'high',55);
        await it(projCId,msC2,'Side drain installation km 0–2','in_progress',techId,'medium',40);
        log.push('Milestones & tasks created');

        // BQ
        const ibq = async (pid,title,total) => {
          const {rows}=await q(`INSERT INTO bq_documents (tenant_id,project_id,title,status,total_amount,created_by) VALUES ($1,$2,$3,'approved',$4,$5) RETURNING id`,[tenantId,pid,title,total,qsId]);
          return rows[0].id;
        };
        const ibqi = (bqId,code,desc,unit,qty,rate,section) =>
          q(`INSERT INTO bq_items (bq_id,item_code,description,unit,quantity,unit_rate,amount,section,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0)`,[bqId,code,desc,unit,qty,rate,qty*rate,section]);
        const bqAId=await ibq(projAId,'BQ Rev 3 — Residensi Harmoni Tower A&B',48500000);
        await ibqi(bqAId,'A1.01','Excavation & earthworks (basement 2 levels)','m³',18500,45,'A - Substructure');
        await ibqi(bqAId,'A1.02','RC pile cap & ground beam','m³',2800,1850,'A - Substructure');
        await ibqi(bqAId,'B1.01','RC columns & shear walls (per floor)','m³',420,1750,'B - Superstructure');
        await ibqi(bqAId,'B1.02','RC flat slab (per floor)','m²',2100,95,'B - Superstructure');
        await ibqi(bqAId,'C1.01','Brick wall partition','m²',28000,85,'C - Architecture');
        await ibqi(bqAId,'C1.02','Aluminium windows & doors','m²',9500,320,'C - Architecture');
        await ibqi(bqAId,'D1.01','Electrical installation (full)','lot',1,4200000,'D - M&E');
        await ibqi(bqAId,'D1.02','Plumbing & sanitary (full)','lot',1,2100000,'D - M&E');
        await ibqi(bqAId,'D1.03','Lift installation (8 units)','unit',8,380000,'D - M&E');
        const bqCId=await ibq(projCId,'BQ — Naik Taraf Jalan FT012',18750000);
        await ibqi(bqCId,'R1.01','Clearing & grubbing','ha',14.2,8500,'R - Roadworks');
        await ibqi(bqCId,'R1.02','Earthwork cut & fill','m³',95000,38,'R - Roadworks');
        await ibqi(bqCId,'R1.03','Sub-base (150mm compacted)','m²',85000,22,'R - Roadworks');
        await ibqi(bqCId,'R1.04','Road base (200mm compacted)','m²',85000,35,'R - Roadworks');
        await ibqi(bqCId,'R1.05','Asphaltic concrete wearing 50mm','m²',85000,52,'R - Roadworks');
        await ibqi(bqCId,'D1.01','Box culvert & side drain','m',8500,380,'D - Drainage');
        log.push('BQ documents created');

        // Claims
        const ic = async (pid,num,date,amount,status) => {
          const ret=amount*0.10,net=amount-ret;
          const {rows}=await q(`INSERT INTO claims (tenant_id,project_id,claim_number,claim_type,claim_date,amount,retention_amount,net_amount,status,source,submitted_by) VALUES ($1,$2,$3,'progress',$4,$5,$6,$7,$8,'manual',$9) RETURNING id`,[tenantId,pid,num,date,amount,ret,net,status,qsId]);
          return rows[0].id;
        };
        const cert = (pid,cid,num,date,amt,status,due) =>
          q(`INSERT INTO payment_certificates (tenant_id,project_id,claim_id,cert_number,cert_date,certified_amount,status,due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[tenantId,pid,cid,num,date,amt,status,due]);

        const clA1=await ic(projAId,'PC-A-001',ago(360),1850000,'paid');
        const clA2=await ic(projAId,'PC-A-002',ago(300),2400000,'paid');
        const clA3=await ic(projAId,'PC-A-003',ago(240),2950000,'paid');
        const clA4=await ic(projAId,'PC-A-004',ago(180),3100000,'certified');
        const clA5=await ic(projAId,'PC-A-005',ago(30),3450000,'submitted');
        await cert(projAId,clA1,'CERT-A-001',ago(340),1665000,'paid',ago(310));
        await cert(projAId,clA2,'CERT-A-002',ago(280),2160000,'paid',ago(250));
        await cert(projAId,clA3,'CERT-A-003',ago(220),2655000,'paid',ago(190));
        await cert(projAId,clA4,'CERT-A-004',ago(160),2790000,'overdue',ago(130));
        await cert(projAId,clA5,'CERT-A-005',ago(10),3105000,'pending',fwd(20));

        const clB1=await ic(projBId,'PC-B-001',ago(600),2100000,'paid');
        const clB2=await ic(projBId,'PC-B-002',ago(540),2800000,'paid');
        const clB3=await ic(projBId,'PC-B-003',ago(480),3200000,'paid');
        const clB4=await ic(projBId,'PC-B-004',ago(420),3100000,'paid');
        const clB5=await ic(projBId,'PC-B-005',ago(360),2950000,'paid');
        const clB6=await ic(projBId,'PC-B-006',ago(240),2600000,'paid');
        const clB7=await ic(projBId,'PC-B-007',ago(120),3800000,'certified');
        const clB8=await ic(projBId,'PC-B-008',ago(20),4200000,'submitted');
        await cert(projBId,clB7,'CERT-B-007',ago(100),3420000,'overdue',ago(70));
        const clC1=await ic(projCId,'PC-C-001',ago(14),620000,'submitted');
        log.push('Claims & certs created');

        // Invoices
        const iinv = async (pid,cid,num,date,items,status,claimId) => {
          const sub=items.reduce((s,i)=>s+i.q*i.p,0);
          const {rows}=await q(`INSERT INTO invoices (tenant_id,project_id,client_id,invoice_number,invoice_date,due_date,subtotal,tax_rate,tax_amount,total,status,claim_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$7,$8,$9,$10) RETURNING id`,[tenantId,pid,cid,num,date,fwd(30),sub,status,claimId||null,financeId]);
          const invId=rows[0].id;
          for(let i=0;i<items.length;i++) await q(`INSERT INTO invoice_items (invoice_id,description,quantity,unit_price,amount,sort_order) VALUES ($1,$2,1,$3,$3,$4)`,[invId,items[i].d,items[i].q*items[i].p,i]);
          return invId;
        };
        await iinv(projAId,clientMegaId,'INV-A-001',ago(340),[{d:'Progress Claim No.1 — Substructure',q:1,p:1665000}],'paid',clA1);
        await iinv(projAId,clientMegaId,'INV-A-002',ago(280),[{d:'Progress Claim No.2 — Structure FL6',q:1,p:2160000}],'paid',clA2);
        await iinv(projAId,clientMegaId,'INV-A-003',ago(220),[{d:'Progress Claim No.3 — Structure FL11',q:1,p:2655000}],'paid',clA3);
        await iinv(projAId,clientMegaId,'INV-A-004',ago(160),[{d:'Progress Claim No.4 — Structure FL15',q:1,p:2790000}],'overdue',clA4);
        await iinv(projAId,clientMegaId,'INV-A-005',ago(10),[{d:'Progress Claim No.5 — Structure FL16',q:1,p:3105000}],'unpaid',clA5);
        await iinv(projBId,clientUrbanId,'INV-B-007',ago(100),[{d:'Progress Claim No.7 — Finishes 87%',q:1,p:3420000}],'overdue',clB7);
        await iinv(projBId,clientUrbanId,'INV-B-008',ago(18),[{d:'Progress Claim No.8 — Defects',q:1,p:4200000}],'unpaid',clB8);
        await iinv(projAId,clientMegaId,'INV-A-V01',ago(90),[{d:'VO-001 Basement waterproofing',q:1,p:185000},{d:'VO-002 Facade revision',q:1,p:92500}],'unpaid',null);
        log.push('Invoices created');

        // RFIs
        const irfi = (pid,num,subj,desc,urgency,status,response,to) =>
          q(`INSERT INTO project_rfis (project_id,rfi_number,subject,description,directed_to,urgency,status,response,due_date,raised_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[pid,num,subj,desc,to,urgency,status,response,fwd(7),engineerId]);
        await irfi(projAId,'RFI-A-001','Column rebar lapping length FL16','Design shows 40d, BQ shows 35d for T25 bars.','normal','responded','Confirm 40d per SD-RC-006. Proceed with 40d.','Perunding Arkitek');
        await irfi(projAId,'RFI-A-002','Lift lobby tile spec change','Client requests 600x1200 instead of 600x600.','normal','under_review',null,'Perunding Arkitek');
        await irfi(projAId,'RFI-A-003','External facade sealant color','FA-EXT-012 shows "grey" — RAL code not specified.','normal','submitted',null,'Perunding Arkitek');
        await irfi(projBId,'RFI-B-001','Hacking for pipe routing FL12','As-built clashes with M&E drawing.','high','responded','Approve alternative routing per RFI sketch.','Jurutera Mekanikal');
        await irfi(projCId,'RFI-C-001','Box culvert invert level discrepancy','Survey RL 42.5m vs drawing 41.8m.','normal','under_review',null,'JKR Design Unit');

        // Change Orders
        const ico = (pid,num,title,desc,cost,days,status) =>
          q(`INSERT INTO project_change_orders (project_id,co_number,title,description,cost_change,time_change,status,raised_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[pid,num,title,desc,cost,days,status,engineerId]);
        await ico(projAId,'VO-A-001','Additional basement waterproofing','Extend crystalline waterproofing to B2 slab soffit.',185000,0,'approved');
        await ico(projAId,'VO-A-002','Facade design revision — Tower A east','Change to unitised curtain wall per client.',92500,14,'pending_approval');
        await ico(projAId,'VO-A-003','Additional fire refuge area FL16 & FL32','UBBL amendment compliance.',38000,7,'approved');
        await ico(projBId,'VO-B-001','M&E rerouting FL12','Reroute ACMV duct to avoid beam clash.',45000,0,'approved');
        await ico(projCId,'VO-C-001','Additional retaining wall chainage 8+500','MSE wall — slope failure risk.',320000,21,'pending_approval');

        // Submittals
        const isub = (pid,num,title,type,status) =>
          q(`INSERT INTO project_submittals (project_id,submittal_number,title,submittal_type,revision_number,status,submitted_by,due_date) VALUES ($1,$2,$3,$4,'Rev 2',$5,$6,$7)`,[pid,num,title,type,status,engineerId,fwd(14)]);
        await isub(projAId,'SUB-A-001','RC Mix Design for 35MPa Concrete','technical_data','approved');
        await isub(projAId,'SUB-A-002','Aluminium Window Shop Drawing Series 3','shop_drawing','approved');
        await isub(projAId,'SUB-A-003','Waterproofing System — Crystalline','material_sample','under_review');
        await isub(projAId,'SUB-A-004','Lift Installation Method Statement','method_statement','submitted');
        await isub(projBId,'SUB-B-001','Curtain Wall System — Unitised','shop_drawing','approved');
        await isub(projCId,'SUB-C-001','Geotextile Material Specification','material_sample','under_review');

        // Risks
        const irisk = (pid,title,cat,l,i,mit,trend,status) =>
          q(`INSERT INTO project_risks (project_id,title,category,likelihood,impact,mitigation,trend,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[pid,title,cat,l,i,mit,trend,status]);
        await irisk(projAId,'Tower crane downtime during monsoon','Weather',3,4,'Pre-order concrete pours; maintain float buffer.','flat','active');
        await irisk(projAId,'Steel rebar price escalation','Commercial',4,3,'Price lock with KL Steel Trading 3 months forward.','up','active');
        await irisk(projAId,'Skilled formwork labour shortage','Resources',3,4,'Engaged backup subcon Bina Teguh.','flat','monitor');
        await irisk(projBId,'Defect list growing — handover risk','Quality',4,5,'Weekly defect audit tracked on dashboard.','down','active');
        await irisk(projBId,'CPC delayed by TNB meter connection','Regulatory',3,4,'Expedite TNB application parallel with client.','flat','active');
        await irisk(projCId,'Unexpected utility services below road','Technical',4,4,'Pre-construction utility mapping; contingency RM80k.','flat','active');
        await irisk(projCId,'Monsoon season affecting earthworks','Weather',5,4,'Schedule earthworks before Oct; drainage bund plan.','up','active');
        log.push('RFIs, COs, Submittals, Risks created');

        // Site Diaries
        for (let i=6;i>=0;i--) {
          const weather=i%3===0?'Light rain AM, sunny PM':i%3===1?'Sunny':'Overcast';
          await q(`INSERT INTO site_diaries (tenant_id,project_id,diary_date,weather,manpower,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[tenantId,projAId,ago(i),weather,115+i,`Formwork FL${16+Math.floor(i/2)} progressing. Rebar ongoing. Safety briefing AM.`,engineerId]);
        }
        for (let i=4;i>=0;i--) {
          await q(`INSERT INTO site_diaries (tenant_id,project_id,diary_date,weather,manpower,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[tenantId,projBId,ago(i),'Sunny',58+i,`Defect rectification FL${6+i}. Touch-up painting and grouting ongoing.`,engineerId]);
        }
        for (let i=2;i>=0;i--) {
          await q(`INSERT INTO site_diaries (tenant_id,project_id,diary_date,weather,manpower,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[tenantId,projCId,ago(i),'Partly cloudy',36+i,`Earthworks chainage 1+${(i*200).toString().padStart(3,'0')}. Compaction layer ongoing.`,engineerId]);
        }
        log.push('Site diaries created');

        // Safety
        await q(`INSERT INTO safety_incidents (tenant_id,project_id,incident_type,severity,incident_date,location,description,investigation_notes,corrective_actions,status,reported_by) VALUES ($1,$2,'near_miss','minor',$3,'FL8 formwork area','Worker nearly struck by falling timber offcut.','Debris not cleared promptly.','Netting at open edges. SOP updated.','closed',$4)`,[tenantId,projAId,ago(45),engineerId]);
        await q(`INSERT INTO safety_incidents (tenant_id,project_id,incident_type,severity,incident_date,location,description,investigation_notes,corrective_actions,status,reported_by) VALUES ($1,$2,'accident','moderate',$3,'Hoist area','Minor laceration on worker hand during hoist loading.','No gloves worn. PTW not observed.','Glove policy reinforced. PTW checklist revised.','closed',$4)`,[tenantId,projAId,ago(18),techId]);
        await q(`INSERT INTO safety_incidents (tenant_id,project_id,incident_type,severity,incident_date,location,description,status,reported_by) VALUES ($1,$2,'near_miss','minor',$3,'Chainage 0+800','Excavator too close to shoulder — near-miss with vehicle.','investigating',$4)`,[tenantId,projCId,ago(3),engineerId]);
        log.push('Safety incidents created');

        // Fleet
        const ifv = (type,reg,make,model,yr,proj,ins,rt,status) =>
          q(`INSERT INTO fleet_vehicles (tenant_id,vehicle_type,registration_number,make,model,year,assigned_project_id,insurance_expiry,roadtax_expiry,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[tenantId,type,reg,make,model,yr,proj,ins,rt,status]);
        await ifv('truck','WA1234B','Isuzu','NPS 75',2021,projAId,fwd(180),fwd(90),'active');
        await ifv('lorry','WB5678C','Hino','WU300',2020,projAId,fwd(240),fwd(120),'active');
        await ifv('machinery','EX-001','Komatsu','PC200',2019,projAId,fwd(60),null,'active');
        await ifv('machinery','EX-002','Caterpillar','320',2022,projCId,fwd(300),null,'active');
        await ifv('machinery','GD-001','Caterpillar','120K Grader',2021,projCId,fwd(150),null,'active');
        await ifv('car','WC9012D','Toyota','Hilux',2023,projAId,fwd(330),fwd(330),'active');
        await ifv('car','WD3456E','Toyota','Hilux',2022,projBId,fwd(45),fwd(45),'active');
        await ifv('truck','WE7890F','Isuzu','ELF 250',2018,null,ago(15),ago(10),'maintenance');
        log.push('Fleet created');

        // Inventory
        const iitem = (name,type,unit,qty,threshold,cost,location) =>
          q(`INSERT INTO inventory_items (tenant_id,name,item_type,unit,quantity,low_stock_threshold,unit_cost,location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[tenantId,name,type,unit,qty,threshold,cost,location]);
        await iitem('OPC Cement (50kg)','consumable','bag',420,100,24.50,'Store A - Gombak');
        await iitem('T25 Rebar (12m)','consumable','tonne',38,8,3350,'Store A - Gombak');
        await iitem('Safety Helmet (white)','returnable','unit',65,10,18,'Safety Store');
        await iitem('Safety Harness Full Body','returnable','unit',30,5,185,'Safety Store');
        await iitem('Formwork Plywood 18mm','returnable','sheet',210,30,42,'Store A - Gombak');
        await iitem('Scaffolding Pipe (6m)','returnable','piece',850,50,28,'Store A - Gombak');
        await iitem('Generator Set 20kVA','returnable','unit',3,1,8500,'Equipment Store');
        await iitem('Diesel (storage)','consumable','litre',2400,500,3.85,'Fuel Store');
        await iitem('Asphalt Mix (hot)','consumable','tonne',180,50,185,'Store C - FT012');
        log.push('Inventory created');

        // CRM Leads
        const ilead = (company,contact,email,ptype,val,source,status) =>
          q(`INSERT INTO crm_leads (tenant_id,company_name,contact_person,email,project_type,estimated_value,source,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[tenantId,company,contact,email,ptype,val,source,status,directorId]);
        await ilead('Perdana Properties Bhd','Encik Farouk','farouk@perdana.com','22-storey serviced apartment, Setapak',35000000,'referral','qualified');
        await ilead('Duta Land Development','Ms. Vivien','vivien@dutaland.com','Industrial park, 40-acre, Semenyih',85000000,'networking','tender_submitted');
        await ilead('Perbadanan PR1MA','En. Hazwan','hazwan@prima.gov.my','Affordable housing 500 units, Rawang',42000000,'government','qualified');
        await ilead('KL Metro Holdings','Dato Syed','syed@klmetro.com','Commercial tower 25-storey, Bangsar',78000000,'direct','contacted');
        await ilead('Amanah Raya Developers','Pn. Halimah','halimah@amanah.com','Mixed dev — retail + SOHO',52000000,'referral','won');
        await ilead('Sime Darby Property','Cik Nurul','nurul@simeproperty.com','Township roads, Nilai',18500000,'networking','lost');
        log.push('CRM leads created');

        await q('COMMIT');
        res.json({ success: true, log });
      } catch(err) {
        await q('ROLLBACK').catch(()=>{});
        client.release();
        throw err;
      }
      client.release();
    } catch(err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

module.exports = router;
