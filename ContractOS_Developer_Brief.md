# ContractOS — Developer Brief
**Version 1.0 | Confidential | For Hiring Purposes**

---

## 1. What We Are Building

**ContractOS** is an Enterprise SaaS (Software as a Service) platform built specifically for the Malaysian construction industry.

It is a single web-based system that replaces the many disconnected tools that construction companies currently use — spreadsheets, WhatsApp, physical files, and separate accounting software — with one unified platform.

ContractOS will be available as:
- A **web application** (accessed via browser on desktop and laptop)
- A **mobile application** (installable on Android and iOS phones — built as a Progressive Web App / PWA)

**Target users:** Malaysian construction companies — from small contractors to large main contractors managing multiple projects and subcontractors.

---

## 2. The Problem We Are Solving

Malaysian construction companies currently manage their business across too many disconnected tools:

| Problem | What They Use Now | What ContractOS Replaces It With |
|---|---|---|
| Project tracking | WhatsApp groups + Excel | Projects module with milestones & tasks |
| Invoicing & claims | Manual Word documents | Finance & Invoicing module |
| HR & attendance | Physical punch cards or Excel | HR module with clock in/out |
| Bill of Quantities (BQ) | Excel templates | Tender/BQ module with AI auto-fill |
| Site safety records | Paper checklists | Safety module (DOSH/OSHA compliant) |
| Document management | USB drives & email | Document Manager with version control |
| Subcontractor management | Phone calls & WhatsApp | Subcontractor portal with claim submission |

---

## 3. Platform Identity

| Property | Value |
|---|---|
| **Product Name** | ContractOS |
| **Product Type** | Enterprise SaaS — Web + Mobile PWA |
| **Industry** | Construction & Contract Management |
| **Primary Market** | Malaysia |
| **Primary Language** | English (with Bahasa Malaysia support) |
| **Currency** | MYR primary — multi-currency supported |
| **Tax Compliance** | Malaysian SST / GST (optional per invoice) |
| **Legal Compliance** | PDPA 2010, ISO 27001, SOC 2 |
| **Design Theme** | Dark & Professional (Navy, Black, Grey, Gold) |

---

## 4. Subscription Model

ContractOS operates on a **Freemium model** with 4 tiers:

| Tier | Users | Key Features |
|---|---|---|
| **Free** | Up to 3 | Basic dashboard, limited projects, basic HR & documents |
| **Pro** | Up to 15 | Full features, all modules except AI and multi-subsidiary |
| **Business** | Up to 50 | Full features + AI BQ auto-fill + API access |
| **Enterprise** | Unlimited | Multi-subsidiary + custom email domain + dedicated support |

- **Billing cycles:** Monthly and Yearly (yearly gets ~20% discount)
- **Trial:** 5-day free trial on all paid features
- **Payment gateway:** Stripe — FPX (Malaysian online banking) + Credit/Debit Card
- **Auto-renewal:** On by default, user can disable

---

## 5. The 16 Modules to Build

| # | Module | Priority | Description |
|---|---|---|---|
| 1 | **Landing Page** | Critical | Public marketing page — bilingual EN/BM |
| 2 | **Login & Auth** | Critical | Email/password, email verification, optional 2FA, setup wizard |
| 3 | **Dashboard** | Critical | Role-based views, KPI cards, charts, alerts |
| 4 | **Finance** | Critical — Build First | Claims management, payment certificates, retention tracking |
| 5 | **Invoicing** | Critical | Create/send invoices, multi-currency, SST/GST toggle, payment tracking |
| 6 | **Projects** | Critical | Project lifecycle, milestones, tasks, Gantt chart, RFI, Submittals, Change Orders |
| 7 | **HR** | High | Clock in/out, attendance, leave management, payroll, overtime, letters |
| 8 | **Tender / BQ** | High | Bill of Quantities builder, templates, version history, AI auto-fill (Phase 2) |
| 9 | **Inventory** | High | Stock tracking, asset borrowing, low stock alerts, purchase orders |
| 10 | **Document Manager** | High | Drag & drop, version history, digital signatures, auto-fill from profiles |
| 11 | **Profiles** | High | Subcon, Client, Supplier, Main Contractor profiles with hierarchy |
| 12 | **User Management** | Critical | 13 user roles, invite, deactivate, role-based permissions |
| 13 | **Settings** | High | Session, API keys, audit log, data export, billing |
| 14 | **Subcontractor Portal** | High | Segregated access for subcons — claims, progress, RFI, documents |
| 15 | **Mobile PWA** | High | Installable app — Dashboard, HR, Projects, Finance, Inventory |
| 16 | **Market Rates** | Medium | Live Malaysian construction rates (CIDB/KPKT) — manual entry at MVP |
| 17 | **Safety Module** | Medium | DOSH + OSHA compliance, incidents, inspections, certifications |
| 18 | **CRM Module** | Medium | Leads, pipeline, bid tracking, convert lead to project |
| 19 | **Fleet Management** | Medium | Vehicle registry, maintenance, fuel, utilisation, cost tracking |
| 20 | **Reports & Analytics** | Medium | PDF/Excel/CSV export, scheduled delivery, all modules covered |
| 21 | **Notifications** | High | In-app, email (AWS SES), WhatsApp Business API (Phase 2) |
| 22 | **Integrations** | Phase 2 | SQL Account, QuickBooks, Xero, DocuSign, MyEG, Google/Outlook Calendar |

---

## 6. User Roles (13 Roles)

The platform has strict role-based access. Each role can only see and do what is relevant to their job.

| Role | Access Level |
|---|---|
| Director | Full access to everything |
| Admin | Full access except audit logs |
| Project Manager (PM) | Full project, finance, BQ, profiles |
| QS / Estimator | BQ, finance, market rates |
| Finance / Accountant | Finance, invoicing, payroll |
| HR | HR module only |
| Engineer | Projects (view), inventory, documents |
| Technician | Projects (own tasks), inventory |
| Officer | Basic access — site operations |
| Internal | General staff — limited access |
| Subcontractor | Segregated portal — own scope only |
| Client | View invoices, project status only |
| Supplier | View purchase orders only |

---

## 7. Tech Stack (Required)

This is the technology the team must build with. Deviation requires approval from the Product Owner.

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js + Tailwind CSS | All web screens, dashboard, module UIs |
| Backend | Node.js + Express.js | API server, business logic, data processing |
| Database | AWS RDS — PostgreSQL | Primary database |
| File Storage | AWS S3 | Documents, images, uploads |
| Authentication | AWS Cognito | Login, signup, 2FA, session management |
| Email | AWS SES | All system emails |
| Payments | Stripe | Subscription billing, FPX, card |
| Mobile | PWA (React) | Installable mobile app — same codebase |
| Hosting | AWS EC2 + CloudFront | Web server + CDN |
| Monitoring | AWS CloudWatch | Performance and security monitoring |
| CI/CD | GitHub Actions | Automated testing and deployment |
| AI / OCR | AWS Textract + Bedrock | BQ scanning and AI auto-fill (Phase 2) |
| Notifications | AWS SES + Meta WhatsApp API | Email + WhatsApp alerts |

---

## 8. Infrastructure & Hosting

| Item | Value |
|---|---|
| Cloud Provider | AWS (Amazon Web Services) |
| Primary Server | AWS Asia Pacific — Kuala Lumpur (ap-southeast-3) |
| Backup Server | AWS Global (Singapore or Ireland) |
| Domain | contractos.my |
| SSL | HTTPS enforced — managed via AWS Certificate Manager |
| Uptime Target | 99.9% SLA |
| Disaster Recovery | Automated daily backups — AWS RDS point-in-time recovery |
| Scalability | Auto-scaling enabled |

---

## 9. Security Requirements (Non-Negotiable)

| Requirement | Standard | Detail |
|---|---|---|
| Data encryption in transit | ISO 27001 | HTTPS/SSL enforced across all pages |
| Data encryption at rest | ISO 27001 | Server-side encryption on AWS |
| Role-based access control | ISO 27001 | Strict permissions per user role |
| Audit logs | SOC 2 | Full log of every user action — admin access only |
| Session management | ISO 27001 | 30-min timeout default — admin adjustable |
| 2FA | ISO 27001 | Optional per user |
| API security | SOC 2 | API key authentication + rate limiting |
| Data breach detection | PDPA 2010 | Auto-detect, alert admin, notify affected users |
| Data residency | PDPA 2010 | Primary data stored in Malaysia (AWS KL) |
| Data retention | PDPA 2010 | 7 years after account closure |

---

## 10. Build Plan — 6 Sprints × 2 Weeks

| Sprint | Weeks | Goal | Key Deliverables |
|---|---|---|---|
| Sprint 1 | 1–2 | Foundation & Infrastructure | AWS setup, design system, landing page, login/signup, user roles |
| Sprint 2 | 3–4 | Dashboard & Profiles | Role-based dashboard, KPI cards, profiles, user management, notifications |
| Sprint 3 | 5–6 | Finance & Invoicing | Invoice creation, claims, payment certs, Stripe billing live |
| Sprint 4 | 7–8 | Projects & HR | Projects, milestones, Gantt, tasks, clock in/out, leave, payroll |
| Sprint 5 | 9–10 | BQ, Inventory, Documents, Settings | BQ builder, inventory, document manager, audit log, data export |
| Sprint 6 | 11–12 | Remaining Modules + QA + Launch | CRM, Safety, Fleet, Mobile PWA, RFI, Change Orders, full QA, pilot launch |

**Target MVP Timeline:** 3 months (Note: Buffer of 1–2 months is recommended for realistic delivery)

---

## 11. Team Structure

| Role | Arrangement | Responsibility |
|---|---|---|
| **Tech Lead** | Full-time | System architecture, AWS setup, backend, code review, technical decisions |
| **Senior Frontend Developer** | Freelance per sprint | All web screens, dashboard, PWA |
| **UI/UX Designer** | Freelance per design package | All screen designs in Figma before build |
| **QA Tester** | Freelance per sprint | Testing, bug reports, regression checks |
| **Product Owner (Founder)** | Full-time | Decisions, approvals, business direction — NOT coding |

---

## 12. Phase 2 Features (After MVP — Not in Scope for Now)

These features are defined but will be built after the MVP is live and generating revenue:

- AI BQ auto-fill from past projects (AWS Bedrock)
- OCR scanning of physical BQ documents (AWS Textract)
- Live CIDB/KPKT market rate API feed
- WhatsApp Business API notifications
- Accounting integrations (SQL Account, QuickBooks, Xero)
- E-signature integrations (DocuSign, MyEG)
- Calendar sync (Google, Outlook)
- Full offline mode for mobile PWA
- Advanced analytics and custom report scheduling
- Social login (Google SSO)

---

## 13. What We Expect from the Tech Lead

- Lead all technical decisions
- Set up and manage AWS infrastructure from Day 1
- Write clean, documented, maintainable code
- Review all code from freelance developers before it is merged
- Communicate technical decisions in plain language to the Product Owner
- Manage GitHub repository and CI/CD pipeline
- Flag risks early — do not wait until the sprint ends

---

## 14. Contact

**Product Owner:** [Your Name]
**Email:** [your@contractos.my]
**Company:** ContractOS Sdn Bhd

*This document is confidential. Do not share outside of the hiring process.*
