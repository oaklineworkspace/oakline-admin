# Account Restriction Reasons - Database Setup Guide

## Overview
This feature enhances your admin security dashboard by storing account restriction reasons in a Supabase database table. Each reason includes professional language and the appropriate contact email from your bank details so affected users know how to reach out.

## What Was Created

### 1. Database Table: `account_restriction_reasons`
A comprehensive table that stores predefined professional reasons for various account restriction actions:
- **ban_user** - Permanent account bans
- **lock_account** - Temporary account locks
- **force_password_reset** - Password reset requirements
- **sign_out_all_devices** - Session terminations
- **suspend_account** - Account suspensions
- **close_account** - Account closures

### 2. API Endpoint: `/api/admin/get-restriction-reasons`
A secure admin-only API endpoint that:
- Fetches restriction reasons from the database
- Groups reasons by action type and category
- Returns professional messaging with contact emails
- Supports filtering by specific action types

### 3. Updated Security Dashboard
The admin security dashboard now:
- Fetches reasons from the database on load
- Falls back to hardcoded reasons if database fetch fails
- Uses professional language with appropriate contact emails
- Maintains backward compatibility

## Setup Instructions

### Step 1: Run the SQL Script in Supabase

1. **Log in to your Supabase project dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and run the SQL script**
   - Open the file: `create_account_restriction_reasons_table.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Return` (Mac)

4. **Verify the table was created**
   - Go to "Table Editor" in the left sidebar
   - Look for the `account_restriction_reasons` table
   - You should see approximately 140+ rows of professional reasons

### Step 2: Verify Bank Details Email Configuration

The restriction reasons reference these emails from your `bank_details` table:
- `info@theoaklinebank.com` - General information and customer service
- `contact-us@theoaklinebank.com` - Security, fraud, and compliance issues

Make sure these emails are properly configured in your `bank_details` table:

```sql
SELECT 
  email_info,
  email_contact,
  email_security,
  email_support
FROM bank_details
LIMIT 1;
```

### Step 3: Test the Integration

1. **Access the Security Dashboard**
   - Navigate to `/admin/security-dashboard`
   - Log in with admin credentials

2. **Test a security action**
   - Select any user
   - Click on a security action (e.g., "Suspend Account", "Lock Account")
   - You should see professional reasons loaded from the database
   - Each reason includes appropriate contact email

3. **Verify the API endpoint**
   - Test the API directly: `GET /api/admin/get-restriction-reasons`
   - Or filter by action: `GET /api/admin/get-restriction-reasons?action_type=ban_user`

## Database Schema Details

### Table Structure
```sql
CREATE TABLE public.account_restriction_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,  -- Type of restriction action
  category text NOT NULL,      -- Reason category
  reason_text text NOT NULL,   -- Professional message with contact email
  contact_email text NOT NULL, -- Email for affected users to reach out
  severity_level text,         -- low, medium, high, critical
  requires_immediate_action boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Example Reasons by Action Type

#### Ban User (33 reasons across 4 categories)
- Fraud & Suspicious Activity (12 reasons)
- Security Violations (11 reasons)
- Regulatory Compliance (5 reasons)
- Terms of Service Violations (5 reasons)

#### Lock Account (16 reasons across 3 categories)
- Security Concerns (6 reasons)
- Verification Required (5 reasons)
- Fraud Prevention (5 reasons)

#### Force Password Reset (10 reasons across 2 categories)
- Security Measures (6 reasons)
- Policy Compliance (4 reasons)

#### Sign Out All Devices (9 reasons across 2 categories)
- Security Response (5 reasons)
- Administrative Actions (4 reasons)

#### Suspend Account (17 reasons across 2 categories)
- Temporary Holds (12 reasons)
- Administrative Review (5 reasons)

#### Close Account (21 reasons across 2 categories)
- Administrative Closure (10 reasons)
- Compliance & Risk (11 reasons)

## Customization

### Adding New Reasons

To add custom reasons to the database:

```sql
INSERT INTO public.account_restriction_reasons 
(action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order)
VALUES
('ban_user', 'Custom Category', 'Your custom reason text. Contact our team for assistance.', 'contact-us@theoaklinebank.com', 'high', true, 100);
```

### Updating Existing Reasons

```sql
UPDATE public.account_restriction_reasons
SET 
  reason_text = 'Updated professional message text.',
  contact_email = 'security@theoaklinebank.com',
  severity_level = 'critical'
WHERE id = 'your-reason-uuid';
```

### Deactivating Reasons (without deleting)

```sql
UPDATE public.account_restriction_reasons
SET is_active = false
WHERE category = 'Old Category';
```

### Changing Contact Emails Globally

If you need to update the contact email for all reasons of a certain type:

```sql
UPDATE public.account_restriction_reasons
SET contact_email = 'new-security@theoaklinebank.com'
WHERE action_type = 'ban_user' 
AND category = 'Security Violations';
```

## Features

✅ **Professional Language** - All reasons use banking-appropriate terminology
✅ **Contact Information** - Each reason includes the right email for users to reach out
✅ **Categorized** - Reasons grouped by category for easy selection
✅ **Severity Levels** - Each reason has a severity indicator (low, medium, high, critical)
✅ **Flexible** - Easy to add, update, or deactivate reasons without code changes
✅ **Backward Compatible** - Falls back to hardcoded reasons if database unavailable
✅ **Secure** - Admin-only API endpoint with proper authentication

## Troubleshooting

### Reasons not loading in dashboard
1. Check browser console for errors
2. Verify the SQL script ran successfully
3. Ensure admin authentication is working
4. Check API endpoint response: `/api/admin/get-restriction-reasons`

### Wrong contact emails appearing
1. Verify `bank_details` table has correct emails
2. Update the restriction reasons table with correct email references
3. Refresh the security dashboard

### Database permission errors
1. Ensure your Supabase user has permissions to create tables
2. Check Row Level Security (RLS) policies if enabled
3. Verify admin_profiles table exists and has your admin user

## Benefits

1. **Easy Maintenance** - Update reasons in database without deploying code
2. **Consistency** - All admins see the same professional reasons
3. **Compliance** - Maintain audit trail of restriction reasons
4. **User Experience** - Affected users get proper contact information
5. **Flexibility** - Add/remove/modify reasons as policies change

## Next Steps

Consider enhancing this feature with:
- Email notifications to users when restrictions are applied
- Analytics on most commonly used restriction reasons
- Automated reason suggestions based on detected patterns
- Multi-language support for global operations
- Integration with compliance reporting systems

## Support

For assistance with this feature:
- Review the SQL file: `create_account_restriction_reasons_table.sql`
- Check the API endpoint: `pages/api/admin/get-restriction-reasons.js`
- Examine the dashboard: `pages/admin/security-dashboard.js`
