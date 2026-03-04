-- Migration: Multi-Staff Billing and Goal Setting
-- Adds support for multiple staff per visit and monthly goals

-- 1. Add monthly_goal column to staff_members table
ALTER TABLE staff_members 
ADD COLUMN IF NOT EXISTS monthly_goal DECIMAL(10, 2) DEFAULT 0;

-- 2. Create visit_staff table for many-to-many relationship between visits and staff
-- This allows multiple staff to attend a single customer visit
CREATE TABLE IF NOT EXISTS visit_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  revenue_share DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(visit_id, staff_id)
);

-- 3. Create indexes for visit_staff table
CREATE INDEX IF NOT EXISTS idx_visit_staff_visit_id ON visit_staff(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_staff_staff_id ON visit_staff(staff_id);

-- 4. Enable RLS on visit_staff
ALTER TABLE visit_staff ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policy for visit_staff
CREATE POLICY "Allow all for authenticated users" ON visit_staff
  FOR ALL USING (true);

-- 6. Add updated_at trigger for visit_staff
CREATE TRIGGER update_visit_staff_updated_at BEFORE UPDATE ON visit_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Add trigger to update staff_members updated_at when monthly_goal changes
-- (already handled by the existing trigger)

-- 8. Add comments for documentation
COMMENT ON TABLE visit_staff IS 'Links visits to multiple staff members with revenue sharing';
COMMENT ON COLUMN visit_staff.revenue_share IS 'Amount of revenue this staff member receives from the visit';
COMMENT ON COLUMN staff_members.monthly_goal IS 'Monthly revenue goal set by admin for this staff member';
