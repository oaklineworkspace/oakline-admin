import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function SecurityDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('logins');
  
  const [filters, setFilters] = useState({
    dateRange: '',
    startDate: '',
    endDate: '',
    deviceType: 'all',
    location: 'all',
    userEmail: '',
    status: 'all',
    limit: 100
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [logoutReason, setLogoutReason] = useState('');
  
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchDashboardData(true);
      }, 30000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [filters, autoRefresh]);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      
      if (filters.startDate && filters.endDate) {
        params.append('dateRange', `${filters.startDate},${filters.endDate}`);
      }
      if (filters.deviceType !== 'all') {
        params.append('deviceType', filters.deviceType);
      }
      if (filters.location !== 'all') {
        params.append('location', filters.location);
      }
      if (filters.userEmail) {
        params.append('userEmail', filters.userEmail);
      }
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      params.append('limit', filters.limit);

      const response = await fetch(`/api/admin/get-security-dashboard-data?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      setDashboardData(result.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleForceLogout = async () => {
    if (!selectedSession) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/force-logout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          reason: logoutReason
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to terminate session');

      setSuccess('Session terminated successfully');
      setShowLogoutModal(false);
      setSelectedSession(null);
      setLogoutReason('');
      
      fetchDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!dashboardData) return;

    let csvContent = '';
    let data = [];
    let headers = [];

    switch (activeTab) {
      case 'logins':
        headers = ['Date & Time', 'User Email', 'Name', 'Status', 'IP Address', 'Device Type', 'Browser', 'OS', 'Location', 'Failure Reason'];
        data = dashboardData.recentLogins.map(login => [
          formatDate(login.login_time),
          login.profiles?.email || 'N/A',
          login.profiles?.first_name && login.profiles?.last_name 
            ? `${login.profiles.first_name} ${login.profiles.last_name}` 
            : 'N/A',
          login.success ? 'Success' : 'Failed',
          login.ip_address || 'N/A',
          login.device_type || 'Unknown',
          login.browser || 'N/A',
          login.os || 'N/A',
          login.city && login.country ? `${login.city}, ${login.country}` : 'Unknown',
          login.failure_reason || 'N/A'
        ]);
        break;

      case 'sessions':
        headers = ['User Email', 'Name', 'Device Type', 'IP Address', 'User Agent', 'Login Time', 'Last Activity', 'Duration'];
        data = dashboardData.activeSessions.map(session => [
          session.profiles?.email || 'N/A',
          session.profiles?.first_name && session.profiles?.last_name 
            ? `${session.profiles.first_name} ${session.profiles.last_name}` 
            : 'N/A',
          session.device_type || 'Unknown',
          session.ip_address || 'N/A',
          session.user_agent || 'N/A',
          formatDate(session.created_at),
          formatDate(session.last_activity),
          getSessionDuration(session.created_at)
        ]);
        break;

      case 'pins':
        headers = ['Date & Time', 'User Email', 'Name', 'Action', 'IP Address', 'Device Info'];
        data = dashboardData.pinActivity.map(activity => [
          formatDate(activity.created_at),
          activity.profiles?.email || 'N/A',
          activity.profiles?.first_name && activity.profiles?.last_name 
            ? `${activity.profiles.first_name} ${activity.profiles.last_name}` 
            : 'N/A',
          activity.message?.includes('created') ? 'Setup' : 'Reset',
          activity.details?.ip_address || 'N/A',
          activity.details?.user_agent || 'N/A'
        ]);
        break;

      case 'banned':
        headers = ['User Email', 'Name', 'Banned Until', 'Ban Duration', 'Created At'];
        data = dashboardData.bannedUsers.map(user => [
          user.email || 'N/A',
          user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'N/A',
          user.banned_until ? formatDate(user.banned_until) : 'N/A',
          user.ban_duration || 'N/A',
          formatDate(user.created_at)
        ]);
        break;
    }

    csvContent = headers.join(',') + '\n';
    csvContent += data.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `security_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getSessionDuration = (startDate) => {
    if (!startDate) return 'N/A';
    const start = new Date(startDate);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (loading && !dashboardData) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading security dashboard...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔒 Security Monitoring Dashboard</h1>
            <p style={styles.subtitle}>System-wide security and authentication monitoring</p>
          </div>
          <Link href="/admin" style={styles.backButton}>
            ← Admin Hub
          </Link>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={styles.closeButton}>✕</button>
          </div>
        )}

        {success && (
          <div style={styles.successBanner}>
            ✓ {success}
            <button onClick={() => setSuccess('')} style={styles.closeButton}>✕</button>
          </div>
        )}

        {dashboardData && (
          <>
            <div style={styles.statsGrid}>
              <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
                <h3 style={styles.statLabel}>Total Logins</h3>
                <p style={styles.statValue}>{dashboardData.stats.totalLogins}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
                <h3 style={styles.statLabel}>Failed Logins</h3>
                <p style={styles.statValue}>{dashboardData.stats.failedLogins}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
                <h3 style={styles.statLabel}>Active Sessions</h3>
                <p style={styles.statValue}>{dashboardData.stats.activeSessions}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #8b5cf6'}}>
                <h3 style={styles.statLabel}>PIN Setups</h3>
                <p style={styles.statValue}>{dashboardData.stats.pinSetups}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
                <h3 style={styles.statLabel}>PIN Resets</h3>
                <p style={styles.statValue}>{dashboardData.stats.pinResets}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
                <h3 style={styles.statLabel}>Banned Users</h3>
                <p style={styles.statValue}>{dashboardData.stats.bannedUsers}</p>
              </div>
            </div>

            {dashboardData.alerts && dashboardData.alerts.length > 0 && (
              <div style={styles.alertsSection}>
                <h3 style={styles.alertsTitle}>🚨 Suspicious Activity Alerts ({dashboardData.alerts.length})</h3>
                <div style={styles.alertsGrid}>
                  {dashboardData.alerts.map((alert, index) => (
                    <div 
                      key={index} 
                      style={{
                        ...styles.alertCard,
                        borderLeft: `4px solid ${getSeverityColor(alert.severity)}`
                      }}
                    >
                      <div style={styles.alertHeader}>
                        <span style={{
                          ...styles.severityBadge,
                          backgroundColor: getSeverityColor(alert.severity)
                        }}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span style={styles.alertType}>
                          {alert.type === 'failed_logins' ? '🔐 Failed Logins' : '💻 Concurrent Sessions'}
                        </span>
                      </div>
                      <p style={styles.alertMessage}>{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.controlsSection}>
              <div style={styles.controlsRow}>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Search User Email:</label>
                  <input
                    type="text"
                    value={filters.userEmail}
                    onChange={(e) => setFilters({...filters, userEmail: e.target.value})}
                    placeholder="email@example.com"
                    style={styles.input}
                  />
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Date Range:</label>
                  <div style={styles.dateRange}>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      style={styles.dateInput}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      style={styles.dateInput}
                    />
                  </div>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Device Type:</label>
                  <select
                    value={filters.deviceType}
                    onChange={(e) => setFilters({...filters, deviceType: e.target.value})}
                    style={styles.select}
                  >
                    <option value="all">All Devices</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                    <option value="desktop">Desktop</option>
                  </select>
                </div>

                {activeTab === 'logins' && (
                  <div style={styles.filterGroup}>
                    <label style={styles.label}>Status:</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      style={styles.select}
                    >
                      <option value="all">All Status</option>
                      <option value="success">Success Only</option>
                      <option value="failed">Failed Only</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={styles.actionsRow}>
                <button
                  onClick={() => fetchDashboardData()}
                  style={styles.refreshButton}
                  disabled={loading}
                >
                  🔄 Refresh
                </button>
                
                <label style={styles.autoRefreshLabel}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  Auto-refresh (30s)
                </label>

                <button
                  onClick={exportToCSV}
                  style={styles.exportButton}
                >
                  📊 Export to CSV
                </button>

                {filters.startDate && (
                  <button
                    onClick={() => setFilters({
                      dateRange: '',
                      startDate: '',
                      endDate: '',
                      deviceType: 'all',
                      location: 'all',
                      userEmail: '',
                      status: 'all',
                      limit: 100
                    })}
                    style={styles.clearButton}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div style={styles.tabsContainer}>
              <div style={styles.tabs}>
                <button
                  onClick={() => setActiveTab('logins')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'logins' ? styles.activeTab : {})
                  }}
                >
                  🔐 Login History ({dashboardData.recentLogins.length})
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'sessions' ? styles.activeTab : {})
                  }}
                >
                  💻 Active Sessions ({dashboardData.activeSessions.length})
                </button>
                <button
                  onClick={() => setActiveTab('pins')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'pins' ? styles.activeTab : {})
                  }}
                >
                  🔑 PIN Activity ({dashboardData.pinActivity.length})
                </button>
                <button
                  onClick={() => setActiveTab('banned')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'banned' ? styles.activeTab : {})
                  }}
                >
                  🚫 Banned Users ({dashboardData.bannedUsers.length})
                </button>
              </div>

              <div style={styles.tabContent}>
                {activeTab === 'logins' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Recent Login Attempts</h3>
                    {dashboardData.recentLogins.length === 0 ? (
                      <p style={styles.emptyText}>No login data available</p>
                    ) : (
                      <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Date & Time</th>
                              <th style={styles.th}>User Email</th>
                              <th style={styles.th}>Name</th>
                              <th style={styles.th}>Status</th>
                              <th style={styles.th}>IP Address</th>
                              <th style={styles.th}>Device</th>
                              <th style={styles.th}>Browser</th>
                              <th style={styles.th}>OS</th>
                              <th style={styles.th}>Location</th>
                              <th style={styles.th}>Failure Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.recentLogins.map(login => (
                              <tr 
                                key={login.id} 
                                style={{
                                  ...styles.tr,
                                  backgroundColor: !login.success ? '#fef2f2' : 'white'
                                }}
                              >
                                <td style={styles.td}>{formatDate(login.login_time)}</td>
                                <td style={styles.td}>{login.profiles?.email || 'N/A'}</td>
                                <td style={styles.td}>
                                  {login.profiles?.first_name && login.profiles?.last_name 
                                    ? `${login.profiles.first_name} ${login.profiles.last_name}` 
                                    : 'N/A'}
                                </td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.statusBadge,
                                    backgroundColor: login.success ? '#10b981' : '#ef4444'
                                  }}>
                                    {login.success ? '✓ Success' : '✕ Failed'}
                                  </span>
                                </td>
                                <td style={styles.td}>{login.ip_address || 'N/A'}</td>
                                <td style={styles.td}>{login.device_type || 'Unknown'}</td>
                                <td style={styles.td}>{login.browser || 'N/A'}</td>
                                <td style={styles.td}>{login.os || 'N/A'}</td>
                                <td style={styles.td}>
                                  {login.city && login.country 
                                    ? `${login.city}, ${login.country}` 
                                    : 'Unknown'}
                                </td>
                                <td style={styles.td}>
                                  {!login.success ? (login.failure_reason || 'Unknown') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'sessions' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Active User Sessions</h3>
                    {dashboardData.activeSessions.length === 0 ? (
                      <p style={styles.emptyText}>No active sessions</p>
                    ) : (
                      <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>User Email</th>
                              <th style={styles.th}>Name</th>
                              <th style={styles.th}>Device Type</th>
                              <th style={styles.th}>IP Address</th>
                              <th style={styles.th}>User Agent</th>
                              <th style={styles.th}>Login Time</th>
                              <th style={styles.th}>Last Activity</th>
                              <th style={styles.th}>Duration</th>
                              <th style={styles.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.activeSessions.map(session => (
                              <tr key={session.id} style={styles.tr}>
                                <td style={styles.td}>{session.profiles?.email || 'N/A'}</td>
                                <td style={styles.td}>
                                  {session.profiles?.first_name && session.profiles?.last_name 
                                    ? `${session.profiles.first_name} ${session.profiles.last_name}` 
                                    : 'N/A'}
                                </td>
                                <td style={styles.td}>{session.device_type || 'Unknown'}</td>
                                <td style={styles.td}>{session.ip_address || 'N/A'}</td>
                                <td style={styles.td}>
                                  <div style={styles.truncate}>{session.user_agent || 'N/A'}</div>
                                </td>
                                <td style={styles.td}>{formatDate(session.created_at)}</td>
                                <td style={styles.td}>{formatDate(session.last_activity)}</td>
                                <td style={styles.td}>{getSessionDuration(session.created_at)}</td>
                                <td style={styles.td}>
                                  <button
                                    onClick={() => {
                                      setSelectedSession(session);
                                      setShowLogoutModal(true);
                                    }}
                                    style={styles.logoutButton}
                                  >
                                    🚫 Force Logout
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'pins' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Transaction PIN Activity</h3>
                    {dashboardData.pinActivity.length === 0 ? (
                      <p style={styles.emptyText}>No PIN activity recorded</p>
                    ) : (
                      <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Date & Time</th>
                              <th style={styles.th}>User Email</th>
                              <th style={styles.th}>Name</th>
                              <th style={styles.th}>Action</th>
                              <th style={styles.th}>IP Address</th>
                              <th style={styles.th}>Device Info</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.pinActivity.map(activity => (
                              <tr key={activity.id} style={styles.tr}>
                                <td style={styles.td}>{formatDate(activity.created_at)}</td>
                                <td style={styles.td}>{activity.profiles?.email || 'N/A'}</td>
                                <td style={styles.td}>
                                  {activity.profiles?.first_name && activity.profiles?.last_name 
                                    ? `${activity.profiles.first_name} ${activity.profiles.last_name}` 
                                    : 'N/A'}
                                </td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.statusBadge,
                                    backgroundColor: activity.message?.includes('created') 
                                      ? '#10b981' 
                                      : '#f59e0b'
                                  }}>
                                    {activity.message?.includes('created') ? '🔐 Setup' : '🔄 Reset'}
                                  </span>
                                </td>
                                <td style={styles.td}>{activity.details?.ip_address || 'N/A'}</td>
                                <td style={styles.td}>
                                  <div style={styles.truncate}>
                                    {activity.details?.user_agent || 'N/A'}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'banned' && (
                  <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Banned Users</h3>
                    {dashboardData.bannedUsers.length === 0 ? (
                      <p style={styles.emptyText}>No banned users</p>
                    ) : (
                      <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>User Email</th>
                              <th style={styles.th}>Name</th>
                              <th style={styles.th}>Banned Until</th>
                              <th style={styles.th}>Ban Duration</th>
                              <th style={styles.th}>Account Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.bannedUsers.map(user => (
                              <tr key={user.id} style={styles.tr}>
                                <td style={styles.td}>{user.email || 'N/A'}</td>
                                <td style={styles.td}>
                                  {user.first_name && user.last_name 
                                    ? `${user.first_name} ${user.last_name}` 
                                    : 'N/A'}
                                </td>
                                <td style={styles.td}>
                                  {user.banned_until ? formatDate(user.banned_until) : 'Permanent'}
                                </td>
                                <td style={styles.td}>{user.ban_duration || 'N/A'}</td>
                                <td style={styles.td}>{formatDate(user.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {showLogoutModal && (
          <div style={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Force Logout Session</h2>
              <p style={styles.modalText}>
                Are you sure you want to terminate this session?
              </p>
              {selectedSession && (
                <div style={styles.sessionInfo}>
                  <p><strong>User:</strong> {selectedSession.profiles?.email}</p>
                  <p><strong>IP:</strong> {selectedSession.ip_address}</p>
                  <p><strong>Device:</strong> {selectedSession.device_type}</p>
                </div>
              )}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Reason (required):</label>
                <textarea
                  value={logoutReason}
                  onChange={(e) => setLogoutReason(e.target.value)}
                  placeholder="e.g., Suspicious activity detected"
                  style={styles.textarea}
                  rows={3}
                />
              </div>
              <div style={styles.modalActions}>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceLogout}
                  style={styles.confirmButton}
                  disabled={!logoutReason || loading}
                >
                  {loading ? 'Terminating...' : 'Force Logout'}
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
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: '20px'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    color: 'white'
  },
  spinner: {
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0
  },
  backButton: {
    padding: '12px 24px',
    background: 'white',
    color: '#1e3a5f',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    background: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#991b1b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successBanner: {
    background: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#065f46',
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
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 8px 0',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0
  },
  alertsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  alertsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 16px 0'
  },
  alertsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  },
  alertCard: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '8px'
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  severityBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white'
  },
  alertType: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  },
  alertMessage: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  controlsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  controlsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '10px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px'
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dateInput: {
    padding: '10px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    flex: 1
  },
  select: {
    padding: '10px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white'
  },
  actionsRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  refreshButton: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  exportButton: {
    padding: '10px 20px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  clearButton: {
    padding: '10px 20px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  autoRefreshLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },
  tabsContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    overflowX: 'auto'
  },
  tab: {
    padding: '16px 24px',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: '#6b7280',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  activeTab: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6'
  },
  tabContent: {
    padding: '24px'
  },
  tableContainer: {
    width: '100%'
  },
  tableTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '16px'
  },
  emptyText: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '16px'
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px'
  },
  th: {
    padding: '12px 16px',
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#111827'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block'
  },
  truncate: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  logoutButton: {
    padding: '6px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '16px'
  },
  modalText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  sessionInfo: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  inputGroup: {
    marginBottom: '24px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '12px 24px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  confirmButton: {
    padding: '12px 24px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  }
};
