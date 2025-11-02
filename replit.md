# Oakline Bank Admin Panel

## Overview
Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. Its primary purpose is to provide comprehensive administrative functionality for managing users, accounts, transactions, cards, applications, and loans. The platform aims to streamline bank operations, enhance security, and offer robust tools for financial oversight and customer service.

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
9.  **Loan Management System:** Comprehensive dashboard, detailed loan view, payment tracking, deposit verification workflow, secure approval process with automatic disbursement, transaction integrity (optimistic locking, automatic rollback), audit logging, and email notifications. Includes integration with a treasury account system for loan requirement deposits.
10. **Transfers Management:** Dedicated page for managing all user transfers (internal, between accounts, wire).

## External Dependencies
*   **Supabase:** Database (PostgreSQL), Authentication, and Row Level Security.
*   **Next.js:** Full-stack framework.
*   **React:** Frontend library.
*   **CSS Modules:** For styling.