
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminBackButton from '../../components/AdminBackButton';
import { supabase } from '../../lib/supabaseClient';

export default function EmailLogs() {
  const router = useRouter();
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select(`
          *,
          profiles:recipient_user_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (err) {
      console.error('Error fetching email logs:', err);
      alert('Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const getProviderBadgeColor = (provider) => {
    switch (provider?.toLowerCase()) {
      case 'primary smtp':
        return '#3b82f6';
      case 'resend':
        return '#10b981';
      case 'sendgrid':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvider = filterProvider === 'all' || 
      log.provider?.toLowerCase() === filterProvider.toLowerCase();
    
    const matchesStatus = filterStatus === 'all' || 
      log.status?.toLowerCase() === filterStatus.toLowerCase();
    
    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    const matchesDateRange = logDate >= dateRange.start && logDate <= dateRange.end;
    
    return matchesSearch && matchesProvider && matchesStatus && matchesDateRange;
  });

  const providerStats = {
    'Primary SMTP': emailLogs.filter(l => l.provider?.toLowerCase() === 'primary smtp').length,
    'Resend': emailLogs.filter(l => l.provider?.toLowerCase() === 'resend').length,
    'SendGrid': emailLogs.filter(l => l.provider?.toLowerCase() === 'sendgrid').length,
  };

  const statusStats = {
    'Sent': emailLogs.filter(l => l.status?.toLowerCase() === 'sent').length,
    'Failed': emailLogs.filter(l => l.status?.toLowerCase() === 'failed').length,
    'Pending': emailLogs.filter(l => l.status?.toLowerCase() === 'pending').length,
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.title}>📧 Email Logs & SMTP Tracking</h1>
              <p style={styles.subtitle}>Monitor email delivery across multiple SMTP providers</p>
            </div>
            <AdminBackButton useBrowserHistory={true} />
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div>
              <div style={styles.statLabel}>Total Emails</div>
              <div style={styles.statValue}>{emailLogs.length}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div>
              <div style={styles.statLabel}>Successfully Sent</div>
              <div style={styles.statValue}>{statusStats['Sent']}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>❌</div>
            <div>
              <div style={styles.statLabel}>Failed</div>
              <div style={styles.statValue}>{statusStats['Failed']}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⏳</div>
            <div>
              <div style={styles.statLabel}>Pending</div>
              <div style={styles.statValue}>{statusStats['Pending']}</div>
            </div>
          </div>
        </div>

        {/* Provider Statistics */}
        <div style={styles.providerStats}>
          <h2 style={styles.sectionTitle}>Provider Usage</h2>
          <div style={styles.providerGrid}>
            {Object.entries(providerStats).map(([provider, count]) => (
              <div key={provider} style={styles.providerCard}>
                <div style={{
                  ...styles.providerBadge,
                  background: getProviderBadgeColor(provider)
                }}>
                  {provider}
                </div>
                <div style={styles.providerCount}>{count} emails</div>
                <div style={styles.providerPercent}>
                  {emailLogs.length > 0 ? ((count / emailLogs.length) * 100).toFixed(1) : 0}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="🔍 Search by email, subject, or message ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Providers</option>
            <option value="primary smtp">Primary SMTP</option>
            <option value="resend">Resend</option>
            <option value="sendgrid">SendGrid</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <div style={styles.dateRange}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={styles.dateInput}
            />
            <span style={styles.dateSeparator}>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={styles.dateInput}
            />
          </div>
          
          <button onClick={fetchEmailLogs} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>

        {/* Email Logs Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loading}>Loading email logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={styles.noData}>
              <div style={styles.noDataIcon}>📭</div>
              <div>No email logs found</div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date/Time</th>
                  <th style={styles.th}>Recipient</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Provider</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Message ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} style={styles.tr}>
                    <td style={styles.td}>
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.recipientInfo}>
                        <div style={styles.recipientEmail}>{log.recipient_email}</div>
                        {log.profiles && (
                          <div style={styles.recipientName}>
                            {log.profiles.first_name} {log.profiles.last_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.subject}>{log.subject || 'N/A'}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>{log.email_type || 'default'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.providerBadge,
                        background: getProviderBadgeColor(log.provider)
                      }}>
                        {log.provider || 'Unknown'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: getStatusBadgeColor(log.status)
                      }}>
                        {log.status || 'Unknown'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.messageId}>
                        {log.message_id ? log.message_id.substring(0, 20) + '...' : 'N/A'}
                      </div>
                      {log.error_message && (
                        <div style={styles.errorMessage}>
                          ⚠️ {log.error_message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: '30px',
    borderBottom: '3px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    color: '#1f2937',
    fontWeight: '700'
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#6b7280',
    fontSize: '14px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '0 30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '2px solid #e5e7eb'
  },
  statIcon: {
    fontSize: '32px'
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '5px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937'
  },
  providerStats: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '0 30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px'
  },
  providerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  providerCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '2px solid #e5e7eb'
  },
  providerCount: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '10px 0 5px 0'
  },
  providerPercent: {
    fontSize: '14px',
    color: '#6b7280'
  },
  filters: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '0 30px',
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: '1 1 300px',
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    background: 'white',
    cursor: 'pointer'
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  dateInput: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none'
  },
  dateSeparator: {
    color: '#6b7280',
    fontSize: '14px'
  },
  refreshButton: {
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease'
  },
  tableContainer: {
    maxWidth: '1400px',
    margin: '0 auto 30px auto',
    padding: '0 30px',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    background: '#f8fafc',
    color: '#1f2937',
    fontWeight: '600',
    fontSize: '13px',
    borderBottom: '2px solid #e5e7eb'
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background 0.2s ease'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#374151'
  },
  recipientInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  recipientEmail: {
    fontWeight: '600',
    color: '#1f2937'
  },
  recipientName: {
    fontSize: '12px',
    color: '#6b7280'
  },
  subject: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  typeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#e0e7ff',
    color: '#3730a3'
  },
  providerBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white'
  },
  messageId: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  errorMessage: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '16px'
  },
  noData: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px'
  },
  noDataIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  }
};
