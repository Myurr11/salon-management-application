# Database Setup Instructions

This directory contains the database schema and mock data for the Salon Manager application.

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project in Supabase
3. Note down your project URL and anon key from Project Settings > API

## Setup Steps

### 1. Run the Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `schema.sql`
5. Click **Run** to execute the schema

This will create all necessary tables, indexes, triggers, and RLS policies.

### 2. Insert Mock Data

1. In the SQL Editor, create a new query
2. Copy and paste the contents of `mock_data.sql`
3. Click **Run** to insert sample data

This will populate your database with:
- 3 staff members (Alice, Bob, Carol)
- 6 services (Haircut, Hair Coloring, Hair Spa, Manicure, Pedicure, Facial)
- 7 inventory items with various stock levels
- 5 sample customers
- 3 sample visits for today (for testing)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env` in the mobile directory
2. Replace the placeholder values with your actual Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Verify Setup

After running the schema and mock data, verify that:
- All tables are created (check in Table Editor)
- Mock data is inserted correctly
- You can query the data using SQL Editor

## Database Schema Overview

### Core Tables
- **staff_members**: Staff member information
- **customers**: Customer database
- **services**: Available salon services
- **inventory_items**: Product inventory

### Transaction Tables
- **visits**: Customer visits/transactions
- **visit_services**: Services provided in each visit
- **visit_products**: Products sold in each visit
- **product_sales**: Product sales tracking (for analytics)

### Other Tables
- **appointments**: Future appointments
- **appointment_services**: Services scheduled for appointments

## Notes

- Row Level Security (RLS) is enabled but currently allows all operations for authenticated users
- In production, you should implement proper authentication and role-based access control
- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- Foreign key constraints ensure data integrity
- Indexes are created for optimal query performance
