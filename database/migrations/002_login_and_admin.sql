-- Migration: Login (admin + staff username/password), Assign branch
-- Run after 001_multi_branch_payment_udhaar.sql. Safe to run (additive).

-- 1. Admin users (one row per admin login)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default admin (username: admin, password: admin123) is created on first login from the app.

-- 2. Staff: add username (unique) and password_hash for login
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Backfill username for existing staff (full id without dashes = unique per staff)
UPDATE staff_members
SET username = 'staff_' || REPLACE(id::text, '-', '')
WHERE username IS NULL AND id IS NOT NULL;

-- Staff password_hash remains NULL until set by admin (Assign Branch screen).
-- App accepts default password 'staff123' when password_hash is NULL for backward compatibility.

CREATE INDEX IF NOT EXISTS idx_staff_members_username ON staff_members(username);

-- RLS for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for admin_users" ON admin_users FOR ALL USING (true);
