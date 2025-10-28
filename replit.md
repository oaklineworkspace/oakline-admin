# Oakline Bank Admin Panel

## Overview

Oakline Bank Admin Panel is a secure, full-stack banking administration platform built with Next.js 14. It provides comprehensive management of users, accounts, transactions, cards, and applications. The system features a modern, mobile-first interface with real-time updates, protected routes, and advanced security measures. It functions as both a customer-facing banking portal and an administrative control panel, enabling bank staff to manage customer accounts, approve applications, issue cards, process transactions, and monitor system activity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Framework & Technologies:** Next.js 14.2.3, React 18.2.0, CSS Modules, Custom CSS.

**Design Patterns:** Mobile-first responsive design, component-based architecture, Context API for authentication, protected routes, lazy loading, memoization.

**Key UI Components:** Interactive DebitCard, LiveChat, responsive MainMenu, StickyFooter, AdminDropdown, and validated form components.

**State Management:** React Context API for global authentication, `useState` for local component state, session storage for enrollment flow, Supabase for admin session management.

### Backend

**API Layer:** Next.js API routes with a RESTful structure, organized by domain. Features include CORS middleware and a service-oriented architecture.

**Authentication & Authorization:** Supabase Auth for user authentication (email/password, magic links), role-based access control (admin, super_admin, manager) via `admin_profiles` table, and AdminAuth component for route protection. Supports MFA for admin accounts and session-based authentication with timeouts.

**Security Measures:** Password strength validation, account lockout, session timeout, API rate limiting, XSS protection (using `xss` library), input validation (`validator`, `zod`), encrypted data storage (AES-256-GCM), and SIEM integration.

**Email System:** Nodemailer for transactional emails with professional templates (enrollment, password reset, notifications), integrated with Zoho email.

### Data Storage

**Primary Database:** Supabase (PostgreSQL).

**Schema Structure:**
- `accounts`: User bank accounts, linked to `auth.users` and `applications`, supporting multiple types, balance tracking, and status management. Routing number: 075915826.
- `admin_profiles`: Admin user roles and permissions, linked to `auth.users`, with a role hierarchy.
- `applications`: Account opening applications with comprehensive KYC data, multi-account type support, and a detailed status workflow.
- Additional tables for `cards/debit_cards`, `transactions`, `zelle_transactions`, and `profiles`.

**Data Relationships:** One-to-many relationships between Users and Applications, Applications and Accounts, Users and Accounts, Users and Cards, and Accounts and Transactions.

**Client Libraries:** `@supabase/supabase-js` for client-side operations, separate admin client with service role key, and real-time subscription capabilities.

### System Design Choices

- **Deployment:** Deployed on Replit, configured with 0.0.0.0 host binding and port 5000.
- **Environment:** Environment variables configured via Replit Secrets.
- **Cache Control:** Next.js configured with cache-control headers.
- **Feature Flags:** Environment-based feature flags for crypto, investments, loans, and notifications.

## External Dependencies

**Payment Processing:**
- **Stripe** (v18.5.0): For payment processing, card management, and merchant services.
  - `@stripe/stripe-js`, `@stripe/react-stripe-js`

**Authentication & Database:**
- **Supabase**: BaaS platform providing PostgreSQL, authentication service with JWT, real-time subscriptions, RLS policies, and storage.

**Form Management:**
- **React Hook Form** (v7.62.0): For form state and validation.
- **@hookform/resolvers** (v5.2.1)
- **Zod** (v4.1.5): TypeScript-first schema validation.

**Data Fetching:**
- **TanStack React Query** (v5.87.4): For server state management, caching, background refetching, and optimistic updates.

**Security & Validation:**
- **bcryptjs** (v3.0.2): Password hashing.
- **validator** (v13.15.15): String validation utilities.
- **xss** (v1.0.15): XSS sanitization.

**Email Service:**
- **Nodemailer** (v6.9.0): Email sending via SMTP, integrated with Zoho email.

**Development Tools:**
- **ESLint** (v8.57.0)
- **eslint-config-next** (v14.2.3)