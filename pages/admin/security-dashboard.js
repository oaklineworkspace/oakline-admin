import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function SecurityDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionData, setActionData] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserSecurity(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/get-users');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    }
  };

  const fetchUserSecurity = async (userId) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/get-user-security?userId=${userId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch security data');
      }
      const data = await response.json();
      setSecurityData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching security data:', err);
    } finally {
      setLoading(false);
    }
  };

  const performSecurityAction = async () => {
    if (!actionType || !selectedUser) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
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
          reason: actionReason,
          data: actionData
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Action failed');

      setSuccess(data.message || 'Action completed successfully');
      setShowActionModal(false);
      setActionReason('');
      setActionData({});

      // Refresh security data
      fetchUserSecurity(selectedUser.id);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (action) => {
    setActionType(action);
    setShowActionModal(true);
    setActionReason('');
    setActionData({});
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };
    return colors[level] || '#6b7280';
  };

  const getPasswordStrengthLabel = (score) => {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Excellent'];
    return labels[score] || 'Unknown';
  };

  const getDeviceInfo = (userAgent) => {
    if (!userAgent) return 'Unknown Device';

    // Simple device detection
    if (userAgent.includes('Mobile')) return '📱 Mobile Device';
    if (userAgent.includes('Tablet')) return '📱 Tablet';
    if (userAgent.includes('Windows')) return '💻 Windows PC';
    if (userAgent.includes('Mac')) return '💻 Mac';
    if (userAgent.includes('Linux')) return '💻 Linux';
    if (userAgent.includes('Android')) return '📱 Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return '📱 iOS Device';

    return '💻 Computer';
  };

  const getActivityIcon = (activity) => {
    const action = activity.action?.toLowerCase() || '';
    const type = activity.type?.toLowerCase() || '';
    const table = activity.table_name?.toLowerCase() || '';
    const category = activity.activity_category?.toLowerCase() || '';
    const message = activity.message?.toLowerCase() || '';

    if (category === 'login' || action.includes('login') || action.includes('sign') || type === 'auth' || message.includes('login')) return '🔐';
    if (category === 'password' || action.includes('password') || message.includes('password')) return '🔑';
    if (action.includes('create') || action.includes('insert')) return '➕';
    if (action.includes('update') || action.includes('modify')) return '✏️';
    if (action.includes('delete') || action.includes('remove')) return '🗑️';
    if (category === 'transaction' || table === 'transactions' || type === 'transaction') return '💸';
    if (category === 'card' || table === 'cards' || type === 'card') return '💳';
    if (table === 'accounts') return '🏦';
    if (table === 'loans') return '🏠';
    if (category === 'profile' || table === 'profiles') return '👤';
    return '📋';
  };

  const getActivityTypeColor = (activity) => {
    const action = activity.action?.toLowerCase() || '';
    const level = activity.level?.toLowerCase() || '';

    if (level === 'error' || action.includes('delete') || action.includes('reject')) return '#dc2626';
    if (level === 'warning' || action.includes('suspend') || action.includes('block')) return '#f59e0b';
    if (action.includes('login') || action.includes('sign')) return '#3b82f6';
    if (action.includes('create') || action.includes('approve')) return '#10b981';
    if (action.includes('update') || action.includes('modify')) return '#8b5cf6';
    return '#6b7280';
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔐 Security Dashboard</h1>
            <p style={styles.subtitle}>
              Monitor user security, sessions, and suspicious activity
              <br />
              <strong style={{ color: '#dc2626' }}>⚠️ PASSWORDS ARE NEVER VISIBLE - All passwords are securely hashed</strong>
            </p>
          </div>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        <div style={styles.content}>
          {/* User Selector */}
          <div style={styles.userSelector}>
            <label style={styles.label}>Select User to Monitor:</label>
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                setSelectedUser(user);
              }}
              style={styles.select}
            >
              <option value="">Choose a user...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.profiles?.first_name && user.profiles?.last_name
                    ? `${user.profiles.first_name} ${user.profiles.last_name} (${user.email})`
                    : user.email}
                </option>
              ))}
            </select>
          </div>

          {loading && !securityData && (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading security data...</p>
            </div>
          )}

          {selectedUser && securityData && (
            <>
              {/* User Info Card */}
              <div style={styles.userInfoCard}>
                <div style={styles.userInfoHeader}>
                  <div>
                    <h2 style={styles.userName}>
                      {securityData.user.firstName} {securityData.user.lastName}
                    </h2>
                    <p style={styles.userEmail}>{securityData.user.email}</p>
                  </div>
                  <div style={styles.userStatus}>
                    {securityData.security.accountLocked && (
                      <span style={styles.statusBadge}>🔒 LOCKED</span>
                    )}
                    {securityData.security.twoFactorEnabled && (
                      <span style={{...styles.statusBadge, background: '#10b981'}}>✓ 2FA</span>
                    )}
                    {securityData.user.emailVerified && (
                      <span style={{...styles.statusBadge, background: '#3b82f6'}}>✓ Verified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div style={styles.statsGrid}>
                <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
                  <h3 style={styles.statLabel}>Total Logins</h3>
                  <p style={styles.statValue}>{securityData.stats.totalLogins}</p>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
                  <h3 style={styles.statLabel}>Failed Logins (7 days)</h3>
                  <p style={styles.statValue}>{securityData.stats.failedLoginsLast7Days}</p>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
                  <h3 style={styles.statLabel}>Active Sessions</h3>
                  <p style={styles.statValue}>{securityData.stats.activeSessions}</p>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
                  <h3 style={styles.statLabel}>Unique IPs</h3>
                  <p style={styles.statValue}>{securityData.stats.uniqueIPs}</p>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #8b5cf6'}}>
                  <h3 style={styles.statLabel}>Password Age</h3>
                  <p style={styles.statValue}>{securityData.security.daysSincePasswordChange} days</p>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #ec4899'}}>
                  <h3 style={styles.statLabel}>Suspicious Activity</h3>
                  <p style={styles.statValue}>{securityData.stats.unresolvedSuspiciousActivity}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionsSection}>
                <h3 style={styles.sectionTitle}>Admin Actions</h3>
                <div style={styles.actionsGrid}>
                  {securityData.security.accountLocked ? (
                    <button 
                      onClick={() => openActionModal('unlock_account')}
                      style={{...styles.actionButton, background: '#10b981'}}
                    >
                      🔓 Unlock Account
                    </button>
                  ) : (
                    <button 
                      onClick={() => openActionModal('lock_account')}
                      style={{...styles.actionButton, background: '#dc2626'}}
                    >
                      🔒 Lock Account
                    </button>
                  )}

                  <button 
                    onClick={() => openActionModal('force_password_reset')}
                    style={{...styles.actionButton, background: '#f59e0b'}}
                  >
                    🔑 Force Password Reset
                  </button>

                  <button 
                    onClick={() => openActionModal('sign_out_all_devices')}
                    style={{...styles.actionButton, background: '#3b82f6'}}
                  >
                    🚪 Sign Out All Devices
                  </button>

                  <button 
                    onClick={() => openActionModal('block_ip')}
                    style={{...styles.actionButton, background: '#8b5cf6'}}
                  >
                    🚫 Block IP Address
                  </button>

                  {securityData.security.twoFactorEnabled ? (
                    <button 
                      onClick={() => openActionModal('disable_2fa')}
                      style={{...styles.actionButton, background: '#6b7280'}}
                    >
                      ✕ Disable 2FA
                    </button>
                  ) : (
                    <button 
                      onClick={() => openActionModal('enable_2fa')}
                      style={{...styles.actionButton, background: '#10b981'}}
                    >
                      ✓ Enable 2FA
                    </button>
                  )}

                  <button 
                    onClick={() => openActionModal('reset_failed_attempts')}
                    style={{...styles.actionButton, background: '#6b7280'}}
                  >
                    🔄 Reset Failed Attempts
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={styles.tabs}>
                <button
                  onClick={() => setActiveTab('overview')}
                  style={activeTab === 'overview' ? styles.tabActive : styles.tab}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setActiveTab('login_history')}
                  style={activeTab === 'login_history' ? styles.tabActive : styles.tab}
                >
                  📜 Login History
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  style={activeTab === 'sessions' ? styles.tabActive : styles.tab}
                >
                  💻 Active Sessions
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  style={activeTab === 'password' ? styles.tabActive : styles.tab}
                >
                  🔑 Password History
                </button>
                <button
                  onClick={() => setActiveTab('suspicious')}
                  style={activeTab === 'suspicious' ? styles.tabActive : styles.tab}
                >
                  ⚠️ Suspicious Activity
                </button>
              </div>

              {/* Tab Content */}
              <div style={styles.tabContent}>
                {activeTab === 'overview' && (
                  <div style={styles.overviewGrid}>
                    <div style={styles.infoCard}>
                      <h3 style={styles.cardTitle}>🔐 Security Status</h3>
                      <div style={styles.infoRow}>
                        <span>Account Status:</span>
                        <strong style={{ color: securityData.security.accountLocked ? '#dc2626' : '#10b981' }}>
                          {securityData.security.accountLocked ? 'LOCKED' : 'Active'}
                        </strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span>Two-Factor Authentication:</span>
                        <strong style={{ color: securityData.security.twoFactorEnabled ? '#10b981' : '#6b7280' }}>
                          {securityData.security.twoFactorEnabled ? 'Enabled ✓' : 'Disabled'}
                        </strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span>Failed Login Attempts:</span>
                        <strong style={{ color: securityData.security.failedLoginAttempts > 3 ? '#dc2626' : '#6b7280' }}>
                          {securityData.security.failedLoginAttempts}
                        </strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span>Email Verified:</span>
                        <strong>{securityData.user.emailVerified ? 'Yes ✓' : 'No'}</strong>
                      </div>
                    </div>

                    <div style={styles.infoCard}>
                      <h3 style={styles.cardTitle}>🔑 Password Information</h3>
                      <div style={styles.infoRow}>
                        <span>Last Changed:</span>
                        <strong>{formatDate(securityData.security.lastPasswordChange)}</strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span>Days Since Change:</span>
                        <strong style={{ color: securityData.security.daysSincePasswordChange > 90 ? '#dc2626' : '#10b981' }}>
                          {securityData.security.daysSincePasswordChange} days
                        </strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span>Password Strength:</span>
                        <strong>
                          {getPasswordStrengthLabel(securityData.security.passwordStrengthScore)}
                        </strong>
                      </div>
                      <div style={{ marginTop: '12px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
                        <strong style={{ color: '#dc2626' }}>⚠️ SECURITY NOTICE:</strong>
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#991b1b' }}>
                          Passwords are NEVER visible to admins. All passwords are securely hashed using industry-standard encryption.
                        </p>
                      </div>
                    </div>

                    <div style={styles.infoCard}>
                      <h3 style={styles.cardTitle}>📅 Account Timeline</h3>
                      <div style={styles.infoRow}>
                        <span>Account Created:</span>
                        <strong>{formatDate(securityData.user.createdAt)}</strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span>Last Sign In:</span>
                        <strong>{formatDate(securityData.user.lastSignInAt)}</strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span>Last Activity:</span>
                        <strong>{formatDate(securityData.security.lastLogin)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'login_history' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.cardTitle}>Login History (Last 50)</h3>
                    {securityData.loginHistory.length === 0 ? (
                      <p style={styles.emptyText}>No login history available</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Date & Time</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>IP Address</th>
                            <th style={styles.th}>Device</th>
                            <th style={styles.th}>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {securityData.loginHistory.map(login => (
                            <tr key={login.id} style={styles.tr}>
                              <td style={styles.td}>{formatDate(login.login_time)}</td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.statusBadge,
                                  background: login.success ? '#10b981' : '#dc2626',
                                  fontSize: '12px',
                                  padding: '4px 8px'
                                }}>
                                  {login.success ? '✓ Success' : '✕ Failed'}
                                </span>
                              </td>
                              <td style={styles.td}>{login.ip_address || 'N/A'}</td>
                              <td style={styles.td}>{login.device_type || 'Unknown'}</td>
                              <td style={styles.td}>
                                {login.city && login.country ? `${login.city}, ${login.country}` : 'Unknown'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'sessions' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.cardTitle}>Active Sessions</h3>
                    {securityData.sessions.length === 0 ? (
                      <p style={styles.emptyText}>No active sessions</p>
                    ) : (
                      <div style={styles.sessionsGrid}>
                        {securityData.sessions.map(session => (
                          <div key={session.id} style={styles.sessionCard}>
                            <div style={styles.sessionHeader}>
                              <span style={styles.sessionIcon}>💻</span>
                              <div>
                                <h4 style={styles.sessionDevice}>{session.device_type || 'Unknown Device'}</h4>
                                <p style={styles.sessionIP}>{session.ip_address}</p>
                              </div>
                            </div>
                            <div style={styles.sessionInfo}>
                              <div style={styles.infoRow}>
                                <span>Last Activity:</span>
                                <strong>{formatDate(session.last_activity)}</strong>
                              </div>
                              <div style={styles.infoRow}>
                                <span>Started:</span>
                                <strong>{formatDate(session.created_at)}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'password' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.cardTitle}>Password Change History</h3>
                    <div style={{ marginBottom: '16px', padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '2px solid #f59e0b' }}>
                      <strong style={{ color: '#92400e' }}>🔒 Privacy Protection:</strong>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#78350f' }}>
                        This shows ONLY when passwords were changed and their strength scores. 
                        Actual passwords and password hashes are NEVER stored in this table or visible to anyone.
                      </p>
                    </div>
                    {securityData.passwordHistory.length === 0 ? (
                      <p style={styles.emptyText}>No password change history</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Date & Time</th>
                            <th style={styles.th}>Changed By</th>
                            <th style={styles.th}>Strength Score</th>
                            <th style={styles.th}>IP Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {securityData.passwordHistory.map(record => (
                            <tr key={record.id} style={styles.tr}>
                              <td style={styles.td}>{formatDate(record.changed_at)}</td>
                              <td style={styles.td}>{record.changed_by || 'User'}</td>
                              <td style={styles.td}>
                                <strong style={{
                                  color: record.password_strength_score >= 3 ? '#10b981' : '#f59e0b'
                                }}>
                                  {getPasswordStrengthLabel(record.password_strength_score)}
                                </strong>
                              </td>
                              <td style={styles.td}>{record.ip_address || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'suspicious' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.cardTitle}>Suspicious Activity</h3>
                    {securityData.suspiciousActivity.length === 0 ? (
                      <p style={styles.emptyText}>No suspicious activity detected</p>
                    ) : (
                      <div style={styles.suspiciousGrid}>
                        {securityData.suspiciousActivity.map(activity => (
                          <div key={activity.id} style={{
                            ...styles.suspiciousCard,
                            borderLeft: `4px solid ${getRiskLevelColor(activity.risk_level)}`
                          }}>
                            <div style={styles.suspiciousHeader}>
                              <span style={styles.activityType}>{activity.activity_type.replace('_', ' ').toUpperCase()}</span>
                              <span style={{
                                ...styles.statusBadge,
                                background: getRiskLevelColor(activity.risk_level),
                                fontSize: '12px'
                              }}>
                                {activity.risk_level.toUpperCase()}
                              </span>
                            </div>
                            <p style={styles.activityDescription}>{activity.description}</p>
                            <div style={styles.activityMeta}>
                              <span>{formatDate(activity.created_at)}</span>
                              {activity.ip_address && <span>IP: {activity.ip_address}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Modal */}
        {showActionModal && (
          <div style={styles.modalOverlay} onClick={() => setShowActionModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {actionType.replace(/_/g, ' ').toUpperCase()}
                </h2>
                <button onClick={() => setShowActionModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                {actionType === 'block_ip' && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>IP Address to Block:</label>
                      <input
                        type="text"
                        value={actionData.ipAddress || ''}
                        onChange={(e) => setActionData({ ...actionData, ipAddress: e.target.value })}
                        placeholder="e.g., 192.168.1.1"
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Expires in (days):</label>
                      <input
                        type="number"
                        value={actionData.expiresInDays || ''}
                        onChange={(e) => setActionData({ ...actionData, expiresInDays: parseInt(e.target.value) })}
                        placeholder="Leave empty for permanent"
                        style={styles.input}
                      />
                    </div>
                  </>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Reason (optional):</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Provide a reason for this action..."
                    style={styles.textarea}
                    rows="4"
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    onClick={performSecurityAction}
                    style={{...styles.confirmButton, opacity: loading ? 0.6 : 1}}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm Action'}
                  </button>
                  <button
                    onClick={() => setShowActionModal(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: 'clamp(14px, 2vw, 16px)',
    color: '#e0e7ff',
    margin: 0,
    lineHeight: '1.6'
  },
  backButton: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto'
  },
  userSelector: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: '#ffffff',
    color: '#374151',
    cursor: 'pointer'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: '#ffffff',
    color: '#374151'
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: '#ffffff',
    color: '#374151',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  loadingState: {
    background: '#ffffff',
    padding: '48px',
    borderRadius: '12px',
    textAlign: 'center'
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto 16px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorBanner: {
    background: '#fee2e2',
    border: '2px solid #dc2626',
    color: '#991b1b',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontWeight: '600'
  },
  successBanner: {
    background: '#d1fae5',
    border: '2px solid #10b981',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontWeight: '600'
  },
  userInfoCard: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  userInfoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px'
  },
  userName: {
    fontSize: 'clamp(20px, 3vw, 24px)',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0'
  },
  userEmail: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  userStatus: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  statusBadge: {
    padding: '6px 12px',
    background: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    borderLeft: '4px solid #667eea'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 8px 0',
    fontWeight: '600'
  },
  statValue: {
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  actionsSection: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 16px 0'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  actionButton: {
    padding: '12px 16px',
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '12px 20px',
    background: 'rgba(255, 255, 255, 0.7)',
    color: '#374151',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    padding: '12px 20px',
    background: '#ffffff',
    color: '#667eea',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    borderBottom: '3px solid #667eea'
  },
  tabContent: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '0 12px 12px 12px',
    minHeight: '400px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  infoCard: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 16px 0'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
    color: '#6b7280',
    gap: '16px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    padding: '12px',
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280'
  },
  tr: {
    transition: 'background 0.2s ease'
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '40px',
    fontSize: '16px'
  },
  sessionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  },
  sessionCard: {
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  sessionHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px'
  },
  sessionIcon: {
    fontSize: '24px'
  },
  sessionDevice: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0'
  },
  sessionIP: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0
  },
  sessionInfo: {
    marginTop: '12px'
  },
  suspiciousGrid: {
    display: 'grid',
    gap: '16px'
  },
  suspiciousCard: {
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  suspiciousHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    gap: '12px',
    flexWrap: 'wrap'
  },
  activityType: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827'
  },
  activityDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0'
  },
  activityMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: '#ffffff',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    lineHeight: '32px'
  },
  modalBody: {
    padding: '24px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end'
  },
  confirmButton: {
    padding: '12px 24px',
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  cancelButton: {
    padding: '12px 24px',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
};