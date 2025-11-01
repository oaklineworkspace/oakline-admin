
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

## Recent Changes

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
