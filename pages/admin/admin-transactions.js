
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' }, 
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, statusFilter, typeFilter, dateFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts!inner (
            account_number,
            user_id,
            applications (
              first_name,
              last_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      alert('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Search filter
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

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
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

    setFilteredTransactions(filtered);
  };

  const handleReverseTransaction = async (transaction) => {
    if (!confirm('Are you sure you want to reverse this transaction? This will create a reversal entry and update the account balance.')) {
      return;
    }

    setActionLoading(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in');
        setActionLoading(false);
        return;
      }

      // Call API endpoint to handle the reversal
      const response = await fetch('/api/admin/reverse-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          accountId: transaction.account_id,
          userId: transaction.user_id,
          amount: transaction.amount,
          type: transaction.type
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reverse transaction');
      }

      alert('Transaction reversed successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Error reversing transaction:', error);
      alert('Failed to reverse transaction: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTransaction = async (transaction) => {
    if (!confirm('Are you sure you want to cancel this transaction? This will mark it as cancelled without changing the balance.')) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('id', transaction.id);

      if (error) throw error;

      alert('Transaction cancelled successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      alert('Failed to cancel transaction: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveTransaction = async (transaction) => {
    if (!confirm('Are you sure you want to approve this pending transaction? This will update the account balance.')) {
      return;
    }

    setActionLoading(true);
    try {
      // Get current account balance
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', transaction.account_id)
        .single();

      if (accountError) throw accountError;

      const currentBalance = parseFloat(account.balance || 0);
      const transactionAmount = parseFloat(transaction.amount);
      
      // Calculate new balance
      const newBalance = transaction.type === 'credit' 
        ? currentBalance + transactionAmount 
        : currentBalance - transactionAmount;

      if (newBalance < 0) {
        alert('Cannot approve: Would result in negative balance');
        return;
      }

      // Update account balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', transaction.account_id);

      if (updateError) throw updateError;

      // Update transaction status
      const { error: statusError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      if (statusError) throw statusError;

      alert('Transaction approved successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Error approving transaction:', error);
      alert('Failed to approve transaction: ' + error.message);
    } finally {
      setActionLoading(false);
    }
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
      reversal: { bg: '#3498DB', color: 'white' },
      failed: { bg: '#E74C3C', color: 'white' }
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
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💸 Transactions Management</h1>
          <p style={styles.subtitle}>View and manage all user transactions</p>
        </div>

        {/* Filters Section */}
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
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
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
              </select>
            </div>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Total Transactions:</span>
              <span style={styles.statValue}>{filteredTransactions.length}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Total Amount:</span>
              <span style={styles.statValue}>
                {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={styles.tableCard}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No transactions found</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead style={styles.tableHead}>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Account</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Date/Time</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
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
                        <span style={styles.dateTime}>
                          {formatDateTime(tx.created_at)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {getStatusBadge(tx.status)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {tx.status === 'pending' && (
                            <button
                              onClick={() => handleApproveTransaction(tx)}
                              style={{ ...styles.actionBtn, ...styles.approveBtn }}
                              disabled={actionLoading}
                              title="Approve Transaction"
                            >
                              ✅
                            </button>
                          )}
                          {tx.status === 'completed' && (
                            <button
                              onClick={() => handleReverseTransaction(tx)}
                              style={{ ...styles.actionBtn, ...styles.reverseBtn }}
                              disabled={actionLoading}
                              title="Reverse Transaction"
                            >
                              🗘
                            </button>
                          )}
                          {tx.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelTransaction(tx)}
                              style={{ ...styles.actionBtn, ...styles.cancelBtn }}
                              disabled={actionLoading}
                              title="Cancel Transaction"
                            >
                              ✖
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setShowDetailsModal(true);
                            }}
                            style={{ ...styles.actionBtn, ...styles.viewBtn }}
                            title="View Details"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedTransaction && (
          <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Transaction Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  style={styles.closeBtn}
                >
                  ✕
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Transaction ID:</span>
                  <span style={styles.detailValue}>{selectedTransaction.id}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>User:</span>
                  <span style={styles.detailValue}>
                    {selectedTransaction.accounts?.applications?.first_name} {selectedTransaction.accounts?.applications?.last_name}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Email:</span>
                  <span style={styles.detailValue}>{selectedTransaction.accounts?.applications?.email}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Account Number:</span>
                  <span style={styles.detailValue}>{selectedTransaction.accounts?.account_number}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Type:</span>
                  <span style={styles.detailValue}>{selectedTransaction.type}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Amount:</span>
                  <span style={styles.detailValue}>{formatCurrency(selectedTransaction.amount)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span>{getStatusBadge(selectedTransaction.status)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Description:</span>
                  <span style={styles.detailValue}>{selectedTransaction.description || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Created At:</span>
                  <span style={styles.detailValue}>{formatDateTime(selectedTransaction.created_at)}</span>
                </div>
                {selectedTransaction.metadata && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Metadata:</span>
                    <pre style={styles.metadataBox}>
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '2rem'
  },
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b'
  },
  filtersCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
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
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.2s'
  },
  select: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  statsRow: {
    display: 'flex',
    gap: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHead: {
    backgroundColor: '#f8fafc',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e2e8f0'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#334155'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  userIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#475569'
  },
  typeBadge: {
    padding: '0.25rem 0.625rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block'
  },
  description: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dateTime: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  approveBtn: {
    backgroundColor: '#dcfce7',
    color: '#16a34a'
  },
  reverseBtn: {
    backgroundColor: '#dbeafe',
    color: '#2563eb'
  },
  cancelBtn: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  viewBtn: {
    backgroundColor: '#f3f4f6',
    color: '#374151'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
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
    color: '#94a3b8',
    fontSize: '1.125rem'
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
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },
  modalBody: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #f1f5f9'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#475569',
    fontSize: '0.875rem'
  },
  detailValue: {
    color: '#1e293b',
    fontSize: '0.875rem',
    textAlign: 'right'
  },
  metadataBox: {
    backgroundColor: '#f8fafc',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxWidth: '300px'
  }
};
