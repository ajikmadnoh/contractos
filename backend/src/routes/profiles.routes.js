const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM profiles WHERE tenant_id = $1 AND is_active = true';
    const params = [req.user.tenant_id];
    if (type) { params.push(type); sql += ` AND profile_type = $${params.length}`; }
    sql += ' ORDER BY company_name ASC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.PM, ROLES.QS, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { profileType, companyName, registrationNumber, contactPerson, email, phone, address, bankName, bankAccountNumber } = req.body;
    const result = await query(
      `INSERT INTO profiles (id, tenant_id, profile_type, company_name, registration_number, contact_person, email, phone, address, bank_name, bank_account_number, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [uuidv4(), req.user.tenant_id, profileType, companyName, registrationNumber, contactPerson, email, phone, address, bankName, bankAccountNumber, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { companyName, contactPerson, email, phone, address } = req.body;
    const result = await query(
      `UPDATE profiles SET company_name=COALESCE($1,company_name), contact_person=COALESCE($2,contact_person),
       email=COALESCE($3,email), phone=COALESCE($4,phone), address=COALESCE($5,address)
       WHERE id=$6 AND tenant_id=$7 RETURNING *`,
      [companyName, contactPerson, email, phone, address, req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    await query('UPDATE profiles SET is_active=false WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]);
    res.json({ message: 'Profile deactivated.' });
  } catch (err) { next(err); }
});

module.exports = router;
