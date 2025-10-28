# Oakline Bank Admin Panel

## Overview

Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14, providing comprehensive management of users, accounts, transactions, cards, and applications. The system features a modern, mobile-first interface with real-time updates, protected routes, and advanced security measures.

The platform serves as both a customer-facing banking portal and an administrative control panel, enabling bank staff to manage all aspects of customer accounts, approve applications, issue cards, process transactions, and monitor system activity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Technologies:**
- **Next.js 14.2.3** - React framework with App Router for server-side rendering and static generation
- **React 18.2.0** - Component-based UI library with hooks for state management
- **CSS Modules** - Scoped styling system for component isolation
- **Custom CSS** - Global styles, responsive utilities, and theme variables

**Design Patterns:**
- Mobile-first responsive design with breakpoint-based media queries
- Component-based architecture with reusable UI elements
- Context API for authentication state management (AuthContext)
- Protected route patterns using HOC wrappers (ProtectedRoute, AdminRoute)
- Lazy loading for heavy components to improve initial page load performance
- Memoization to prevent unnecessary re-renders

**Key UI Components:**
- `DebitCard` - Interactive card display with flip animation and security controls
- `LiveChat` - Real-time customer support chat interface
- `MainMenu` - Responsive navigation with dropdown menus
- `StickyFooter` - Persistent bottom navigation for quick access
- `AdminDropdown` - Hierarchical admin panel navigation
- Form components with validation (FormInput, step-indicator, account-type-card)

**State Management:**
- React Context API for global authentication state
- Local component state with useState hooks
- Session storage for enrollment flow persistence
- Supabase session management for admin authentication

### Backend Architecture

**API Layer:**
- Next.js API routes for serverless backend functionality
- RESTful endpoint structure organized by domain (users, loans, transactions, cards)
- CORS middleware support via `withCors` helper
- Service-oriented architecture with separate concerns

**Authentication & Authorization:**
- Supabase Auth for user authentication with email/password
- Magic link authentication for enrollment flows
- Role-based access control via admin_profiles table (admin, super_admin, manager)
- AdminAuth component wrapper for admin route protection
- Supabase-backed admin authentication via admin_profiles table
- Session-based authentication with timeout management
- Multi-factor authentication support for admin accounts

**Security Measures:**
- Password strength validation (12+ chars, numbers, special chars, upper/lowercase)
- Account lockout after failed login attempts (5 attempts, 30 min lockout)
- Session timeout (15 min for users, 10 min for admins)
- API rate limiting (100 requests/15 min for users, 1000 for admins)
- XSS protection using `xss` library
- Input validation using `validator` and `zod` libraries
- Encrypted data storage (AES-256-GCM)
- SIEM integration for security event monitoring

**Email System:**
- Nodemailer for transactional emails
- Professional email templates for enrollment, password reset, notifications
- Zoho email integration (info@, support@, admin@, finance@ addresses)
- SMTP configuration with SSL/TLS

### Data Storage Solutions

**Primary Database: Supabase (PostgreSQL)**

**Schema Structure:**

1. **accounts** - User bank accounts
   - Links to auth.users and applications tables
   - Supports multiple account types (checking, savings, business, etc.)
   - Balance tracking with positive constraint
   - Status management (pending, active, closed, suspended, rejected)
   - Routing number: 075915826

2. **admin_profiles** - Admin user roles and permissions
   - Links to auth.users
   - Role hierarchy (admin, super_admin, manager)
   - Active status tracking

3. **applications** - Account opening applications
   - Comprehensive KYC data (SSN, ID, employment, income)
   - Multi-account type support via array field
   - Application status workflow (pending, approved, rejected, under_review, completed)
   - Admin-created vs. customer-created distinction

4. **Additional Tables** (referenced but not fully shown):
   - cards/debit_cards - Card issuance and management
   - transactions - Financial transaction history
   - zelle_transactions - P2P payment records
   - profiles - Extended user profile data

**Data Relationships:**
- Users → Applications (one-to-many)
- Applications → Accounts (one-to-many)
- Users → Accounts (one-to-many)
- Users → Cards (one-to-many)
- Accounts → Transactions (one-to-many)

**Client Libraries:**
- `@supabase/supabase-js` for client-side database operations
- Separate admin client with service role key for elevated permissions
- Real-time subscription capabilities for live updates

### External Dependencies

**Payment Processing:**
- **Stripe** (v18.5.0) - Payment processing and card management
  - `@stripe/stripe-js` - Client-side Stripe integration
  - `@stripe/react-stripe-js` - React components for Stripe
  - Used for card issuance, payment processing, and merchant services

**Authentication & Database:**
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database
  - Authentication service with JWT tokens
  - Real-time subscriptions
  - Row-level security policies
  - Storage for file uploads

**Form Management:**
- **React Hook Form** (v7.62.0) - Form state and validation
- **@hookform/resolvers** (v5.2.1) - Validation schema resolvers
- **Zod** (v4.1.5) - TypeScript-first schema validation

**Data Fetching:**
- **TanStack React Query** (v5.87.4) - Server state management
  - Caching and synchronization
  - Background refetching
  - Optimistic updates

**Security & Validation:**
- **bcryptjs** (v3.0.2) - Password hashing
- **validator** (v13.15.15) - String validation utilities
- **xss** (v1.0.15) - XSS sanitization

**Email Service:**
- **Nodemailer** (v6.9.0) - Email sending
  - SMTP transport configuration
  - HTML email templates
  - Zoho email integration

**Development Tools:**
- **ESLint** (v8.57.0) - Code linting
- **eslint-config-next** (v14.2.3) - Next.js specific rules

**Infrastructure:**
- Deployed on Replit (0.0.0.0 host binding, port 5000)
- Next.js configured with cache control headers for proper client updates
- Production deployment ready with autoscale configuration
- SIEM integration support (Splunk, Datadog, Elasticsearch)

## Recent Changes

### October 28, 2025 - Comprehensive Transaction Management System
- **Admin Transactions Page Enhancement**: Complete overhaul of admin-transactions page with full CRUD capabilities
  - **Full Edit Functionality**: Admins can now edit all transaction fields:
    - Type (credit/debit with validation)
    - Amount (positive number validation)
    - Description
    - Status (pending, completed, failed, hold, cancelled, reversed)
    - Created_at timestamp
    - Updated_at timestamp (auto-updates unless manually edited)
  - **Create New Transactions**: New modal for admins to create transactions directly
  - **Enhanced Filtering System**:
    - Filter by status with dropdown
    - Filter by transaction type (credit/debit)
    - Filter by user (dropdown populated from applications)
    - Date filters: today, last 7 days, last 30 days, custom date range
    - Search across user names, emails, account numbers, and descriptions
  - **Audit Logging**: All transaction changes automatically logged to audit_logs table
    - Captures old_data and new_data in JSONB format
    - Records admin user who made the change
    - Tracks action type (update_transaction, create_transaction)
  - **Smart Auto-Update Logic**:
    - Updated_at auto-updates to current time when other fields change
    - Manual edits to updated_at are preserved when explicitly modified
    - Frontend tracks manual vs. auto changes with state flags
  - **Real-time Updates**: Live subscription to transactions table for instant refresh
  - **Security**: Full admin authentication required, input validation on all fields
- **New API Endpoints**:
  - `/api/admin/update-transaction` - Updates transaction with validation and audit logging
  - `/api/admin/create-transaction` - Creates new transaction with default status 'pending'
- **Status Validation**: Prevents invalid status values, ensures data integrity
- **Responsive Design**: Mobile-first interface with optimized table layout

### October 28, 2025 - Database Schema Updates & Missing Tables Fix
- **Database Schema**: Created SQL scripts for missing Supabase tables
  - Created `transactions` table with full RLS policies and indexes
  - Created `check_deposits` table for mobile check deposit feature
  - Added proper foreign key constraints and data validation
  - Included Row Level Security policies for user data protection
- **Admin Pages Fixed**:
  - Fixed admin-transactions page (was empty due to missing transactions table)
  - Fixed mobile-check-deposits page (was showing "table not found" error)
  - All API endpoints verified and working correctly
- **File Added**: `supabase_missing_tables.sql` - Comprehensive SQL script for table creation
- **Note**: User needs to run the SQL script in their Supabase dashboard to complete setup

### October 27, 2025 - Admin Approval Email Fix & Security Cleanup
- **Critical Email Fix**: Resolved issue where admin approval emails weren't sending login credentials to users
  - Root cause: SUPABASE_SERVICE_KEY environment variable was missing
  - User confirmed secret is now configured in Replit as SUPABASE_SERVICE_KEY
  - Approval flow now successfully sends welcome emails with temporary passwords
- **Security Cleanup**: Removed insecure duplicate admin page
  - Deleted `pages/admin/admin-users-management.js` - contained hardcoded fake data and imported supabaseAdmin on client (security risk)
  - Updated all navigation links in AdminNavDropdown, admin index, and admin-dashboard to remove broken references
  - Consolidated to single `admin-users.js` page that properly fetches real data from API endpoints
- **Dependencies & Server Setup**:
  - Installed all npm dependencies (360 packages)
  - Configured and started Next.js dev server on port 5000
  - Server running successfully with no errors
  - Ready for admin approval testing

### October 26, 2025 - Replit Migration Completed
- **Platform Migration**: Successfully migrated from Vercel to Replit
- **Port Configuration**: Configured Next.js to run on port 5000 with 0.0.0.0 host binding
- **Cache Control**: Added proper cache-control headers to prevent heuristic caching issues
- **Build Fixes Applied**:
  - Fixed duplicate code in `pages/api/admin/approve-pending-account.js` (removed duplicate imports and handler function)
  - Fixed undefined `handleLogout` error in `pages/admin/manage-user-enrollment.js` (removed unused logout button)
  - Verified no instrumentation.ts/js files blocking startup
- **Environment Configuration**:
  - All required environment variables configured via Replit Secrets
  - Supabase credentials: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
  - Email service (SMTP): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  - Admin authentication: ADMIN_SECRET_KEY
- **Admin Authentication Refactor**: 
  - Removed all hardcoded admin passwords (previously "Chrismorgan23$")
  - Implemented Supabase admin_profiles table authentication
  - Created AdminAuth component wrapper for consistent admin route protection
  - All admin pages now verify user sessions against admin_profiles table
- **Security Improvements**: 
  - Eliminated password-based admin access in favor of database-verified authentication
  - Admin access now requires both Supabase authentication AND admin_profiles table entry
  - Environment secrets securely managed through Replit
- **Admin Panel API Fixes** (Latest):
  - **approve-pending-account.js**: Refactored to use explicit foreign key lookups instead of joins
    - Fetches account and application separately to avoid Supabase join array ambiguity
    - Uses account.application_id to retrieve the correct application record
    - Added robust validation with .trim() to catch empty/whitespace-only strings
    - Returns clear 422 errors for missing or incomplete application data
    - Prevents null dereference errors when sending approval emails
  - **get-accounts.js**: Added optional status query parameter
    - Supports filtering accounts by status (e.g., ?status=pending)
    - Falls back to returning all accounts when no status specified
    - Enables both manual-transactions page (all accounts) and approve-accounts page (pending only)
- **Deployment**: 
  - Development server running successfully on port 5000
  - Dependencies installed and verified (Next.js 14.2.3)
  - Ready for production deployment with autoscale configuration

**Configuration:**
- Environment-based feature flags (crypto, investments, loans, notifications)
- Security configuration with customizable thresholds
- SMTP settings for email delivery
- Database connection strings via environment variables