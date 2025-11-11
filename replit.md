# Oakline Bank Admin Panel

## Overview
Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. Its primary purpose is to provide comprehensive administrative functionality for managing users, accounts, transactions, cards, applications, and loans. The platform aims to streamline bank operations, enhance security, and offer robust tools for financial oversight and customer service.

## Recent Changes (November 2025)
- **Account Opening Fee Treasury Credit (Nov 11, 2025):** Updated `complete_account_opening_deposit_atomic` PostgreSQL function to automatically credit account opening deposit fees to the bank's treasury account (user_id: `7f62c3ec-31fe-4952-aa00-2c922064d56a`). Previously, fees were deducted from user deposits but not tracked anywhere - now they properly flow to treasury. When a deposit with a $5 fee is completed, user receives net amount ($95) and treasury receives fee ($5) with corresponding transaction records. Feature deployed to development database; production deployment guide in `DEPLOY_FEE_TO_TREASURY.md`.
- **Email Logging System (Nov 11, 2025):** Created `email_logs` table in development database to track all email delivery across the system. Captures recipient, subject, email type, provider, status (pending/sent/failed), message IDs, and error details. All server-side emails automatically log via `sendEmail()` function in `lib/email.js`. Created admin UI at `/admin/email-logs` for viewing all email history. Prepared implementation guide (`FRONTEND_EMAIL_LOGGING_INSTRUCTIONS.md`) for separate frontend repository to ensure emails from both admin and user repositories are logged to shared Supabase table.
- **Security & Configuration Improvements (Nov 10, 2025):** Removed all hardcoded credentials and secrets from codebase. Replaced hardcoded `@theoaklinebank.com` email addresses and domain URLs with environment variables (`BANK_EMAIL_DOMAIN`, `NEXT_PUBLIC_SITE_DOMAIN`, `NEXT_PUBLIC_SITE_URL`). Updated 20+ files across `lib/` and `pages/api/` to use environment-based configuration. System now supports multiple SMTP providers with automatic fallback (Resend → Primary SMTP → SendGrid). Note: SendGrid integration (connector:ccfg_sendgrid_01K69QKAPBPJ4SWD8GQHGY03D5) is available in Replit but user chose manual setup via SENDGRID_API_KEY secret.
- **Account Request Management System (Nov 10, 2025):** Implemented complete admin workflow for managing additional account requests from existing users. Created `/api/admin/account-requests` endpoint with GET (fetch requests with status filtering) and POST (approve/reject) operations. Built `/admin/manage-account-requests` UI page with status filters, inline approval/rejection, and modal for rejection reasons. System automatically generates unique 12-digit account numbers, creates debit cards via existing card generation service, and sends styled HTML email notifications for both approval and rejection. Integrated with existing account_requests table schema including user metadata, account type details, and review tracking.
- **Professional Account Approval Flow (Jan 7, 2025):** Implemented multi-stage account approval process separating application approval from account activation. Updated `/api/admin/update-account-status` to use proper schema statuses (`pending_application`, `approved`, `pending_funding`, `active`, `rejected`) with admin authentication and audit logging. Verified existing `/admin/approve-funding` page for minimum deposit tracking. Created comprehensive documentation in `ACCOUNT_APPROVAL_FLOW.md` explaining the professional flow: Application Approval → Funding Confirmation (if min_deposit > 0) → Account Activation.
- **Storage Diagnostics Tool (Jan 7, 2025):** Created `/admin/storage-diagnostics` page and `/api/admin/list-storage-files` endpoint to diagnose document viewing issues. Tool shows files in Supabase storage buckets vs. database records, identifies orphaned files (files in storage but not in `user_id_documents` table), and provides guidance on fixing sync issues. Helps admins understand why uploaded documents may not appear in the admin panel.
- **Vercel Deployment Fix (Jan 7, 2025):** Fixed build failure caused by duplicate code in `pages/api/admin/verify-id-document.js`. The entire file content was duplicated, causing "name defined multiple times" errors. Removed duplicate code, build now passes successfully.
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
4.  **Account Request Management:** Process additional account requests from existing users with automated account creation, card issuance, and email notifications.
5.  **Transaction Management:** View, create, process bulk, and reverse transactions.
6.  **Card Management:** Issue, manage statuses, process applications, and assign cards.
7.  **Reporting & Audit:** System logs, audit trails, and transaction reports.
8.  **Bank Details Management:** Manage bank information, contact details, and dynamically add/update email fields.
9.  **Crypto Wallet & Deposit Management:** Assign crypto wallet addresses (BTC, USDT, ETH, BNB), review/manage crypto deposit requests, approve/reject deposits with automatic balance crediting and email notifications.
10.  **Loan Management System:** Comprehensive dashboard, detailed loan view, payment tracking with user-submitted payments requiring admin approval, deposit verification workflow, secure atomic approval process using PostgreSQL RPC functions to prevent race conditions and ensure data integrity, automatic balance updates, audit logging, and email notifications. Includes integration with a treasury account system for loan requirement deposits.
11. **Transfers Management:** Dedicated page for managing all user transfers (internal, between accounts, wire).

## External Dependencies
*   **Supabase:** Database (PostgreSQL), Authentication, and Row Level Security.
*   **Next.js:** Full-stack framework.
*   **React:** Frontend library.
*   **CSS Modules:** For styling.