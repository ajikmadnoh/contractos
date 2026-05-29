const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, SUBSCRIPTION_TIERS, USER_LIMITS } = require('../config/constants');
const { query } = require('../config/database');

// GET /users — all users in this tenant
router.get('/', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.HR), async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, is_active, email_verified, last_login_at, created_at FROM users WHERE tenant_id=$1 ORDER BY name ASC',
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /users/invite
router.post('/invite', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { name, email, role } = req.body;

    // Check user limit for subscription tier
    const countResult = await query('SELECT COUNT(*) FROM users WHERE tenant_id=$1 AND is_active=true', [req.user.tenant_id]);
    const currentCount = parseInt(countResult.rows[0].count);
    const limit = USER_LIMITS[req.user.subscription_tier];
    if (currentCount >= limit) {
      return res.status(403).json({ error: `Your ${req.user.subscription_tier} plan allows up to ${limit} users. Please upgrade to add more.` });
    }

    const existing = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'A user with this email already exists.' });

    const tempPassword = uuidv4().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const verificationToken = uuidv4();

    await query(
      `INSERT INTO users (id, tenant_id, name, email, password_hash, role, email_verification_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uuidv4(), req.user.tenant_id, name, email, passwordHash, role, verificationToken]
    );

    // TODO: Send invite email via AWS SES with verificationToken and tempPassword
    res.status(201).json({ message: `Invitation sent to ${email}.` });
  } catch (err) { next(err); }
});

// PATCH /users/:id/role
router.patch('/:id/role', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    const result = await query(
      'UPDATE users SET role=$1 WHERE id=$2 AND tenant_id=$3 AND id != $4 RETURNING id, name, role',
      [role, req.params.id, req.user.tenant_id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found or cannot change your own role.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /users/:id/deactivate
router.patch('/:id/deactivate', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate yourself.' });
    const result = await query(
      'UPDATE users SET is_active=false WHERE id=$1 AND tenant_id=$2 RETURNING id, name',
      [req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: `${result.rows[0].name} has been deactivated.` });
  } catch (err) { next(err); }
});

module.exports = router;
