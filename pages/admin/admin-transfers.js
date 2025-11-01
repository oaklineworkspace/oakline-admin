import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminBackButton from '../../components/AdminBackButton';

export default function AdminTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchTransfers();

    const subscription = supabase
      .channel('transfers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' }, 
        () => {
          fetchTransfers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, statusFilter, typeFilter, dateFilter, dateRange]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts!inner (
            account_number,
            user_id,
            application_id
          )
        `)
        .or('description.ilike.%transfer%,description.ilike.%wire%')
        .order('created_at', { ascending: false })
        .limit(500);

      if (txError) throw txError;

      const appIds = [...new Set(txData.map(tx => tx.accounts?.application_id).filter(Boolean))];
      let applications = [];

      if (appIds.length > 0) {
        const { data: appsData } = await supabase
          .from('applications')
          .select('id, first_name, last_name, email')
          .in('id', appIds);
        applications = appsData || [];
      }

      const enrichedData = txData.map(tx => {
        const application = applications?.find(a => a.id === tx.accounts?.application_id);

        return {
          ...tx,
          accounts: {
            ...tx.accounts,
            applications: application || {
              first_name: 'Unknown',
              last_name: 'User',
              email: 'N/A'
            }
          }
        };
      });

      setTransfers(enrichedData || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      alert('Failed to fetch transfers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = [...transfers];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => {
        const firstName = tx.accounts?.applications?.first_name?.toLowerCase() || '';
        const lastName = tx.accounts?.applications?.last_name?.toLowerCase() || '';
        const email = tx.accounts?.applications?.email?.toLowerCase() || '';
        const accountNumber = tx.accounts?.account_number?.toLowerCase() || '';
        const description = tx.description?.toLowerCase() || '';

        return firstName.includes(search) || 
               lastName.includes(search) || 
               email.includes(search) || 
               accountNumber.includes(search) ||
               description.includes(search);
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    if (dateFilter === 'custom' && (dateRange.start || dateRange.end)) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;
        
        if (start && end) return txDate >= start && txDate <= end;
        if (start) return txDate >= start;
        if (end) return txDate <= end;
        return true;
      });
    } else if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();

      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(tx => new Date(tx.created_at) >= startDate);
    }

    setFilteredTransfers(filtered);
  };

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return 'N/A';
    const str = String(accountNumber);
    return `****${str.slice(-4)}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: { bg: '#2ECC71', color: 'white' },
      pending: { bg: '#F1C40F', color: '#333' },
      cancelled: { bg: '#7F8C8D', color: 'white' },
      reversed: { bg: '#3498DB', color: 'white' },
      failed: { bg: '#E74C3C', color: 'white' },
      hold: { bg: '#E67E22', color: 'white' }
    };

    const style = styles[status?.toLowerCase()] || styles.pending;

    return (
      <span style={{
        padding: '0.4rem 0.8rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}>
        {status || 'Unknown'}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminAuth>
      <AdminBackButton />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔄 User Transfers Management</h1>
            <p style={styles.subtitle}>View all internal, between account, and wire transfers</p>
          </div>
          <button
            onClick={fetchTransfers}
            style={styles.refreshButton}
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        <div style={styles.filtersCard}>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>🔍 Search</label>
              <input
                type="text"
                placeholder="Search by name, email, or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>📊 Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="hold">Hold</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>💳 Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>📅 Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </>
            )}
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Total Transfers:</span>
              <span style={styles.statValue}>{filteredTransfers.length}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Total Amount:</span>
              <span style={styles.statValue}>
                {formatCurrency(filteredTransfers.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0))}
              </span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Completed:</span>
              <span style={styles.statValue}>
                {filteredTransfers.filter(tx => tx.status === 'completed').length}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.tableCard}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading transfers...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No transfers found</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead style={styles.tableHead}>
                  <tr>
                    <th style={styles.th}>User Full Name</th>
                    <th style={styles.th}>Account Number</th>
                    <th style={styles.th}>Transaction Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((tx) => (
                    <tr key={tx.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <div style={styles.userIcon}>
                            {(tx.accounts?.applications?.first_name?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <div style={styles.userName}>
                              {tx.accounts?.applications?.first_name} {tx.accounts?.applications?.last_name}
                            </div>
                            <div style={styles.userEmail}>
                              {tx.accounts?.applications?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.accountNumber}>
                          {maskAccountNumber(tx.accounts?.account_number)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: tx.type === 'credit' ? '#d1fae5' : '#fee2e2',
                          color: tx.type === 'credit' ? '#065f46' : '#991b1b'
                        }}>
                          {tx.type === 'credit' ? '↑ Credit' : '↓ Debit'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          fontWeight: '700',
                          color: tx.type === 'credit' ? '#059669' : '#dc2626'
                        }}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.description}>
                          {tx.description || 'No description'}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {getStatusBadge(tx.status)}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateTime}>
                          {formatDateTime(tx.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1600px',
    margin: '0 auto',
    backgroundColor: '#f8fafc'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    marginTop: '0.5rem'
  },
  refreshButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  filtersCard: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#475569'
  },
  input: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.2s'
  },
  select: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  statsRow: {
    display: 'flex',
    gap: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
    flexWrap: 'wrap'
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHead: {
    backgroundColor: '#f8fafc'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#1e293b'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  userIcon: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '50%',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '1rem'
  },
  userName: {
    fontWeight: '600',
    color: '#1e293b'
  },
  userEmail: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  accountNumber: {
    fontFamily: 'monospace',
    backgroundColor: '#f8fafc',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.875rem'
  },
  typeBadge: {
    display: 'inline-block',
    padding: '0.375rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  description: {
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dateTime: {
    fontSize: '0.875rem',
    color: '#64748b'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    color: '#64748b'
  },
  spinner: {
    width: '3rem',
    height: '3rem',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    padding: '4rem',
    textAlign: 'center'
  },
  emptyText: {
    fontSize: '1.125rem',
    color: '#94a3b8'
  }
};
