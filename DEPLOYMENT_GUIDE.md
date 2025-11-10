# Deployment Guide - Account Opening Deposit System

## Overview
This guide covers deploying the atomic account opening deposit completion system that ensures data integrity and prevents race conditions when admins approve deposits.

## What Was Implemented

### 1. Email Notifications
When an admin changes the status of an account opening deposit, the system now automatically sends professional HTML email notifications to the user:
- **Approved**: Notifies user their deposit was approved and is awaiting confirmations
- **Rejected**: Informs user why their deposit was rejected with admin notes
- **Completed**: Confirms deposit was credited to their account with balance details

### 2. Atomic Balance Crediting
Created a PostgreSQL RPC function that prevents duplicate credits and race conditions by:
- Locking deposit and account rows during the operation
- Checking if deposit was already completed
- Verifying no duplicate transaction exists
- Updating account balance, creating transaction record, and updating deposit status all in one atomic transaction
- Automatic rollback if any step fails

## Deployment Steps

### Step 1: Deploy the RPC Function to Supabase

1. **Navigate to your Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and execute the SQL**
   - Open the file `complete_account_opening_deposit_atomic.sql` in this repository
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify deployment**
   - After execution, you should see "Success. No rows returned"
   - The function is now deployed and ready to use

### Step 2: Configure Email Settings

The email system uses Nodemailer with Gmail SMTP. You need to configure the following environment variables:

1. **Add to your `.env.local` file** (if not already present):
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-specific-password
   ```

2. **For Gmail users:**
   - Enable 2-factor authentication on your Google account
   - Generate an App Password at https://myaccount.google.com/apppasswords
   - Use the generated 16-character password as `EMAIL_PASS`

3. **For other email providers:**
   - Update the SMTP configuration in `lib/email.js`:
     ```javascript
     const transporter = nodemailer.createTransport({
       host: 'smtp.your-provider.com',
       port: 587,
       secure: false,
       auth: {
         user: process.env.EMAIL_USER,
         pass: process.env.EMAIL_PASS
       }
     });
     ```

### Step 3: Test the System

1. **Create a test account opening deposit**
   - Navigate to `/admin/manage-account-opening-deposits`
   - Find a pending deposit

2. **Test status changes**
   - Change status to "Approved" → User should receive approval email
   - Change status to "Rejected" → User should receive rejection email
   - Change status to "Completed" → User should receive completion email AND account balance should be credited

3. **Verify balance crediting**
   - Check the user's account balance increased by the deposit amount
   - Verify a transaction record was created with type "deposit"
   - Confirm deposit status shows "completed" with timestamp

4. **Test race condition prevention**
   - Try to complete the same deposit twice rapidly
   - Second attempt should fail with "Deposit has already been completed"
   - No duplicate balance credit should occur

## Security Features

✅ **Search Path Protection**: RPC function uses `SET search_path = public` to prevent search-path hijacking attacks

✅ **Row Locking**: Uses PostgreSQL `FOR UPDATE` to prevent concurrent modifications

✅ **Duplicate Prevention**: Checks for existing transactions before crediting

✅ **Atomic Operations**: All database changes happen in one transaction (all succeed or all fail)

✅ **Admin Authentication**: API endpoint requires admin authorization

✅ **Audit Logging**: All deposit status changes are logged with admin ID and timestamp

## Files Modified/Created

### New Files
- `complete_account_opening_deposit_atomic.sql` - PostgreSQL RPC function for atomic operations
- `FRONTEND_DASHBOARD_DESIGN_PROMPT.md` - Design specifications for frontend dashboard
- `DEPLOYMENT_GUIDE.md` - This file

### Modified Files
- `pages/api/admin/update-account-opening-deposit.js` - Now uses RPC for completions and sends emails
- `lib/email.js` - Added functions for account opening deposit email notifications

## Troubleshooting

### Email not sending
- Check that `EMAIL_USER` and `EMAIL_PASS` are set in environment variables
- Verify Gmail App Password is correct (no spaces)
- Check server logs for email errors
- Ensure port 587 is not blocked by firewall

### Balance not being credited
- Verify the RPC function was deployed to Supabase
- Check that the function name matches: `complete_account_opening_deposit_atomic`
- Look for errors in server logs when changing status to "completed"
- Ensure the deposit has an `account_id` and valid `amount`

### Duplicate credit errors
- This is working as intended! The system prevents duplicate credits
- If a deposit was already completed, it cannot be completed again
- Refresh the admin page to see the current status

## Next Steps

After successful deployment:

1. **Monitor the system** for the first few deposit completions
2. **Review transaction logs** to ensure proper balance crediting
3. **Check email delivery** to confirm users receive notifications
4. **Update admin documentation** to inform staff about the new email notifications

## Support

If you encounter issues:
1. Check server logs in the dev workflow
2. Review browser console for frontend errors
3. Verify Supabase function logs in the Supabase dashboard
4. Check email provider logs for delivery issues
