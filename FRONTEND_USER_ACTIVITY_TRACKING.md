
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

# Frontend User Activity Tracking Implementation Guide

## Overview
This guide provides instructions for implementing comprehensive user activity tracking in the user frontend application so that admin pages can monitor user behavior and security events.

## Implementation Prompt for Replit AI

Copy and paste the following prompt to Replit AI in your **user frontend repository**:

---

I need to implement comprehensive user activity tracking in this frontend application so that the admin security dashboard can monitor all user activities. The admin dashboard is not receiving data because the frontend is not logging user actions to Supabase.

Please implement the following activity tracking system:

### 1. Create Activity Logger Utility (lib/activityLogger.js)

Create a utility file that logs user activities to multiple Supabase tables:

```javascript
import { supabase } from './supabaseClient';

// Get user's IP address
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

// Parse user agent to get device info
const parseUserAgent = (userAgent) => {
  const ua = userAgent.toLowerCase();
  
  let deviceType = 'Desktop';
  if (ua.includes('mobile')) deviceType = 'Mobile';
  else if (ua.includes('tablet')) deviceType = 'Tablet';
  
  let browser = 'Unknown';
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios')) os = 'iOS';
  
  return { deviceType, browser, os };
};

// Log to system_logs table
export const logSystemActivity = async ({
  level = 'info',
  type,
  message,
  details = {}
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;

    await supabase.from('system_logs').insert({
      user_id: user.id,
      level,
      type,
      message,
      details: {
        ...details,
        ip_address,
        user_agent,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log system activity:', error);
  }
};

// Log to login_history table
export const logLoginAttempt = async (success, failureReason = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && success) return;

    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;
    const { deviceType, browser, os } = parseUserAgent(user_agent);

    await supabase.from('login_history').insert({
      user_id: user?.id,
      login_time: new Date().toISOString(),
      success,
      ip_address,
      user_agent,
      device_type: deviceType,
      browser,
      os,
      failure_reason: failureReason
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
};

// Log to user_sessions table
export const createUserSession = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;
    const { deviceType } = parseUserAgent(user_agent);

    const { data: sessionData } = await supabase.from('user_sessions').insert({
      user_id: user.id,
      ip_address,
      user_agent,
      device_type: deviceType,
      is_active: true,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    }).select();

    if (sessionData && sessionData[0]) {
      localStorage.setItem('session_id', sessionData[0].id);
    }
  } catch (error) {
    console.error('Failed to create user session:', error);
  }
};

// Update session activity
export const updateSessionActivity = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', sessionId);
    }
  } catch (error) {
    console.error('Failed to update session activity:', error);
  }
};

// End session on logout
export const endUserSession = async () => {
  try {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      localStorage.removeItem('session_id');
    }
  } catch (error) {
    console.error('Failed to end user session:', error);
  }
};

// Log to password_history table
export const logPasswordChange = async (method = 'user_settings') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;

    await supabase.from('password_history').insert({
      user_id: user.id,
      changed_at: new Date().toISOString(),
      changed_by: 'user',
      ip_address,
      user_agent,
      method
    });

    // Also log to system_logs
    await logSystemActivity({
      level: 'info',
      type: 'security',
      message: 'Password changed successfully',
      details: { method }
    });
  } catch (error) {
    console.error('Failed to log password change:', error);
  }
};

// Log to audit_logs table
export const logAuditActivity = async ({ action, tableName, oldData, newData }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      table_name: tableName,
      old_data: oldData,
      new_data: newData,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log audit activity:', error);
  }
};

// Log transaction PIN setup/change
export const logPINActivity = async (action) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await logSystemActivity({
      level: 'info',
      type: 'security',
      message: `Transaction PIN ${action}`,
      details: { action }
    });

    await logAuditActivity({
      action: `pin_${action}`,
      tableName: 'profiles',
      oldData: null,
      newData: { pin_action: action }
    });
  } catch (error) {
    console.error('Failed to log PIN activity:', error);
  }
};

// Master activity logger - Use this for general activities
export const logActivity = async ({
  type,
  action,
  category,
  message,
  details = {}
}) => {
  await logSystemActivity({
    level: 'info',
    type: type || category,
    message,
    details: { ...details, action, category }
  });
};
```

### 2. Track These Events Across Your Application

#### Authentication Events (in login/logout pages):

```javascript
import { logLoginAttempt, createUserSession, endUserSession, logSystemActivity } from '../lib/activityLogger';

// On successful login
await logLoginAttempt(true);
await createUserSession();
await logSystemActivity({
  level: 'info',
  type: 'auth',
  message: 'User logged in successfully'
});

// On failed login
await logLoginAttempt(false, 'Invalid credentials');
await logSystemActivity({
  level: 'warning',
  type: 'auth',
  message: 'Failed login attempt',
  details: { reason: 'invalid_credentials' }
});

// On logout
await endUserSession();
await logSystemActivity({
  level: 'info',
  type: 'auth',
  message: 'User logged out'
});
```

#### Password Changes:

```javascript
import { logPasswordChange } from '../lib/activityLogger';

// After successful password change
await logPasswordChange('user_settings');
```

#### Transaction PIN Setup/Changes:

```javascript
import { logPINActivity } from '../lib/activityLogger';

// When PIN is set up
await logPINActivity('setup');

// When PIN is changed
await logPINActivity('changed');
```

#### Financial Transactions:

```javascript
import { logSystemActivity, logAuditActivity } from '../lib/activityLogger';

// On transaction attempt
await logSystemActivity({
  level: 'info',
  type: 'transaction',
  message: `Transfer of $${amount} initiated`,
  details: {
    amount,
    recipient: recipientAccount,
    transaction_type: 'transfer'
  }
});

// On successful transaction
await logAuditActivity({
  action: 'create',
  tableName: 'transactions',
  oldData: null,
  newData: { amount, type: 'transfer', status: 'completed' }
});
```

#### Profile Updates:

```javascript
import { logAuditActivity, logSystemActivity } from '../lib/activityLogger';

// On profile update
await logAuditActivity({
  action: 'update',
  tableName: 'profiles',
  oldData: { name: oldName, email: oldEmail },
  newData: { name: newName, email: newEmail }
});

await logSystemActivity({
  level: 'info',
  type: 'profile',
  message: 'Profile updated',
  details: { fields_changed: ['name', 'email'] }
});
```

#### Device Login Tracking:

```javascript
import { createUserSession, updateSessionActivity } from '../lib/activityLogger';

// On app initialization (in _app.js or layout)
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      createUserSession();
    }
  });

  // Update session activity every 5 minutes
  const interval = setInterval(() => {
    updateSessionActivity();
  }, 5 * 60 * 1000);

  return () => {
    clearInterval(interval);
    authListener.subscription.unsubscribe();
  };
}, []);
```

### 3. Session Activity Heartbeat

Add this to your main layout or _app.js to track active sessions:

```javascript
import { useEffect } from 'react';
import { updateSessionActivity } from '../lib/activityLogger';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Update session activity every 5 minutes
    const interval = setInterval(() => {
      updateSessionActivity();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <Component {...pageProps} />;
}
```

### 4. Implementation Checklist

- [ ] Create lib/activityLogger.js with all logging functions
- [ ] Add login/logout tracking to authentication pages
- [ ] Add password change tracking to password change functionality
- [ ] Add transaction PIN tracking when users set/change their PIN
- [ ] Add transaction logging to all financial operations
- [ ] Add profile update tracking
- [ ] Add session heartbeat to _app.js
- [ ] Add device/browser tracking to login flow
- [ ] Test all logging functions
- [ ] Verify data appears in admin/security-dashboard

### 5. Privacy & Security Notes

**DO NOT LOG:**
- Passwords (plain text or hashed)
- Security tokens
- Full credit card numbers
- Full account numbers (mask them: ****1234)
- Social Security Numbers

**DO LOG:**
- User actions and timestamps
- IP addresses
- Device/browser information
- Success/failure status
- Amounts and transaction types
- Profile changes (what changed, not sensitive values)

---

## Expected Result

After implementation:
- All user logins will be tracked in `login_history`
- Active sessions will be tracked in `user_sessions`
- Password changes will be logged in `password_history`
- All activities will be logged in `system_logs`
- Data changes will be tracked in `audit_logs`
- Admin security dashboard will display all activities in real-time
