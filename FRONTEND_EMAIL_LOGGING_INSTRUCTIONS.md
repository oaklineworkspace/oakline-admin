# Instructions for Frontend Repository - Email Logging Setup

## Context
Our Oakline Bank application has two repositories:
1. **Admin Repository** - Where admins manage the bank (has email logging already set up)
2. **Frontend Repository** - Where users interact with the bank (YOU ARE HERE)

Both repositories use the **same Supabase database**. 

## Problem
Currently, emails sent from this frontend repository are NOT being logged to the `email_logs` table. Only admin emails appear in the admin panel's email logs page.

## Solution Required
Implement email logging for ALL emails sent from this frontend repository so they appear in the admin panel at `/admin/email-logs`.

## Database Table Structure
The `email_logs` table already exists in Supabase with this structure:

```sql
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  subject text,
  email_type text,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);
```

## What You Need to Do

### Step 1: Create Email Logging Utility
Create a new file `lib/emailLogger.js` (or `utils/emailLogger.js` depending on your project structure) with this code:

```javascript
import { supabase } from './supabaseClient'; // Adjust path as needed

/**
 * Logs email to the email_logs table
 * Call this wrapper around your email sending function
 */
export async function sendEmailWithLogging({ 
  to, 
  subject, 
  html, 
  text,
  type = 'default',
  userId = null, // Optional: user ID if available
  sendEmailFunction // Your actual email sending function
}) {
  // Step 1: Create initial log entry with 'pending' status
  const { data: logEntry, error: logError } = await supabase
    .from('email_logs')
    .insert({
      recipient_email: to,
      recipient_user_id: userId,
      subject: subject,
      email_type: type,
      provider: 'pending',
      status: 'pending'
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to create email log entry:', logError);
  }

  try {
    // Step 2: Send the actual email
    const result = await sendEmailFunction({ to, subject, html, text, type });
    
    // Step 3: Update log with success
    if (logEntry) {
      await supabase
        .from('email_logs')
        .update({
          provider: result?.provider || 'smtp',
          status: 'sent',
          message_id: result?.messageId || result?.id
        })
        .eq('id', logEntry.id);
    }

    return result;
  } catch (error) {
    // Step 4: Update log with failure
    if (logEntry) {
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', logEntry.id);
    }

    throw error; // Re-throw so calling code can handle it
  }
}
```

### Step 2: Update All Email Sending Code
Find everywhere in your frontend repository where emails are sent and wrap those calls with `sendEmailWithLogging`.

**BEFORE (example):**
```javascript
import { sendEmail } from '../lib/email';

// Somewhere in your code
await sendEmail({
  to: user.email,
  subject: 'Welcome to Oakline Bank',
  html: emailTemplate
});
```

**AFTER:**
```javascript
import { sendEmail } from '../lib/email';
import { sendEmailWithLogging } from '../lib/emailLogger';

// Somewhere in your code
await sendEmailWithLogging({
  to: user.email,
  subject: 'Welcome to Oakline Bank',
  html: emailTemplate,
  type: 'welcome', // Options: 'welcome', 'notify', 'security', 'loans', etc.
  userId: user.id, // Optional but recommended
  sendEmailFunction: sendEmail
});
```

### Step 3: Common Email Types to Use
Use these email type values to categorize your emails (matches the admin system):

- `'welcome'` - Welcome emails for new users
- `'notify'` - General notifications
- `'security'` - Password resets, security alerts
- `'verify'` - Email verification
- `'loans'` - Loan-related emails
- `'crypto'` - Cryptocurrency transaction emails
- `'default'` - Any other email type

### Step 4: Find All Email Sending Locations
Search your codebase for:
1. `sendEmail(` - Direct email function calls
2. `nodemailer` - If using nodemailer directly
3. `fetch('/api/send` - API calls that send emails
4. Any email-related API routes in `/pages/api/`

Update ALL of these to use the logging wrapper.

### Step 5: Test
After implementing:
1. Send a test email from your frontend (e.g., trigger a password reset)
2. Check the admin panel at `/admin/email-logs`
3. Verify your frontend email appears in the logs

## Example: Complete Implementation

Here's a complete example of updating a password reset email:

**pages/api/auth/send-reset-email.js:**
```javascript
import { supabase } from '../../../lib/supabaseClient';
import { sendEmail } from '../../../lib/email';
import { sendEmailWithLogging } from '../../../lib/emailLogger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  try {
    // Get user
    const { data: user } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('email', email)
      .single();

    const resetLink = `https://yoursite.com/reset-password?token=...`;

    // Send with logging
    await sendEmailWithLogging({
      to: email,
      subject: 'Password Reset - Oakline Bank',
      html: `<p>Click here to reset: ${resetLink}</p>`,
      type: 'security',
      userId: user?.id,
      sendEmailFunction: sendEmail
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

## Important Notes

1. **Don't modify the Supabase table** - It's already created and shared between both repos
2. **Use the same email types** - This keeps logs consistent across both repositories
3. **Include userId when possible** - This helps admin track emails per user
4. **Test thoroughly** - Make sure all email paths are covered

## Verification Checklist

After implementation, verify:
- [ ] Created `lib/emailLogger.js` with logging wrapper
- [ ] Updated all email-sending code to use the wrapper
- [ ] Tested at least one email from frontend
- [ ] Confirmed email appears in admin panel at `/admin/email-logs`
- [ ] Checked that email shows correct type, status, and recipient

## Questions?

If you encounter issues:
1. Check Supabase connection is working
2. Verify `email_logs` table exists in your Supabase database
3. Check browser console for any Supabase errors
4. Ensure your Supabase client has permission to write to `email_logs` table

---

**Summary:** Wrap all email sending functions with `sendEmailWithLogging` to automatically log emails to the shared `email_logs` table. This will make all frontend emails visible in the admin panel.
