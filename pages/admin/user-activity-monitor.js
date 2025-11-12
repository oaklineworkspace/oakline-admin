
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function UserActivityMonitor() {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    activityType: 'all',
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    searchTerm: '',
    limit: 100
  });

  // Stats
  const [stats, setStats] = useState({
    totalActivities: 0,
    loginAttempts: 0,
    passwordChanges: 0,
    transactions: 0,
    accountChanges: 0,
    todayActivities: 0
  });

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, [filters.userId, filters.activityType, filters.startDate, filters.endDate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/get-users');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.activityType) params.append('activityType', filters.activityType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await fetch(`/api/admin/get-user-activities?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();

      setActivities(data.activities || []);
      calculateStats(data.activities || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (activitiesData) => {
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activitiesData.filter(a => 
      new Date(a.created_at).toISOString().split('T')[0] === today
    );

    setStats({
      totalActivities: activitiesData.length,
      loginAttempts: activitiesData.filter(a => 
        a.action?.toLowerCase().includes('login') || 
        a.action?.toLowerCase().includes('sign') ||
        a.type === 'auth' ||
        a.activity_category === 'login' ||
        a.message?.toLowerCase().includes('login')
      ).length,
      passwordChanges: activitiesData.filter(a => 
        a.action?.toLowerCase().includes('password') ||
        a.action?.toLowerCase().includes('update_user_password') ||
        a.activity_category === 'password' ||
        a.message?.toLowerCase().includes('password')
      ).length,
      transactions: activitiesData.filter(a => 
        a.table_name === 'transactions' || 
        a.type === 'transaction' ||
        a.activity_category === 'transaction'
      ).length,
      accountChanges: activitiesData.filter(a => 
        a.table_name === 'accounts' ||
        a.table_name === 'profiles' ||
        a.activity_category === 'account' ||
        a.activity_category === 'profile'
      ).length,
      todayActivities: todayActivities.length
    });
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

  const getActivityColor = (activity) => {
    const action = activity.action?.toLowerCase() || '';
    const level = activity.level?.toLowerCase() || '';

    if (level === 'error' || action.includes('delete') || action.includes('reject')) return '#dc2626';
    if (level === 'warning' || action.includes('suspend') || action.includes('block')) return '#f59e0b';
    if (action.includes('login') || action.includes('sign')) return '#3b82f6';
    if (action.includes('create') || action.includes('approve')) return '#10b981';
    if (action.includes('update') || action.includes('modify')) return '#8b5cf6';
    return '#6b7280';
  };

  const formatJSON = (data) => {
    if (!data) return 'N/A';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getUserName = (activity) => {
    if (activity.profiles?.first_name) {
      return `${activity.profiles.first_name} ${activity.profiles.last_name || ''}`.trim();
    }
    if (activity.profiles?.email) {
      return activity.profiles.email;
    }
    if (activity.details?.user_email) {
      return activity.details.user_email;
    }
    return 'System';
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

  const filteredActivities = activities.filter(activity => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    const searchString = JSON.stringify({
      action: activity.action,
      table: activity.table_name,
      type: activity.type,
      message: activity.message,
      user: getUserName(activity)
    }).toLowerCase();
    return searchString.includes(searchLower);
  });

  const exportToCSV = () => {
    if (filteredActivities.length === 0) return;

    const headers = ['Date & Time', 'User', 'Activity', 'Table/Type', 'Details'];
    const rows = filteredActivities.map(activity => [
      new Date(activity.created_at).toLocaleString(),
      getUserName(activity),
      activity.action || activity.message || 'N/A',
      activity.table_name || activity.type || 'N/A',
      activity.message || 'See full details'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_activities_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>👁️ User Activity Monitor</h1>
            <p style={styles.subtitle}>Track all user activities, logins, and account changes</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchActivities} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <button onClick={exportToCSV} style={styles.exportButton}>
              📥 Export CSV
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
            <h3 style={styles.statLabel}>Total Activities</h3>
            <p style={styles.statValue}>{stats.totalActivities}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Today's Activities</h3>
            <p style={styles.statValue}>{stats.todayActivities}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #8b5cf6'}}>
            <h3 style={styles.statLabel}>Login Attempts</h3>
            <p style={styles.statValue}>{stats.loginAttempts}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Password Changes</h3>
            <p style={styles.statValue}>{stats.passwordChanges}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
            <h3 style={styles.statLabel}>Transactions</h3>
            <p style={styles.statValue}>{stats.transactions}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Account Changes</h3>
            <p style={styles.statValue}>{stats.accountChanges}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>User:</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({...filters, userId: e.target.value})}
                style={styles.select}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.profiles?.first_name && user.profiles?.last_name
                      ? `${user.profiles.first_name} ${user.profiles.last_name} (${user.email})`
                      : user.email}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Activity Type:</label>
              <select
                value={filters.activityType}
                onChange={(e) => setFilters({...filters, activityType: e.target.value})}
                style={styles.select}
              >
                <option value="all">All Activities</option>
                <option value="login">🔐 Login Events</option>
                <option value="password">🔑 Password Changes</option>
                <option value="transaction">💸 Transactions</option>
                <option value="card">💳 Card Activities</option>
                <option value="account">🏦 Account Changes</option>
                <option value="loan">🏠 Loan Activities</option>
                <option value="profile">👤 Profile Changes</option>
                <option value="auth">Authentication</option>
                <option value="user">User Changes</option>
                <option value="system">System Events</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Search:</label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                placeholder="🔍 Search activities..."
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Start Date:</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>End Date:</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Limit:</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({...filters, limit: e.target.value})}
                style={styles.select}
              >
                <option value="50">50 records</option>
                <option value="100">100 records</option>
                <option value="250">250 records</option>
                <option value="500">500 records</option>
                <option value="1000">1000 records</option>
              </select>
            </div>

            {(filters.startDate || filters.endDate) && (
              <button
                onClick={() => setFilters({
                  ...filters,
                  startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                })}
                style={styles.clearButton}
              >
                ✕ Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Activities Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No activities found</p>
            </div>
          ) : (
            <div style={styles.activitiesGrid}>
              {filteredActivities.map(activity => (
                <div 
                  key={activity.id} 
                  style={styles.activityCard}
                  onClick={() => {
                    setSelectedActivity(activity);
                    setShowModal(true);
                  }}
                >
                  <div style={styles.activityHeader}>
                    <div style={styles.activityHeaderLeft}>
                      <span style={styles.activityIcon}>
                        {getActivityIcon(activity)}
                      </span>
                      <div>
                        <h3 style={styles.activityTitle}>
                          {activity.action || activity.message || 'Activity'}
                        </h3>
                        <p style={styles.activityUser}>
                          {getUserName(activity)}
                        </p>
                      </div>
                    </div>
                    <span 
                      style={{
                        ...styles.activityBadge,
                        background: getActivityColor(activity) + '20',
                        color: getActivityColor(activity)
                      }}
                    >
                      {activity.table_name || activity.type || 'System'}
                    </span>
                  </div>

                  <div style={styles.activityBody}>
                    <div style={styles.activityInfo}>
                      <span style={styles.infoLabel}>Date & Time:</span>
                      <span style={styles.infoValue}>
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                    {activity.message && (
                      <div style={styles.activityInfo}>
                        <span style={styles.infoLabel}>Message:</span>
                        <span style={styles.infoValue}>{activity.message}</span>
                      </div>
                    )}
                    {activity.details?.ip_address && (
                      <div style={styles.activityInfo}>
                        <span style={styles.infoLabel}>IP Address:</span>
                        <span style={styles.infoValue}>{activity.details.ip_address}</span>
                      </div>
                    )}
                    {activity.details?.user_agent && (
                      <div style={styles.activityInfo}>
                        <span style={styles.infoLabel}>Device:</span>
                        <span style={styles.infoValue}>
                          {getDeviceInfo(activity.details.user_agent)}
                        </span>
                      </div>
                    )}
                    {activity.activity_category && (
                      <div style={styles.activityInfo}>
                        <span style={styles.infoLabel}>Category:</span>
                        <span style={styles.infoValue}>
                          {activity.activity_category.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    )}
                    {activity.source && (
                      <div style={styles.activityInfo}>
                        <span style={styles.infoLabel}>Source:</span>
                        <span style={styles.infoValue}>
                          {activity.source === 'audit_log' ? 'Audit Log' : 'System Log'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={styles.activityFooter}>
                    <button style={styles.viewDetailsButton}>
                      👁️ View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Details Modal */}
        {showModal && selectedActivity && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {getActivityIcon(selectedActivity)} Activity Details
                </h2>
                <button onClick={() => setShowModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>User:</span>
                    <span style={styles.detailValue}>{getUserName(selectedActivity)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Activity:</span>
                    <span style={styles.detailValue}>
                      {selectedActivity.action || selectedActivity.message || 'N/A'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Table/Type:</span>
                    <span style={styles.detailValue}>
                      {selectedActivity.table_name || selectedActivity.type || 'N/A'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Date & Time:</span>
                    <span style={styles.detailValue}>
                      {new Date(selectedActivity.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedActivity.activity_category && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Category:</span>
                      <span style={styles.detailValue}>
                        {selectedActivity.activity_category.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  )}
                  {selectedActivity.details?.ip_address && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>IP Address:</span>
                      <span style={styles.detailValue}>{selectedActivity.details.ip_address}</span>
                    </div>
                  )}
                  {selectedActivity.details?.user_agent && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Device/Browser:</span>
                      <span style={styles.detailValue} style={{fontSize: '12px'}}>
                        {selectedActivity.details.user_agent}
                      </span>
                    </div>
                  )}
                  {selectedActivity.details?.location && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Location:</span>
                      <span style={styles.detailValue}>{selectedActivity.details.location}</span>
                    </div>
                  )}
                  {selectedActivity.level && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Level:</span>
                      <span style={styles.detailValue}>{selectedActivity.level}</span>
                    </div>
                  )}
                  {selectedActivity.source && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Source:</span>
                      <span style={styles.detailValue}>
                        {selectedActivity.source === 'audit_log' ? 'Audit Log' : 'System Log'}
                      </span>
                    </div>
                  )}
                </div>

                {selectedActivity.old_data && (
                  <div style={styles.jsonSection}>
                    <h4 style={styles.jsonTitle}>Old Data:</h4>
                    <pre style={styles.jsonPre}>{formatJSON(selectedActivity.old_data)}</pre>
                  </div>
                )}

                {selectedActivity.new_data && (
                  <div style={styles.jsonSection}>
                    <h4 style={styles.jsonTitle}>New Data:</h4>
                    <pre style={styles.jsonPre}>{formatJSON(selectedActivity.new_data)}</pre>
                  </div>
                )}

                {selectedActivity.details && (
                  <div style={styles.jsonSection}>
                    <h4 style={styles.jsonTitle}>Additional Details:</h4>
                    <pre style={styles.jsonPre}>{formatJSON(selectedActivity.details)}</pre>
                  </div>
                )}
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
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
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  exportButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
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
  filtersSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },
  filterGroup: {
    flex: 1,
    minWidth: '200px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none'
  },
  clearButton: {
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
    background: 'white',
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
  activitiesGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  activityCard: {
    background: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #e2e8f0'
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  activityHeaderLeft: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  activityIcon: {
    fontSize: 'clamp(1.5rem, 4vw, 28px)'
  },
  activityTitle: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  activityUser: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },
  activityBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  activityBody: {
    marginBottom: '16px'
  },
  activityInfo: {
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
  activityFooter: {
    display: 'flex',
    gap: '8px'
  },
  viewDetailsButton: {
    flex: 1,
    padding: '10px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
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
  closeButton: {
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
  detailsGrid: {
    display: 'grid',
    gap: '16px',
    marginBottom: '20px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    color: '#2d3748',
    fontWeight: '500'
  },
  jsonSection: {
    marginTop: '20px'
  },
  jsonTitle: {
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px'
  },
  jsonPre: {
    background: '#f7fafc',
    padding: '15px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    overflow: 'auto',
    maxHeight: '300px',
    border: '1px solid #e2e8f0',
    fontFamily: 'monospace'
  }
};
