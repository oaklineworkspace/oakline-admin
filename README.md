
# Oakline Bank - Admin Panel

## Overview

This is the **administrative control panel** for Oakline Bank. This repository contains only admin-facing functionality for managing users, accounts, transactions, cards, and applications.

## Features

- **User Management**: Create, view, edit, and delete user accounts
- **Account Management**: Approve accounts, manage account statuses
- **Transaction Management**: Create manual transactions, process bulk transactions, view all transactions
- **Card Management**: Issue cards, manage card applications, assign cards to users
- **Application Approval**: Review and approve user applications
- **Reporting & Audit**: View system logs, generate reports, audit trails
- **Admin Authentication**: Secure admin-only access with role-based permissions

## Tech Stack

- **Frontend**: Next.js 14, React 18
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Admin-only)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Run the development server:
```bash
npm run dev
```

4. Access the admin panel at `http://localhost:5000`

## Admin Routes

- `/` - Admin Navigation Hub (login required)
- `/admin/dashboard` - Main admin dashboard
- `/admin/manage-all-users` - User management
- `/admin/approve-applications` - Application approval
- `/admin/approve-accounts` - Account approval
- `/admin/manage-accounts` - Account management
- `/admin/admin-transactions` - Transaction overview
- `/admin/manual-transactions` - Create manual transactions
- `/admin/bulk-transactions` - Bulk transaction processing
- `/admin/manage-cards` - Card management
- `/admin/issue-debit-card` - Issue new cards
- `/admin/admin-card-applications` - Card application review

## Security

- All routes are protected with admin authentication
- Role-based access control (RBAC)
- Supabase Row Level Security (RLS) policies
- Admin-only API endpoints

## Deployment

Deploy on Replit with the existing configuration. The app will be available at your Replit deployment URL.
