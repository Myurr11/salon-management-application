# Database Migrations

Run in order on your Supabase SQL editor:

1. **Base schema** (if starting fresh): run `../schema.sql` first.
2. **001_multi_branch_payment_udhaar.sql** – branches, payment modes, discount, udhaar, customer gender, etc.
3. **002_login_and_admin.sql** – login: `admin_users` table, `staff_members.username` and `staff_members.password_hash`.

**Default credentials after migrations:**

- **Admin:** First time you sign in with username `admin` and password `admin123`, the app creates the admin user. Use these or change the password later.
- **Staff:** Username is backfilled as `staff_` + first 8 chars of their ID. If `password_hash` is not set, the app accepts password `staff123` until the admin sets a password from **Admin → Assign Branch**.
