
# Frontend User Activity Tracking Implementation Guide

## Overview
This guide provides instructions for implementing comprehensive user activity tracking in the user frontend application so that admin pages can monitor user behavior and security events.

## Implementation Prompt for Replit AI

Copy and paste the following prompt to Replit AI in your **user frontend repository**:

---

I need to implement comprehensive user activity tracking in this frontend application so that admin pages can monitor user behavior. Please implement the following:

### 1. Create Activity Logger Utility (`lib/activityLogger.js`):

Create a utility that logs user activities to the backend with the following capabilities:

```javascript
// Example structure - implement this utility
import { supabase } from './supabaseClient';

const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP:', error);
    return 'Unknown';
  }
};

export const logActivity = async ({
  type,
  action,
  category,
  message,
  details = {}
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;

    const activityData = {
      user_id: user.id,
      type,
      action,
      category,
      message,
      details: {
        ...details,
        ip_address,
        user_agent,
        timestamp: new Date().toISOString()
      }
    };

    // Send to backend API
    await fetch('/api/log-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityData)
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
```

### 2. Track the Following Events:

**Authentication Events:**
- Login/Logout (with IP address and device info)
- Failed login attempts
- Password changes
- Password reset requests
- Account lockouts

**Profile & Account Events:**
- Profile updates (name, email, phone, address)
- Account settings changes
- Email verification
- Phone verification

**Financial Transactions:**
- Transaction attempts and completions
- Transfer initiation and completion
- Bill payments
- Failed transactions (with reasons)

**Account Management:**
- Account status changes
- Account type changes
- Account opening requests

**Card Activity:**
- Card requests
- Card activation
- Card usage/transactions
- Card blocking/unblocking

**Loan Activity:**
- Loan applications
- Loan payments
- Loan document uploads
- Loan status checks

**Document & Security:**
- Document uploads (ID, proof of address, etc.)
- Security question updates
- Two-factor authentication changes

**Navigation (Critical Pages Only):**
- Dashboard access
- Settings page access
- Transaction history views

### 3. Activity Logging Should Include:

For each logged activity, include:
- `user_id` - Current user's ID
- `type` - Event type (auth, transaction, profile, security, etc.)
- `action` - Specific action taken
- `category` - Broader category for grouping
- `message` - Human-readable description
- `ip_address` - User's IP address
- `user_agent` - Browser/device information
- `details` - Additional metadata object containing:
  - Amounts (for financial transactions)
  - Account numbers (masked if sensitive)
  - Success/failure status
  - Error messages (if applicable)
  - Any other relevant context

### 4. Backend API Endpoint (`/api/log-activity`):

Create an API endpoint that:
- Accepts activity data from frontend
- Validates user session
- Stores in `system_logs` table with proper structure
- Handles errors gracefully without breaking user experience

```javascript
// Example API endpoint structure
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, type, action, category, message, details } = req.body;

    // Validate user session
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization);
    if (!user || user.id !== user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Insert into system_logs table
    const { error } = await supabase
      .from('system_logs')
      .insert({
        user_id,
        type,
        action,
        category,
        message,
        details,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Activity logging error:', error);
    return res.status(500).json({ error: 'Failed to log activity' });
  }
}
```

### 5. Integration Examples:

**After Successful Login:**
```javascript
await logActivity({
  type: 'auth',
  action: 'user_login',
  category: 'login',
  message: 'User logged in successfully',
  details: {
    login_method: 'email_password'
  }
});
```

**After Transaction:**
```javascript
await logActivity({
  type: 'transaction',
  action: 'transfer_completed',
  category: 'transaction',
  message: `Transfer of $${amount} to ${recipientName}`,
  details: {
    amount,
    recipient_account: maskAccountNumber(recipientAccount),
    transaction_id,
    transaction_type: 'transfer'
  }
});
```

**After Password Change:**
```javascript
await logActivity({
  type: 'security',
  action: 'password_changed',
  category: 'security',
  message: 'User changed their password',
  details: {
    changed_via: 'settings_page'
  }
});
```

**Failed Login Attempt:**
```javascript
await logActivity({
  type: 'auth',
  action: 'login_failed',
  category: 'login',
  message: 'Failed login attempt',
  details: {
    reason: 'invalid_credentials',
    email: attemptedEmail
  }
});
```

**Loan Application Submitted:**
```javascript
await logActivity({
  type: 'loan',
  action: 'loan_application_submitted',
  category: 'loan',
  message: `Applied for ${loanType} loan of $${amount}`,
  details: {
    loan_type: loanType,
    amount,
    term_months: term,
    application_id
  }
});
```

**Document Upload:**
```javascript
await logActivity({
  type: 'document',
  action: 'document_uploaded',
  category: 'document',
  message: `Uploaded ${documentType}`,
  details: {
    document_type: documentType,
    file_name: fileName,
    file_size: fileSize
  }
});
```

### 6. Privacy Considerations:

**IMPORTANT - Do NOT Log:**
- Passwords (plain text or hashed)
- Security tokens or API keys
- Full credit card numbers
- Full account numbers (use masking)
- Social Security Numbers
- Sensitive personal information

**DO Log with Masking:**
- Account numbers: `****1234`
- Card numbers: `****-****-****-1234`
- Amounts: Full amounts are OK
- Email addresses: Full email is OK for admin tracking

### 7. Implementation Checklist:

- [ ] Create `lib/activityLogger.js` utility
- [ ] Create `/api/log-activity` endpoint
- [ ] Add activity logging to login/logout flows
- [ ] Add activity logging to all financial transactions
- [ ] Add activity logging to profile updates
- [ ] Add activity logging to password changes
- [ ] Add activity logging to loan applications and payments
- [ ] Add activity logging to document uploads
- [ ] Add activity logging to card operations
- [ ] Add activity logging to failed authentication attempts
- [ ] Test all logging endpoints
- [ ] Verify logs appear in admin dashboard

### 8. Testing:

After implementation, test by:
1. Logging in - check if login activity is recorded
2. Making a transaction - check if transaction is logged
3. Changing password - check if password change is logged
4. Uploading a document - check if upload is logged
5. Visit the admin panel at `/admin/user-activity-monitor` to verify all activities are visible

---

## Expected Result

After implementing this system:
- All critical user actions will be tracked
- Admin dashboard will show real-time user activities
- Security events will be monitored
- Audit trail will be complete for compliance
- Suspicious activities can be detected early

## Support

If you encounter issues during implementation:
1. Verify Supabase connection is working
2. Check that `system_logs` table exists in Supabase
3. Ensure proper permissions for writing to `system_logs`
4. Check browser console for any errors
5. Verify API endpoint is accessible

