import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

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
    const admin = await verifyAdminAuth(token);
    if (!admin) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        errorCode: 'INVALID_AUTH_TOKEN',
        details: { message: 'Invalid or expired admin token' }
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required',
        errorCode: 'MISSING_USER_ID',
        details: { missingField: 'userId', message: 'userId must be provided in request body' }
      });
    }

    // End all sessions
    const { data: sessionsData, error: sessionsError, count } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        is_active: false, 
        ended_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_active', true)
      .select();

    if (sessionsError) {
      return res.status(500).json({ 
        error: 'Failed to end user sessions',
        details: sessionsError.message,
        errorCode: 'SESSION_UPDATE_FAILED'
      });
    }

    const sessionsEnded = sessionsData?.length || 0;
    
    if (sessionsEnded === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No active sessions found for this user',
        errorCode: 'NO_ACTIVE_SESSIONS',
        details: { userId },
        sessionsEnded: 0
      });
    }

    // Sign out from auth (this invalidates JWT tokens)
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId);
    if (signOutError) {
      console.error('Error signing out user:', signOutError);
      return res.status(500).json({ 
        error: 'Failed to sign out user from auth',
        details: signOutError.message,
        errorCode: 'AUTH_SIGNOUT_FAILED',
        sessionsEnded // Include sessions already ended
      });
    }

    // Log the action
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      user_id: admin.id,
      action: 'force_logout_banned_user',
      table_name: 'user_sessions',
      new_data: {
        target_user_id: userId,
        admin_id: admin.id,
        sessions_ended: sessionsEnded
      }
    });

    if (auditError) {
      console.error('Failed to log audit entry:', auditError);
      // Don't fail if logging fails
    }

    return res.status(200).json({ 
      success: true,
      message: 'User logged out successfully',
      sessionsEnded 
    });

  } catch (error) {
    console.error('Error forcing logout:', error);
    return res.status(500).json({ 
      error: 'Failed to force logout',
      details: error.message,
      errorCode: 'FORCE_LOGOUT_ERROR'
    });
  }
}
