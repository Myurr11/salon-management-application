-- Add description column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS description TEXT;
