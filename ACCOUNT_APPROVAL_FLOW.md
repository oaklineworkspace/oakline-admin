# Professional Account Approval Flow

## Overview
This document outlines the professional, multi-stage account approval process for Oakline Bank. The flow separates application approval from account activation, ensuring proper verification and funding requirements are met.

## Flow Stages

### 1️⃣ **Application Submission & Review**
**Admin Page:** `/admin/approve-applications`

- User submits an account application through the public-facing form
- Application enters the system with status: `pending`
- Admin reviews the application details:
  - Personal information
  - Employment status
  - Requested account types
  - Identity verification (if available)

---

### 2️⃣ **Application Approval**
**Admin Page:** `/admin/approve-applications`  
**API Endpoint:** `/api/admin/approve-application`

When an admin **approves** an application:

1. **User Account Created:**
   - Creates Supabase Auth user (if doesn't exist)
   - Generates temporary password
   - Creates user profile record

2. **Bank Accounts Created:**
   - For each requested account type, creates an account record
   - **Account Status Logic:**
     - If `min_deposit > 0`: Status = **`pending_funding`** (requires deposit before activation)
     - If `min_deposit = 0`: Status = **`approved`** (ready for admin activation)
   
3. **Debit Cards Issued:**
   - Cards are only issued for accounts with status `approved` (no deposit required)
   - Cards for `pending_funding` accounts are created after funding is confirmed

4. **Email Notification:**
   - Welcome email sent with temporary credentials
   - Lists active accounts and pending funding requirements
   - User can log in but cannot use pending_funding accounts yet

**Result:**
- Application status → `approved`
- Accounts created with appropriate status
- User has login credentials

---

### 3️⃣ **Account Funding (For Accounts Requiring Minimum Deposit)**
**Admin Page:** `/admin/approve-funding`  
**API Endpoint:** `/api/admin/confirm-account-funding`

For accounts in **`pending_funding`** status:

1. **User Makes Deposit:**
   - User deposits cryptocurrency or funds
   - Deposit tracked in `account_opening_crypto_deposits` table
   - Deposit status: `pending` → `under_review` → `approved` → `completed`

2. **Admin Monitors Deposits:**
   - View `/admin/approve-funding` page
   - See all accounts awaiting funding
   - Track total deposited vs. required minimum
   - View deposit history and transaction details

3. **Admin Confirms Funding:**
   - When `total_deposited >= min_deposit`:
     - "Confirm & Activate" button becomes available
   - Admin clicks to confirm
   - Account status changes: **`pending_funding` → `active`**
   - Fields updated:
     - `funding_confirmed_by` = admin user ID
     - `funding_confirmed_at` = current timestamp
   - Account activation email sent to user

---

### 4️⃣ **Account Activation (For Zero-Deposit Accounts)**
**Admin Page:** `/admin/approve-accounts` OR `/admin/manage-accounts`  
**API Endpoint:** `/api/admin/update-account-status`

For accounts in **`approved`** status (no minimum deposit required):

1. **Admin Reviews Account:**
   - Verify all application details are correct
   - Confirm user identity if needed
   - Check for any compliance requirements

2. **Admin Activates Account:**
   - Manually change status: **`approved` → `active`**
   - Account becomes fully operational
   - User can now perform all banking operations

---

## Account Status Transitions

```
Application Submitted
       ↓
  [Admin Reviews]
       ↓
Application Approved
       ↓
    ┌─────────────────────────┐
    │                         │
    ↓                         ↓
min_deposit > 0          min_deposit = 0
    ↓                         ↓
pending_funding            approved
    ↓                         ↓
[User Deposits]        [Admin Activates]
    ↓                         ↓
[Admin Confirms]              │
    ↓                         │
    └──────→ active ←─────────┘
```

## Valid Account Statuses

Based on your schema:
- **`pending_application`** - Awaiting application approval
- **`approved`** - Application approved, account created, awaiting activation (no deposit required)
- **`pending_funding`** - Awaiting minimum deposit confirmation
- **`active`** - Fully operational account
- **`rejected`** - Application or account rejected

## Admin Roles & Responsibilities

### Application Approval Admin
- **Page:** `/admin/approve-applications`
- **Responsibilities:**
  - Review and approve/reject applications
  - Create user accounts and profiles
  - Set up initial bank accounts
  - Issue temporary credentials

### Account Funding Admin
- **Page:** `/admin/approve-funding`
- **Responsibilities:**
  - Monitor deposit progress
  - Verify minimum deposit requirements met
  - Confirm funding and activate accounts
  - Track cryptocurrency deposits

### Account Management Admin
- **Page:** `/admin/manage-accounts`
- **Responsibilities:**
  - Activate zero-deposit accounts
  - Update account statuses
  - Handle account maintenance
  - Manage account settings

## Document Verification Issue & Solution

### Problem Identified
Your Supabase storage bucket **`documents`** contains 5 uploaded files, but the admin page **"View User Documents"** shows no documents.

### Root Cause
Files exist in storage, but the **`user_id_documents`** table is empty. The table needs records that reference the storage files.

### Solution
1. **Use Storage Diagnostics Page:**
   - Navigate to: `/admin/storage-diagnostics`
   - View files in storage bucket vs. database records
   - Identify orphaned files (in storage but not in database)

2. **Fix Missing Database Records:**
   - Ensure users upload documents through proper API endpoint
   - API must create BOTH:
     - Storage file upload
     - Database record in `user_id_documents` table
   
3. **Required Fields in `user_id_documents`:**
   ```sql
   user_id (UUID)
   document_type (TEXT)
   front_url (TEXT) - path to file in storage
   back_url (TEXT) - path to file in storage  
   status (TEXT) - 'pending', 'verified', 'rejected'
   created_at (TIMESTAMP)
   ```

4. **Proper File URL Format:**
   - Store relative path: `user-id/filename.jpg`
   - OR full URL: `.../storage/v1/object/public/documents/filename.jpg`
   - System will extract filename and generate signed URLs

## Key API Endpoints

| Endpoint | Purpose | Required Status |
|----------|---------|-----------------|
| `/api/admin/approve-application` | Approve application, create accounts | Application: `pending` |
| `/api/admin/confirm-account-funding` | Confirm deposit, activate account | Account: `pending_funding` |
| `/api/admin/update-account-status` | Change account status | Any account status |
| `/api/admin/get-accounts?status=pending_funding` | List accounts awaiting funding | - |
| `/api/admin/get-accounts?status=approved` | List accounts ready for activation | - |
| `/api/admin/list-storage-files` | Diagnose storage/database sync | - |

## Best Practices

1. **Clear Separation of Duties:**
   - Different admins for application approval vs. account activation
   - Reduces fraud and ensures proper verification

2. **Audit Trail:**
   - All status changes logged in `audit_logs` table
   - Track who approved, who activated, and when
   - Fields: `approved_by`, `approved_at`, `funding_confirmed_by`, `funding_confirmed_at`

3. **User Communication:**
   - Send emails at each stage
   - Clear instructions about next steps
   - Deposit requirements clearly communicated

4. **Minimum Deposit Tracking:**
   - Automatically calculate total deposits
   - Prevent activation until requirement met
   - Support multiple deposit methods (crypto, ACH, wire)

## Quick Reference

### "I want to approve an application"
→ Go to `/admin/approve-applications` → Select application → Click "Approve"

### "I want to activate an account that needs a deposit"
→ Go to `/admin/approve-funding` → Verify deposit met → Click "Confirm & Activate"

### "I want to activate a zero-deposit account"
→ Go to `/admin/manage-accounts` → Find account with status "approved" → Change to "active"

### "I want to see why documents aren't showing"
→ Go to `/admin/storage-diagnostics` → Check if files in storage match database records

---

## Recent Updates

✅ **Updated:** `pages/api/admin/update-account-status.js`
- Now uses correct schema statuses
- Added admin authentication
- Added audit logging
- Added rejection reason support

✅ **Created:** `pages/api/admin/list-storage-files.js`
- Lists files in Supabase storage bucket
- Compares storage files vs. database records
- Identifies orphaned files

✅ **Created:** `pages/admin/storage-diagnostics.js`
- Admin page to diagnose document issues
- Shows files in storage bucket
- Shows database records
- Highlights mismatches

✅ **Fixed:** Vercel deployment issue
- Removed duplicate code in `verify-id-document.js`

---

*Last Updated: 2025-01-07*
