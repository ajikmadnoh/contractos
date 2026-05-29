const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { ROLES, SUBSCRIPTION_TIERS } = require('../config/constants');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, companyName } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();
    const tenantId = uuidv4();
    const userId = uuidv4();

    await query('BEGIN');

    await query(
      `INSERT INTO tenants (id, company_name, subscription_tier, change_order_threshold)
       VALUES ($1, $2, $3, $4)`,
      [tenantId, companyName, SUBSCRIPTION_TIERS.FREE, 10000]
    );

    await query(
      `INSERT INTO users (id, tenant_id, name, email, password_hash, role, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, tenantId, name, email, passwordHash, ROLES.DIRECTOR, verificationToken]
    );

    await query('COMMIT');

    // TODO: Send verification email via AWS SES

    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify your account.',
    });
  } catch (err) {
    await query('ROLLBACK');
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await query(
      `SELECT u.*, t.subscription_tier, t.company_name
       FROM users u JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.email_verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in.' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Your account has been deactivated. Contact your administrator.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      await query(
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
        [user.id]
      );
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await query(
      'UPDATE users SET failed_login_attempts = 0, last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        companyName: user.company_name,
        subscriptionTier: user.subscription_tier,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token is required.' });

    const result = await query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 3600000);

    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
      [resetToken, resetExpiry, email]
    );

    // Always return success to prevent email enumeration
    // TODO: Send reset email via AWS SES
    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    const result = await query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, result.rows[0].id]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  // JWT is stateless — client discards the token
  res.json({ message: 'Logged out successfully.' });
};

exports.getMe = async (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    tenantId: req.user.tenant_id,
    subscriptionTier: req.user.subscription_tier,
  });
};
