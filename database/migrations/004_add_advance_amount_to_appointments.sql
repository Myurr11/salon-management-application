-- Add advance_amount column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10, 2) DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_advance_amount ON appointments(advance_amount);
