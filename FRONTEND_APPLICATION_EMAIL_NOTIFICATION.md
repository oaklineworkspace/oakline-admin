
# Frontend Application Submission - Admin Email Notification Guide

## Overview
This guide explains how to implement admin email notifications in the **frontend repository** when users submit applications through the `apply.js` page.

## Problem
Currently, when users submit applications in the frontend, the admin at `info@theoaklinebank.com` does not receive email notifications. This guide will fix that.

## Solution Architecture

### Option 1: Direct API Call (Recommended)
Call the admin notification API directly after successful application submission.

### Option 2: Database Trigger (Alternative)
Use the existing Supabase trigger (if it's properly configured).

---

## Implementation Steps

### Step 1: Locate Your Application Submission Code

Find the file where users submit applications. This is typically:
- `pages/apply.js` (or similar)
- `pages/api/applications.js` (if using an API route)
- `pages/api/submit-application.js`

### Step 2: Add Admin Notification Function

Create a new utility function to send admin notifications:

**Create: `lib/sendAdminNotification.js`**

```javascript
/**
 * Sends email notification to admin when a new application is submitted
 * @param {string} applicationId - The ID of the submitted application
 * @param {string} applicantName - Full name of the applicant
 * @param {string} applicantEmail - Email of the applicant
 */
export async function sendAdminNotification(applicationId, applicantName, applicantEmail) {
  try {
    const response = await fetch('https://oakline-controller.theoaklinebank.com/api/send-admin-application-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId,
        applicantName,
        applicantEmail
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send admin notification');
    }

    console.log('✅ Admin notification sent successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    // Don't throw - we don't want to fail the application submission if email fails
    return { success: false, error: error.message };
  }
}
```

### Step 3: Update Application Submission Code

Find where the application is successfully inserted into the database and add the notification call.

**Example for API Route (`pages/api/applications.js` or similar):**

```javascript
import { supabase } from '../../lib/supabaseClient';
import { sendAdminNotification } from '../../lib/sendAdminNotification';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const applicationData = req.body;

    // Insert application into database
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        ...applicationData,
        application_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // ✅ NEW: Send admin notification
    const applicantName = `${applicationData.first_name} ${applicationData.last_name}`;
    await sendAdminNotification(
      application.id,
      applicantName,
      applicationData.email
    );

    return res.status(200).json({
      success: true,
      applicationId: application.id
    });
  } catch (error) {
    console.error('Application submission error:', error);
    return res.status(500).json({
      error: 'Failed to submit application',
      details: error.message
    });
  }
}
```

**Example for Client-Side Submission (`pages/apply.js`):**

```javascript
import { supabase } from '../lib/supabaseClient';
import { sendAdminNotification } from '../lib/sendAdminNotification';

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Insert application
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        // ... other fields
        application_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // ✅ NEW: Send admin notification
    const applicantName = `${formData.firstName} ${formData.lastName}`;
    await sendAdminNotification(
      application.id,
      applicantName,
      formData.email
    );

    // Show success message
    setSuccess(true);
    setFormData({}); // Reset form
  } catch (error) {
    console.error('Error submitting application:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Step 4: Test the Implementation

1. **Submit a Test Application:**
   - Go to your application form in the frontend
   - Fill out the form completely
   - Submit the application

2. **Check the Admin Email:**
   - Admin should receive an email at `info@theoaklinebank.com`
   - Email subject should be: "🔔 New Application Submitted - [Applicant Name]"

3. **Check Admin Dashboard:**
   - Log into admin dashboard at `https://oakline-controller.theoaklinebank.com/admin`
   - Go to Email Logs page
   - Verify the notification email appears with status "sent"

4. **Check Browser Console:**
   - Look for: `✅ Admin notification sent successfully`
   - If you see errors, check the error message

---

## Troubleshooting

### Issue: Admin not receiving emails

**Check 1: Verify API endpoint is reachable**
```javascript
// Test in browser console
fetch('https://oakline-controller.theoaklinebank.com/api/send-admin-application-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    applicationId: 'test-123',
    applicantName: 'Test User',
    applicantEmail: 'test@example.com'
  })
}).then(r => r.json()).then(console.log);
```

**Check 2: Verify application is being created**
- Check Supabase dashboard
- Look in the `applications` table
- Confirm new entries are being added

**Check 3: Check CORS settings**
If you get CORS errors, the admin repository needs to allow your frontend domain.

**Check 4: Verify SMTP is configured**
- The admin repository must have email providers configured
- Check admin Email Logs page for delivery status

### Issue: Function is being called but no email sent

**Check the admin repository logs:**
- The admin API should log when it receives notification requests
- Look for: `📧 Admin notification request received`

**Check email_logs table:**
```sql
SELECT * FROM email_logs 
WHERE email_type = 'notify' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Alternative: Using Database Triggers

If you prefer to use database triggers instead of direct API calls, the admin repository already has a trigger configured. However, it requires:

1. **Enable pg_net extension in Supabase**
2. **Configure the trigger properly**
3. **Set correct API URL in the trigger**

The trigger approach is less reliable than direct API calls because:
- Triggers run asynchronously
- Harder to debug
- Network issues in Supabase can cause failures

**We recommend using the direct API call method (Steps 1-3 above).**

---

## Email Notification Details

The admin will receive:
- **To:** info@theoaklinebank.com
- **Subject:** 🔔 New Application Submitted - [Applicant Name]
- **Content:**
  - Applicant's full name
  - Applicant's email
  - Application ID
  - Direct link to review the application in admin dashboard

---

## Important Notes

1. **Don't fail the application if email fails:**
   - The `sendAdminNotification` function catches errors
   - This ensures user applications are saved even if email fails

2. **Email is logged:**
   - All emails are tracked in the `email_logs` table
   - Admin can view delivery status in the admin panel

3. **Multiple SMTP providers:**
   - The admin repository uses failover SMTP providers
   - If one provider fails, it tries the next one

4. **Asynchronous operation:**
   - Email sending doesn't block application submission
   - User gets immediate confirmation

---

## Complete Example

Here's a complete working example:

**pages/api/submit-application.js**
```javascript
import { supabase } from '../../lib/supabaseClient';
import { sendAdminNotification } from '../../lib/sendAdminNotification';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      ssn,
      address,
      city,
      state,
      zipCode,
      accountType,
      initialDeposit
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        date_of_birth: dateOfBirth,
        ssn,
        address,
        city,
        state,
        zip_code: zipCode,
        account_type: accountType,
        initial_deposit: initialDeposit,
        application_status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Send admin notification (non-blocking)
    const applicantName = `${firstName} ${lastName}`;
    sendAdminNotification(application.id, applicantName, email)
      .catch(err => console.error('Background email error:', err));

    // Return success to user immediately
    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: application.id
    });

  } catch (error) {
    console.error('Application submission error:', error);
    return res.status(500).json({
      error: 'Failed to submit application',
      details: error.message
    });
  }
}
```

---

## Summary

1. Create `lib/sendAdminNotification.js` utility function
2. Call it after successful application insertion
3. Don't block user experience if email fails
4. Test by submitting a real application
5. Verify in admin Email Logs page

The admin will now receive email notifications for every new application! 🎉
```
