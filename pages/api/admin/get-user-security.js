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

    // Get suspicious activity (all, not just unresolved)
    const { data: suspiciousActivity } = await supabaseAdmin
      .from('suspicious_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get audit logs for security-related actions
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get system logs related to this user
    const { data: systemLogs } = await supabaseAdmin
      .from('system_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get blocked IPs (if any exist for this user's IPs)
    const userIPs = [...new Set(loginHistory?.map(l => l.ip_address).filter(Boolean) || [])];
    let blockedIPs = [];
    if (userIPs.length > 0) {
      const { data: ips } = await supabaseAdmin
        .from('blocked_ips')
        .select('*')
        .in('ip_address', userIPs)
        .order('created_at', { ascending: false });
      blockedIPs = ips || [];
    }

    // Get user's devices from login history
    const devices = [...new Map(
      loginHistory?.map(l => [
        `${l.device_type}-${l.browser}-${l.os}`,
        {
          deviceType: l.device_type,
          browser: l.browser,
          os: l.os,
          lastUsed: l.login_time,
          ipAddress: l.ip_address
        }
      ]) || []
    ).values()];

    // Get user's locations from login history
    const locations = [...new Map(
      loginHistory?.filter(l => l.city && l.country).map(l => [
        `${l.city}-${l.country}`,
        {
          city: l.city,
          country: l.country,
          latitude: l.latitude,
          longitude: l.longitude,
          lastUsed: l.login_time,
          ipAddress: l.ip_address
        }
      ]) || []
    ).values()];

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

    // Count security events by type
    const securityEvents = {
      passwordChanges: passwordHistory?.length || 0,
      suspiciousActivities: suspiciousActivity?.length || 0,
      unresolvedSuspicious: suspiciousActivity?.filter(a => !a.resolved).length || 0,
      failedLogins: failedLogins?.length || 0,
      successfulLogins: loginHistory?.filter(l => l.success).length || 0,
      blockedIPCount: blockedIPs.length,
      uniqueDevices: devices.length,
      uniqueLocations: locations.length,
    };

    // Risk assessment
    let riskScore = 0;
    let riskFactors = [];

    if (loginAttemptsCount > 3) {
      riskScore += 20;
      riskFactors.push(`${loginAttemptsCount} failed login attempts`);
    }
    if (daysSincePasswordChange > 90) {
      riskScore += 15;
      riskFactors.push(`Password not changed in ${daysSincePasswordChange} days`);
    }
    if (!twoFactorEnabled) {
      riskScore += 10;
      riskFactors.push('Two-factor authentication not enabled');
    }
    if (suspiciousActivity?.filter(a => !a.resolved).length > 0) {
      riskScore += 25;
      riskFactors.push(`${suspiciousActivity.filter(a => !a.resolved).length} unresolved suspicious activities`);
    }
    if (uniqueIPs.length > 10) {
      riskScore += 10;
      riskFactors.push(`Access from ${uniqueIPs.length} different IPs`);
    }
    if (blockedIPs.length > 0) {
      riskScore += 30;
      riskFactors.push(`${blockedIPs.length} blocked IP(s) used`);
    }

    const riskLevel = riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';

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
        phone: profile?.phone || '',
        country: profile?.country || '',
        enrollmentCompleted: profile?.enrollment_completed || false,
      },
      security: {
        accountLocked,
        twoFactorEnabled,
        failedLoginAttempts: loginAttemptsCount,
        lastPasswordChange,
        daysSincePasswordChange,
        passwordStrengthScore: passwordHistory?.[0]?.password_strength_score || 0,
        lastLogin,
        riskScore,
        riskLevel,
        riskFactors,
        emailAlerts: securitySettings?.emailalerts ?? true,
        smsAlerts: securitySettings?.smsalerts ?? false,
        loginAlerts: securitySettings?.loginalerts ?? true,
        transactionAlerts: securitySettings?.transactionalerts ?? true,
        fraudAlerts: securitySettings?.fraudalerts ?? true,
      },
      sessions: sessions || [],
      loginHistory: loginHistory || [],
      failedLogins: failedLogins || [],
      passwordHistory: passwordHistory || [],
      suspiciousActivity: suspiciousActivity || [],
      auditLogs: auditLogs || [],
      systemLogs: systemLogs || [],
      blockedIPs: blockedIPs || [],
      devices: devices || [],
      locations: locations || [],
      stats: {
        totalLogins: loginHistory?.length || 0,
        failedLoginsLast7Days: failedLogins?.length || 0,
        activeSessions: sessions?.length || 0,
        uniqueIPs: uniqueIPs.length,
        uniqueLocations: uniqueLocations.length,
        unresolvedSuspiciousActivity: suspiciousActivity?.filter(a => !a.resolved).length || 0,
        ...securityEvents
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
