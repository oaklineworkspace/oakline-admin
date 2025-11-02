import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import Link from 'next/link';

export default function AdminAudit() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    table_name: '',
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, selectedUserId]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      
      if (!error) {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles(first_name, last_name, email)')
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (filters.action) {
        query = query.ilike('action', `%${filters.action}%`);
      }

      if (filters.table_name) {
        query = query.eq('table_name', filters.table_name);
      }

      if (selectedUserId) {
        query = query.eq('user_id', selectedUserId);
      }

      const { data, error } = await query;

      if (!error) {
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (logId) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const formatJSON = (data) => {
    if (!data) return 'N/A';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const exportToCSV = () => {
    if (filteredAuditLogs.length === 0) return;
    
    const headers = ['Date', 'User', 'Action', 'Table', 'Old Data', 'New Data'];
    const rows = filteredAuditLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'N/A',
      log.action || 'N/A',
      log.table_name || 'N/A',
      formatJSON(log.old_data).replace(/\n/g, ' ').replace(/\s+/g, ' '),
      formatJSON(log.new_data).replace(/\n/g, ' ').replace(/\s+/g, ' ')
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionColor = (action) => {
    if (!action) return '#6c757d';
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('create') || lowerAction.includes('insert')) return '#28a745';
    if (lowerAction.includes('update') || lowerAction.includes('modify')) return '#ffc107';
    if (lowerAction.includes('delete') || lowerAction.includes('remove')) return '#dc3545';
    return '#17a2b8';
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const logString = JSON.stringify({
      action: log.action,
      table_name: log.table_name,
      user: log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : '',
      old_data: log.old_data,
      new_data: log.new_data
    }).toLowerCase();
    return logString.includes(searchLower);
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔍 Admin Audit Logs</h1>
            <p style={styles.subtitle}>Track all system activities and changes</p>
          </div>
          <Link href="/" style={styles.backButton}>
            ← Back to Hub
          </Link>
        </div>

        <div style={styles.controls}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Start Date:</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>End Date:</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Action:</label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder="Filter by action..."
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Table:</label>
              <select
                value={filters.table_name}
                onChange={(e) => setFilters({ ...filters, table_name: e.target.value })}
                style={styles.select}
              >
                <option value="">All Tables</option>
                <option value="accounts">Accounts</option>
                <option value="transactions">Transactions</option>
                <option value="cards">Cards</option>
                <option value="loans">Loans</option>
                <option value="applications">Applications</option>
                <option value="users">Users</option>
              </select>
            </div>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>User:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={styles.select}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Search:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                style={styles.input}
              />
            </div>
            <div style={styles.buttonGroup}>
              <button onClick={fetchAuditLogs} style={styles.refreshButton}>
                🔄 Refresh
              </button>
              <button onClick={exportToCSV} style={styles.exportButton}>
                📥 Export CSV
              </button>
            </div>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{filteredAuditLogs.length}</div>
            <div style={styles.statLabel}>Total Logs</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>
              {filteredAuditLogs.filter(l => l.action?.toLowerCase().includes('create')).length}
            </div>
            <div style={styles.statLabel}>Creates</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>
              {filteredAuditLogs.filter(l => l.action?.toLowerCase().includes('update')).length}
            </div>
            <div style={styles.statLabel}>Updates</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>
              {filteredAuditLogs.filter(l => l.action?.toLowerCase().includes('delete')).length}
            </div>
            <div style={styles.statLabel}>Deletions</div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading audit logs...</div>
        ) : (
          <div style={styles.logsContainer}>
            {filteredAuditLogs.length === 0 ? (
              <div style={styles.noData}>
                <div style={styles.noDataIcon}>📋</div>
                <div>No audit logs found for the selected filters</div>
              </div>
            ) : (
              filteredAuditLogs.map((log) => (
                <div key={log.id} style={styles.logCard}>
                  <div 
                    style={styles.logHeader}
                    onClick={() => toggleExpanded(log.id)}
                  >
                    <div style={styles.logHeaderLeft}>
                      <span style={{ ...styles.actionBadge, background: getActionColor(log.action) }}>
                        {log.action || 'UNKNOWN'}
                      </span>
                      <span style={styles.tableBadge}>{log.table_name || 'N/A'}</span>
                      <span style={styles.logUser}>
                        {log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'System'}
                      </span>
                    </div>
                    <div style={styles.logHeaderRight}>
                      <span style={styles.logDate}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <button style={styles.expandButton}>
                        {expandedLogId === log.id ? '▼' : '►'}
                      </button>
                    </div>
                  </div>

                  {expandedLogId === log.id && (
                    <div style={styles.logDetails}>
                      <div style={styles.detailSection}>
                        <h4 style={styles.detailTitle}>Old Data:</h4>
                        <pre style={styles.jsonPre}>
                          {formatJSON(log.old_data)}
                        </pre>
                      </div>
                      <div style={styles.detailSection}>
                        <h4 style={styles.detailTitle}>New Data:</h4>
                        <pre style={styles.jsonPre}>
                          {formatJSON(log.new_data)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  container: {
    minHeight: '100vh',
    padding: '20px',
    background: '#f5f5f5'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '8px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px'
  },
  error: {
    color: '#dc3545',
    fontSize: '14px',
    textAlign: 'center'
  },
  loginButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
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
  backButton: {
    padding: '10px 20px',
    background: '#3498db',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  },
  controls: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  filterRow: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },
  filterGroup: {
    flex: 1,
    minWidth: '200px'
  },
  select: {
    padding: '10px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    background: 'white'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    padding: '10px 16px',
    background: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  exportButton: {
    padding: '10px 16px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  statBox: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#7f8c8d'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#7f8c8d'
  },
  logsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  noDataIcon: {
    fontSize: '48px',
    marginBottom: '10px'
  },
  logCard: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  logHeader: {
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
    ':hover': {
      background: '#f8f9fa'
    }
  },
  logHeaderLeft: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  logHeaderRight: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  actionBadge: {
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  tableBadge: {
    padding: '4px 12px',
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  logUser: {
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: '500'
  },
  logDate: {
    fontSize: '13px',
    color: '#7f8c8d'
  },
  expandButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#2c3e50'
  },
  logDetails: {
    padding: '20px',
    background: '#f8f9fa',
    borderTop: '1px solid #e0e0e0'
  },
  detailSection: {
    marginBottom: '15px'
  },
  detailTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '8px'
  },
  jsonPre: {
    background: 'white',
    padding: '15px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '300px',
    border: '1px solid #e0e0e0',
    fontFamily: 'monospace'
  }
};
