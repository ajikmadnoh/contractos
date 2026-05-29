const express = require('express');
const router = express.Router();

const authRoutes          = require('./auth.routes');
const projectRoutes       = require('./projects.routes');
const invoiceRoutes       = require('./invoices.routes');
const hrRoutes            = require('./hr.routes');
const financeRoutes       = require('./finance.routes');
const profileRoutes       = require('./profiles.routes');
const userRoutes          = require('./users.routes');
const bqRoutes            = require('./bq.routes');
const notificationRoutes  = require('./notifications.routes');

router.use('/auth',          authRoutes);
router.use('/projects',      projectRoutes);
router.use('/invoices',      invoiceRoutes);
router.use('/hr',            hrRoutes);
router.use('/finance',       financeRoutes);
router.use('/profiles',      profileRoutes);
router.use('/users',         userRoutes);
router.use('/bq',            bqRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: 'ContractOS', version: '1.0.0', timestamp: new Date().toISOString() });
});

module.exports = router;
