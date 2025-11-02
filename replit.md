
# Oakline Bank Admin Panel

## Overview

Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. This is a **pure admin repository** containing only administrative functionality for managing users, accounts, transactions, cards, and applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Framework & Technologies:** Next.js 14.2.3, React 18.2.0, CSS Modules, Custom CSS.

**Design Patterns:** Mobile-first responsive design, component-based architecture, Context API for authentication, protected routes for admin access.

**Key UI Components:** AdminNavDropdown, AdminPageDropdown, AdminFooter, and validated form components for admin operations.

**State Management:** React Context API for admin authentication, `useState` for local component state, Supabase for admin session management.

### Routing Architecture

**Route Organization:**
- **`/` (Root)**: Admin Dashboard login and navigation hub - the main entry point for bank administrators
- **`/admin/*`**: All administrative routes for managing bank operations

**Authentication Flow:**
- Admin users: Login → redirects to `/` (Admin Navigation Center)
- All routes require admin authentication
- Role-based access control for different admin permission levels

### Backend

**Framework:** Next.js API Routes

**Database:** Supabase (PostgreSQL) with Row Level Security

**Authentication:** Supabase Auth with admin-only policies

**Key API Endpoints:**
- `/api/admin/*` - All admin operations (user management, transactions, cards, etc.)

### Admin Features

1. **User Management**
   - Create users
   - View all users with account details
   - Delete users (with complete cleanup)
   - Manage user enrollment

2. **Account Management**
   - Approve pending accounts
   - Manage account statuses
   - Update account information

3. **Application Processing**
   - Review user applications
   - Approve/reject applications
   - Manage card applications

4. **Transaction Management**
   - View all transactions
   - Create manual transactions
   - Process bulk transactions
   - Reverse transactions

5. **Card Management**
   - Issue new cards
   - Manage card statuses
   - Process card applications
   - Assign cards to users

6. **Reporting & Audit**
   - System logs
   - Audit trails
   - Transaction reports

7. **Bank Details Management**
   - Manage bank information and contact details
   - Update standard email addresses (info, contact, support, loans, notify, updates, welcome)
   - Add custom email fields dynamically
   - Automatic column creation for new email fields
   - Database function automatically creates columns if they don't exist

8. **Crypto Wallet & Deposit Management**
   - Assign and update crypto wallet addresses for users (BTC, USDT, ETH, BNB)
   - Search and filter users by email or name
   - Review and manage crypto deposit requests
   - Approve deposits with automatic balance crediting
   - Reject deposits with optional reason
   - Email notifications for approved/rejected deposits
   - Summary statistics and filtering by status

9. **Loan Management System**
   - **Comprehensive Loan Dashboard** (`/admin/admin-loans`) with deposit verification badges and status filtering
   - **Detailed Loan View** (`/admin/loans/[loanId]`) showing full loan information, repayment schedule, and deposit verification
   - **Loan Payments Dashboard** (`/admin/loan-payments`) tracking all payment history across users
   - **Deposit Verification Workflow**: Automatic validation of required deposits from crypto deposits or bank transactions
   - **Secure Approval Process**: Approve loans with automatic disbursement to user accounts
   - **Transaction Integrity**: Optimistic locking prevents race conditions during disbursement
   - **Automatic Rollback**: Failed operations automatically rollback all changes to maintain data consistency
   - **Audit Logging**: Complete audit trail for all loan operations
   - **Email Notifications**: Users notified of loan approvals with full details
   - **Stats Dashboard**: Real-time statistics showing pending, active, completed loans, and total amounts

## Recent Changes

### Loan Management System Implementation (November 2, 2025)
Built comprehensive loan management system with deposit verification, secure approval workflows, and payment tracking:

**Admin Pages:**
- **`/admin/admin-loans`**: Enhanced loan dashboard with deposit verification badges, stats (pending/active/completed loans), and multi-status filtering
- **`/admin/loans/[loanId]`**: Detailed loan view showing borrower information, loan details, deposit verification status, repayment schedule, approval form with notes
- **`/admin/loan-payments`**: Payment tracking dashboard displaying all loan payments with user details, amounts, status, and dates

**API Endpoints (all secured with admin authentication):**
- **`GET /api/admin/get-loans`**: Fetch all loans with user email/name from profiles table (secured with verifyAdminAuth)
- **`GET /api/admin/get-loan-detail`**: Retrieve complete loan information with user/account details for a specific loan
- **`GET /api/admin/get-loan-payments`**: Fetch all loan payment records with user information
- **`POST /api/admin/approve-loan-with-disbursement`**: Approve loans with deposit verification, automatic disbursement, and rollback on failure

**Security & Data Integrity:**
- **Optimistic Locking**: Account balance updates check current balance and verify affected rows to prevent race conditions
- **Transaction Rollback**: Comprehensive error handling with automatic rollback of loan status and balance changes on any failure
- **Admin Authentication**: All endpoints protected with verifyAdminAuth to prevent unauthorized access
- **Audit Trail**: All loan approvals logged to audit_logs and system_logs tables

**Deposit Verification:**
- Checks both `crypto_deposits` (confirmed/completed) and `transactions` (deposit/completed) tables
- Validates deposit amount meets or exceeds loan requirement
- Prevents loan approval without verified deposits when required
- Visual badges on dashboard indicate deposit verification status

**Disbursement Process:**
1. Verify deposit requirement (if applicable)
2. Update loan status to 'active' with optimistic locking
3. Credit user account balance with atomic update
4. Create transaction record for disbursement
5. Log audit trail with admin details
6. Send email notification to user
7. Automatic rollback on any failure to maintain consistency

### Replit Migration & Crypto Deposits Management Upgrade (November 1, 2025)
Successfully migrated the Oakline Bank Admin Panel from Vercel to Replit with enhanced crypto deposit management:

**Migration Achievements:**
- Configured Next.js to run on Replit with proper port 5000 binding and host settings
- Verified all environment variables and Supabase authentication
- Fixed Supabase query syntax issues in loans API (`profiles!user_id` → `profiles:user_id`)

**Crypto Deposits Management - Complete Rebuild:**
- **Full Database Control**: Expandable rows display all 20+ database fields including timestamps, approval/rejection details, metadata, and transaction hashes
- **Advanced Filtering**: Multi-dimensional filtering by status, user email/ID, crypto type, wallet address, and date range with one-click clear
- **Smart Status Management**: Context-aware action buttons for all 9 status states (Pending, On Hold, Awaiting Confirmations, Confirmed, Processing, Completed, Rejected, Failed, Reversed)
- **Automatic Balance Management**: Atomic balance updates with rollback on failure - deposits only change status after successful balance adjustments
- **Complete Audit Trail**: Every status change logged in `crypto_deposit_audit_logs` with admin details, reasons, and balance changes
- **Pagination & Search**: 10 items per page with comprehensive search across all deposit fields
- **Data Integrity**: Critical fix ensures deposit statuses only update after balance changes succeed, preventing inconsistent states

**API Enhancements:**
- `POST /api/admin/update-crypto-deposit-status` - New unified endpoint for all status transitions with audit logging and balance management
- Fixed `/api/admin/get-loans` Supabase join syntax for proper data fetching

### Transfers Management & Performance Optimization (November 1, 2025)
Enhanced admin dashboard with professional transfer management and critical performance fixes:
- **New Admin Page**: `/admin/admin-transfers` - Dedicated transfers page displaying all user transfers (internal, between accounts, wire) with user name, account number, transaction type, amount, description, status, and timestamp
- **Crypto Deposit Workflow**: Added professional two-step workflow with "Confirm" button to verify blockchain deposits before "Approve" button credits accounts
- **API Enhancements**: 
  - `POST /api/admin/confirm-crypto-deposit` - Mark crypto deposits as confirmed after blockchain verification
  - Updated `GET /api/admin/get-crypto-deposits` to support "confirmed" status filtering
- **Performance Optimizations**: 
  - Added 500-record limit to transactions and transfers queries to improve page load times
  - **Critical Fix**: Replaced `auth.admin.listUsers()` in crypto deposits API with targeted profiles query to prevent pagination-related data loss for accounts with >50 users
- **Loans Page Fix**: Updated `/api/admin/get-loans` to properly fetch loan data with user emails from Supabase profiles table instead of auth service

### Crypto Wallet & Deposit Management (October 31, 2025)
Added comprehensive cryptocurrency management for administrators:
- **New Admin Pages**:
  - `/admin/assign-crypto-wallets` - Assign/update wallet addresses for users across supported cryptocurrencies
  - `/admin/manage-crypto-deposits` - Review, approve, or reject crypto deposits with automatic processing
- **API Endpoints**: Four secure endpoints with bearer token authentication
  - `POST /api/admin/assign-crypto-wallet` - Assign or update wallet addresses
  - `GET /api/admin/get-crypto-deposits` - Fetch deposits with status filtering
  - `POST /api/admin/approve-crypto-deposit` - Approve deposits and credit accounts
  - `POST /api/admin/reject-crypto-deposit` - Reject deposits with notifications
- **Security**: `lib/adminAuth.js` helper verifies admin authentication via Supabase bearer tokens
- **Features**: Auto-balance updates, email notifications, summary statistics, search/filter capabilities

### Dynamic Email Field Support (October 31, 2025)
Added ability to dynamically create email columns in the `bank_details` table:
- **Database Function**: `add_bank_details_column_if_not_exists(column_name)` safely creates columns for email fields
- **API Endpoint**: `/api/admin/update-bank-details` handles column creation and data updates with authentication
- **Security**: Project-scoped JWT validation ensures only authenticated admins can modify bank details
- **Frontend**: Bank details page automatically works with any email_* field without database migrations

## Security

- Admin-only authentication
- Role-based access control (RBAC)
- Supabase Row Level Security policies
- Protected API routes
- Secure session management

## Deployment

This application is designed to run on Replit. Use port 5000 for development and production.
