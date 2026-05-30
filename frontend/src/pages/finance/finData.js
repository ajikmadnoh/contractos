// Representative finance data (Malaysian construction context), ported from the
// ConstructOS design. Used as graceful fallback when the backend has no rows yet,
// and as the source for forward-looking modules (cashflow, statutory, MyInvois)
// that don't have dedicated tables. Live API data overrides these where available.

export const PAYMENT_CERTS = [
  { id: 'PC-2026-0041', code: 'PVDH-T3', period: '#14 · Apr 2026', status: 'review',    gross: 8_460_000, ret: 423_000, prevAdj: -16_720, reimb: 36_000, net: 8_037_280, due: '2026-05-23', dueText: 'Due in 3d',  client: 'Pavilion Damansara Sdn Bhd', flag: 'ai', daysOut: 14, project: 'Pavilion Damansara Heights — T3' },
  { id: 'PC-2026-0040', code: 'ISKP-2',  period: '#22 · Apr 2026', status: 'approved',  gross: 5_240_000, ret: 262_000, prevAdj: 0,        reimb: 0,      net: 4_978_000, due: '2026-05-20', dueText: 'Due tomorrow', client: 'Iskandar Waterfront Holdings', daysOut: 28, project: 'Iskandar Puteri P2' },
  { id: 'PC-2026-0039', code: 'KLCC-EB', period: '#18 · Apr 2026', status: 'paid',      gross: 2_180_000, ret: 109_000, prevAdj: 0,        reimb: 0,      net: 2_071_000, due: 'Paid 14 May', dueText: 'Paid',         client: 'DBKL · KL City Hall',  daysOut: 0,  project: 'KLCC East Carriage Bridge' },
  { id: 'PC-2026-0038', code: 'PNS-HUB', period: '#04 · Apr 2026', status: 'draft',     gross: 4_120_000, ret: 206_000, prevAdj: 0,        reimb: 14_400, net: 3_928_400, due: '2026-05-28', dueText: 'Due in 8d',    client: 'MRCB Land',            daysOut: 21, project: 'Penang Sentral Hub' },
  { id: 'PC-2026-0037', code: 'CYB-DC4', period: '#02 · Apr 2026', status: 'submitted', gross: 1_840_000, ret: 92_000,  prevAdj: 0,        reimb: 0,      net: 1_748_000, due: '2026-05-24', dueText: 'Due in 4d',    client: 'TM One',               daysOut: 17, project: 'Cyberjaya DC4' },
  { id: 'PC-2026-0036', code: 'KKM-RES', period: '#28 · Apr 2026', status: 'overdue',   gross: 980_000,   ret: 49_000,  prevAdj: 0,        reimb: 0,      net: 931_000,   due: '2026-05-13', dueText: 'Overdue 7d',   client: 'Sutera Harbour Group', daysOut: 41, project: 'KK Marina Resort' },
  { id: 'PC-2026-0035', code: 'PUTJ-OB', period: '#03 · Apr 2026', status: 'submitted', gross: 1_440_000, ret: 72_000,  prevAdj: 0,        reimb: 0,      net: 1_368_000, due: '2026-05-26', dueText: 'Due in 6d',    client: 'Putrajaya Holdings',   daysOut: 12, project: 'Putrajaya Boulevard' },
  { id: 'PC-2026-0034', code: 'PVDH-T3', period: '#13 · Mar 2026', status: 'paid',      gross: 7_980_000, ret: 399_000, prevAdj: 0,        reimb: 0,      net: 7_581_000, due: 'Paid 24 Apr', dueText: 'Paid',         client: 'Pavilion Damansara Sdn Bhd', daysOut: 0, project: 'Pavilion Damansara Heights — T3' },
];

export const AR_MATRIX = [
  { code: 'PVDH-T3', client: 'Pavilion Damansara Sdn Bhd', current: 8_037_000, b1_30: 4_820_000, b31_60: 1_820_000, b61_90: 0, b90: 0, dso: 38, terms: 28, riskScore: 72 },
  { code: 'ISKP-2',  client: 'Iskandar Waterfront Holdings', current: 4_978_000, b1_30: 2_100_000, b31_60: 980_000, b61_90: 0, b90: 0, dso: 31, terms: 30, riskScore: 84 },
  { code: 'PNS-HUB', client: 'MRCB Land', current: 3_928_000, b1_30: 1_840_000, b31_60: 620_000, b61_90: 0, b90: 0, dso: 26, terms: 30, riskScore: 91 },
  { code: 'CYB-DC4', client: 'TM One', current: 1_748_000, b1_30: 980_000, b31_60: 0, b61_90: 0, b90: 0, dso: 22, terms: 30, riskScore: 95 },
  { code: 'KLCC-EB', client: 'DBKL · KL City Hall', current: 0, b1_30: 1_240_000, b31_60: 1_120_000, b61_90: 1_240_000, b90: 480_000, dso: 78, terms: 30, riskScore: 38 },
  { code: 'PUTJ-OB', client: 'Putrajaya Holdings', current: 1_368_000, b1_30: 0, b31_60: 420_000, b61_90: 380_000, b90: 0, dso: 44, terms: 30, riskScore: 64 },
  { code: 'KKM-RES', client: 'Sutera Harbour Group', current: 0, b1_30: 180_000, b31_60: 280_000, b61_90: 320_000, b90: 931_000, dso: 96, terms: 30, riskScore: 22 },
];

export const RETENTIONS = [
  { code: 'PVDH-T3', project: 'Pavilion Damansara T3',  contract: 184_500_000, held: 5_618_000, cap: 9_225_000, halfRelease: '2026-10-15', finalRelease: '2027-09-15', dlpMonths: 12, phase: 'building' },
  { code: 'ISKP-2',  project: 'Iskandar Puteri P2',     contract: 96_200_000,  held: 3_592_000, cap: 4_810_000, halfRelease: '2026-06-30', finalRelease: '2027-06-30', dlpMonths: 12, phase: 'building' },
  { code: 'KLCC-EB', project: 'KLCC East Carriage',     contract: 47_900_000,  held: 1_482_000, cap: 2_395_000, halfRelease: '2026-08-04', finalRelease: '2027-08-04', dlpMonths: 12, phase: 'pc-soon' },
  { code: 'PNS-HUB', project: 'Penang Sentral Hub',     contract: 218_400_000, held: 2_096_000, cap: 10_920_000, halfRelease: '2027-12-20', finalRelease: '2028-12-20', dlpMonths: 12, phase: 'early' },
  { code: 'PUTJ-OB', project: 'Putrajaya Boulevard',    contract: 72_800_000,  held: 420_000,   cap: 3_640_000, halfRelease: '2027-08-10', finalRelease: '2028-08-10', dlpMonths: 12, phase: 'early' },
  { code: 'KKM-RES', project: 'KK Marina Resort',       contract: 56_300_000,  held: 1_410_000, cap: 2_815_000, halfRelease: '2026-05-30', finalRelease: '2027-05-30', dlpMonths: 12, phase: 'releasing' },
  { code: 'CYB-DC4', project: 'Cyberjaya DC4',          contract: 138_700_000, held: 760_000,   cap: 6_935_000, halfRelease: '2027-04-28', finalRelease: '2028-04-28', dlpMonths: 12, phase: 'early' },
];

export const BONDS = [
  { code: 'PVDH-T3', kind: 'Performance Bond', issuer: 'AmBank Islamic',  amount: 9_225_000,   expires: '2026-12-15', cover: '5% contract',   state: 'ok' },
  { code: 'PVDH-T3', kind: 'CAR Insurance',    issuer: 'Allianz General', amount: 184_500_000, expires: '2026-09-15', cover: '100% contract', state: 'ok' },
  { code: 'ISKP-2',  kind: 'Performance Bond', issuer: 'Maybank',         amount: 4_810_000,   expires: '2026-09-30', cover: '5% contract',   state: 'expiring' },
  { code: 'KLCC-EB', kind: 'Performance Bond', issuer: 'CIMB Bank',       amount: 2_395_000,   expires: '2026-11-04', cover: '5% contract',   state: 'ok' },
  { code: 'PNS-HUB', kind: 'Performance Bond', issuer: 'HSBC Amanah',     amount: 10_920_000,  expires: '2028-03-20', cover: '5% contract',   state: 'ok' },
  { code: 'CYB-DC4', kind: 'Performance Bond', issuer: 'RHB Bank',        amount: 6_935_000,   expires: '2027-07-28', cover: '5% contract',   state: 'ok' },
  { code: 'KKM-RES', kind: 'DLP Bond',         issuer: 'Maybank',         amount: 1_410_000,   expires: '2027-05-30', cover: '2.5% contract', state: 'ok' },
];

export const CASHFLOW_13W = [
  { wk: 'W20', date: 'May 12', inCert: 8.4, inInv: 6.2, out: 5.1, conf: 'actual' },
  { wk: 'W21', date: 'May 19', inCert: 5.2, inInv: 8.9, out: 6.4, conf: 'actual' },
  { wk: 'W22', date: 'May 26', inCert: 7.8, inInv: 4.1, out: 5.8, conf: 'committed' },
  { wk: 'W23', date: 'Jun 02', inCert: 4.2, inInv: 7.6, out: 6.2, conf: 'committed' },
  { wk: 'W24', date: 'Jun 09', inCert: 9.1, inInv: 5.4, out: 5.9, conf: 'committed' },
  { wk: 'W25', date: 'Jun 16', inCert: 6.4, inInv: 9.2, out: 6.8, conf: 'projected' },
  { wk: 'W26', date: 'Jun 23', inCert: 7.2, inInv: 6.8, out: 5.4, conf: 'projected' },
  { wk: 'W27', date: 'Jun 30', inCert: 8.6, inInv: 7.4, out: 6.1, conf: 'projected' },
  { wk: 'W28', date: 'Jul 07', inCert: 5.4, inInv: 8.2, out: 5.7, conf: 'projected' },
  { wk: 'W29', date: 'Jul 14', inCert: 7.8, inInv: 5.9, out: 6.4, conf: 'projected' },
  { wk: 'W30', date: 'Jul 21', inCert: 9.4, inInv: 7.1, out: 6.9, conf: 'projected' },
  { wk: 'W31', date: 'Jul 28', inCert: 6.8, inInv: 8.4, out: 5.8, conf: 'projected' },
  { wk: 'W32', date: 'Aug 04', inCert: 8.2, inInv: 6.5, out: 6.2, conf: 'projected' },
];
export const CASH_BALANCE_START = 18.4;

export const MYINVOIS_BUCKETS = [
  { kind: 'Validated', count: 184, amount: 38_420_000, color: 'var(--good)' },
  { kind: 'Submitted', count: 24,  amount: 6_240_000,  color: 'var(--info)' },
  { kind: 'Pending',   count: 12,  amount: 3_180_000,  color: 'var(--warn)' },
  { kind: 'Rejected',  count: 3,   amount: 412_000,    color: 'var(--danger)' },
  { kind: 'Cancelled', count: 5,   amount: 1_240_000,  color: 'var(--magenta)' },
];

export const MYINVOIS_RECENT = [
  { uuid: 'UUID-A4F9-2026-04129', irn: 'PB-2026-04129', kind: 'Invoice',     to: 'Pavilion Damansara Sdn Bhd', amount: 8_037_280, time: '11:24', status: 'validated', tin: 'C20881234560' },
  { uuid: 'UUID-A4F8-2026-04128', irn: 'PB-2026-04128', kind: 'Invoice',     to: 'TM One',                     amount: 1_748_000, time: '10:58', status: 'validated', tin: 'C18820221050' },
  { uuid: 'UUID-A4F7-2026-04127', irn: 'PB-2026-04127', kind: 'Credit Note', to: 'MRCB Land',                  amount: -184_000,  time: '10:42', status: 'submitted', tin: 'C21884412309' },
  { uuid: 'UUID-A4F6-2026-04126', irn: 'PB-2026-04126', kind: 'Invoice',     to: 'Putrajaya Holdings',         amount: 1_368_000, time: '09:38', status: 'rejected',  tin: 'C19872110984', err: 'TIN mismatch — verify against MyTax registry' },
  { uuid: 'UUID-A4F5-2026-04125', irn: 'PB-2026-04125', kind: 'Invoice',     to: 'Sutera Harbour Group',       amount: 931_000,   time: '08:51', status: 'pending',   tin: 'C20019988231' },
  { uuid: 'UUID-A4F4-2026-04124', irn: 'PB-2026-04124', kind: 'Debit Note',  to: 'DBKL · KL City Hall',        amount: 38_400,    time: '08:14', status: 'validated', tin: 'C18712345001' },
];

export const STATUTORY = [
  { code: 'SST',       label: 'SST 8% (Service Tax)',      period: 'Apr 2026', due: '2026-05-30', amount: 1_420_000, status: 'due',  ref: 'C20881234560' },
  { code: 'CIDB Levy', label: 'CIDB Levy 0.125%',          period: 'Q1 2026',  due: '2026-05-31', amount: 184_000,   status: 'due',  ref: 'G7-PB-1500-95' },
  { code: 'EPF',       label: 'EPF (KWSP) — 13% employer', period: 'Apr 2026', due: '2026-05-15', amount: 412_000,   status: 'paid', ref: 'KWSP 4128-991' },
  { code: 'SOCSO',     label: 'SOCSO (PERKESO)',           period: 'Apr 2026', due: '2026-05-15', amount: 38_400,    status: 'paid', ref: 'PERKESO 22841' },
  { code: 'EIS',       label: 'EIS (Employment Insurance)',period: 'Apr 2026', due: '2026-05-15', amount: 9_600,     status: 'paid', ref: 'EIS 22841' },
  { code: 'PCB',       label: 'PCB (MTD) Income Tax',      period: 'Apr 2026', due: '2026-05-15', amount: 184_200,   status: 'paid', ref: 'LHDN 7184-021' },
  { code: 'HRDF',      label: 'HRD Corp Levy 1%',          period: 'Apr 2026', due: '2026-05-15', amount: 32_400,    status: 'paid', ref: 'HRDF 1241' },
];
