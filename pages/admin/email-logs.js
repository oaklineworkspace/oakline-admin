
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [resendMessage, setResendMessage] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const handleResendEmail = async (emailLog) => {
    if (!confirm(`Are you sure you want to resend this email to ${emailLog.recipient_email}?`)) {
      return;
    }

    setResendingId(emailLog.id);
    setResendMessage('');

    try {
      const response = await fetch('/api/admin/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailLogId: emailLog.id })
      });

      const result = await response.json();

      if (response.ok) {
        setResendMessage(`✅ Email resent successfully via ${result.provider}!`);
        fetchEmailLogs(); // Refresh the logs
        setTimeout(() => setResendMessage(''), 5000);
      } else {
        setResendMessage(`❌ Error: ${result.error || 'Failed to resend email'}`);
        setTimeout(() => setResendMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error resending email:', error);
      setResendMessage('❌ Error resending email');
      setTimeout(() => setResendMessage(''), 5000);
    } finally {
      setResendingId(null);
    }
  };

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      // First get email logs
      const { data: logsData, error: logsError } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Then get unique user IDs and fetch their profiles
      const userIds = [...new Set(logsData.map(log => log.recipient_user_id).filter(Boolean))];
      
      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      // Merge profiles into logs
      const enrichedLogs = logsData.map(log => ({
        ...log,
        profiles: log.recipient_user_id ? profilesMap[log.recipient_user_id] : null
      }));

      setEmailLogs(enrichedLogs);
    } catch (err) {
      console.error('Error fetching email logs:', err);
      alert('Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const getProviderBadgeColor = (provider) => {
    switch (provider?.toLowerCase()) {
      case 'brevo':
        return '#0092ff';
      case 'resend':
      case 'smtp2':
        return '#10b981';
      case 'primary smtp':
      case 'smtp1':
        return '#3b82f6';
      case 'smtp4':
        return '#8b5cf6';
      case 'smtp5':
        return '#ec4899';
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
      log.message_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.email_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvider = filterProvider === 'all' || 
      log.provider?.toLowerCase() === filterProvider.toLowerCase();
    
    const matchesStatus = filterStatus === 'all' || 
      log.status?.toLowerCase() === filterStatus.toLowerCase();

    const matchesType = filterType === 'all' ||
      log.email_type?.toLowerCase() === filterType.toLowerCase();
    
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'sent' && log.status === 'sent') ||
      (activeTab === 'failed' && log.status === 'failed') ||
      (activeTab === 'pending' && log.status === 'pending');
    
    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    const matchesDateRange = logDate >= dateRange.start && logDate <= dateRange.end;
    
    return matchesSearch && matchesProvider && matchesStatus && matchesType && matchesTab && matchesDateRange;
  });

  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(l => l.status === 'sent').length,
    failed: emailLogs.filter(l => l.status === 'failed').length,
    pending: emailLogs.filter(l => l.status === 'pending').length,
  };

  const providerStats = {
    'Brevo': emailLogs.filter(l => l.provider?.toLowerCase() === 'brevo').length,
    'Resend': emailLogs.filter(l => l.provider?.toLowerCase() === 'resend' || l.provider?.toLowerCase() === 'smtp2').length,
    'Primary SMTP': emailLogs.filter(l => l.provider?.toLowerCase() === 'primary smtp' || l.provider?.toLowerCase() === 'smtp1').length,
  };

  const emailTypes = [...new Set(emailLogs.map(l => l.email_type).filter(Boolean))];

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📧 Email Logs & SMTP Tracking</h1>
            <p style={styles.subtitle}>Monitor email delivery across multiple SMTP providers</p>
            {resendMessage && (
              <p style={{
                ...styles.subtitle,
                marginTop: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: resendMessage.includes('✅') ? '#d1fae5' : '#fee2e2',
                color: resendMessage.includes('✅') ? '#065f46' : '#991b1b',
                fontWeight: '600'
              }}>
                {resendMessage}
              </p>
            )}
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchEmailLogs} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Emails</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Successfully Sent</h3>
            <p style={styles.statValue}>{stats.sent}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
            <h3 style={styles.statLabel}>Failed</h3>
            <p style={styles.statValue}>{stats.failed}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
        </div>

        {/* Provider Statistics */}
        <div style={styles.providerStatsSection}>
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

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'sent', 'failed', 'pending'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by email, subject, message ID, or type..."
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
            <option value="brevo">Brevo</option>
            <option value="resend">Resend</option>
            <option value="smtp2">SMTP2</option>
            <option value="primary smtp">Primary SMTP</option>
            <option value="smtp1">SMTP1</option>
            <option value="smtp4">SMTP4</option>
            <option value="smtp5">SMTP5</option>
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

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Types</option>
            {emailTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filters */}
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
                  setDateRange({
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  });
                }}
                style={styles.clearDateButton}
              >
                ✕ Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Email Logs Grid */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading email logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No email logs found</p>
            </div>
          ) : (
            <div style={styles.logsGrid}>
              {filteredLogs.map(log => (
                <div key={log.id} style={styles.emailCard}>
                  <div style={styles.emailHeader}>
                    <div>
                      <h3 style={styles.emailType}>
                        {log.email_type?.toUpperCase() || 'EMAIL'}
                      </h3>
                      <p style={styles.emailRecipient}>{log.recipient_email}</p>
                      {log.profiles && (
                        <p style={styles.emailName}>
                          {log.profiles.first_name} {log.profiles.last_name}
                        </p>
                      )}
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      background: log.status === 'sent' ? '#d1fae5' :
                                log.status === 'failed' ? '#fee2e2' : '#fef3c7',
                      color: log.status === 'sent' ? '#065f46' :
                            log.status === 'failed' ? '#991b1b' : '#92400e'
                    }}>
                      {log.status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={styles.emailBody}>
                    <div style={styles.emailInfo}>
                      <span style={styles.infoLabel}>Subject:</span>
                      <span style={styles.infoValue}>{log.subject || 'N/A'}</span>
                    </div>
                    <div style={styles.emailInfo}>
                      <span style={styles.infoLabel}>Provider:</span>
                      <span style={{
                        ...styles.providerBadgeSmall,
                        background: getProviderBadgeColor(log.provider)
                      }}>
                        {log.provider || 'Unknown'}
                      </span>
                    </div>
                    <div style={styles.emailInfo}>
                      <span style={styles.infoLabel}>Sent At:</span>
                      <span style={styles.infoValue}>
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {log.message_id && (
                      <div style={styles.emailInfo}>
                        <span style={styles.infoLabel}>Message ID:</span>
                        <span style={styles.messageId}>
                          {log.message_id.substring(0, 30)}...
                        </span>
                      </div>
                    )}
                    {log.error_message && (
                      <div style={styles.errorBadge}>
                        ⚠️ {log.error_message}
                      </div>
                    )}
                  </div>

                  <div style={styles.emailFooter}>
                    <button
                      onClick={() => {
                        setSelectedEmail(log);
                        setShowModal(true);
                      }}
                      style={styles.viewButton}
                    >
                      👁️ View Details
                    </button>
                    {(log.email_content_html || log.email_content_text) && (
                      <button
                        onClick={() => handleResendEmail(log)}
                        disabled={resendingId === log.id}
                        style={{
                          ...styles.resendButton,
                          opacity: resendingId === log.id ? 0.6 : 1,
                          cursor: resendingId === log.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {resendingId === log.id ? '⏳ Resending...' : '📧 Resend'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Details Modal */}
        {showModal && selectedEmail && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Email Details</h2>
                <button onClick={() => setShowModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Email ID:</span>
                    <span style={styles.detailValue}>{selectedEmail.id}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Recipient:</span>
                    <span style={styles.detailValue}>{selectedEmail.recipient_email}</span>
                  </div>
                  {selectedEmail.profiles && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Recipient Name:</span>
                      <span style={styles.detailValue}>
                        {selectedEmail.profiles.first_name} {selectedEmail.profiles.last_name}
                      </span>
                    </div>
                  )}
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Subject:</span>
                    <span style={styles.detailValue}>{selectedEmail.subject || 'N/A'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Email Type:</span>
                    <span style={styles.detailValue}>{selectedEmail.email_type || 'N/A'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Provider:</span>
                    <span style={styles.detailValue}>{selectedEmail.provider || 'Unknown'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Status:</span>
                    <span style={{
                      ...styles.detailValue,
                      color: selectedEmail.status === 'sent' ? '#10b981' :
                            selectedEmail.status === 'failed' ? '#ef4444' : '#f59e0b',
                      fontWeight: '600'
                    }}>
                      {selectedEmail.status?.toUpperCase()}
                    </span>
                  </div>
                  {selectedEmail.message_id && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Message ID:</span>
                      <span style={{...styles.detailValue, fontFamily: 'monospace', fontSize: '12px'}}>
                        {selectedEmail.message_id}
                      </span>
                    </div>
                  )}
                  {selectedEmail.error_message && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Error Message:</span>
                      <span style={{...styles.detailValue, color: '#ef4444'}}>
                        {selectedEmail.error_message}
                      </span>
                    </div>
                  )}
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Created At:</span>
                    <span style={styles.detailValue}>
                      {new Date(selectedEmail.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedEmail.updated_at && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Updated At:</span>
                      <span style={styles.detailValue}>
                        {new Date(selectedEmail.updated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Metadata:</span>
                      <pre style={styles.metadataValue}>
                        {JSON.stringify(selectedEmail.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedEmail.email_content_html && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Email Content (HTML):</span>
                      <div style={styles.emailContentPreview}>
                        <iframe
                          srcDoc={selectedEmail.email_content_html}
                          style={styles.emailIframe}
                          sandbox="allow-same-origin"
                          title="Email Preview"
                        />
                      </div>
                      <details style={styles.emailContentDetails}>
                        <summary style={styles.emailContentSummary}>View HTML Source</summary>
                        <pre style={styles.metadataValue}>
                          {selectedEmail.email_content_html}
                        </pre>
                      </details>
                    </div>
                  )}
                  {selectedEmail.email_content_text && !selectedEmail.email_content_html && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Email Content (Text):</span>
                      <pre style={styles.metadataValue}>
                        {selectedEmail.email_content_text}
                      </pre>
                    </div>
                  )}
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
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
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
  providerStatsSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: 'clamp(1.1rem, 3vw, 20px)',
    fontWeight: '700',
    color: '#1A3E6F',
    marginBottom: '16px',
    margin: 0
  },
  providerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '16px'
  },
  providerCard: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  providerBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '8px'
  },
  providerCount: {
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: '8px 0'
  },
  providerPercent: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096'
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  filtersSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
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
    background: 'white'
  },
  dateRangeSection: {
    background: 'white',
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
  logsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  emailCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: 'clamp(10px, 2vw, 15px)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #e2e8f0'
  },
  emailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  emailType: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  emailRecipient: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#1A3E6F',
    fontWeight: '500'
  },
  emailName: {
    margin: '2px 0 0 0',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#718096'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  emailBody: {
    marginBottom: '16px'
  },
  emailInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    gap: '12px',
    alignItems: 'center'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600',
    minWidth: 'fit-content'
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right',
    wordBreak: 'break-word'
  },
  providerBadgeSmall: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'white'
  },
  messageId: {
    fontSize: '11px',
    color: '#6b7280',
    fontFamily: 'monospace',
    textAlign: 'right'
  },
  errorBadge: {
    marginTop: '12px',
    padding: '8px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '500'
  },
  emailFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  viewButton: {
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
  resendButton: {
    flex: 1,
    padding: '10px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
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
    maxWidth: '600px',
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
    gap: '16px'
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
    fontWeight: '500',
    wordBreak: 'break-word'
  },
  metadataValue: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    color: '#2d3748',
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    overflow: 'auto',
    maxHeight: '200px'
  },
  emailContentPreview: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    marginTop: '8px'
  },
  emailIframe: {
    width: '100%',
    minHeight: '400px',
    border: 'none',
    display: 'block'
  },
  emailContentDetails: {
    marginTop: '12px'
  },
  emailContentSummary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#3b82f6',
    padding: '8px',
    background: '#f0f9ff',
    borderRadius: '6px',
    userSelect: 'none'
  }
};
