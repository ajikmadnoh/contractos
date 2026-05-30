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

module.exports = router;
