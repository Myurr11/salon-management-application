# Salon Manager - Supabase Setup Guide

This guide will help you set up Supabase as the backend for the Salon Manager mobile application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Expo CLI installed globally (`npm install -g expo-cli`)

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in your project details:
   - Name: `salon-manager` (or any name you prefer)
   - Database Password: Choose a strong password (save it!)
   - Region: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Set Up Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `database/schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for the query to complete - you should see "Success. No rows returned"

## Step 3: Insert Mock Data

1. In the SQL Editor, create a **New Query**
2. Open the file `database/mock_data.sql` from this project
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run**
5. Verify the data was inserted by going to **Table Editor** and checking:
   - `staff_members` table (should have 3 rows)
   - `services` table (should have 6 rows)
   - `inventory_items` table (should have 7 rows)
   - `customers` table (should have 5 rows)

## Step 4: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon public key**: Copy this (long string starting with `eyJ...`)

## Step 5: Configure Environment Variables

1. In the `mobile` directory, create a `.env` file:
   ```bash
   cd mobile
   cp .env.example .env
   ```

2. Open `.env` and replace the placeholder values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Important**: Make sure `.env` is in your `.gitignore` file (it should be by default)

## Step 6: Install Dependencies

If you haven't already:
```bash
cd mobile
npm install
```

## Step 7: Test the Connection

1. Start the Expo development server:
   ```bash
   npm start
   ```

2. Open the app on your device/simulator
3. You should see:
   - Staff members loaded from Supabase (Alice Johnson, Bob Smith, Carol Williams)
   - Services loaded from database
   - Inventory items loaded from database
   - Sample customers available

## Troubleshooting

### Error: "Supabase URL not configured"
- Make sure you created the `.env` file in the `mobile` directory
- Check that the environment variables are prefixed with `EXPO_PUBLIC_`
- Restart the Expo server after creating/updating `.env`

### Error: "Failed to load data"
- Check your Supabase project is active (not paused)
- Verify your API keys are correct
- Check the browser console or Expo logs for detailed error messages
- Ensure Row Level Security (RLS) policies allow access (the schema sets up permissive policies)

### Data not appearing
- Verify mock data was inserted successfully (check Table Editor in Supabase)
- Check the browser console for any errors
- Try refreshing the app

### Database connection issues
- Make sure your Supabase project is not paused
- Check your internet connection
- Verify the Project URL is correct (no trailing slashes)

## Next Steps

Once everything is working:

1. **Test all features:**
   - Create a new customer visit
   - Add products to a visit
   - View bills
   - Manage inventory (admin)
   - View product sales (admin)

2. **Customize for production:**
   - Set up proper authentication (Supabase Auth)
   - Implement role-based Row Level Security policies
   - Add more services and inventory items
   - Customize the UI to match your brand

3. **Deploy:**
   - Build the app for production
   - Set up proper environment variables in your deployment platform
   - Configure Supabase for production use

## Database Schema Overview

The database includes:
- **staff_members**: Staff member information
- **customers**: Customer database
- **services**: Available salon services
- **inventory_items**: Product inventory
- **visits**: Customer visits/transactions
- **visit_services**: Services provided in each visit
- **visit_products**: Products sold in each visit
- **product_sales**: Product sales tracking
- **appointments**: Future appointments (for future use)

## Support

If you encounter issues:
1. Check the Supabase logs in your project dashboard
2. Review the Expo/React Native logs
3. Verify all SQL scripts ran successfully
4. Check that environment variables are set correctly

For Supabase-specific issues, refer to: https://supabase.com/docs
