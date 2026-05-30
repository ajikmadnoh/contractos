const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const automation = require('../services/automationService');

// GET /automation/status — last run time for every job
router.get('/status', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const rows = await automation.getAutomationStatus();
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /automation/run-aging — manual aging sweep (scoped to caller's tenant)
router.post('/run-aging', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const result = await automation.runAging(req.user.tenant_id);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /automation/run-escalation — manually trigger weekly cert + invoice escalation
router.post('/run-escalation', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const [certs, invoices] = await Promise.all([
      automation.runWeeklyEscalation(req.user.tenant_id),
      automation.runWeeklyInvoiceEscalation(req.user.tenant_id),
    ]);
    res.json({ certsEscalated: certs.escalated, invoicesEscalated: invoices.escalated });
  } catch (err) { next(err); }
});

// POST /automation/run-milestone-check — manually trigger milestone overdue check
router.post('/run-milestone-check', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.PM), async (req, res, next) => {
  try {
    const result = await automation.runMilestoneOverdueCheck(req.user.tenant_id);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /automation/run-daily-sweep — run all daily jobs at once (admin use)
router.post('/run-daily-sweep', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN), async (req, res, next) => {
  try {
    const result = await automation.runDailySweep();
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
