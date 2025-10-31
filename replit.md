
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

## Recent Changes

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
