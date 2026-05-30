require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS — allow frontend to talk to backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (diary photos, tender sources). Filenames are UUIDs,
// so they're effectively unguessable; helmet's CORP is relaxed for cross-origin <img>.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

// Attach db helpers to every request so routes can use req.db.query()
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Global rate limiter
app.use('/api', apiLimiter);

// All API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ContractOS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Daily automation sweep: aging, escalations (cert + invoice), milestone overdue check.
// Runs ~5s after boot then every 24h. Each sub-job has its own idempotency guard so
// running daily is safe even though some jobs only act every 7 days.
// Disable entirely with AGING_JOB=off.
if (process.env.AGING_JOB !== 'off') {
  const { runDailySweep } = require('./services/automationService');
  const sweep = () => runDailySweep().catch(e => console.error('[sweep] daily sweep failed:', e.message));
  setTimeout(sweep, 5000);
  setInterval(sweep, 24 * 60 * 60 * 1000).unref();
}

module.exports = app;
