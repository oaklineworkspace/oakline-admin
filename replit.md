# Oakline Bank Admin Panel

## Overview
The Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. Its core purpose is to provide comprehensive administrative functionality for managing various banking operations including users, accounts, transactions, cards, applications, and loans. The platform aims to streamline bank operations, enhance security, and offer robust tools for financial oversight and customer service. It enables efficient management of account requests, loan processes, wire transfers, and ensures secure handling of financial data and user interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
**Framework & Technologies:** Next.js 14.2.3, React 18.2.0, CSS Modules, Custom CSS.
**Design Patterns:** Mobile-first responsive design, component-based architecture, Context API for authentication, protected routes for admin access. UI components include AdminNavDropdown, AdminPageDropdown, AdminFooter, and validated form components.
**State Management:** React Context API for admin authentication, `useState` for local component state, Supabase for admin session management.
**UI/UX Decisions:** Consistent professional UI across admin pages, modern gradient buttons, hover effects, responsive font sizes, tab-based filtering, confirmation modals for critical actions, and visual feedback for deposit completion.

### Routing Architecture
**Route Organization:** The root (`/`) serves as the Admin Dashboard login and navigation hub. All administrative routes are nested under `/admin/*`, managing bank operations.
**Authentication Flow:** Admin users log in and are redirected to the Admin Navigation Center. All routes require admin authentication with role-based access control.

### Backend
**Framework:** Next.js API Routes.
**Database:** Supabase (PostgreSQL) with Row Level Security.
**Authentication:** Supabase Auth with admin-only policies.
**Key API Endpoints:** All administrative operations are handled via `/api/admin/*` endpoints.

### Admin Features
1.  **User Management:** Create, view, delete, and manage user enrollment, including enhanced banning functionality with session termination, force logout, and comprehensive logging.
2.  **Account Management:** Approve pending accounts, manage statuses, update information, and process additional account requests with automated account creation, card issuance, and email notifications. This includes a multi-stage account approval process.
3.  **Application Processing:** Review, approve/reject user and card applications.
4.  **Transaction Management:** View, create, process bulk, and reverse transactions. Includes enhanced security for transaction deletion.
5.  **Card Management:** Issue, manage statuses, process applications, and assign cards.
6.  **Reporting & Audit:** System logs, audit trails, and transaction reports. This includes a new `email_logs` table for tracking all email delivery and a storage diagnostics tool for identifying orphaned files.
7.  **Bank Details Management:** Manage bank information, contact details, and dynamically add/update email fields.
8.  **Crypto Wallet & Deposit Management:** Assign crypto wallet addresses, review/manage crypto deposit requests, approve/reject deposits with automatic balance crediting and email notifications, ensuring database constraint alignment.
9.  **Loan Management System:** Comprehensive dashboard, detailed loan view, payment tracking with user-submitted payments requiring admin approval, deposit verification workflow, secure atomic approval process using PostgreSQL RPC functions, automatic balance updates, and email notifications. This includes integration with a treasury account system for loan requirement deposits and a separate loan approval from disbursement.
10. **Wire Transfer Management:** Professional interface for oversight, including statistics dashboard, advanced filtering, and a complete action suite (approve, reject, cancel, reverse, hold, release, complete) with automated email notifications and database trigger functions for data integrity.
11. **Timestamp Editor:** Professional bulk update functionality for user timestamps with multi-select filters and date/datetime toggle.
12. **Account Restriction Reasons Management:** Complete CRUD interface for managing professional account restriction reasons used in security actions (ban, lock, suspend, close accounts). Includes categorization, severity levels, contact email management, search/filter capabilities, and integration with the security dashboard. All reasons stored in database with appropriate bank contact emails.
13. **Account Restoration Reasons Management:** New table for managing reasons for restoring user access (unban, lift suspension, unlock, reactivate). Supports multiple action types with predefined categories including appeals, compliance, legal, security, and technical reasons. Enables consistent documentation of why accounts are being restored.
14. **Oakline Pay Management System:** Complete payment and tag management dashboard with professional interface. Features include:
    - **Oakline Tags Management:** Tag profiles, activation/deactivation, search and filtering
    - **Payment History:** Payment status updates with automatic user account crediting (complete action), full/partial refund system with reason tracking, advanced search/filter by recipient/reference, select-all/individual payment selection with visual highlighting, bulk delete functionality with confirmation dialogs
    - **Pending Claims Management (ENHANCED):** Complete dual-action workflow for card payment claims:
      * **Card Details Submitted Status:** Complete/Cancel buttons to process submitted card payments
      * **Pending Approval Status:** Approve/Reject buttons for claim approval workflow
      * Professional debit card visual display with:
        - Gradient blue card design (Oakline branded)
        - Gold chip element
        - Card number formatted in groups of 4
        - Cardholder name, expiry date, and CVV displayed on card
        - Realistic card styling with shadows and professional appearance
      * Complete card details visibility for payment processing (card number, CVV, SSN fully visible)
      * Organized claim and verification information sections below the card
      * Bulk selection with select-all checkbox functionality
      * Bulk Complete/Cancel and Approve/Reject operations with visual confirmation
      * Automatic email notifications for all actions (Complete, Cancel, Approve, Reject)
      * Email templates with claim/payment details (amount, cardholder name, card last 4 digits, claim token, recipient email)
      * Search/filtering capabilities by email, token, or sender name
      * Status tracking and approval status indicators

## Database Schema Updates

### Recent Changes (Nov 29, 2025) - Card Issuance Enhancement ✓
- **Issue 1:** Debit card issuance modal was not saving the cardholder name to the database
  - **Root Cause:** The `issue-card.js` API endpoint was missing `cardholder_name: cardholderName` in the database insert
  - **Fix Applied:** Added `cardholder_name` field to the card insert operation in `/api/admin/issue-card.js`
  - **Result:** Cards now successfully issue with all information including cardholder name

- **Issue 2:** Account numbers were not displaying properly when admin selected a user during card issuance
  - **Root Cause:** The `get-accounts.js` API was not filtering by the selected `userId` parameter
  - **Fixes Applied:**
    * Updated `/api/admin/get-accounts.js` to accept and filter by `userId` query parameter
    * Enhanced `/admin/manage-cards.js` to show account selection only after user is selected
    * Improved account display format: `Account Number - Type - Balance: $amount`
    * Added helpful loading message when accounts are being fetched
  - **Result:** Admins now see the selected user's active accounts with clear, formatted details

### Recent Changes (Nov 28, 2025) - Data Fetching, Button Actions & Email Notifications ✓
- **Data Source Correction:** Removed non-existent `applications` table query; now fetches exclusively from:
  * `oakline_pay_profiles` (Oakline Tags management)
  * `oakline_pay_transactions` (Payment history)
  * `oakline_pay_pending_claims` (Pending payment claims - 15 test records loaded)
- **Oakline Pay Pending Claims Table:** Fetches complete claim history with all 15 records loading successfully
  * Status values: pending, sent, claimed, expired
  * Approval status: pending, approved, rejected
  * Card details: card_number, card_expiry, card_cvv, cardholder_name, billing info, SSN, date_of_birth
- **Admin Integration:** Enhanced "Pending Claims" tab with:
  * Accurate total claim volume calculation from claims.length (showing 15 total)
  * Correct status badge display: PENDING (yellow), CLAIMED (green), EXPIRED (red)
  * Single workflow: Status='pending' or 'sent' with approval_status≠'approved' → Complete/Cancel buttons
  * All actions trigger automated email notifications with proper error handling and user feedback
  * Bulk actions available: Complete/Cancel multiple claims with visual confirmation
- **Action Button Improvements:** Complete/Cancel buttons now:
  * Display proper status (shows "Processing..." while loading)
  * Provide clear feedback: ✅ Success message with confirmation, ❌ Error message with details
  * Update claim status to 'claimed'/'approved' on Complete action
  * Update to 'expired'/'rejected' on Cancel action
  * Automatically refresh data after successful action with slight delay
- **Email Notifications (Improved):**
  * Complete: "Your Card Payment Has Been Completed" - payment processed successfully
  * Cancel: "Your Card Payment Request Was Not Processed - Try Alternative Methods" - includes recommendations to:
    - Use a different debit card
    - Link bank account directly
    - Open an Oakline Bank account
    - Contact support for assistance
  * All emails include payment details (amount, card last 4, recipient, date) and support contact info
- **Error Handling:** Enhanced to catch and display API errors with specific failure reasons
- **UI/UX Improvements (Nov 28, 2025):**
  * Loading spinner on buttons: "⏳ Processing..." during action execution
  * Success/Error banner styled like admin/verifications (professional modal with gradient header)
  * Green gradient banner with "✅ Success" for successful actions
  * Red banner with "❌ Error" for failures
  * Auto-dismisses after 2 seconds (success) or 5 seconds (errors)
  * Modal auto-closes on successful action completion
  * Data automatically refreshes after action
  * **Email Recipients Fixed:** Emails sent to `sender_contact` (cardholder who submitted card) instead of just recipient email

### Profiles Table Display Messages
**Column Strategy:** The `ban_display_message` column currently serves as a multi-purpose display message column for all account restriction statuses (ban, suspend, close). To improve clarity and future maintainability:
- **Recommended Action:** Rename `ban_display_message` to `restriction_display_message` to accurately reflect its broader usage across all restriction types (bans, suspensions, closures)
- **Current Usage:** Stores display messages for banned, suspended, and closed accounts
- **Future Enhancement:** Could add separate `suspension_end_date` field to calculate auto-lift messages when suspension expires

### Pre-defined Restriction Reasons
The system includes professional pre-configured reasons in the `account_restriction_reasons` table:
- **Suspension Security Reason (High Priority):** "For your protection, your account has been temporarily suspended due to unusual login activity, which may indicate a security risk or unauthorized sharing of credentials." (security@theoaklinebank.com)

### Restoration Reasons Table
The `account_restoration_reasons` table stores predefined reasons for restoring user access with categories: Appeals, Compliance, Legal, Security, and Technical. Action types include: unban_user, lift_suspension, unlock_account, reactivate_account.

## External Dependencies
*   **Supabase:** Database (PostgreSQL), Authentication, and Row Level Security.
*   **Next.js:** Full-stack framework.
*   **React:** Frontend library.
*   **CSS Modules:** For styling.
*   **Resend/SendGrid:** Email delivery services with automatic fallback.
