const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const projectRoutes = require('./projects.routes');
const invoiceRoutes = require('./invoices.routes');
const hrRoutes = require('./hr.routes');

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/hr', hrRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'ContractOS',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
