const ROLES = {
  DIRECTOR: 'director',
  ADMIN: 'admin',
  PM: 'pm',
  QS: 'qs',
  FINANCE: 'finance',
  HR: 'hr',
  ENGINEER: 'engineer',
  TECHNICIAN: 'technician',
  OFFICER: 'officer',
  INTERNAL: 'internal',
  SUBCON: 'subcon',
  CLIENT: 'client',
  SUPPLIER: 'supplier',
};

const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
};

const USER_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: 3,
  [SUBSCRIPTION_TIERS.PRO]: 15,
  [SUBSCRIPTION_TIERS.BUSINESS]: 50,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: Infinity,
};

const PROJECT_STATUSES = {
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PENDING_CUSTOMER: 'pending_customer',
  PENDING_VENDOR: 'pending_vendor',
  PENDING_PAYMENT: 'pending_payment',
};

const PAYMENT_STATUSES = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  OVERDUE: 'overdue',
  PARTIALLY_PAID: 'partially_paid',
};

const CHANGE_ORDER_THRESHOLD_DEFAULT = 10000;

const SESSION_TIMEOUT_DEFAULT = 30;

module.exports = {
  ROLES,
  SUBSCRIPTION_TIERS,
  USER_LIMITS,
  PROJECT_STATUSES,
  PAYMENT_STATUSES,
  CHANGE_ORDER_THRESHOLD_DEFAULT,
  SESSION_TIMEOUT_DEFAULT,
};
