-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    org_type VARCHAR(50) NOT NULL CHECK(org_type IN ('central', 'region', 'province')),
    parent_id UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Profile (Sync with Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    org_id UUID REFERENCES organizations(id),
    role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'region', 'province')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. KPI Groups
CREATE TABLE IF NOT EXISTS kpi_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0
);

-- 4. KPI Master (Updated for complex indicator tracking)
CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES kpi_groups(id),
    code VARCHAR(50) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    parent_goal TEXT, -- Ex: '3.3 ยุติการแพร่กระจายของเอดส์...'
    kpi_type VARCHAR(50) NOT NULL CHECK(kpi_type IN ('ratio', 'percent', 'number')),
    unit TEXT, -- Ex: 'คน (ต่อประชากร 1,000 คน)'
    evaluation_direction VARCHAR(20) DEFAULT 'higher_is_better' CHECK(evaluation_direction IN ('higher_is_better', 'lower_is_better')),
    owner_org_name TEXT, -- Ex: 'กองโรคเอดส์และโรคติดต่อทางเพศสัมพันธ์'
    num_label TEXT,
    denom_label TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. KPI Targets (Target values)
CREATE TABLE IF NOT EXISTS kpi_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id),
    fiscal_year INT NOT NULL,
    quarter VARCHAR(10) CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'YEAR')),
    target_value NUMERIC, -- Can be null if TBD
    target_type VARCHAR(30) DEFAULT 'absolute', -- 'absolute', 'relative_decrease'
    base_year INT, 
    note TEXT, -- Ex: 'ลดลงร้อยละ 10 จากปีที่ผ่านมา'
    UNIQUE(kpi_id, org_id, fiscal_year, quarter)
);

-- 6. KPI Results 
CREATE TABLE IF NOT EXISTS kpi_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) NOT NULL,
    fiscal_year INT NOT NULL,
    quarter VARCHAR(10) NOT NULL CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    numerator_value NUMERIC,
    denominator_value NUMERIC,
    result_value NUMERIC,
    note TEXT, -- Ex: 'อยู่ระหว่างการจัดทำคาดการณ์ผู้ติดเชื้อ'
    data_status VARCHAR(20) DEFAULT 'draft' CHECK(data_status IN ('draft', 'published', 'pending')),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kpi_id, org_id, fiscal_year, quarter)
);


-- ==========================================
-- SEED DATA: Insert the 4 SDG goals provided
-- ==========================================

-- 1. Create KPI Group for SDG
INSERT INTO kpi_groups (id, name, sort_order) 
VALUES ('11111111-1111-1111-1111-111111111111', 'SDG Indicators', 2)
ON CONFLICT DO NOTHING;

-- 2. Insert KPIs
INSERT INTO kpis (id, group_id, code, title, parent_goal, kpi_type, unit, evaluation_direction, owner_org_name) VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', '3.3.1', 'จำนวนผู้ติดเชื้อ HIV รายใหม่ต่อประชากรที่ไม่มีการติดเชื้อ 1,000 คน', '3.3 ยุติการแพร่กระจายของเอดส์ วัณโรค มาลาเรีย และโรคเขตร้อนที่ถูกละเลย และต่อสู้กับโรคตับอักเสบ โรคติดต่อทางน้ำ และโรคติดต่ออื่นๆ ภายในปี พ.ศ. 2573', 'ratio', 'คน (ต่อประชากรที่ไม่มีการติดเชื้อ 1,000 คน)', 'lower_is_better', 'กองโรคเอดส์และโรคติดต่อทางเพศสัมพันธ์'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '3.3.2', 'อุบัติการณ์ของวัณโรคต่อประชากร 100,000 คน', '3.3 ยุติการแพร่กระจายของเอดส์ วัณโรค มาลาเรีย และโรคเขตร้อนที่ถูกละเลย และต่อสู้กับโรคตับอักเสบ โรคติดต่อทางน้ำ และโรคติดต่ออื่นๆ ภายในปี พ.ศ. 2573', 'ratio', 'อัตรา (ต่อประชากร 100,000 คน)', 'lower_is_better', 'กองวัณโรค'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', '3.3.3', 'อัตราการเกิดโรคมาลาเรียต่อประชากร 1,000 คน ต่อปี', '3.3 ยุติการแพร่กระจายของเอดส์ วัณโรค มาลาเรีย และโรคเขตร้อนที่ถูกละเลย และต่อสู้กับโรคตับอักเสบ โรคติดต่อทางน้ำ และโรคติดต่ออื่นๆ ภายในปี พ.ศ. 2573', 'ratio', 'อัตรา (ต่อประชากร 1,000 คน)', 'lower_is_better', 'กองโรคติดต่อนำโดยแมลง'),
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', '3.3.4', 'จำนวนของผู้ติดเชื้อไวรัสตับอักเสบบีต่อประชากร 100,000 คน', '3.3 ยุติการแพร่กระจายของเอดส์ วัณโรค มาลาเรีย และโรคเขตร้อนที่ถูกละเลย และต่อสู้กับโรคตับอักเสบ โรคติดต่อทางน้ำ และโรคติดต่ออื่นๆ ภายในปี พ.ศ. 2573', 'number', 'คน (ต่อประชากร 100,000 คน)', 'lower_is_better', 'กองโรคเอดส์และโรคติดต่อทางเพศสัมพันธ์')
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Targets for Year 2573 (2030) as requested (using 2573 as fiscal_year for now)
INSERT INTO kpi_targets (kpi_id, fiscal_year, quarter, target_value, target_type, note) VALUES 
('22222222-2222-2222-2222-222222222221', 2573, 'YEAR', 0.2, 'absolute', 'ข้อมูล ณ 67'),
('22222222-2222-2222-2222-222222222222', 2573, 'YEAR', 20, 'absolute', 'ข้อมูล ณ 67'),
('22222222-2222-2222-2222-222222222223', 2573, 'YEAR', 0.006, 'absolute', ''),
('22222222-2222-2222-2222-222222222224', 2573, 'YEAR', NULL, 'relative_decrease', 'ลดลงร้อยละ 10 จากปีที่ผ่านมา')
ON CONFLICT DO NOTHING;

-- 4. Create an Organization for Central Office to attach the results to
INSERT INTO organizations (id, name, org_type) VALUES 
('33333333-3333-3333-3333-333333333333', 'ส่วนกลาง (กรมควบคุมโรค)', 'central')
ON CONFLICT DO NOTHING;

-- 5. Insert Current Results (Year 2568, Quarter 1 as an example)
INSERT INTO kpi_results (kpi_id, org_id, fiscal_year, quarter, result_value, data_status, note) VALUES 
('22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333333', 2568, 'Q1', 0.13, 'published', 'ข้อมูล ณ 67'),
('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 2568, 'Q1', 146, 'published', 'ข้อมูล ณ 67'),
('22222222-2222-2222-2222-222222222223', '33333333-3333-3333-3333-333333333333', 2568, 'Q1', 0.23, 'published', ''),
('22222222-2222-2222-2222-222222222224', '33333333-3333-3333-3333-333333333333', 2568, 'Q1', NULL, 'pending', 'อยู่ระหว่างการจัดทำคาดการณ์ผู้ติดเชื้อ')
ON CONFLICT DO NOTHING;
