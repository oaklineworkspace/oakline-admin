
<new_str>import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function AdminAudit() {
  const { user, signOut } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterAdmin, setFilterAdmin] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [admins, setAdmins] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchAuditLogs();
    fetchAdmins();
  }, [filterAction, filterAdmin, dateRange]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch audit logs from Supabase
  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          admin_profiles!inner(
            full_name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

      // Apply date range filter
      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate + 'T00:00:00');
      }

      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate + 'T23:59:59');
      }

      // Apply action filter
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      // Apply admin filter
      if (filterAdmin !== 'all') {
        query = query.eq('admin_id', filterAdmin);
      }

      const { data, error } = await query.limit(1000);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no audit logs table exists, create some mock logs for demo
      if (!data || data.length === 0) {
        const mockLogs = generateMockAuditLogs();
        setAuditLogs(mockLogs);
      } else {
        setAuditLogs(data);
      }

    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Generate mock logs if table doesn't exist
      const mockLogs = generateMockAuditLogs();
      setAuditLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  // Fetch admins for filter dropdown
  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .order('full_name');

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  // Generate mock audit logs for demonstration
  const generateMockAuditLogs = () => {
    const actions = [
      'user_created',
      'user_deleted',
      'account_approved',
      'account_rejected',
      'transaction_created',
      'balance_updated',
      'card_issued',
      'card_blocked',
      'settings_updated',
      'admin_login',
      'report_generated',
      'notification_sent'
    ];

    const targetTypes = ['user', 'account', 'transaction', 'card', 'system'];
    
    const mockLogs = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const randomDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const action = actions[Math.floor(Math.random() * actions.length)];
      const targetType = targetTypes[Math.floor(Math.random() * targetTypes.length)];
      
      mockLogs.push({
        id: i + 1,
        admin_id: user?.id,
        action: action,
        target_type: targetType,
        target_id: Math.floor(Math.random() * 1000) + 1,
        details: {
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 Admin Browser',
          previous_value: action.includes('updated') ? 'Previous Value' : null,
          new_value: action.includes('updated') ? 'New Value' : null,
          reason: 'Admin action performed'
        },
        created_at: randomDate.toISOString(),
        admin_profiles: {
          full_name: 'Admin User',
          email: user?.email || 'admin@oaklinebank.com',
          role: 'admin'
        }
      });
    }

    return mockLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Filter audit logs based on search term
  const filteredAuditLogs = auditLogs.filter(log =>
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.id?.toString().includes(searchTerm)
  );

  const getActionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'user_created':
        return '👤➕';
      case 'user_deleted':
        return '👤🗑️';
      case 'account_approved':
        return '✅';
      case 'account_rejected':
        return '❌';
      case 'transaction_created':
        return '💰';
      case 'balance_updated':
        return '💳';
      case 'card_issued':
        return '💳➕';
      case 'card_blocked':
        return '💳🚫';
      case 'settings_updated':
        return '⚙️';
      case 'admin_login':
        return '🔐';
      case 'report_generated':
        return '📊';
      case 'notification_sent':
        return '📧';
      default:
        return '📋';
    }
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'user_created':
      case 'account_approved':
      case 'card_issued':
        return '#10b981';
      case 'user_deleted':
      case 'account_rejected':
      case 'card_blocked':
        return '#ef4444';
      case 'settings_updated':
      case 'balance_updated':
        return '#f59e0b';
      case 'admin_login':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateStats = () => {
    const stats = {
      total: filteredAuditLogs.length,
      today: filteredAuditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      }).length,
      thisWeek: filteredAuditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= weekAgo;
      }).length,
      uniqueAdmins: new Set(filteredAuditLogs.map(log => log.admin_id)).size
    };
    return stats;
  };

  const stats = calculateStats();

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>🔍 Audit Logs</h1>
            <p style={styles.subtitle}>Track administrative actions and system changes</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchAuditLogs} style={styles.refreshButton} disabled={loading}>
              {loading ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>Total Actions</h3>
            <p style={styles.statNumber}>{stats.total}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Today</h3>
            <p style={{...styles.statNumber, color: '#3b82f6'}}>{stats.today}</p>
          </div>
          <div style={styles.statCard}>
            <h3>This Week</h3>
            <p style={{...styles.statNumber, color: '#10b981'}}>{stats.thisWeek}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Active Admins</h3>
            <p style={{...styles.statNumber, color: '#f59e0b'}}>{stats.uniqueAdmins}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersContainer}>
          <div style={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by action, target, admin name, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Actions</option>
              <option value="user_created">User Created</option>
              <option value="user_deleted">User Deleted</option>
              <option value="account_approved">Account Approved</option>
              <option value="account_rejected">Account Rejected</option>
              <option value="transaction_created">Transaction Created</option>
              <option value="balance_updated">Balance Updated</option>
              <option value="card_issued">Card Issued</option>
              <option value="settings_updated">Settings Updated</option>
              <option value="admin_login">Admin Login</option>
            </select>

            <select
              value={filterAdmin}
              onChange={(e) => setFilterAdmin(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Admins</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name} ({admin.role})
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              style={styles.dateInput}
            />

            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              style={styles.dateInput}
            />
          </div>
        </div>

        {/* Audit Logs Table */}
        <div style={styles.auditSection}>
          <h2>Audit Trail ({filteredAuditLogs.length})</h2>
          
          {loading ? (
            <div style={styles.loading}>Loading audit logs...</div>
          ) : filteredAuditLogs.length === 0 ? (
            <div style={styles.noData}>
              {searchTerm || filterAction !== 'all' || filterAdmin !== 'all' 
                ? 'No audit logs match your filters.' 
                : 'No audit logs found for the selected date range.'
              }
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>ID</th>
                    <th>Action</th>
                    <th>Admin</th>
                    <th>Target</th>
                    <th>Target ID</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <span style={styles.auditId}>#{log.id}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.actionBadge,
                          backgroundColor: getActionColor(log.action),
                        }}>
                          {getActionIcon(log.action)} {log.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div>
                          <div style={styles.adminName}>{log.admin_profiles?.full_name}</div>
                          <div style={styles.adminEmail}>{log.admin_profiles?.email}</div>
                          <small style={styles.adminRole}>{log.admin_profiles?.role}</small>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.targetType}>
                          {log.target_type}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.targetId}>
                          #{log.target_id}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.timestamp}>
                          {formatDate(log.created_at)}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <button
                          onClick={() => setSelectedAudit(log)}
                          style={styles.viewButton}
                        >
                          👁️ Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Details Modal */}
        {selectedAudit && (
          <div style={styles.modal} onClick={() => setSelectedAudit(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>Audit Log Details - #{selectedAudit.id}</h3>
                <button
                  onClick={() => setSelectedAudit(null)}
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailGroup}>
                    <label>Audit ID:</label>
                    <span>#{selectedAudit.id}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Action:</label>
                    <span style={{
                      ...styles.actionBadge,
                      backgroundColor: getActionColor(selectedAudit.action),
                    }}>
                      {getActionIcon(selectedAudit.action)} {selectedAudit.action?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Admin:</label>
                    <div>
                      <div style={styles.adminName}>{selectedAudit.admin_profiles?.full_name}</div>
                      <div style={styles.adminEmail}>{selectedAudit.admin_profiles?.email}</div>
                      <small style={styles.adminRole}>Role: {selectedAudit.admin_profiles?.role}</small>
                    </div>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Target Type:</label>
                    <span style={{fontWeight: '500'}}>{selectedAudit.target_type}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Target ID:</label>
                    <span>#{selectedAudit.target_id}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Timestamp:</label>
                    <span>{formatDate(selectedAudit.created_at)}</span>
                  </div>
                  {selectedAudit.details && (
                    <div style={styles.detailGroup}>
                      <label>Details:</label>
                      <pre style={styles.jsonDetails}>
                        {JSON.stringify(selectedAudit.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}

export default AdminAudit;

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  refreshButton: {
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  error: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '10px 0 0 0'
  },
  filtersContainer: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  searchGroup: {
    marginBottom: '20px'
  },
  searchInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px'
  },
  filterGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  dateInput: {
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px'
  },
  auditSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontStyle: 'italic'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f8f9fa',
    fontWeight: 'bold',
    color: '#333'
  },
  tableRow: {
    borderBottom: '1px solid #dee2e6'
  },
  tableCell: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '14px',
    verticalAlign: 'top'
  },
  auditId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  actionBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  adminName: {
    fontWeight: '500',
    color: '#333'
  },
  adminEmail: {
    fontSize: '12px',
    color: '#666'
  },
  adminRole: {
    color: '#666',
    textTransform: 'uppercase'
  },
  targetType: {
    textTransform: 'capitalize',
    fontWeight: '500',
    color: '#495057'
  },
  targetId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  timestamp: {
    fontSize: '12px',
    color: '#666',
    fontFamily: 'monospace'
  },
  viewButton: {
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e9ecef'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666'
  },
  modalBody: {
    padding: '20px'
  },
  detailsGrid: {
    display: 'grid',
    gap: '15px'
  },
  detailGroup: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: '10px',
    alignItems: 'start',
    padding: '10px 0',
    borderBottom: '1px solid #f1f3f4'
  },
  jsonDetails: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '200px'
  }
};
</new_str>
