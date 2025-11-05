# Oakline Bank Admin Panel

## Overview
Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. Its primary purpose is to provide comprehensive administrative functionality for managing users, accounts, transactions, cards, applications, and loans. The platform aims to streamline bank operations, enhance security, and offer robust tools for financial oversight and customer service.

## Recent Changes (November 2025)
- **Enhanced Loan Management Dashboard (Nov 5, 2025):** Added date range filtering to admin loans page with inclusive end-of-day handling for precise date-based queries. Enhanced search functionality to include user names in addition to email and loan IDs. Added "Review Application" button on each loan card that links to the comprehensive multi-step loan review page at `/admin/loans/[loanId]` for ID verification, collateral review, and approval workflows.
- **Loan Deposit Status Auto-Update (Nov 4, 2025):** Fixed critical issue where loans.deposit_status was not updating from 'pending' to 'completed' when admins approved/completed the 10% crypto deposit requirement. Updated both `/api/admin/approve-crypto-deposit` and `/api/admin/update-crypto-deposit-status` to automatically update the loans table when crypto deposits with purpose='loan_requirement' are approved or marked completed. Ensures loan deposit status stays synchronized across both approval workflows.
- **Loan Payment Approval Workflow (Nov 4, 2025):** Implemented secure loan payment approval system with atomic database transactions. Users can now submit loan payments with 'pending' status through `/api/submit-loan-payment`. Admins approve/reject payments via atomic PostgreSQL function `approve_loan_payment_atomic()` which prevents race conditions, uses optimistic locking, and ensures data integrity. Admin UI updated to show approve/reject buttons for pending payments.
- **Transaction Deletion Security (Nov 4, 2025):** Enhanced transaction deletion endpoint with proper admin authorization using `verifyAdminAuth()` and added comprehensive audit logging for all deletion actions.
- **Database Constraint Alignment (Nov 3, 2025):** Fixed crypto wallet creation for loan requirements by aligning frontend and API network type values with database CHECK constraints. The `loan_crypto_wallets` table only accepts specific network types: BTC, ERC20, TRC20, BEP20, SOLANA, POLYGON. Updated both POST and PUT handlers to validate before insertion.
- **Loan Deposit Status Tracking:** Modified to use `loans.deposit_status` database field as single source of truth instead of calculating from crypto_deposits table.
- **Loan Approval Workflow:** Separated approval action from disbursement - approve button now only sets status to 'approved' without automatically disbursing funds.
- **Audit Logging:** Added comprehensive audit logging for all loan approval and rejection actions with admin details.

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
- **`/` (Root)**: Admin Dashboard login and navigation hub.
- **`/admin/*`**: All administrative routes for managing bank operations.
**Authentication Flow:** Admin users log in and are redirected to the Admin Navigation Center. All routes require admin authentication with role-based access control.

### Backend
**Framework:** Next.js API Routes.
**Database:** Supabase (PostgreSQL) with Row Level Security.
**Authentication:** Supabase Auth with admin-only policies.
**Key API Endpoints:** `/api/admin/*` for all administrative operations.

### Admin Features
1.  **User Management:** Create, view, delete users, and manage enrollment.
2.  **Account Management:** Approve pending accounts, manage statuses, and update information.
3.  **Application Processing:** Review, approve/reject user and card applications.
4.  **Transaction Management:** View, create, process bulk, and reverse transactions.
5.  **Card Management:** Issue, manage statuses, process applications, and assign cards.
6.  **Reporting & Audit:** System logs, audit trails, and transaction reports.
7.  **Bank Details Management:** Manage bank information, contact details, and dynamically add/update email fields.
8.  **Crypto Wallet & Deposit Management:** Assign crypto wallet addresses (BTC, USDT, ETH, BNB), review/manage crypto deposit requests, approve/reject deposits with automatic balance crediting and email notifications.
9.  **Loan Management System:** Comprehensive dashboard, detailed loan view, payment tracking with user-submitted payments requiring admin approval, deposit verification workflow, secure atomic approval process using PostgreSQL RPC functions to prevent race conditions and ensure data integrity, automatic balance updates, audit logging, and email notifications. Includes integration with a treasury account system for loan requirement deposits.
10. **Transfers Management:** Dedicated page for managing all user transfers (internal, between accounts, wire).

## External Dependencies
*   **Supabase:** Database (PostgreSQL), Authentication, and Row Level Security.
*   **Next.js:** Full-stack framework.
*   **React:** Frontend library.
*   **CSS Modules:** For styling.