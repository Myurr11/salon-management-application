# Salon Management System

A comprehensive salon management application built with React Native and Supabase, designed to streamline salon operations including staff management, customer tracking, inventory control, billing, appointments, and financial reporting.

## 📸 Screenshots

### Authentication
#### Login Screen
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/login-screen.PNG" alt="Login Screen" width="30%" />
</div>

### Admin Dashboard
#### Main Dashboard
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/admin-dashboard.PNG" alt="Admin Dashboard" width="30%" />
</div>

#### Staff Performance
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/staff-performance.PNG" alt="Staff Performance" width="30%" />
</div>

### Staff Management (Admin)
#### Manage Staff
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/manage-staff.PNG" alt="Manage Staff" width="30%" />
</div>

#### Add Staff
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/add-staff.PNG" alt="Add Staff" width="30%" />
</div>

### Attendance System
#### Mark Attendance (Staff Dashboard)
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/mark-attendance.PNG" alt="Mark Attendance Before" width="30%" />
</div>

#### Attendance View (Admin Dashboard with Photo)
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/attendance-admin-photo.PNG" alt="Attendance with Photo" width="30%" />
</div>

### Services Management (Admin)
#### Manage Services
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/manage-services.PNG" alt="Manage Services" width="30%" />
</div>

#### Add Services
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/add-services.PNG" alt="Add Services" width="30%" />
</div>

### Inventory Management (Admin)
#### Manage Inventory
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/manage-inventory.PNG" alt="Manage Inventory" width="30%" />
</div>

#### Add Inventory Items
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/add-inventory-items.PNG" alt="Add Inventory Items" width="30%" />
</div>

### Appointments
#### Appointments List
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/appointments-list.PNG" alt="Appointments List" width="30%" />
</div>

#### Book Appointment
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/book-appointment.PNG" alt="Book Appointment" width="30%" />
</div>

### Special Offers (Admin)
#### Special Offers List
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/special-offers.PNG" alt="Special Offers" width="30%" />
</div>

#### Create New Offer
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/create-new-offer.PNG" alt="Create New Offer" width="30%" />
</div>

### Reports
#### Product Sales (Admin)
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/product-sales.PNG" alt="Product Sales" width="30%" />
</div>

#### Staff Report
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/staff-report.PNG" alt="Staff Report" width="30%" />
</div>

### Staff Dashboard
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/staff-dashboard.PNG" alt="Staff Dashboard" width="30%" />
</div>

### Customer Visits
#### Create New Visit - Screenshot 1
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/create-visit-1.PNG" alt="Create New Visit 1" width="30%" />
</div>

#### Create New Visit - Screenshot 2
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/create-visit-2.PNG" alt="Create New Visit 2" width="30%" />
</div>

### Customer Management
#### Customer List
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/customer-list.PNG" alt="Customer List" width="30%" />
</div>

#### Customer Details
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/customer-details.PNG" alt="Customer Details" width="30%" />
</div>

### Billing
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screenshots/bill.PNG" alt="Bill" width="30%" />
</div>


## 📱 Features

### Admin Dashboard
- **Revenue Analytics**: Real-time revenue tracking with daily, monthly, and yearly summaries
- **Staff Performance**: Track individual staff performance with monthly goals and commission calculations
- **Branch Management**: Multi-branch support with branch-wise revenue breakdown
- **Payment Breakdown**: Track payments by method (Cash, UPI, Card, Credit/Udhaar)
- **Quick Actions**: Fast access to all major features from the dashboard

### Staff Management
- **Add/Remove Staff**: Complete CRUD operations for staff members
- **Staff Profiles**: Manage staff details including username, password, and monthly goals
- **Soft Delete**: Archive staff members while preserving historical data
- **Search & Filter**: Quickly find staff members by name or username
- **Attendance Tracking**: Mark and track staff attendance with photo verification

### Customer Management
- **Customer Database**: Comprehensive customer profiles with contact information
- **Visit History**: Track customer visits and services availed
- **Birthday Tracking**: Store customer DOB for special offers
- **Search Functionality**: Quick customer lookup by name or phone

### Services Management
- **Service Catalog**: Add, edit, and remove salon services
- **Pricing Control**: Set and update service prices
- **Service Descriptions**: Add detailed descriptions for each service
- **Active/Inactive Toggle**: Soft delete services instead of permanent removal

### Inventory Management
- **Stock Tracking**: Real-time inventory levels with low stock alerts
- **Product Catalog**: Manage products with names, quantities, and pricing
- **Inventory Reports**: View product sales and stock movement
- **Low Stock Alerts**: Automatic notifications when items fall below threshold
- **Stock Value Tracking**: Monitor inventory value (optional display)

### Billing System
- **Quick Billing**: Fast billing interface for walk-in customers
- **Multi-Service Billing**: Add multiple services to a single bill
- **Product Sales**: Sell retail products along with services
- **Payment Methods**: Support for Cash, UPI, Card, and Credit (Udhaar)
- **Bill History**: View and manage past bills

### Appointment Management
- **Booking System**: Schedule appointments with specific staff members
- **Advance Payments**: Track advance amounts received during booking
- **Appointment Status**: Manage scheduled, completed, and cancelled appointments
- **Calendar View**: View upcoming and past appointments
- **Balance Tracking**: Automatic calculation of remaining balance after advance payment

### Udhaar (Credit) Management
- **Credit Tracking**: Track outstanding customer credits
- **Payment History**: View credit transaction history
- **Balance Management**: Monitor and manage customer balances

### Attendance System
- **Daily Attendance**: Mark staff attendance with check-in/check-out
- **Photo Verification**: Optional photo capture for attendance validation
- **Attendance Reports**: View staff attendance history
- **Status Types**: Support for Present, Absent, Late, and Half-Day statuses

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native with TypeScript
- **Backend**: Supabase (PostgreSQL database)
- **State Management**: React Context API
- **Navigation**: React Navigation (Native Stack)
- **UI Components**: Custom components with consistent design tokens

### Project Structure

```
salon-management-system/
├── mobile/                      # React Native mobile application
│   ├── src/
│   │   ├── screens/            # All application screens
│   │   │   ├── Admin*.tsx      # Admin-specific screens
│   │   │   ├── Staff*.tsx      # Staff-specific screens
│   │   │   └── *.tsx           # Common screens
│   │   ├── context/            # React Context providers
│   │   │   ├── AuthContext.tsx # Authentication state management
│   │   │   └── DataContext.tsx # Application data management
│   │   ├── services/           # Supabase service layer
│   │   │   ├── supabaseService.ts
│   │   │   └── attendancePhotoService.ts
│   │   ├── components/         # Reusable UI components
│   │   │   └── ui/             # Base UI components
│   │   ├── theme/              # Theme and design tokens
│   │   │   ├── colors.ts
│   │   │   └── index.ts
│   │   └── types.ts            # TypeScript type definitions
│   ├── assets/                 # Images, icons, fonts
│   ├── App.tsx                 # Main application entry point
│   ├── app.json                # App configuration
│   └── package.json            # Dependencies
├── database/
│   ├── schema.sql              # Database schema definition
│   ├── migrations/             # Database migration files
│   │   ├── 001_*.sql
│   │   ├── 002_*.sql
│   │   └── ...
│   └── mock_data.sql           # Sample data for testing
└── SETUP.md                    # Setup instructions
```

### Key Directories

#### Screens (`mobile/src/screens/`)
- **Admin Screens**: Dashboard, Inventory, Services, Staff Management, Attendance, Product Sales, Udhaar, Staff Performance, Reports
- **Staff Screens**: Dashboard, Billing, Attendance, Reports
- **Shared Screens**: Customer List, Customer Detail, Inventory View, Appointments, Login

#### Context (`mobile/src/context/`)
- **AuthContext**: Manages user authentication, login/logout, and staff member data
- **DataContext**: Manages application-wide data (services, customers, visits, inventory, appointments)

#### Services (`mobile/src/services/`)
- **supabaseService**: All database operations and API calls to Supabase
- **attendancePhotoService**: Handles photo capture and upload for attendance

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account and project
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. **Clone the repository**
```bash
cd mobile
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up the database**
- Go to your Supabase project dashboard
- Setup the database according to Database Schema

5. **Start the development server**
```bash
npm start
```

6. **Run on device**
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

## 📊 Database Schema

### Core Tables

#### staff_members
- `id` (UUID, primary key)
- `name` (VARCHAR)
- `username` (VARCHAR, unique)
- `password_hash` (VARCHAR)
- `branch_id` (VARCHAR, optional)
- `monthly_goal` (DECIMAL, optional)
- `is_active` (BOOLEAN, default: true)
- `created_at`, `updated_at` (TIMESTAMP)

#### customers
- `id` (UUID, primary key)
- `name` (VARCHAR)
- `dob` (DATE, optional)
- `phone` (VARCHAR, optional)
- `email` (VARCHAR, optional)
- `address` (TEXT, optional)
- `created_at`, `updated_at` (TIMESTAMP)

#### services
- `id` (UUID, primary key)
- `name` (VARCHAR)
- `price` (DECIMAL)
- `description` (TEXT, optional)
- `duration_minutes` (INTEGER, optional)
- `is_active` (BOOLEAN, default: true)
- `created_at`, `updated_at` (TIMESTAMP)

#### inventory_items
- `id` (UUID, primary key)
- `name` (VARCHAR)
- `quantity` (INTEGER)
- `min_threshold` (INTEGER, default: 5)
- `price` (DECIMAL)
- `description` (TEXT, optional)
- `unit` (VARCHAR, default: 'units')
- `created_at`, `updated_at` (TIMESTAMP)

#### visits
- `id` (UUID, primary key)
- `staff_id` (UUID, foreign key)
- `customer_id` (UUID, foreign key)
- `visit_date` (DATE)
- `total_amount` (DECIMAL, default: 0)
- `created_at`, `updated_at` (TIMESTAMP)

#### appointments
- `id` (UUID, primary key)
- `customer_id` (UUID, foreign key)
- `staff_id` (UUID, foreign key)
- `appointment_time` (TIMESTAMP)
- `status` (VARCHAR: scheduled/completed/cancelled)
- `advance_amount` (DECIMAL, optional)
- `notes` (TEXT, optional)
- `created_at`, `updated_at` (TIMESTAMP)

#### attendance
- `id` (UUID, primary key)
- `staff_id` (UUID, foreign key)
- `attendance_date` (DATE)
- `check_in_time` (TIMESTAMP)
- `check_out_time` (TIMESTAMP)
- `status` (VARCHAR: present/absent/late/half_day)
- `notes` (TEXT, optional)
- `attendance_photo_url` (TEXT, optional)
- `created_at`, `updated_at` (TIMESTAMP)

## 🔐 Authentication

The system supports two types of users:

### Admin Users
- Full access to all features
- Can manage staff, inventory, services, and view all reports
- Stored in `admin_users` table

### Staff Members
- Limited access to their own data and customers
- Can bill customers, mark attendance, view personal performance
- Stored in `staff_members` table with username/password

### Default Credentials
After initial setup:
- **Admin**: Username: `admin`, Password: `admin123` (change immediately!)
- **Staff**: Auto-generated username as `staff_[ID]`, default password: `staff123`

## 🎨 Design System

### Color Palette
```typescript
// Primary Colors
green: '#2D9A5F'      // Success, nature, growth
gold: '#C9A84C'       // Premium, achievements
blue: '#3A7EC8'       // Trust, professionalism
purple: '#7C3AED'     // Luxury, creativity
rose: '#E11D48'       // Beauty, passion

// Neutral Colors
bg: '#F7F5F2'         // Background (warm light gray)
surface: '#FFFFFF'    // Cards, surfaces
border: '#E8E3DB'     // Borders, dividers
text: '#1A1814'       // Primary text
textSub: '#6B6560'    // Secondary text
textMuted: '#A09A8F'  // Tertiary text
```

### Typography
- Font family: System fonts (San Francisco on iOS, Roboto on Android)
- Consistent font weights: 400 (regular), 600 (semibold), 700 (bold), 800 (extra bold), 900 (black)

### Spacing
- Consistent padding: 8, 10, 12, 14, 16, 20, 24px
- Border radius: 8px (sm), 12px (md), 16px (lg), 20px (xl), 999px (pill/circle)

## 📱 Screen Navigation

### Admin Navigation Flow
```
Admin Dashboard
├── Manage Inventory
├── Manage Services
├── Product Sales
├── Attendance
├── Udhaar (Credit)
├── Staff Performance
├── Manage Staff
├── Assign Branch
├── Appointments
└── Staff Report
```

### Staff Navigation Flow
```
Staff Dashboard
├── New Visit (Billing)
├── Customers
├── Inventory
├── Appointments
└── Mark Attendance
```

## 🔧 Development

### Running Tests
```bash
npm test
```

### Building for Production

#### iOS
```bash
eas build --platform ios
```

#### Android
```bash
eas build --platform android
```

### Code Style
- TypeScript for type safety
- ESLint configuration for code consistency
- Prettier for code formatting

## 📦 Deployment

### Environment Variables
Ensure production environment has correct Supabase credentials:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Database Backups
- Enable automatic backups in Supabase dashboard
- Regular manual exports recommended

### Monitoring
- Use Supabase logs for database query monitoring
- React Native debugging tools for frontend issues

## 🐛 Troubleshooting

### Common Issues

**Issue: Staff members not appearing after deletion**
- Solution: Ensure migration `006_add_is_active_to_staff.sql` is applied
- Verify `is_active` column exists in staff_members table

**Issue: Header spacing too large**
- Solution: Check `paddingTop` values in screen styles (should be 10px, not 52px)

**Issue: Tab navigation height inconsistent**
- Solution: Ensure tabs are wrapped in container with fixed height and backgroundColor

**Issue: Login fails**
- Solution: Verify Supabase credentials in `.env`
- Check RLS policies in Supabase dashboard

## 📝 License

This project is proprietary software. All rights reserved.