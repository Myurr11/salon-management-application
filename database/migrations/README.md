# Database Migrations

Run in order on your Supabase SQL editor:

1. **Base schema** (if starting fresh): run `../schema.sql` first.
2. **Feature migration**: run `001_multi_branch_payment_udhaar.sql` to add:
   - Branches table and branch_id on staff, inventory, visits, product_sales, attendance
   - Payment mode (cash/UPI/card/udhaar), discount, override reason, bill_number on visits
   - Customer gender; inventory cost_price
   - Udhaar (credit) tables: udhaar_balance, udhaar_transactions

Existing data is backfilled with a default "Main Branch" so nothing breaks.
