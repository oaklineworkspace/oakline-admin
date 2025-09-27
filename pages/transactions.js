
<new_str>import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function AdminTransactions() {
  const { user, signOut } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchTransactions();
  }, [filterType, filterStatus, dateRange]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch transactions from Supabase with user and account details
  const fetchTransactions = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          profiles!inner(
            full_name,
            email
          ),
          accounts!inner(
            account_number,
            account_type
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate + 'T00:00:00');
      }

      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate + 'T23:59:59');
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;

      setTransactions(data || []);

    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(transaction =>
    transaction.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.accounts?.account_number?.includes(searchTerm) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.id?.toString().includes(searchTerm)
  );

  const handleUpdateTransactionStatus = async (transactionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) throw error;

      // Update local state
      setTransactions(transactions.map(tx => 
        tx.id === transactionId ? { ...tx, status: newStatus } : tx
      ));

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'transaction_status_updated',
          target_type: 'transaction',
          target_id: transactionId,
          details: {
            new_status: newStatus,
            updated_at: new Date().toISOString()
          }
        });

    } catch (error) {
      console.error('Error updating transaction status:', error);
      setError('Failed to update transaction status');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit':
        return '💰';
      case 'withdrawal':
        return '💸';
      case 'transfer':
        return '🔄';
      case 'payment':
        return '💳';
      case 'fee':
        return '⚡';
      default:
        return '📊';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateStats = () => {
    const stats = {
      total: filteredTransactions.length,
      completed: filteredTransactions.filter(tx => tx.status === 'completed').length,
      pending: filteredTransactions.filter(tx => tx.status === 'pending').length,
      failed: filteredTransactions.filter(tx => tx.status === 'failed').length,
      totalAmount: filteredTransactions
        .filter(tx => tx.status === 'completed')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0)
    };
    return stats;
  };

  const stats = calculateStats();

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>📊 Transaction Management</h1>
            <p style={styles.subtitle}>Monitor and manage all banking transactions</p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/manual-transactions" style={styles.actionButton}>
              ➕ Manual Transaction
            </Link>
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
            <h3>Total Transactions</h3>
            <p style={styles.statNumber}>{stats.total}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Completed</h3>
            <p style={{...styles.statNumber, color: '#10b981'}}>{stats.completed}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Pending</h3>
            <p style={{...styles.statNumber, color: '#f59e0b'}}>{stats.pending}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Failed</h3>
            <p style={{...styles.statNumber, color: '#ef4444'}}>{stats.failed}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Total Volume</h3>
            <p style={styles.statNumber}>{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersContainer}>
          <div style={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by name, email, account, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
              <option value="payment">Payments</option>
              <option value="fee">Fees</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              style={styles.dateInput}
              placeholder="Start Date"
            />

            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              style={styles.dateInput}
              placeholder="End Date"
            />

            <button onClick={fetchTransactions} style={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={styles.transactionsSection}>
          <h2>Transactions ({filteredTransactions.length})</h2>
          
          {loading ? (
            <div style={styles.loading}>Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div style={styles.noData}>
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? 'No transactions match your filters.' 
                : 'No transactions found.'
              }
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>ID</th>
                    <th>Type</th>
                    <th>User</th>
                    <th>Account</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <span style={styles.transactionId}>
                          #{transaction.id.toString().slice(-6)}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.transactionType}>
                          {getTypeIcon(transaction.type)} {transaction.type}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div>
                          <div style={styles.userName}>{transaction.profiles?.full_name}</div>
                          <div style={styles.userEmail}>{transaction.profiles?.email}</div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div>
                          <div>{transaction.accounts?.account_number}</div>
                          <small style={styles.accountType}>{transaction.accounts?.account_type}</small>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          color: transaction.type === 'deposit' ? '#10b981' : 
                                transaction.type === 'withdrawal' ? '#ef4444' : '#6b7280',
                          fontWeight: 'bold'
                        }}>
                          {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(transaction.status),
                        }}>
                          {transaction.status}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.description}>
                          {transaction.description || 'No description'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.date}>
                          {formatDate(transaction.created_at)}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            style={styles.viewButton}
                          >
                            👁️ View
                          </button>
                          {transaction.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateTransactionStatus(transaction.id, 'completed')}
                                style={styles.approveButton}
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => handleUpdateTransactionStatus(transaction.id, 'failed')}
                                style={styles.rejectButton}
                              >
                                ❌ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div style={styles.modal} onClick={() => setSelectedTransaction(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailGroup}>
                    <label>Transaction ID:</label>
                    <span>#{selectedTransaction.id}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Type:</label>
                    <span>{getTypeIcon(selectedTransaction.type)} {selectedTransaction.type}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Amount:</label>
                    <span style={{fontWeight: 'bold', fontSize: '18px'}}>
                      {formatCurrency(selectedTransaction.amount)}
                    </span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Status:</label>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(selectedTransaction.status),
                    }}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>User:</label>
                    <span>{selectedTransaction.profiles?.full_name} ({selectedTransaction.profiles?.email})</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Account:</label>
                    <span>{selectedTransaction.accounts?.account_number} ({selectedTransaction.accounts?.account_type})</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Description:</label>
                    <span>{selectedTransaction.description || 'No description'}</span>
                  </div>
                  <div style={styles.detailGroup}>
                    <label>Created:</label>
                    <span>{formatDate(selectedTransaction.created_at)}</span>
                  </div>
                  {selectedTransaction.updated_at && (
                    <div style={styles.detailGroup}>
                      <label>Updated:</label>
                      <span>{formatDate(selectedTransaction.updated_at)}</span>
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

export default AdminTransactions;

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
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  actionButton: {
    background: '#28a745',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
    gap: '15px',
    alignItems: 'end'
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
  refreshButton: {
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  transactionsSection: {
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
  transactionId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  transactionType: {
    textTransform: 'capitalize',
    fontWeight: '500'
  },
  userName: {
    fontWeight: '500',
    color: '#333'
  },
  userEmail: {
    fontSize: '12px',
    color: '#666'
  },
  accountType: {
    color: '#666',
    textTransform: 'capitalize'
  },
  statusBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  description: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  date: {
    fontSize: '12px',
    color: '#666'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexDirection: 'column'
  },
  viewButton: {
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  approveButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  rejectButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
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
    maxWidth: '600px',
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
    gridTemplateColumns: '150px 1fr',
    gap: '10px',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f1f3f4'
  }
};
</new_str>
