-- Migration: Add is_active column to staff_members table
-- This allows soft deletion of staff members instead of permanent deletion

-- Add is_active column with default value true
ALTER TABLE staff_members 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_staff_members_is_active ON staff_members(is_active);

-- Update existing staff members to be active
UPDATE staff_members SET is_active = true WHERE is_active IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN staff_members.is_active IS 'Soft delete flag - false means staff member has been removed';
