import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
    
    // Try to get admin from authorization header if session fails
    let isAdmin = false;
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      const admin = await verifyAdminAuth(token);
      isAdmin = !!admin;
    }

    if (!isAdmin && sessionError) {
      return res.status(401).json({ error: 'Unauthorized - Admin access required' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user basic info from Supabase Auth
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !userData || !userData.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const authUser = userData.user;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get security settings
    const { data: securitySettings } = await supabaseAdmin
      .from('user_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get login history (last 50 logins)
    const { data: loginHistory } = await supabaseAdmin
      .from('login_history')
      .select('*')
      .eq('user_id', userId)
      .order('login_time', { ascending: false })
      .limit(50);

    // Get active sessions
    const { data: sessions } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    // Get failed login attempts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: failedLogins } = await supabaseAdmin
      .from('login_history')
      .select('*')
      .eq('user_id', userId)
      .eq('success', false)
      .gte('login_time', sevenDaysAgo.toISOString())
      .order('login_time', { ascending: false });

    // Get password history
    const { data: passwordHistory } = await supabaseAdmin
      .from('password_history')
      .select('*')
      .eq('user_id', userId)
      .order('changed_at', { ascending: false })
      .limit(10);

    // Get suspicious activity (unresolved)
    const { data: suspiciousActivity } = await supabaseAdmin
      .from('suspicious_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    // Calculate security metrics
    const lastPasswordChange = passwordHistory?.[0]?.changed_at || authUser.created_at;
    const daysSincePasswordChange = Math.floor(
      (new Date() - new Date(lastPasswordChange)) / (1000 * 60 * 60 * 24)
    );

    const twoFactorEnabled = profile?.security_settings?.two_factor_enabled || false;
    const accountLocked = securitySettings?.account_locked || false;
    const loginAttemptsCount = securitySettings?.failed_login_attempts || 0;
    const lastLogin = loginHistory?.[0]?.login_time || null;

    // Get unique IPs and locations
    const uniqueIPs = [...new Set(loginHistory?.map(l => l.ip_address).filter(Boolean) || [])];
    const uniqueLocations = [...new Set(loginHistory?.map(l => 
      l.city && l.country ? `${l.city}, ${l.country}` : null
    ).filter(Boolean) || [])];

    return res.status(200).json({
      success: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        createdAt: authUser.created_at,
        emailVerified: authUser.email_confirmed_at ? true : false,
        lastSignInAt: authUser.last_sign_in_at,
      },
      security: {
        accountLocked,
        twoFactorEnabled,
        failedLoginAttempts: loginAttemptsCount,
        lastPasswordChange,
        daysSincePasswordChange,
        passwordStrengthScore: passwordHistory?.[0]?.password_strength_score || 0,
        lastLogin,
      },
      sessions: sessions || [],
      loginHistory: loginHistory || [],
      failedLogins: failedLogins || [],
      passwordHistory: passwordHistory || [],
      suspiciousActivity: suspiciousActivity || [],
      stats: {
        totalLogins: loginHistory?.length || 0,
        failedLoginsLast7Days: failedLogins?.length || 0,
        activeSessions: sessions?.length || 0,
        uniqueIPs: uniqueIPs.length,
        uniqueLocations: uniqueLocations.length,
        unresolvedSuspiciousActivity: suspiciousActivity?.length || 0,
      }
    });

  } catch (error) {
    console.error('Error fetching user security data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch security data',
      details: error.message 
    });
  }
}
