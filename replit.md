# Oakline Bank Admin Panel

## Overview
The Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. Its core purpose is to provide comprehensive administrative functionality for managing various banking operations including users, accounts, transactions, cards, applications, and loans. The platform aims to streamline bank operations, enhance security, and offer robust tools for financial oversight and customer service, enabling efficient management of financial data and user interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
**Framework & Technologies:** Next.js 14, React, CSS Modules.
**Design Patterns:** Mobile-first responsive design, component-based architecture, Context API for authentication, protected routes. Consistent professional UI with modern gradients, hover effects, responsive fonts, tab-based filtering, confirmation modals, and visual feedback.
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
4.  **Transaction Management:** View, create, process bulk, and reverse transactions.
5.  **Card Management:** Issue debit/credit cards with immediate email notifications, manage statuses, process applications, and assign cards.
6.  **Reporting & Audit:** System logs, audit trails, transaction reports, email delivery tracking, and storage diagnostics.
7.  **Bank Details Management:** Manage bank information, contact details, and dynamically update email fields.
8.  **Crypto Wallet & Deposit Management:** Assign crypto wallet addresses, review/manage crypto deposit requests, approve/reject deposits with automatic balance crediting and email notifications.
9.  **Loan Management System:** Comprehensive dashboard, detailed loan view, payment tracking with admin approval, deposit verification, secure atomic approval processes, automatic balance updates, and email notifications.
10. **Wire Transfer Management:** Professional interface for oversight, including statistics dashboard, advanced filtering, and a complete action suite (approve, reject, cancel, reverse, hold, release, complete) with automated email notifications.
11. **Timestamp Editor:** Bulk update functionality for user timestamps with multi-select filters and date/datetime toggle.
12. **Account Restriction Reasons Management:** Complete CRUD interface for managing account restriction reasons, including categorization, severity, contact email management, search/filter, and integration with the security dashboard.
13. **Account Restoration Reasons Management:** Manage reasons for restoring user access (unban, lift suspension, unlock, reactivate) with predefined categories and action types.
14. **Oakline Pay Management System:** Complete payment and tag management dashboard. This includes managing Oakline Tags (profiles, activation/deactivation, search) and Payment History (status updates, refund system, search/filter, bulk delete).
15. **Pending Claims Management:** Dual-action workflow for card payment claims (Complete/Cancel for submitted; Approve/Reject for pending approval), featuring professional debit card visual display, organized claim/verification sections, bulk operations, and automatic email notifications.
16. **Investment Management:** Comprehensive product and investment management, including editing current values and statuses, activating/closing investments, and managing products (create, edit, activate/deactivate, delete). Includes analytics for performance summary.
17. **Admin Navigation:** A global `AdminNavBar` component provides a dropdown menu with all admin pages and global search functionality.
18. **Session Handling:** Token refresh interval changed to 2 minutes with proactive refresh on focus and improved error handling for specific refresh token errors.
19. **Account Mode Management:** Freeze/unfreeze user accounts and set/remove unlimited mode. Includes filtering by status, reason tracking, admin audit fields, and confirmation modals. Located at `/admin/manage-account-modes`.

## External Dependencies
*   **Supabase:** Database (PostgreSQL), Authentication, and Row Level Security.
*   **Next.js:** Full-stack framework.
*   **React:** Frontend library.
*   **CSS Modules:** For styling.
*   **Resend/SendGrid:** Email delivery services with automatic fallback.