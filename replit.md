# Oakline Bank Admin Panel

## Overview
The Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. Its core purpose is to provide comprehensive administrative functionality for managing various banking operations including users, accounts, transactions, cards, applications, and loans. The platform aims to streamline bank operations, enhance security, and offer robust tools for financial oversight and customer service, enabling efficient management of financial data and user interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
**Framework & Technologies:** Next.js 14.2.3, React 18.2.0, CSS Modules.
**Design Patterns:** Mobile-first responsive design, component-based architecture, Context API for authentication, protected routes. Consistent professional UI, modern gradient buttons, hover effects, responsive fonts, tab-based filtering, confirmation modals, and visual feedback.
**State Management:** React Context API for admin authentication, `useState` for local component state, Supabase for admin session management.

### Routing Architecture
**Route Organization:** Root (`/`) serves as the Admin Dashboard login. All administrative routes are nested under `/admin/*`.
**Authentication Flow:** Admin users log in and are redirected to the Admin Navigation Center. All routes require admin authentication with role-based access control.

### Backend
**Framework:** Next.js API Routes.
**Database:** Supabase (PostgreSQL) with Row Level Security.
**Authentication:** Supabase Auth with admin-only policies.
**Key API Endpoints:** All administrative operations are handled via `/api/admin/*` endpoints.

### Admin Features
1.  **User Management:** Create, view, delete, and manage user enrollment, including enhanced banning functionality with session termination, force logout, and comprehensive logging.
2.  **Account Management:** Approve pending accounts, manage statuses, update information, and process additional account requests with automated creation, card issuance, and email notifications.
3.  **Application Processing:** Review, approve/reject user and card applications.
4.  **Transaction Management:** View, create, process bulk, and reverse transactions with enhanced security for deletion.
5.  **Card Management:** Issue debit/credit cards with immediate email notifications to users, manage statuses, process applications, and assign cards. Users receive professional email with card details, limits, and security tips immediately upon issuance.
6.  **Reporting & Audit:** System logs, audit trails, transaction reports, email delivery tracking, and storage diagnostics.
7.  **Bank Details Management:** Manage bank information, contact details, and dynamically add/update email fields.
8.  **Crypto Wallet & Deposit Management:** Assign crypto wallet addresses, review/manage crypto deposit requests, approve/reject deposits with automatic balance crediting and email notifications.
9.  **Loan Management System:** Comprehensive dashboard, detailed loan view, payment tracking with user-submitted payments requiring admin approval, deposit verification, secure atomic approval process using PostgreSQL RPC functions, automatic balance updates, and email notifications.
10. **Wire Transfer Management:** Professional interface for oversight, including statistics dashboard, advanced filtering, and a complete action suite (approve, reject, cancel, reverse, hold, release, complete) with automated email notifications and database trigger functions.
11. **Timestamp Editor:** Professional bulk update functionality for user timestamps with multi-select filters and date/datetime toggle.
12. **Account Restriction Reasons Management:** Complete CRUD interface for managing professional account restriction reasons, including categorization, severity, contact email management, search/filter, and integration with the security dashboard. The `ban_display_message` column should be renamed to `restriction_display_message`.
13. **Account Restoration Reasons Management:** Manage reasons for restoring user access (unban, lift suspension, unlock, reactivate) with predefined categories (Appeals, Compliance, Legal, Security, Technical) and action types.
14. **Oakline Pay Management System:** Complete payment and tag management dashboard.
    - **Oakline Tags Management:** Tag profiles, activation/deactivation, search and filtering.
    - **Payment History:** Payment status updates with automatic user account crediting, full/partial refund system, advanced search/filter, bulk delete.
    - **Pending Claims Management:** Dual-action workflow for card payment claims (Complete/Cancel for submitted; Approve/Reject for pending approval). Features professional debit card visual display with complete card details visibility, organized claim/verification sections, bulk selection, bulk operations with visual confirmation, and automatic email notifications for all actions.

## External Dependencies
*   **Supabase:** Database (PostgreSQL), Authentication, and Row Level Security.
*   **Next.js:** Full-stack framework.
*   **React:** Frontend library.
*   **CSS Modules:** For styling.
*   **Resend/SendGrid:** Email delivery services with automatic fallback.
## Recent Enhancements (Nov 29, 2025)

### Card Issuance with Email Notifications ✓
- **Feature:** Admins can issue debit cards for user accounts through manage-cards page
- **Immediate Email Notification:** User receives professional email immediately when admin issues a card
- **Email Template Features:**
  - Green gradient header matching brand colors
  - Card details: type, last 4 digits, expiry date, linked account
  - Transaction limits: daily and monthly
  - Security tips and warnings
  - Call-to-action to access online banking
  - 24/7 customer support contact information
- **Technical Implementation:**
  - New email template at `pages/api/email/send-card-issued-email.js`
  - Issue-card API automatically sends email after successful card creation
  - Non-blocking: email failure doesn't prevent card issuance
  - Uses existing SMTP configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)

### Card Issuance UI Improvements ✓
- Professional success/error banners with auto-dismiss timers
- Loading spinner overlay during card processing
- Account number display: full numbers (305224016184) for active accounts only
- Error details shown to admin for troubleshooting
- Consistent design with admin/verifications page

## Recent Enhancements (Dec 02, 2025)

### Loan Payment Management Improvements ✓
- **Payment Proof Loading Fixed:** Corrected storage bucket reference to use `documents` bucket via `/api/admin/get-proof-url` API
- **Quick Action Buttons:** Added inline Approve/Reject buttons on payment cards for streamlined admin workflow
- **Enhanced UX:** Loading spinners with processing state indicators during approve/reject actions
- **Success/Error Banners:** Professional animated banners with slideIn/slideOut animations and auto-dismiss timers

### Email Notifications for Loan Payments ✓
- **Approval Emails:** Users receive professional HTML emails when payments are approved
- **Rejection Emails:** Users receive notification with rejection reason when payments are declined
- **Template Features:**
  - Bank-branded gradient header
  - Payment details: amount, loan type, reference number
  - Status indicator with color-coded badges
  - For approvals: remaining balance, months covered, next payment date
  - For rejections: clear reason and support contact
  - Call-to-action to view loan details in dashboard

### Treasury Crediting for All Payment Types ✓
- **Deposit Handling:** 10% loan deposits are now properly credited to treasury account
- **All Methods Supported:** Treasury crediting works for account balance, crypto, and wire payments
- **Loan Activation:** Deposits automatically activate pending loans upon approval
- **Transaction Tracking:** Complete metadata and transaction logging for audit trail

## Recent Enhancements (Dec 03, 2025)

### Loan Payment Modal UX Fixes ✓
- **Action State Tracking:** Added `modalState.actionType` to properly track approve/reject action independently from form state
- **Loading State Display:** Modal loading spinner correctly shows "Approving payment..." or "Rejecting payment..." based on actual action
- **Success State Display:** Modal success state shows correct icon and message matching the action taken
- **Form State Isolation:** Each modal session starts clean with proper form/state resets
- **Quick Reject Flow:** Opens modal with reject pre-selected, requiring admin to provide rejection reason
- **Validation:** Reject action requires non-empty rejection reason before submission
- **Refund Processing:** Rejected payments automatically refund user account with full transaction logging

## Recent Enhancements (Dec 04, 2025)

### Loan Payment Status Dropdown Fix ✓
- **targetStatus Parameter:** Frontend now passes the admin-selected status to the API
- **Correct Status Transitions:** Selecting "completed" sets status to "completed", not "approved"
- **Success Messages:** Distinct confirmation messages for approved vs completed status

### Treasury Fee Crediting with Idempotency ✓
- **Unique Reference Keys:** Each treasury credit uses `TRSRY-FEE-{paymentId}` as idempotency key
- **Double-Credit Prevention:** System checks for existing transactions before crediting
- **Duplicate Handling:** Both pre-check and database constraint (23505 error) handled gracefully
- **Order of Operations:** Transaction record created before balance update for safety
- **10% Fee Calculation:** Only applies to deposit payments (`is_deposit === true`)

## Recent Enhancements (Dec 15, 2025)

### Loan Deposit Status Sync Fix ✓
- **Issue:** Admin-loans page was not detecting when 10% loan deposit status changed to "completed" in loan-payments
- **Fix:** When approving a deposit payment, the system now updates the `loans` table with:
  - `deposit_status: 'completed'`
  - `deposit_paid: true`
  - `deposit_amount` (amount paid)
  - `deposit_date` (timestamp)
  - `deposit_method` (preserved from payment or existing loan)
- **Metadata Handling:** Supports plain JSON, stringified JSON, and double-stringified JSON metadata
- **Loan ID Resolution:** Checks multiple sources: `payment.loan_id`, `payment.loans.id`, `metadata.loan_id`, `metadata.loanId`, `metadata.loan.id`
- **Method Preservation:** Fetches existing loan to preserve deposit_method if payment doesn't specify one

### Account Types Authorization Fix ✓
- **Issue:** Manage Account Types page was showing "no authorization" error
- **Fix:** Added proper Authorization headers with session access token to all API calls:
  - `fetchAccountTypes()` - GET request to list account types
  - `handleSubmit()` - POST request to save/update account types
  - `handleDelete()` - POST request to delete account types
- **Pattern:** Now matches other authenticated admin pages using `supabase.auth.getSession()`
