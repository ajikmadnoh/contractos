-- ContractOS Migration 003 — BQ, Documents, Safety, CRM, Fleet, RFI

-- ============================================================
-- TENDER / BQ
-- ============================================================
CREATE TABLE bq_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','archived')),
  total_amount NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bq_tenant_id ON bq_documents(tenant_id);

CREATE TRIGGER trigger_bq_updated_at
  BEFORE UPDATE ON bq_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE bq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bq_id UUID NOT NULL REFERENCES bq_documents(id) ON DELETE CASCADE,
  item_code VARCHAR(50),
  description TEXT NOT NULL,
  unit VARCHAR(50),
  quantity NUMERIC(12,3),
  unit_rate NUMERIC(12,2),
  amount NUMERIC(15,2),
  section VARCHAR(255),
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_bq_items_bq_id ON bq_items(bq_id);

-- Market Rates
CREATE TABLE market_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  rate NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'MYR',
  location VARCHAR(255),
  source VARCHAR(100) DEFAULT 'admin',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_rates_tenant_id ON market_rates(tenant_id);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size_bytes BIGINT,
  version INTEGER NOT NULL DEFAULT 1,
  category VARCHAR(100),
  signed BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);

-- ============================================================
-- SAFETY
-- ============================================================
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  incident_type VARCHAR(30) NOT NULL CHECK (incident_type IN ('accident','near_miss','dangerous_occurrence','occupational_disease')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor','moderate','serious','fatal')),
  incident_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  injured_person VARCHAR(255),
  investigation_notes TEXT,
  corrective_actions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','closed')),
  reported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safety_incidents_tenant_id ON safety_incidents(tenant_id);

CREATE TABLE safety_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_name VARCHAR(255) NOT NULL,
  cert_number VARCHAR(100),
  issued_date DATE,
  expiry_date DATE,
  issuing_body VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring_soon','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safety_certs_tenant_id ON safety_certifications(tenant_id);
CREATE INDEX idx_safety_certs_user_id ON safety_certifications(user_id);
CREATE INDEX idx_safety_certs_expiry ON safety_certifications(expiry_date);

-- ============================================================
-- CRM
-- ============================================================
CREATE TABLE crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  project_type VARCHAR(255),
  estimated_value NUMERIC(15,2),
  source VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','tender_submitted','won','lost','on_hold')),
  converted_project_id UUID REFERENCES projects(id),
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_leads_tenant_id ON crm_leads(tenant_id);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);

-- ============================================================
-- FLEET
-- ============================================================
CREATE TABLE fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('car','truck','lorry','machinery','equipment','other')),
  registration_number VARCHAR(50),
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  capacity VARCHAR(100),
  assigned_project_id UUID REFERENCES projects(id),
  insurance_expiry DATE,
  roadtax_expiry DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fleet_tenant_id ON fleet_vehicles(tenant_id);

CREATE TABLE fleet_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(100) NOT NULL,
  scheduled_date DATE,
  completed_date DATE,
  cost NUMERIC(12,2),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RFI & SUBMITTALS
-- ============================================================
CREATE TABLE rfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfi_number VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  urgency VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low','normal','urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','under_review','responded','closed')),
  response TEXT,
  response_date DATE,
  due_date DATE,
  raised_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rfis_project_id ON rfis(project_id);
CREATE INDEX idx_rfis_tenant_id ON rfis(tenant_id);

-- Change Orders
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  co_number VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reason TEXT,
  cost_impact NUMERIC(15,2),
  time_impact_days INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','rejected','implemented')),
  auto_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_orders_project_id ON change_orders(project_id);
CREATE INDEX idx_change_orders_tenant_id ON change_orders(tenant_id);
