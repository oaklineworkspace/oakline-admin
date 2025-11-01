import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ManageCryptoDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, totalPendingAmount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchDeposits();
  }, [statusFilter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/admin/get-crypto-deposits?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch deposits');
      }

      setDeposits(result.deposits || []);
      setFilteredDeposits(result.deposits || []);
      setSummary(result.summary || { total: 0, pending: 0, approved: 0, rejected: 0, totalPendingAmount: 0 });
    } catch (error) {
      console.error('Error fetching deposits:', error);
      setError(`Failed to fetch deposits: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (depositId) => {
    if (!window.confirm('Are you sure you want to approve this deposit? This will credit the user\'s account.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/approve-crypto-deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ depositId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve deposit');
      }

      setMessage(`✅ Deposit approved successfully! New balance: $${result.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      await fetchDeposits();

      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error approving deposit:', error);
      setError(`Failed to approve deposit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (depositId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    
    if (reason === null) {
      return;
    }

    if (!window.confirm('Are you sure you want to reject this deposit?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/reject-crypto-deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ depositId, reason })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject deposit');
      }

      setMessage('✅ Deposit rejected successfully');
      await fetchDeposits();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      setError(`Failed to reject deposit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e', text: 'Pending' },
      approved: { backgroundColor: '#d1fae5', color: '#065f46', text: 'Approved' },
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b', text: 'Rejected' },
    };

    const style = statusStyles[status] || statusStyles.pending;

    return (
      <span style={{
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
      }}>
        {style.text}
      </span>
    );
  };

  if (loading && deposits.length === 0) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading crypto deposits...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💼 Manage Crypto Deposits</h1>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {message && <div style={styles.successMessage}>{message}</div>}

        <div style={styles.summaryGrid}>
          <div style={{...styles.summaryCard, ...styles.totalCard}}>
            <div style={styles.summaryIcon}>📊</div>
            <div style={styles.summaryContent}>
              <div style={styles.summaryLabel}>Total Deposits</div>
              <div style={styles.summaryValue}>{summary.total}</div>
            </div>
          </div>
          <div style={{...styles.summaryCard, ...styles.pendingCard}}>
            <div style={styles.summaryIcon}>⏳</div>
            <div style={styles.summaryContent}>
              <div style={styles.summaryLabel}>Pending</div>
              <div style={styles.summaryValue}>{summary.pending}</div>
              <div style={styles.summarySubtext}>
                ${summary.totalPendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div style={{...styles.summaryCard, ...styles.approvedCard}}>
            <div style={styles.summaryIcon}>✅</div>
            <div style={styles.summaryContent}>
              <div style={styles.summaryLabel}>Approved</div>
              <div style={styles.summaryValue}>{summary.approved}</div>
            </div>
          </div>
          <div style={{...styles.summaryCard, ...styles.rejectedCard}}>
            <div style={styles.summaryIcon}>❌</div>
            <div style={styles.summaryContent}>
              <div style={styles.summaryLabel}>Rejected</div>
              <div style={styles.summaryValue}>{summary.rejected}</div>
            </div>
          </div>
        </div>

        <div style={styles.filterContainer}>
          <label style={styles.filterLabel}>Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Deposits</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>User Email</th>
                <th style={styles.th}>Account Number</th>
                <th style={styles.th}>Crypto Type</th>
                <th style={styles.th}>Network</th>
                <th style={styles.th}>Wallet Address</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>TX Hash</th>
                <th style={styles.th}>Confirmations</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan="12" style={styles.emptyState}>
                    {statusFilter === 'all' 
                      ? 'No crypto deposits found' 
                      : `No ${statusFilter} deposits found`}
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((deposit) => (
                  <tr key={deposit.id} style={styles.tableRow}>
                    <td style={styles.td}>{deposit.id}</td>
                    <td style={styles.td}>{deposit.user_email}</td>
                    <td style={styles.td}>
                      <span style={styles.accountNumber}>{deposit.account_number}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.cryptoBadge}>{deposit.crypto_type}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.networkBadge}>{deposit.network_type || 'N/A'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.walletAddress} title={deposit.wallet_address}>
                        {deposit.wallet_address?.substring(0, 12)}...{deposit.wallet_address?.substring(deposit.wallet_address.length - 8)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <strong>${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </td>
                    <td style={styles.td}>
                      {deposit.transaction_hash ? (
                        <span style={styles.txHash} title={deposit.transaction_hash}>
                          {deposit.transaction_hash.substring(0, 10)}...
                        </span>
                      ) : (
                        <span style={styles.noData}>N/A</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.confirmations}>{deposit.confirmations || 0}</span>
                    </td>
                    <td style={styles.td}>{getStatusBadge(deposit.status)}</td>
                    <td style={styles.td}>{formatDate(deposit.created_at)}</td>
                    <td style={styles.td}>
                      {deposit.status === 'pending' ? (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleApprove(deposit.id)}
                            disabled={loading}
                            style={loading ? styles.disabledButton : styles.approveButton}
                            title="Approve and credit account"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleReject(deposit.id)}
                            disabled={loading}
                            style={loading ? styles.disabledButton : styles.rejectButton}
                            title="Reject deposit"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={styles.noAction}>No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    padding: '20px 15px',
    maxWidth: '1600px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
    background: 'white',
    padding: '15px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 'clamp(20px, 5vw, 32px)',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  backButton: {
    padding: '10px 18px',
    backgroundColor: '#64748b',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px 12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s',
  },
  totalCard: {
    borderLeft: '4px solid #3b82f6',
  },
  pendingCard: {
    borderLeft: '4px solid #f59e0b',
  },
  approvedCard: {
    borderLeft: '4px solid #10b981',
  },
  rejectedCard: {
    borderLeft: '4px solid #ef4444',
  },
  summaryIcon: {
    fontSize: 'clamp(24px, 5vw, 32px)',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 'clamp(11px, 2.2vw, 14px)',
    color: '#64748b',
    marginBottom: '4px',
  },
  summaryValue: {
    fontSize: 'clamp(20px, 5vw, 28px)',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summarySubtext: {
    fontSize: 'clamp(10px, 2vw, 13px)',
    color: '#64748b',
    marginTop: '4px',
  },
  filterContainer: {
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 'clamp(13px, 2.8vw, 15px)',
    fontWeight: '600',
    color: '#475569',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: 'white',
    flex: 1,
    minWidth: '150px',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fca5a5',
    borderLeft: '4px solid #dc2626',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#059669',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #6ee7b7',
    borderLeft: '4px solid #059669',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px',
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
  },
  th: {
    padding: '12px 8px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: 'clamp(11px, 2.2vw, 14px)',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px 8px',
    fontSize: 'clamp(11px, 2.2vw, 14px)',
    color: '#334155',
  },
  accountNumber: {
    fontFamily: 'monospace',
    backgroundColor: '#f1f5f9',
    padding: '3px 6px',
    borderRadius: '4px',
    fontSize: 'clamp(11px, 2.2vw, 13px)',
  },
  cryptoBadge: {
    display: 'inline-block',
    padding: '5px 10px',
    backgroundColor: '#f59e0b',
    color: 'white',
    borderRadius: '6px',
    fontSize: 'clamp(11px, 2.2vw, 13px)',
    fontWeight: '600',
  },
  networkBadge: {
    display: 'inline-block',
    padding: '3px 6px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    borderRadius: '4px',
    fontSize: 'clamp(10px, 2vw, 11px)',
    fontWeight: '600',
  },
  walletAddress: {
    fontFamily: 'monospace',
    fontSize: 'clamp(10px, 2vw, 12px)',
    color: '#64748b',
  },
  txHash: {
    fontFamily: 'monospace',
    fontSize: 'clamp(10px, 2vw, 11px)',
    color: '#3b82f6',
    cursor: 'pointer',
  },
  confirmations: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '12px',
    fontSize: 'clamp(10px, 2vw, 12px)',
    fontWeight: '600',
  },
  noData: {
    color: '#94a3b8',
    fontSize: 'clamp(10px, 2vw, 12px)',
    fontStyle: 'italic',
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  approveButton: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(10px, 2vw, 13px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  rejectButton: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(10px, 2vw, 13px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  disabledButton: {
    padding: '6px 12px',
    backgroundColor: '#cbd5e1',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(10px, 2vw, 13px)',
    fontWeight: '600',
    cursor: 'not-allowed',
    whiteSpace: 'nowrap',
  },
  noAction: {
    color: '#94a3b8',
    fontSize: 'clamp(11px, 2.2vw, 13px)',
    fontStyle: 'italic',
  },
  emptyState: {
    padding: '40px 15px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 'clamp(14px, 3vw, 16px)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTop: '5px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
