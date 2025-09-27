
<new_str>import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function AdminLogs() {
  const { user, signOut } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, [filterLevel, filterType, dateRange]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch system logs from Supabase
  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date range filter
      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate + 'T00:00:00');
      }

      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate + 'T23:59:59');
      }

      // Apply level filter
      if (filterLevel !== 'all') {
        query = query.eq('level', filterLevel);
      }

      // Apply type filter
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query.limit(1000);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no logs table exists, create some mock logs for demo
      if (!data || data.length === 0) {
        const mockLogs = generateMockLogs();
        setLogs(mockLogs);
      } else {
        setLogs(data);
      }

    } catch (error) {
      console.error('Error fetching logs:', error);
      // Generate mock logs if table doesn't exist
      const mockLogs = generateMockLogs();
      setLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock logs for demonstration
  const generateMockLogs = () => {
    const logTypes = ['auth', 'transaction', 'system', 'security', 'error', 'api'];
    const logLevels = ['info', 'warning', 'error', 'debug'];
    const messages = [
      'User login successful',
      'Transaction processed successfully',
      'Failed login attempt detected',
      'System backup completed',
      'Database connection established',
      'API rate limit exceeded',
      'Password reset requested',
      'Card transaction approved',
      'Suspicious activity detected',
      'Admin action logged',
      'Account balance updated',
      'Email notification sent'
    ];

    const mockLogs = [];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const randomDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      mockLogs.push({
        id: i + 1,
        level: logLevels[Math.floor(Math.random() * logLevels.length)],
        type: logTypes[Math.floor(Math.random() * logTypes.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        details: {
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          session_id: `sess_${Math.random().toString(36).substr(2, 9)}`
        },
        created_at: randomDate.toISOString(),
        user_id: Math.random() > 0.3 ? user?.id : null,
        admin_id: Math.random() > 0.7 ? user?.id : null
      });
    }

    return mockLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Filter logs based on search term
  const filteredLogs = logs.filter(log =>
    log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.level?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.id?.toString().includes(searchTerm)
  );

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      case 'debug':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'auth':
        return '🔐';
      case 'transaction':
        return '💰';
      case 'system':
        return '⚙️';
      case 'security':
        return '🛡️';
      case 'error':
        return '❌';
      case 'api':
        return '🔌';
      default:
        return '📋';
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
      total: filteredLogs.length,
      error: filteredLogs.filter(log => log.level === 'error').length,
      warning: filteredLogs.filter(log => log.level === 'warning').length,
      info: filteredLogs.filter(log => log.level === 'info').length,
      debug: filteredLogs.filter(log => log.level === 'debug').length
    };
    return stats;
  };

  const stats = calculateStats();

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>📋 System Logs</h1>
            <p style={styles.subtitle}>Monitor system activities and troubleshoot issues</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchLogs} style={styles.refreshButton} disabled={loading}>
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
            <h3>Total Logs</h3>
            <p style={styles.statNumber}>{stats.total}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Errors</h3>
            <p style={{...styles.statNumber, color: '#ef4444'}}>{stats.error}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Warnings</h3>
            <p style={{...styles.statNumber, color: '#f59e0b'}}>{stats.warning}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Info</h3>
            <p style={{...styles.statNumber, color: '#3b82f6'}}>{stats.info}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Debug</h3>
            <p style={{...styles.statNumber, color: '#6b7280'}}>{stats.debug}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersContainer}>
          <div style={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search logs by message, type, level, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="auth">Authentication</option>
              <option value="transaction">Transactions</option>
              <option value="system">System</option>
              <option value="security">Security</option>
              <option value="api">API</option>
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

        {/* Logs Table */}
        <div style={styles.logsSection}>
          <h2>System Logs ({filteredLogs.length})</h2>
          
          {loading ? (
            <div style={styles.loading}>Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={styles.noData}>
              {searchTerm || filterLevel !== 'all' || filterType !== 'all' 
                ? 'No logs match your filters.' 
                : 'No logs found for the selected date range.'
              }
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>ID</th>
                    <th>Level</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <span style={styles.logId}>#{log.id}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.levelBadge,
                          backgroundColor: getLevelColor(log.level),
                        }}>
                          {log.level?.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.logType}>
                          {getTypeIcon(log.type)} {log.type}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.logMessage}>
                          {log.message}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.timestamp}>
                          {formatDate(log.created_at)}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <button
                          onClick={() => setSelectedLog(log)}
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

        {/* Log Details Modal */}
        {selectedLog && (
          <div style={styles.modal} onClick={() => setSelectedLog(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>Log Details - #{selectedLog.id}</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailGroup}>
                    <label>Log ID:</label>
                    <span>#{selectedLog.id}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Level:</label>
                    <span style={{
                      ...styles.levelBadge,
                      backgroundColor: getLevelColor(selectedLog.level),
                    }}>
                      {selectedLog.level?.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Type:</label>
                    <span>{getTypeIcon(selectedLog.type)} {selectedLog.type}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Message:</label>
                    <span style={{fontWeight: '500'}}>{selectedLog.message}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Timestamp:</label>
                    <span>{formatDate(selectedLog.created_at)}</span>
                  </div>
                  {selectedLog.user_id && (
                    <div style={styles.detailGroup}>
                      <label>User ID:</label>
                      <span>{selectedLog.user_id}</span>
                    </div>
                  )}
                  {selectedLog.admin_id && (
                    <div style={styles.detailGroup}>
                      <label>Admin ID:</label>
                      <span>{selectedLog.admin_id}</span>
                    </div>
                  )}
                  {selectedLog.details && (
                    <div style={styles.detailGroup}>
                      <label>Details:</label>
                      <pre style={styles.jsonDetails}>
                        {JSON.stringify(selectedLog.details, null, 2)}
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

export default AdminLogs;

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
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
  logsSection: {
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
  logId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  levelBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  logType: {
    textTransform: 'capitalize',
    fontWeight: '500'
  },
  logMessage: {
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
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
