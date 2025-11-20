import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      errorCode: 'METHOD_NOT_ALLOWED',
      details: { receivedMethod: req.method, allowedMethod: 'POST' }
    });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'No authorization header',
        errorCode: 'MISSING_AUTH_HEADER',
        details: { message: 'Authorization header is required for admin actions' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const authResult = await verifyAdminAuth(token);

    if (authResult.error) {
      return res.status(authResult.status || 401).json({ 
        error: authResult.error,
        errorCode: 'AUTH_FAILED',
        details: { message: authResult.error }
      });
    }

    const admin = authResult;

    // Fetch bank details for email configuration
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_support, name')
      .eq('name', 'Oakline Bank')
      .single();

    const emailDomain = process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com';
    const supportEmail = bankDetails?.email_support || `support@${emailDomain}`;
    const bankName = bankDetails?.name || 'Oakline Bank';

    const { action, userId, reason, data } = req.body;

    if (!action || !userId) {
      return res.status(400).json({ 
        error: 'action and userId are required',
        errorCode: 'MISSING_REQUIRED_FIELDS',
        details: { missingFields: [!action && 'action', !userId && 'userId'].filter(Boolean) }
      });
    }

    // Get user info
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !userData || !userData.user) {
      return res.status(404).json({ 
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND',
        details: { userId, message: getUserError?.message || 'User does not exist' }
      });
    }

    const authUser = userData.user;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const userEmail = authUser.email;
    const userName = profile ? `${profile.first_name} ${profile.last_name}` : userEmail;

    let result = {};

    switch (action) {
      case 'lock_account':
        // Lock the account
        const { error: lockError } = await supabaseAdmin
          .from('user_security_settings')
          .upsert({
            user_id: userId,
            account_locked: true,
            locked_reason: reason || 'Account locked by administrator',
            locked_at: new Date().toISOString(),
            locked_by: admin.adminId,
            updated_at: new Date().toISOString()
          });

        if (lockError) {
          console.error('Lock account error:', lockError);
          return res.status(500).json({ 
            error: 'Failed to lock user account',
            details: lockError.message,
            errorCode: 'LOCK_ACCOUNT_FAILED'
          });
        }

        // Log suspicious activity
        await supabaseAdmin.from('suspicious_activity').insert({
          user_id: userId,
          activity_type: 'account_locked',
          description: `Account locked by admin: ${reason || 'No reason provided'}`,
          risk_level: 'high',
          metadata: { admin_id: admin.email, admin_email: admin.email }
        });

        // Send email notification
        await sendEmail({
          to: userEmail,
          subject: '🔒 Your Account Has Been Locked - Oakline Bank',
          type: EMAIL_TYPES.SECURITY,
          html: generateAccountLockedEmail(userName, reason)
        });

        result = { message: 'Account locked successfully' };
        break;

      case 'unlock_account':
        // Unlock the account
        const { error: unlockError } = await supabaseAdmin
          .from('user_security_settings')
          .update({
            account_locked: false,
            locked_reason: null,
            failed_login_attempts: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (unlockError) {
          console.error('Unlock account error:', unlockError);
          return res.status(500).json({ 
            error: 'Failed to unlock user account',
            details: unlockError.message,
            errorCode: 'UNLOCK_ACCOUNT_FAILED'
          });
        }

        // Send email notification
        await sendEmail({
          to: userEmail,
          subject: '✅ Your Account Has Been Unlocked - Oakline Bank',
          type: EMAIL_TYPES.SECURITY,
          html: generateAccountUnlockedEmail(userName)
        });

        result = { message: 'Account unlocked successfully' };
        break;

      case 'force_password_reset':
        // Generate password reset link
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com';
        const { data: resetLink, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: userEmail,
          options: {
            redirectTo: `${siteUrl}/reset-password`
          }
        });

        if (resetError) {
          console.error('Password reset generation error:', resetError);
          return res.status(500).json({ 
            error: 'Failed to generate password reset link',
            details: resetError.message,
            errorCode: 'PASSWORD_RESET_FAILED'
          });
        }

        // Send password reset email
        await sendEmail({
          to: userEmail,
          subject: '🔐 Password Reset Required - Oakline Bank',
          type: EMAIL_TYPES.SECURITY,
          html: generateForcedPasswordResetEmail(userName, resetLink.properties.action_link, reason)
        });

        result = { message: 'Password reset email sent successfully' };
        break;

      case 'sign_out_all_devices':
        // End all active sessions for the user
        const { data: sessionsData, error: sessionsError } = await supabaseAdmin
          .from('user_sessions')
          .update({ 
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('is_active', true)
          .select();

        if (sessionsError) {
          console.error('Sessions update error:', sessionsError);
          return res.status(500).json({ 
            error: 'Failed to end user sessions',
            details: sessionsError.message,
            errorCode: 'SESSION_UPDATE_FAILED'
          });
        }

        const sessionsEnded = sessionsData?.length || 0;

        // Sign out user from Supabase Auth (this invalidates JWT tokens)
        try {
          const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId, 'global');
          if (signOutError) {
            console.error('Auth sign out error:', signOutError);
            // Don't fail the entire operation if auth signout fails
            // Sessions are already ended in the database
          }
        } catch (authError) {
          console.error('Auth sign out exception:', authError);
          // Continue - sessions are already ended
        }

        // Send email notification
        try {
          await sendEmail({
            to: userEmail,
            subject: '🚪 You Have Been Signed Out - Oakline Bank',
            type: EMAIL_TYPES.SECURITY,
            html: generateSignOutEmail(userName, reason)
          });
        } catch (emailError) {
          console.error('Failed to send sign-out email:', emailError);
          // Don't fail the operation if email fails
        }

        result = { 
          message: 'User signed out from all devices',
          sessionsEnded 
        };
        break;

      case 'block_ip':
        const { ipAddress, expiresInDays } = data || {};
        if (!ipAddress) {
          return res.status(400).json({ 
            error: 'ipAddress is required for block_ip action',
            errorCode: 'BLOCK_IP_VALIDATION_FAILED',
            details: { missingField: 'ipAddress', message: 'ipAddress must be provided in data parameter' }
          });
        }

        const expiresAt = expiresInDays 
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { error: blockIpError } = await supabaseAdmin.from('blocked_ips').insert({
          ip_address: ipAddress,
          reason: reason || 'Blocked by administrator',
          blocked_by: admin.id,
          expires_at: expiresAt,
          is_active: true
        });

        if (blockIpError) {
          console.error('Block IP error:', blockIpError);
          return res.status(500).json({ 
            error: 'Failed to block IP address',
            details: blockIpError.message,
            errorCode: 'BLOCK_IP_FAILED'
          });
        }

        result = { message: `IP address ${ipAddress} blocked successfully` };
        break;

      case 'unblock_ip':
        const { ipToUnblock } = data || {};
        if (!ipToUnblock) {
          return res.status(400).json({ 
            error: 'ipToUnblock is required',
            errorCode: 'UNBLOCK_IP_VALIDATION_FAILED',
            details: { missingField: 'ipToUnblock', message: 'ipToUnblock must be provided in data parameter' }
          });
        }

        const { error: unblockIpError } = await supabaseAdmin
          .from('blocked_ips')
          .update({ is_active: false })
          .eq('ip_address', ipToUnblock);

        if (unblockIpError) {
          console.error('Unblock IP error:', unblockIpError);
          return res.status(500).json({ 
            error: 'Failed to unblock IP address',
            details: unblockIpError.message,
            errorCode: 'UNBLOCK_IP_FAILED'
          });
        }

        result = { message: `IP address ${ipToUnblock} unblocked successfully` };
        break;

      case 'enable_2fa':
        // Update security settings to enable 2FA
        const { data: currentProfile, error: fetch2FAProfileError } = await supabaseAdmin
          .from('profiles')
          .select('security_settings')
          .eq('id', userId)
          .single();

        if (fetch2FAProfileError) {
          console.error('Fetch profile for 2FA error:', fetch2FAProfileError);
          return res.status(500).json({ 
            error: 'Failed to fetch user profile for 2FA update',
            details: fetch2FAProfileError.message,
            errorCode: 'ENABLE_2FA_FETCH_FAILED'
          });
        }

        const updatedSettings = {
          ...(currentProfile?.security_settings || {}),
          two_factor_enabled: true,
          two_factor_enforced_by_admin: true
        };

        const { error: enable2FAError } = await supabaseAdmin
          .from('profiles')
          .update({ security_settings: updatedSettings })
          .eq('id', userId);

        if (enable2FAError) {
          console.error('Enable 2FA error:', enable2FAError);
          return res.status(500).json({ 
            error: 'Failed to enable 2FA',
            details: enable2FAError.message,
            errorCode: 'ENABLE_2FA_FAILED'
          });
        }

        await sendEmail({
          to: userEmail,
          subject: '🔐 Two-Factor Authentication Enabled - Oakline Bank',
          type: EMAIL_TYPES.SECURITY,
          html: generate2FAEnabledEmail(userName)
        });

        result = { message: '2FA enabled for user' };
        break;

      case 'disable_2fa':
        // Update security settings to disable 2FA
        const { data: currentProfile2, error: fetchDisable2FAProfileError } = await supabaseAdmin
          .from('profiles')
          .select('security_settings')
          .eq('id', userId)
          .single();

        if (fetchDisable2FAProfileError) {
          console.error('Fetch profile for disable 2FA error:', fetchDisable2FAProfileError);
          return res.status(500).json({ 
            error: 'Failed to fetch user profile for 2FA update',
            details: fetchDisable2FAProfileError.message,
            errorCode: 'DISABLE_2FA_FETCH_FAILED'
          });
        }

        const updatedSettings2 = {
          ...(currentProfile2?.security_settings || {}),
          two_factor_enabled: false,
          two_factor_enforced_by_admin: false
        };

        const { error: disable2FAError } = await supabaseAdmin
          .from('profiles')
          .update({ security_settings: updatedSettings2 })
          .eq('id', userId);

        if (disable2FAError) {
          console.error('Disable 2FA error:', disable2FAError);
          return res.status(500).json({ 
            error: 'Failed to disable 2FA',
            details: disable2FAError.message,
            errorCode: 'DISABLE_2FA_FAILED'
          });
        }

        result = { message: '2FA disabled for user' };
        break;

      case 'reset_failed_attempts':
        // Reset failed login attempts counter
        const { error: resetAttemptsError } = await supabaseAdmin
          .from('user_security_settings')
          .update({ 
            failed_login_attempts: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (resetAttemptsError) {
          console.error('Reset failed attempts error:', resetAttemptsError);
          return res.status(500).json({ 
            error: 'Failed to reset failed login attempts',
            details: resetAttemptsError.message,
            errorCode: 'RESET_ATTEMPTS_FAILED'
          });
        }

        result = { message: 'Failed login attempts reset successfully' };
        break;

      case 'ban_user':
        // Ban user account
        const banDuration = data?.banDuration || '876000h'; // Default 100 years
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: banDuration
        });

        if (banError) {
          console.error('Auth ban error:', banError);
          return res.status(500).json({ 
            error: 'Failed to ban user in authentication system',
            details: banError.message,
            errorCode: 'AUTH_BAN_FAILED'
          });
        }

        // Generate professional ban message based on reason
        const professionalBanMessage = generateProfessionalBanMessage(reason);

        // 1. Update profile with ban status
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_banned: true,
            ban_reason: reason || 'Banned by administrator',
            ban_display_message: professionalBanMessage,
            banned_at: new Date().toISOString(),
            banned_by: admin.id,
            status: 'suspended',
            status_reason: reason,
            status_changed_at: new Date().toISOString(),
            status_changed_by: admin.id
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Profile update error:', profileError);
          return res.status(500).json({ 
            error: 'Failed to update profile ban status',
            details: profileError.message,
            errorCode: 'PROFILE_UPDATE_FAILED'
          });
        }

        // 2. Terminate all active sessions
        const { error: sessionsErrorBan } = await supabaseAdmin
          .from('user_sessions')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('is_active', true);

        if (sessionsErrorBan) {
          console.error('Session termination error:', sessionsErrorBan);
          return res.status(500).json({ 
            error: 'Failed to terminate user sessions',
            details: sessionsErrorBan.message,
            errorCode: 'SESSION_TERMINATION_FAILED'
          });
        }

        // Sign out from auth (invalidates JWT tokens) - this is optional and shouldn't fail the ban
        try {
          const { error: signOutErrorBan } = await supabaseAdmin.auth.admin.signOut(userId, 'global');
          if (signOutErrorBan) {
            console.error('Auth sign out error (non-critical):', signOutErrorBan);
            // Don't fail the ban action if sign out fails - sessions are already ended in database
          }
        } catch (authError) {
          console.error('Auth sign out exception (non-critical):', authError);
          // Continue - sessions are already ended and user is banned
        }

        // 3. Log the ban action in system_logs
        const { error: systemLogError } = await supabaseAdmin
          .from('system_logs')
          .insert({
            level: 'warning',
            type: 'user',
            message: 'User account banned',
            details: {
              user_id: userId,
              ban_reason: reason || 'No reason provided',
              banned_by: admin.id,
              admin_email: admin.email
            },
            user_id: userId,
            admin_id: admin.id
          });

        if (systemLogError) {
          console.error('Failed to log ban in system_logs:', systemLogError);
          // Don't fail the entire operation if logging fails
        }

        // Log suspicious activity
        const { error: suspiciousActivityError } = await supabaseAdmin.from('suspicious_activity').insert({
          user_id: userId,
          activity_type: 'account_banned',
          description: `Account banned by admin: ${reason || 'No reason provided'}`,
          risk_level: 'high',
          metadata: { admin_id: admin.id, admin_email: admin.email }
        });

        if (suspiciousActivityError) {
          console.error('Failed to log suspicious activity:', suspiciousActivityError);
          // Don't fail the entire operation if logging fails
        }

        // Send email notification to banned user
        try {
          await sendEmail({
            to: userEmail,
            subject: `🚫 Your Account Has Been Banned - ${bankName}`,
            type: EMAIL_TYPES.SECURITY,
            html: generateAccountBannedEmail(userName, reason, supportEmail, bankName)
          });
          console.log('Ban notification email sent to:', userEmail);
        } catch (emailError) {
          console.error('Error sending ban notification email:', emailError);
          // Don't fail the ban action if email fails
        }

        result = { message: 'User banned successfully' };
        break;

      case 'suspend_account':
        // Suspend user account temporarily (PROFILE ONLY - NOT AUTH TABLE)
        const suspensionDays = data?.suspensionDays || 30;
        const suspensionEndDate = new Date();
        suspensionEndDate.setDate(suspensionEndDate.getDate() + suspensionDays);

        const suspensionMessage = generateProfessionalSuspensionMessage(reason, suspensionEndDate);

        // Update profile ONLY - do not touch auth table
        const { error: suspendError } = await supabaseAdmin
          .from('profiles')
          .update({
            status: 'suspended',
            status_reason: reason || 'Account suspended by administrator',
            ban_display_message: suspensionMessage,
            status_changed_at: new Date().toISOString(),
            status_changed_by: admin.id,
            suspension_start_date: new Date().toISOString(),
            suspension_end_date: suspensionEndDate.toISOString(),
            is_banned: false // Ensure is_banned is false for suspensions
          })
          .eq('id', userId);

        if (suspendError) {
          console.error('Profile suspend error:', suspendError);
          return res.status(500).json({ 
            error: 'Failed to suspend account',
            details: suspendError.message,
            errorCode: 'PROFILE_SUSPEND_FAILED'
          });
        }

        // Terminate active sessions (but don't ban in auth)
        const { error: sessionsErrorSuspend } = await supabaseAdmin
          .from('user_sessions')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('is_active', true);

        if (sessionsErrorSuspend) {
          console.error('Session termination error for suspension:', sessionsErrorSuspend);
        }

        // Log the suspension
        await supabaseAdmin.from('system_logs').insert({
          level: 'warning',
          type: 'user',
          message: 'User account suspended',
          details: {
            user_id: userId,
            suspension_reason: reason || 'No reason provided',
            suspension_end_date: suspensionEndDate.toISOString(),
            suspended_by: admin.id,
            admin_email: admin.email
          },
          user_id: userId,
          admin_id: admin.id
        });

        // Send suspension email
        await sendEmail({
          to: userEmail,
          subject: `⚠️ Your Account Has Been Suspended - ${bankName}`,
          type: EMAIL_TYPES.SECURITY,
          html: generateAccountSuspendedEmail(userName, reason, suspensionEndDate, supportEmail, bankName)
        });

        result = { message: 'Account suspended successfully', suspensionEndDate };
        break;

      case 'close_account':
        // Close user account permanently
        const closureMessage = generateProfessionalClosureMessage(reason);

        const { error: closeError } = await supabaseAdmin
          .from('profiles')
          .update({
            status: 'closed',
            status_reason: reason || 'Account closed by administrator',
            ban_display_message: closureMessage,
            status_changed_at: new Date().toISOString(),
            status_changed_by: admin.id,
            account_closed_at: new Date().toISOString(),
            account_closed_by: admin.id,
            closure_reason: reason
          })
          .eq('id', userId);

        if (closeError) {
          console.error('Profile close error:', closeError);
          return res.status(500).json({ 
            error: 'Failed to close account',
            details: closeError.message,
            errorCode: 'PROFILE_CLOSE_FAILED'
          });
        }

        // Send closure email
        await sendEmail({
          to: userEmail,
          subject: `Account Closure Notification - ${bankName}`,
          type: EMAIL_TYPES.SECURITY,
          html: generateAccountClosedEmail(userName, reason, supportEmail, bankName)
        });

        result = { message: 'Account closed successfully' };
        break;

      case 'unban_user':
        // Unban user account
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: 'none'
        });

        if (unbanError) {
          console.error('Auth unban error:', unbanError);
          return res.status(500).json({ 
            error: 'Failed to unban user in authentication system',
            details: unbanError.message,
            errorCode: 'AUTH_UNBAN_FAILED'
          });
        }

        // Clear ban status from profile
        const { error: unbanProfileError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_banned: false,
            ban_reason: null,
            banned_at: null,
            banned_by: null
          })
          .eq('id', userId);

        if (unbanProfileError) {
          console.error('Profile unban error:', unbanProfileError);
          return res.status(500).json({ 
            error: 'Failed to clear profile ban status',
            details: unbanProfileError.message,
            errorCode: 'PROFILE_UNBAN_FAILED'
          });
        }

        // Send email notification
        await sendEmail({
          to: userEmail,
          subject: '✅ Your Account Has Been Unbanned - Oakline Bank',
          type: EMAIL_TYPES.SECURITY,
          html: generateAccountUnbannedEmail(userName)
        });

        result = { message: 'User unbanned successfully' };
        break;

      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          errorCode: 'INVALID_SECURITY_ACTION',
          details: { action, message: `Unknown action type: ${action}` }
        });
    }

    // Log the admin action in audit_logs
    const { error: auditLogError } = await supabaseAdmin.from('audit_logs').insert({
      user_id: admin.adminId,
      action: `security_action_${action}`,
      table_name: 'user_security',
      new_data: {
        target_user_id: userId,
        target_user_email: userEmail,
        action,
        reason,
        data
      }
    });

    if (auditLogError) {
      console.error('Failed to create audit log entry:', auditLogError);
      // Continue even if audit logging fails - the action has already been performed
    }

    // Log in account_status_audit_log if action affects account status
    if (['ban_user', 'unban_user', 'lock_account', 'unlock_account', 'suspend_account', 'close_account'].includes(action)) {
      // Get the full reason object if it exists in the database
      let reasonMetadata = {};

      if (action !== 'reset_failed_attempts' && action !== 'unban_user') {
        try {
          const { data: matchingReason } = await supabaseAdmin
            .from('account_restriction_reasons')
            .select('category, severity_level, requires_immediate_action, contact_email')
            .eq('action_type', action)
            .eq('reason_text', reason)
            .eq('is_active', true)
            .single();

          if (matchingReason) {
            reasonMetadata = {
              category: matchingReason.category,
              severity_level: matchingReason.severity_level,
              requires_immediate_action: matchingReason.requires_immediate_action,
              contact_email: matchingReason.contact_email
            };
          }
        } catch (err) {
          console.log('No matching reason found in database, using custom reason');
        }
      }
      
      // Fetch current security settings for account_locked status
      const { data: securitySettings, error: securitySettingsError } = await supabaseAdmin
        .from('user_security_settings')
        .select('account_locked')
        .eq('user_id', userId)
        .single();

      if (securitySettingsError) {
        console.error('Failed to fetch security settings:', securitySettingsError);
        // Continue even if fetching security settings fails
      }

      const { error: statusAuditError } = await supabaseAdmin.from('account_status_audit_log').insert({
        user_id: userId,
        changed_by: admin.adminId,
        old_status: profile?.status || 'active',
        new_status: action === 'ban_user' ? 'banned' : action === 'suspend_account' ? 'suspended' : action === 'close_account' ? 'closed' : action === 'unlock_account' ? 'active' : profile?.status || 'active',
        old_is_banned: profile?.is_banned || false,
        new_is_banned: action === 'ban_user',
        old_account_locked: securitySettings?.account_locked || false,
        new_account_locked: action === 'lock_account',
        reason,
        action_type: action.replace('_user', '').replace('_account', ''),
        metadata: {
          ...reasonMetadata,
          admin_email: admin.email,
          user_email: userEmail,
          timestamp: new Date().toISOString(),
          // Include suspension details if applicable
          ...(action === 'suspend_account' && {
            suspension_start_date: new Date().toISOString(),
            suspension_end_date: new Date(new Date().getTime() + (data?.suspensionDays || 30) * 24 * 60 * 60 * 1000).toISOString()
          })
        }
      });

      if (statusAuditError) {
        console.error('Failed to create status audit log entry:', statusAuditError);
      }
    }

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error performing security action:', error);
    return res.status(500).json({ 
      error: 'Failed to perform security action',
      details: error.message,
      errorCode: 'SECURITY_ACTION_ERROR'
    });
  }
}

// Helper functions to generate professional messages
function generateProfessionalBanMessage(reason) {
  const reasonLower = (reason || '').toLowerCase();

  if (reasonLower.includes('fraud') || reasonLower.includes('suspicious')) {
    return 'Your account has been permanently restricted due to suspicious activity detected on your account. For your security and to protect our banking community, access has been suspended. Please contact our Fraud Prevention team immediately.';
  } else if (reasonLower.includes('security') || reasonLower.includes('breach')) {
    return 'Account access has been restricted due to security concerns. Our Security team has identified activity that requires immediate attention. Please contact us to resolve this matter.';
  } else if (reasonLower.includes('compliance') || reasonLower.includes('regulatory')) {
    return 'Your account access has been restricted to ensure compliance with banking regulations. Please contact our Compliance department to complete the necessary verification procedures.';
  } else if (reasonLower.includes('unauthorized') || reasonLower.includes('credential')) {
    return 'Account access has been restricted due to unauthorized access attempts or credential sharing violations. Please contact our Security team to restore your access.';
  } else if (reasonLower.includes('terms') || reasonLower.includes('violation')) {
    return 'Your account has been restricted due to violations of our Terms of Service. Please review our policies and contact our Customer Relations team.';
  } else {
    return 'Your account access has been restricted by our administrative team. For detailed information and resolution steps, please contact our Customer Support department.';
  }
}

function generateProfessionalSuspensionMessage(reason, endDate) {
  const formattedDate = new Date(endDate).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const reasonLower = (reason || '').toLowerCase();

  if (reasonLower.includes('verification') || reasonLower.includes('documentation')) {
    return `Your account is temporarily suspended pending verification. This suspension will be lifted on ${formattedDate} once the required documentation is provided. Please contact our Verification team.`;
  } else if (reasonLower.includes('review') || reasonLower.includes('investigation')) {
    return `Your account is under temporary review. Access will be restored on or before ${formattedDate} pending completion of our investigation. We appreciate your patience.`;
  } else {
    return `Your account has been temporarily suspended until ${formattedDate}. Please contact our Customer Support team for more information on resolving this matter.`;
  }
}

function generateProfessionalClosureMessage(reason) {
  const reasonLower = (reason || '').toLowerCase();

  if (reasonLower.includes('request') || reasonLower.includes('customer')) {
    return 'Your account has been closed as per your request. All associated services have been terminated. Thank you for banking with us.';
  } else if (reasonLower.includes('dormant') || reasonLower.includes('inactive')) {
    return 'Your account has been closed due to extended inactivity. If you believe this was done in error, please contact our Customer Relations team.';
  } else if (reasonLower.includes('compliance') || reasonLower.includes('regulatory')) {
    return 'Your account has been closed to comply with regulatory requirements. For questions regarding this closure, please contact our Compliance department.';
  } else {
    return 'Your account has been permanently closed by our administrative team. For information regarding this closure, please contact our Customer Support department.';
  }
}

// Email templates
function generateAccountLockedEmail(userName, reason) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">🔒 Account Locked</h1>
      </div>
      <div style="padding: 32px;">
        <p>Dear ${userName},</p>
        <p>Your Oakline Bank account has been temporarily locked for security reasons.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Please contact our customer support team to resolve this issue.</p>
        <p>Best regards,<br>Oakline Bank Security Team</p>
      </div>
    </body>
    </html>
  `;
}

function generateAccountUnlockedEmail(userName) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">✅ Account Unlocked</h1>
      </div>
      <div style="padding: 32px;">
        <p>Dear ${userName},</p>
        <p>Good news! Your Oakline Bank account has been unlocked and you can now access your account normally.</p>
        <p>If you did not request this change, please contact us immediately.</p>
        <p>Best regards,<br>Oakline Bank Security Team</p>
      </div>
    </body>
    </html>
  `;
}

function generateForcedPasswordResetEmail(userName, resetLink, reason) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">🔐 Password Reset Required</h1>
      </div>
      <div style="padding: 32px;">
        <p>Dear ${userName},</p>
        <p>A password reset has been initiated for your Oakline Bank account.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background: #f59e0b; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p>Best regards,<br>Oakline Bank Security Team</p>
      </div>
    </body>
    </html>
  `;
}

function generateSignOutEmail(userName, reason) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">🚪 Signed Out</h1>
      </div>
      <div style="padding: 32px;">
        <p>Dear ${userName},</p>
        <p>You have been signed out from all devices for security reasons.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Please sign in again to access your account.</p>
        <p>If you did not request this action, please contact us immediately.</p>
        <p>Best regards,<br>Oakline Bank Security Team</p>
      </div>
    </body>
    </html>
  `;
}

function generate2FAEnabledEmail(userName) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">🔐 2FA Enabled</h1>
      </div>
      <div style="padding: 32px;">
        <p>Dear ${userName},</p>
        <p>Two-factor authentication has been enabled for your Oakline Bank account for enhanced security.</p>
        <p>You will now need to provide an additional verification code when signing in.</p>
        <p>Best regards,<br>Oakline Bank Security Team</p>
      </div>
    </body>
    </html>
  `;
}

function generateAccountBannedEmail(userName, reason, supportEmail, bankName) {
  const professionalMessage = generateProfessionalBanMessage(reason);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
            🏦 ${bankName}
          </div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 14px;">
            Account Security Notification
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 32px;">
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="color: #991b1b; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">
              Important Account Notice
            </h2>
          </div>

          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            Dear ${userName},
          </p>

          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            ${professionalMessage}
          </p>

          ${reason ? `
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              Administrative Note:
            </h3>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
              ${reason}
            </p>
          </div>
          ` : ''}

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
            <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              📞 Need Assistance?
            </h3>
            <p style="color: #1e40af; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
              If you believe this action was taken in error or require additional information, please contact our Customer Relations team:
            </p>
            <p style="color: #1e40af; font-size: 15px; font-weight: 600; margin: 0;">
              Email: <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none;">${supportEmail}</a>
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
            We appreciate your understanding and cooperation in this matter.
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
            Respectfully,<br/>
            <strong style="color: #1f2937;">${bankName} Security & Compliance Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ${bankName}. All rights reserved.<br/>
            Member FDIC | Routing: 075915826
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAccountSuspendedEmail(userName, reason, endDate, supportEmail, bankName) {
  const formattedDate = new Date(endDate).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
            🏦 ${bankName}
          </div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 14px;">
            Temporary Account Suspension Notice
          </div>
        </div>

        <div style="padding: 40px 32px;">
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="color: #92400e; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">
              Account Temporarily Suspended
            </h2>
          </div>

          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            Dear ${userName},
          </p>

          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Your ${bankName} account has been temporarily suspended and will remain inactive until <strong>${formattedDate}</strong>.
          </p>

          ${reason ? `
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              Reason for Suspension:
            </h3>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
              ${reason}
            </p>
          </div>
          ` : ''}

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
            <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              What This Means:
            </h3>
            <ul style="color: #1e40af; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Your account access is temporarily restricted</li>
              <li>No transactions can be processed during this period</li>
              <li>Your account will be automatically reactivated on ${formattedDate}</li>
              <li>Your funds remain secure and protected</li>
            </ul>
          </div>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 24px 0;">
            For questions or to resolve this matter sooner, please contact: <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a>
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
            Sincerely,<br/>
            <strong style="color: #1f2937;">${bankName} Customer Relations Team</strong>
          </p>
        </div>

        <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ${bankName}. All rights reserved.<br/>
            Member FDIC | Routing: 075915826
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAccountClosedEmail(userName, reason, supportEmail, bankName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
            🏦 ${bankName}
          </div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 14px;">
            Account Closure Confirmation
          </div>
        </div>

        <div style="padding: 40px 32px;">
          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            Dear ${userName},
          </p>

          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            This letter confirms that your account with ${bankName} has been permanently closed.
          </p>

          ${reason ? `
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              Closure Details:
            </h3>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
              ${reason}
            </p>
          </div>
          ` : ''}

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 24px 0;">
            Thank you for choosing ${bankName} for your banking needs. If you have any questions, please contact us at <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a>
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
            Best regards,<br/>
            <strong style="color: #1f2937;">${bankName} Account Services</strong>
          </p>
        </div>

        <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ${bankName}. All rights reserved.<br/>
            Member FDIC | Routing: 075915826
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAccountUnbannedEmail(userName) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">✅ Account Unbanned</h1>
      </div>
      <div style="padding: 32px;">
        <p>Dear ${userName},</p>
        <p>Good news! Your Oakline Bank account ban has been lifted and you can now access your account normally.</p>
        <p>If you did not request this change, please contact us immediately.</p>
        <p>Best regards,<br>Oakline Bank Security Team</p>
      </div>
    </body>
    </html>
  `;
}