import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

// Add CSS animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
  `;
  if (!document.querySelector('#security-dashboard-animations')) {
    styleSheet.id = 'security-dashboard-animations';
    document.head.appendChild(styleSheet);
  }
}

export default function SecurityDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [userFilter, setUserFilter] = useState('all');
  const [bannedFilter, setBannedFilter] = useState('all');

  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });

  const [successBanner, setSuccessBanner] = useState({
    visible: false,
    message: '',
    action: ''
  });

  const [securityData, setSecurityData] = useState({
    loginHistory: [],
    activeSessions: [],
    suspiciousActivity: [],
    auditLogs: [],
    systemLogs: [],
    passwordHistory: [],
    pinHistory: [],
    bannedUsers: []
  });

  useEffect(() => {
    fetchSecurityData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, riskFilter, dateFilter, dateRange, activeTab, userFilter, bannedFilter]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      // Fetch all users with profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch login history
      const { data: loginHistory, error: loginError } = await supabase
        .from('login_history')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(1000);

      if (loginError) console.error('Login history error:', loginError);

      // Fetch active sessions
      const { data: activeSessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .order('last_activity', { ascending: false }); // Fetch all sessions, filtering for active will be done client-side if needed, or in the frontend message for banned users

      if (sessionsError) console.error('Sessions error:', sessionsError);

      // Fetch suspicious activity
      const { data: suspiciousActivity, error: suspiciousError } = await supabase
        .from('suspicious_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (suspiciousError) console.error('Suspicious activity error:', suspiciousError);

      // Fetch audit logs
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (auditError) console.error('Audit logs error:', auditError);

      // Fetch system logs
      const { data: systemLogs, error: systemError } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (systemError) console.error('System logs error:', systemError);

      // Fetch password history
      const { data: passwordHistory, error: passwordError } = await supabase
        .from('password_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(500);

      if (passwordError) console.error('Password history error:', passwordError);

      // Fetch PIN history from system logs
      const pinHistory = (systemLogs || []).filter(log => 
        log.type === 'auth' && 
        (log.message?.includes('Transaction PIN') || log.message?.includes('PIN'))
      );

      // Fetch banned users from API
      let bannedUsers = [];
      try {
        const bannedResponse = await fetch('/api/admin/get-banned-users', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!bannedResponse.ok) {
          const errorData = await bannedResponse.json();
          throw new Error(errorData.error || `Failed to fetch banned users: ${bannedResponse.statusText}`);
        }
        const bannedResult = await bannedResponse.json();
        bannedUsers = bannedResult.bannedUsers || [];
      } catch (err) {
        console.error('Error fetching banned users:', err);
        setError(`Failed to load banned users: ${err.message}`);
      }

      setSecurityData({
        loginHistory: loginHistory || [],
        activeSessions: activeSessions || [],
        suspiciousActivity: suspiciousActivity || [],
        auditLogs: auditLogs || [],
        systemLogs: systemLogs || [],
        passwordHistory: passwordHistory || [],
        pinHistory: pinHistory || [],
        bannedUsers: bannedUsers || []
      });

      // Enrich users with security data
      const enrichedUsers = (profilesData || []).map(profile => {
        const userLogins = (loginHistory || []).filter(l => l.user_id === profile.id);
        const userSessions = (activeSessions || []).filter(s => s.user_id === profile.id);
        const userSuspicious = (suspiciousActivity || []).filter(s => s.user_id === profile.id);
        const failedLogins = userLogins.filter(l => !l.success);
        const lastLogin = userLogins[0];
        const userPinHistory = pinHistory.filter(p => p.user_id === profile.id);
        const isBanned = bannedUsers.some(b => b.id === profile.id);

        // Get unique devices based on user_agent
        const uniqueDevices = [...new Set(userSessions.map(s => s.user_agent))];

        return {
          ...profile,
          loginCount: userLogins.length,
          failedLoginCount: failedLogins.length,
          activeSessionsCount: userSessions.length,
          uniqueDevicesCount: uniqueDevices.length,
          suspiciousActivityCount: userSuspicious.filter(s => !s.resolved).length,
          lastLoginTime: lastLogin?.login_time,
          lastLoginSuccess: lastLogin?.success,
          lastIpAddress: lastLogin?.ip_address,
          riskLevel: calculateRiskLevel(failedLogins.length, userSuspicious.filter(s => !s.resolved).length, userSessions.length), // Use unresolved suspicious activities for risk
          pinChangesCount: userPinHistory.length,
          isBanned: isBanned,
          sessions: userSessions,
          pinHistory: userPinHistory
        };
      });

      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers); // Initialize filtered users
    } catch (err) {
      setError(err.message);
      console.error('Error fetching security data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskLevel = (failedLogins, unresolvedSuspicious, activeSessions) => {
    if (failedLogins > 5 || unresolvedSuspicious > 3) return 'high';
    if (failedLogins > 2 || unresolvedSuspicious > 1 || activeSessions > 3) return 'medium';
    return 'low';
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        const email = user.email?.toLowerCase() || '';
        const firstName = user.first_name?.toLowerCase() || '';
        const lastName = user.last_name?.toLowerCase() || '';
        return email.includes(search) || firstName.includes(search) || lastName.includes(search);
      });
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter(user => user.id === userFilter);
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(user => user.riskLevel === riskFilter);
    }

    if (bannedFilter === 'banned') {
      filtered = filtered.filter(user => user.isBanned);
    } else if (bannedFilter === 'active') {
      filtered = filtered.filter(user => !user.isBanned);
    }

    // Handle date filtering logic here if needed, based on user.lastLoginTime
    // For now, date filter is applied in overview tab, not directly here
    
    setFilteredUsers(filtered);
  };

  const handleSecurityAction = async (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setActionReason(''); // Clear previous reason
    setShowActionModal(true);
  };

  const executeSecurityAction = async () => {
    if (!selectedUser || !actionType || !actionReason.trim()) {
      setError('Reason is required for this action.');
      return;
    }

    setActionLoading(true);
    setLoadingBanner({
      visible: true,
      current: 1,
      total: 1,
      action: getActionLabel(actionType),
      message: 'Processing security action...'
    });
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication session expired. Please log in again.');
        return;
      }

      const response = await fetch('/api/admin/security-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: actionType,
          userId: selectedUser.id,
          reason: actionReason
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to execute ${getActionLabel(actionType)}`);
      }

      // Hide loading banner first
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      
      // Show professional success banner
      setSuccessBanner({
        visible: true,
        message: `${getActionLabel(actionType)} executed successfully for ${selectedUser.email}`,
        action: getActionLabel(actionType)
      });
      
      setShowActionModal(false);
      await fetchSecurityData(); // Refresh data
      
      // Auto-hide success banner after 5 seconds
      setTimeout(() => {
        setSuccessBanner({ visible: false, message: '', action: '' });
      }, 5000);
    } catch (err) {
      setError('❌ ' + err.message);
      console.error('Security action error:', err);
    } finally {
      setActionLoading(false);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
    }
  };

  const handleEndSession = async (session) => {
    if (!confirm(`Are you sure you want to end the session for device: ${session.device_type || 'Unknown'} (IP: ${session.ip_address || 'N/A'})?`)) {
      return;
    }

    setLoadingBanner({
      visible: true,
      current: 1,
      total: 1,
      action: 'Ending Session',
      message: 'Terminating user session...'
    });

    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;

      // Hide loading banner first
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      
      // Show professional success banner
      setSuccessBanner({
        visible: true,
        message: 'Session ended successfully',
        action: 'End Session'
      });
      
      await fetchSecurityData(); // Refresh data to reflect the change
      
      // Auto-hide success banner after 5 seconds
      setTimeout(() => {
        setSuccessBanner({ visible: false, message: '', action: '' });
      }, 5000);
    } catch (err) {
      setError('❌ Failed to end session: ' + err.message);
      console.error('End session error:', err);
    } finally {
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      lock_account: 'Lock Account',
      unlock_account: 'Unlock Account',
      force_password_reset: 'Force Password Reset',
      sign_out_all_devices: 'Sign Out All Devices',
      enable_2fa: 'Enable 2FA',
      disable_2fa: 'Disable 2FA',
      reset_failed_attempts: 'Reset Failed Attempts',
      ban_user: 'Ban User',
      unban_user: 'Unban User'
    };
    return labels[action] || action;
  };

  const getRiskBadge = (level) => {
    const styles = {
      high: { bg: '#fee2e2', color: '#991b1b' },
      medium: { bg: '#fef3c7', color: '#92400e' },
      low: { bg: '#d1fae5', color: '#065f46' }
    };
    const style = styles[level] || styles.low;
    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
        fontWeight: '700',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}>
        {level || 'Unknown'}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Invalid Date';
    }
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.sessions?.some(s => s.is_active && !s.ended_at)).length, // Count users with active sessions
    highRiskUsers: users.filter(u => u.riskLevel === 'high').length,
    suspiciousActivities: users.reduce((sum, u) => sum + u.suspiciousActivityCount, 0),
    totalLogins: securityData.loginHistory.length,
    failedLogins: securityData.loginHistory.filter(l => !l.success).length,
    activeSessions: securityData.activeSessions.filter(s => s.is_active && !s.ended_at).length, // Count currently active sessions
    bannedUsers: securityData.bannedUsers.length
  };

  return (
    <AdminAuth>
      <AdminLoadingBanner
        isVisible={loadingBanner.visible}
        current={loadingBanner.current}
        total={loadingBanner.total}
        action={loadingBanner.action}
        message={loadingBanner.message}
      />
      
      {/* Professional Success Banner */}
      {successBanner.visible && (
        <div style={styles.successBannerOverlay} onClick={() => setSuccessBanner({ visible: false, message: '', action: '' })}>
          <div style={styles.successBannerContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.successBannerHeader}>
              <div style={styles.successBannerLogo}>🏦 OAKLINE ADMIN</div>
              <div style={styles.successBannerActions}>
                <div style={styles.successBannerIcon}>✅</div>
                <button 
                  onClick={() => setSuccessBanner({ visible: false, message: '', action: '' })}
                  style={styles.successBannerClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div style={styles.successBannerContent}>
              <h3 style={styles.successBannerAction}>{successBanner.action}</h3>
              <p style={styles.successBannerMessage}>{successBanner.message}</p>
            </div>
            
            <div style={styles.successBannerFooter}>
              <div style={styles.successBannerCheckmark}>✓ Operation Completed Successfully</div>
              <button
                onClick={() => setSuccessBanner({ visible: false, message: '', action: '' })}
                style={styles.successBannerOkButton}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔒 Security Monitoring Dashboard</h1>
            <p style={styles.subtitle}>Monitor user security, sessions, and suspicious activities</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchSecurityData} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={() => setError('')} style={styles.closeButton}>✕</button>
          </div>
        )}

        {success && (
          <div style={styles.successBanner}>
            {success}
            <button onClick={() => setSuccess('')} style={styles.closeButton}>✕</button>
          </div>
        )}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Users</h3>
            <p style={styles.statValue}>{stats.totalUsers}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Active Sessions</h3>
            <p style={styles.statValue}>{stats.activeSessions}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>High Risk Users</h3>
            <p style={styles.statValue}>{stats.highRiskUsers}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Suspicious Activities</h3>
            <p style={styles.statValue}>{stats.suspiciousActivities}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #7c3aed'}}>
            <h3 style={styles.statLabel}>Total Logins</h3>
            <p style={styles.statValue}>{stats.totalLogins}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
            <h3 style={styles.statLabel}>Failed Logins</h3>
            <p style={styles.statValue}>{stats.failedLogins}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #991b1b'}}>
            <h3 style={styles.statLabel}>Banned Users</h3>
            <p style={styles.statValue}>{stats.bannedUsers}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['overview', 'login_history', 'active_sessions', 'pin_history', 'suspicious', 'banned_users', 'audit_logs', 'system_logs', 'password_history'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'login_history' && '📜 Login History'}
              {tab === 'active_sessions' && '💻 Sessions'}
              {tab === 'pin_history' && '🔑 PIN History'}
              {tab === 'suspicious' && '⚠️ Suspicious Activity'}
              {tab === 'banned_users' && '🚫 Banned Users'}
              {tab === 'audit_logs' && '📋 Audit Logs'}
              {tab === 'system_logs' && '🖥️ System Logs'}
              {tab === 'password_history' && '🔐 Password History'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              filterUsers(); // Apply filter on search term change
            }}
            style={styles.searchInput}
          />
          <select value={userFilter} onChange={(e) => {
            setUserFilter(e.target.value);
            filterUsers();
          }} style={styles.filterSelect}>
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} ({user.email})
              </option>
            ))}
          </select>
          <select value={riskFilter} onChange={(e) => {
            setRiskFilter(e.target.value);
            filterUsers();
          }} style={styles.filterSelect}>
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <select value={bannedFilter} onChange={(e) => {
            setBannedFilter(e.target.value);
            filterUsers();
          }} style={styles.filterSelect}>
            <option value="all">All Status</option>
            <option value="active">Active Users</option>
            <option value="banned">Banned Users</option>
          </select>
          <select value={dateFilter} onChange={(e) => {
            setDateFilter(e.target.value);
            if(e.target.value !== 'custom') {
              // Apply immediate filter if not custom range
              // You might want to add specific date filtering logic here based on 'today', 'week', 'month'
              // For now, we assume custom range handles the date filtering
              filterUsers(); 
            }
          }} style={styles.filterSelect}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Date Range */}
        {dateFilter === 'custom' && (
          <div style={styles.dateRangeSection}>
            <div style={styles.dateRangeLabel}>
              <span>📅</span>
              <span>Filter by Date Range:</span>
            </div>
            <div style={styles.dateRangeInputs}>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>From:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>To:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  style={styles.dateInput}
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <button
                  onClick={() => {
                    setDateRange({ start: '', end: '' });
                    filterUsers(); // Re-filter after clearing dates
                  }}
                  style={styles.clearDateButton}
                >
                  ✕ Clear Dates
                </button>
              )}
              <button 
                onClick={filterUsers} 
                style={{...styles.clearDateButton, background: '#10b981', marginLeft: 'auto'}}
              >
                Apply Date Filter
              </button>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading security data...</p>
            </div>
          ) : activeTab === 'overview' ? (
            <div style={styles.usersGrid}>
              {filteredUsers.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyIcon}>👥</p>
                  <p style={styles.emptyText}>No users found matching your criteria</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} style={styles.userCard}>
                    <div style={styles.userCardHeader}>
                      <div>
                        <h3 style={styles.userName}>
                          {user.first_name} {user.last_name}
                          {user.isBanned && <span style={styles.bannedBadge}>🚫 BANNED</span>}
                        </h3>
                        <p style={styles.userEmail}>{user.email}</p>
                      </div>
                      {getRiskBadge(user.riskLevel)}
                    </div>

                    <div style={styles.userCardBody}>
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>Last Login:</span>
                        <span style={styles.infoValue}>{formatDateTime(user.lastLoginTime)}</span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>Last IP:</span>
                        <span style={styles.infoValue}>{user.lastIpAddress || 'N/A'}</span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>Active Sessions:</span>
                        <span style={styles.infoValue}>{user.activeSessionsCount}</span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>Unique Devices:</span>
                        <span style={styles.infoValue}>{user.uniqueDevicesCount}</span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>Failed Logins:</span>
                        <span style={{...styles.infoValue, color: user.failedLoginCount > 0 ? '#dc2626' : '#059669'}}>
                          {user.failedLoginCount}
                        </span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>PIN Changes:</span>
                        <span style={styles.infoValue}>{user.pinChangesCount}</span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>Suspicious Activities:</span>
                        <span style={{...styles.infoValue, color: user.suspiciousActivityCount > 0 ? '#dc2626' : '#059669'}}>
                          {user.suspiciousActivityCount}
                        </span>
                      </div>
                    </div>

                    <div style={styles.userCardFooter}>
                      {user.isBanned ? (
                        <button
                          onClick={() => handleSecurityAction(user, 'unban_user')}
                          style={{...styles.actionButton, background: '#10b981'}}
                        >
                          ✓ Unban User
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSecurityAction(user, 'ban_user')}
                          style={{...styles.actionButton, background: '#dc2626'}}
                        >
                          🚫 Ban User
                        </button>
                      )}
                      <button
                        onClick={() => handleSecurityAction(user, 'lock_account')}
                        style={styles.actionButton}
                      >
                        🔒 Lock
                      </button>
                      <button
                        onClick={() => handleSecurityAction(user, 'force_password_reset')}
                        style={styles.actionButton}
                      >
                        🔑 Reset Password
                      </button>
                      <button
                        onClick={() => handleSecurityAction(user, 'sign_out_all_devices')}
                        style={styles.actionButton}
                      >
                        🚪 Sign Out All
                      </button>
                      <button
                        onClick={() => router.push(`/admin/user-details?userId=${user.id}`)}
                        style={{...styles.actionButton, flex: '1 1 100%', marginTop: '8px', background: '#1e40af'}}
                      >
                        👁️ View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'login_history' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>Recent Login Attempts ({securityData.loginHistory.length})</h3>
              {securityData.loginHistory.slice(0, 100).map(log => {
                const user = users.find(u => u.id === log.user_id);
                return (
                  <div key={log.id} style={{...styles.logCard, backgroundColor: log.success ? '#ffffff' : '#fef2f2'}}>
                    <div style={styles.logHeader}>
                      <div>
                        <span style={log.success ? styles.successBadge : styles.failedBadge}>
                          {log.success ? '✓ Success' : '✕ Failed'}
                        </span>
                        {user && <span style={styles.userBadge}>{user.first_name} {user.last_name}</span>}
                      </div>
                      <span style={styles.logTime}>{formatDateTime(log.login_time)}</span>
                    </div>
                    <div style={styles.logBody}>
                      <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
                      <p><strong>IP:</strong> {log.ip_address || 'N/A'}</p>
                      <p><strong>Device:</strong> {log.device_type || 'Unknown'} • {log.browser || 'N/A'} • {log.os || 'N/A'}</p>
                      {log.city && log.country && <p><strong>Location:</strong> {log.city}, {log.country}</p>}
                      {!log.success && log.failure_reason && <p><strong>Reason:</strong> {log.failure_reason}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'active_sessions' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>User Sessions ({securityData.activeSessions.length})</h3>
              {securityData.activeSessions.map(session => {
                const user = users.find(u => u.id === session.user_id);
                const isActive = session.is_active && !session.ended_at;
                
                // Check if session is truly active (last activity within 30 minutes)
                const lastActivity = session.last_activity ? new Date(session.last_activity) : null;
                const now = new Date();
                const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
                const isOnline = isActive && lastActivity && lastActivity > thirtyMinutesAgo;
                
                return (
                  <div key={session.id} style={styles.logCard}>
                    <div style={styles.logHeader}>
                      <div>
                        {!isActive ? (
                          <span style={styles.endedBadge}>⭕ Ended</span>
                        ) : isOnline ? (
                          <span style={styles.activeBadge}>🟢 Active (Online)</span>
                        ) : (
                          <span style={styles.offlineBadge}>🟡 Active (Offline)</span>
                        )}
                        {user && <span style={styles.userBadge}>{user.first_name} {user.last_name}</span>}
                      </div>
                      {isActive && (
                        <button 
                          onClick={() => handleEndSession(session)}
                          style={styles.endSessionButton}
                        >
                          🚪 End Session
                        </button>
                      )}
                    </div>
                    <div style={styles.logBody}>
                      <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
                      <p><strong>IP:</strong> {session.ip_address || 'N/A'}</p>
                      <p><strong>Device:</strong> {session.device_type || 'Unknown'}</p>
                      <p><strong>Started:</strong> {formatDateTime(session.created_at)}</p>
                      <p><strong>Last Activity:</strong> {formatDateTime(session.last_activity)}</p>
                      {session.ended_at && <p><strong>Ended:</strong> {formatDateTime(session.ended_at)}</p>}
                      <p><strong>User Agent:</strong> {session.user_agent || 'N/A'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'pin_history' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>Transaction PIN History ({securityData.pinHistory.length})</h3>
              {securityData.pinHistory.map(log => {
                const user = users.find(u => u.id === log.user_id);
                return (
                  <div key={log.id} style={styles.logCard}>
                    <div style={styles.logHeader}>
                      <div>
                        <span style={styles.pinBadge}>🔑 PIN Activity</span>
                        {user && <span style={styles.userBadge}>{user.first_name} {user.last_name}</span>}
                      </div>
                      <span style={styles.logTime}>{formatDateTime(log.created_at)}</span>
                    </div>
                    <div style={styles.logBody}>
                      <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
                      <p><strong>Action:</strong> {log.message}</p>
                      {log.details && <p><strong>Details:</strong> {JSON.stringify(log.details).substring(0, 100)}...</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'banned_users' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>Banned Users ({securityData.bannedUsers.length})</h3>
              {securityData.bannedUsers.map(bannedUser => {
                const user = users.find(u => u.id === bannedUser.id);
                return (
                  <div key={bannedUser.id} style={{...styles.logCard, borderLeft: '4px solid #dc2626'}}>
                    <div style={styles.logHeader}>
                      <span style={styles.bannedBadge}>🚫 BANNED</span>
                      <button
                        onClick={() => handleSecurityAction(user, 'unban_user')}
                        style={{...styles.endSessionButton, background: '#10b981'}}
                      >
                        ✓ Unban User
                      </button>
                    </div>
                    <div style={styles.logBody}>
                      <p><strong>Email:</strong> {bannedUser.email}</p>
                      <p><strong>Name:</strong> {user?.first_name} {user?.last_name}</p>
                      {bannedUser.banned_until && <p><strong>Banned Until:</strong> {formatDateTime(bannedUser.banned_until)}</p>}
                      {bannedUser.ban_duration && <p><strong>Ban Duration:</strong> {bannedUser.ban_duration}</p>}
                      {bannedUser.reason && <p><strong>Reason:</strong> {bannedUser.reason}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'suspicious' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>Suspicious Activity Reports ({securityData.suspiciousActivity.length})</h3>
              {securityData.suspiciousActivity.map(activity => {
                const user = users.find(u => u.id === activity.user_id);
                return (
                  <div key={activity.id} style={{...styles.logCard, borderLeft: `4px solid ${activity.risk_level === 'high' ? '#dc2626' : activity.risk_level === 'medium' ? '#f59e0b' : '#10b981'}`}}>
                    <div style={styles.logHeader}>
                      <div>
                        <span style={{
                          ...styles.riskBadge,
                          backgroundColor: activity.risk_level === 'high' ? '#fee2e2' : activity.risk_level === 'medium' ? '#fef3c7' : '#d1fae5',
                          color: activity.risk_level === 'high' ? '#991b1b' : activity.risk_level === 'medium' ? '#92400e' : '#065f46'
                        }}>
                          {activity.risk_level?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        {user && <span style={styles.userBadge}>{user.first_name} {user.last_name}</span>}
                      </div>
                      <span style={styles.logTime}>{formatDateTime(activity.created_at)}</span>
                    </div>
                    <div style={styles.logBody}>
                      <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
                      <p><strong>Type:</strong> {activity.activity_type}</p>
                      <p><strong>Description:</strong> {activity.description}</p>
                      {activity.ip_address && <p><strong>IP:</strong> {activity.ip_address}</p>}
                      <p><strong>Status:</strong> {activity.resolved ? '✅ Resolved' : '⏳ Pending'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'audit_logs' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>Audit Trail ({securityData.auditLogs.length})</h3>
              {securityData.auditLogs.slice(0, 100).map(log => {
                const user = users.find(u => u.id === log.user_id);
                return (
                  <div key={log.id} style={styles.logCard}>
                    <div style={styles.logHeader}>
                      <div>
                        <span style={styles.auditBadge}>{log.action}</span>
                        {user && <span style={styles.userBadge}>{user.first_name} {user.last_name}</span>}
                      </div>
                      <span style={styles.logTime}>{formatDateTime(log.created_at)}</span>
                    </div>
                    <div style={styles.logBody}>
                      <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
                      {log.table_name && <p><strong>Table:</strong> {log.table_name}</p>}
                      {log.old_data && <p><strong>Old Data:</strong> {JSON.stringify(log.old_data).substring(0, 100)}...</p>}
                      {log.new_data && <p><strong>New Data:</strong> {JSON.stringify(log.new_data).substring(0, 100)}...</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'system_logs' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>System Events ({securityData.systemLogs.length})</h3>
              {securityData.systemLogs.slice(0, 100).map(log => {
                const user = users.find(u => u.id === log.user_id);
                return (
                  <div key={log.id} style={styles.logCard}>
                    <div style={styles.logHeader}>
                      <div>
                        <span style={{
                          ...styles.levelBadge,
                          backgroundColor: log.level === 'error' ? '#fee2e2' : log.level === 'warning' ? '#fef3c7' : '#e0f2fe',
                          color: log.level === 'error' ? '#991b1b' : log.level === 'warning' ? '#92400e' : '#075985'
                        }}>
                          {log.level?.toUpperCase() || 'INFO'}
                        </span>
                        {user && <span style={styles.userBadge}>{user.first_name} {user.last_name}</span>}
                      </div>
                      <span style={styles.logTime}>{formatDateTime(log.created_at)}</span>
                    </div>
                    <div style={styles.logBody}>
                      {user && <p><strong>Email:</strong> {user.email}</p>}
                      <p><strong>Type:</strong> {log.type}</p>
                      <p><strong>Message:</strong> {log.message}</p>
                      {log.details && <p><strong>Details:</strong> {JSON.stringify(log.details).substring(0, 100)}...</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'password_history' ? (
            <div style={styles.logsList}>
              <h3 style={styles.logsTitle}>Password Changes ({securityData.passwordHistory.length})</h3>
              {securityData.passwordHistory.slice(0, 100).map(log => {
                const user = users.find(u => u.id === log.user_id);
                return (
                  <div key={log.id} style={styles.logCard}>
                    <div style={styles.logHeader}>
                      <div>
                        <span style={styles.passwordBadge}>{log.method || 'user_settings'}</span>
                        {user && <span style={styles.userBadge}>{user.first_name} {user.last_name}</span>}
                      </div>
                      <span style={styles.logTime}>{formatDateTime(log.changed_at)}</span>
                    </div>
                    <div style={styles.logBody}>
                      <p><strong>Email:</strong> {user?.email || 'Unknown'}</p>
                      <p><strong>Changed By:</strong> {log.changed_by || 'User'}</p>
                      {log.ip_address && <p><strong>IP:</strong> {log.ip_address}</p>}
                      {log.user_agent && <p><strong>User Agent:</strong> {log.user_agent.substring(0, 60)}...</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Action Modal */}
        {showActionModal && selectedUser && (
          <div style={styles.modalOverlay} onClick={() => setShowActionModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>{getActionLabel(actionType)}</h2>
                <button onClick={() => setShowActionModal(false)} style={styles.closeBtn}>×</button>
              </div>
              <div style={styles.modalBody}>
                <p style={styles.modalText}>
                  You are about to <strong>{getActionLabel(actionType).toLowerCase()}</strong> for:
                </p>
                <div style={styles.userInfoBox}>
                  <p><strong>User:</strong> {selectedUser.first_name} {selectedUser.last_name}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Risk Level:</strong> {selectedUser.riskLevel?.toUpperCase()}</p>
                  {selectedUser.isBanned && <p style={{color: '#dc2626'}}><strong>Status:</strong> BANNED</p>}
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Reason (required):</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g., Suspicious activity detected, multiple failed login attempts, etc."
                    style={styles.textarea}
                    rows={3}
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowActionModal(false)}
                  style={styles.cancelButton}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={executeSecurityAction}
                  style={styles.confirmButton}
                  disabled={!actionReason.trim() || actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  tabs: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap',
    overflowX: 'auto'
  },
  tab: {
    flex: '1 1 auto',
    minWidth: '120px',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  },
  activeTab: {
    backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  filtersSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '150px'
  },
  dateRangeSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  dateRangeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  dateRangeInputs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },
  dateInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateLabel: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '500',
    color: '#4a5568'
  },
  dateInput: {
    padding: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    minWidth: '150px'
  },
  clearDateButton: {
    padding: '10px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#718096',
    fontWeight: '600'
  },
  usersGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))'
  },
  userCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  userCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  userEmail: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },
  bannedBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: 'clamp(0.7rem, 1.6vw, 11px)',
    fontWeight: '700',
    backgroundColor: '#fee2e2',
    color: '#991b1b'
  },
  userBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: 'clamp(0.7rem, 1.6vw, 11px)',
    fontWeight: '600',
    backgroundColor: '#e0f2fe',
    color: '#075985',
    marginLeft: '8px'
  },
  userCardBody: {
    marginBottom: '16px'
  },
  userInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600'
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right'
  },
  userCardFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    fontWeight: '600',
    cursor: 'pointer',
    minWidth: '80px'
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  logsTitle: {
    fontSize: 'clamp(1.25rem, 3.5vw, 20px)',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '16px'
  },
  logCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  logTime: {
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    color: '#6b7280'
  },
  logBody: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#374151',
    lineHeight: '1.5'
  },
  successBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  failedBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#fee2e2',
    color: '#991b1b'
  },
  activeBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  endedBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#fef3c7',
    color: '#92400e'
  },
  offlineBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#fef3c7',
    color: '#d97706'
  },
  pinBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#fef3c7',
    color: '#92400e'
  },
  riskBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600'
  },
  auditBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#e0f2fe',
    color: '#075985'
  },
  levelBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600'
  },
  passwordBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    color: '#1e40af'
  },
  endSessionButton: {
    padding: '6px 12px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },
  modalText: {
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    color: '#374151',
    marginBottom: '16px'
  },
  userInfoBox: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    lineHeight: '1.6'
  },
  inputGroup: {
    marginBottom: '16px'
  },
  label: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
    display: 'block'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none'
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  cancelButton: {
    padding: '12px 24px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#475569',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    color: 'white',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  successBannerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.3s ease-out'
  },
  successBannerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    minWidth: '400px',
    maxWidth: '500px',
    overflow: 'hidden',
    animation: 'slideIn 0.3s ease-out'
  },
  successBannerHeader: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successBannerLogo: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    letterSpacing: '2px',
    textTransform: 'uppercase'
  },
  successBannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  successBannerIcon: {
    fontSize: '32px',
    animation: 'bounce 0.6s ease-in-out'
  },
  successBannerClose: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: '#ffffff',
    fontSize: '24px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    lineHeight: 1,
    padding: 0
  },
  successBannerContent: {
    padding: '30px 20px'
  },
  successBannerAction: {
    margin: '0 0 15px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center'
  },
  successBannerMessage: {
    margin: '0',
    fontSize: '16px',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: '1.6'
  },
  successBannerFooter: {
    backgroundColor: '#f0fdf4',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successBannerCheckmark: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#059669',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  successBannerOkButton: {
    padding: '8px 24px',
    background: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};