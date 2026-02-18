-- Migration: Multi-branch, payment modes, discount/override, customer gender, udhaar
-- Run this on existing Supabase DB to add new features. Safe to run (additive with defaults).

-- 1. Branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default branch for existing data
INSERT INTO branches (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Main Branch')
ON CONFLICT (id) DO NOTHING;

-- 2. Add branch_id to staff_members
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
UPDATE staff_members SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_members_branch_id ON staff_members(branch_id);

-- 3. Add branch_id to inventory_items (branch-level inventory)
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
UPDATE inventory_items SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);

-- 4. Add branch_id and payment fields to visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'card', 'udhaar'));
ALTER TABLE visits ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS amount_override DECIMAL(10, 2);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS override_reason TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS bill_number VARCHAR(50) UNIQUE;

UPDATE visits SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_visits_branch_id ON visits(branch_id);
CREATE INDEX IF NOT EXISTS idx_visits_payment_mode ON visits(payment_mode);

-- 5. Add branch_id to product_sales (denormalized for analytics)
ALTER TABLE product_sales ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
UPDATE product_sales ps SET branch_id = (SELECT branch_id FROM visits v WHERE v.id = ps.visit_id LIMIT 1) WHERE ps.branch_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_sales_branch_id ON product_sales(branch_id);

-- 6. Add branch_id to attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
UPDATE attendance SET branch_id = (SELECT branch_id FROM staff_members sm WHERE sm.id = attendance.staff_id LIMIT 1) WHERE branch_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_branch_id ON attendance(branch_id);

-- 7. Customer: add gender
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL);

-- 8. Inventory: cost price (selling price stays as price)
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2);
UPDATE inventory_items SET cost_price = price WHERE cost_price IS NULL AND price IS NOT NULL;

-- 9. Udhaar (credit) tracking
CREATE TABLE IF NOT EXISTS udhaar_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  outstanding_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, branch_id)
);

CREATE TABLE IF NOT EXISTS udhaar_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'payment')),
  amount DECIMAL(10, 2) NOT NULL,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_udhaar_balance_customer_branch ON udhaar_balance(customer_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_udhaar_transactions_customer ON udhaar_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_udhaar_transactions_branch ON udhaar_transactions(branch_id);

-- RLS for new tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for branches" ON branches FOR ALL USING (true);
ALTER TABLE udhaar_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for udhaar_balance" ON udhaar_balance FOR ALL USING (true);
ALTER TABLE udhaar_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for udhaar_transactions" ON udhaar_transactions FOR ALL USING (true);

-- Trigger for branches updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
