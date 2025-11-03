import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ManageCryptoDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, confirmed: 0, rejected: 0, reversed: 0, totalPendingAmount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [cryptoTypeFilter, setCryptoTypeFilter] = useState('all');
  const [walletSearchFilter, setWalletSearchFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deposits, statusFilter, userSearchFilter, cryptoTypeFilter, walletSearchFilter, dateFromFilter, dateToFilter, purposeFilter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/get-crypto-deposits?status=all', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch deposits');
      }

      setDeposits(result.deposits || []);
      setSummary(result.summary || { total: 0, pending: 0, confirmed: 0, rejected: 0, reversed: 0, totalPendingAmount: 0 });
    } catch (error) {
      console.error('Error fetching deposits:', error);
      setError(`Failed to fetch deposits: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deposits];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    if (userSearchFilter) {
      filtered = filtered.filter(d => 
        d.user_email?.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
        d.user_id?.toLowerCase().includes(userSearchFilter.toLowerCase())
      );
    }

    if (cryptoTypeFilter !== 'all') {
      filtered = filtered.filter(d => d.crypto_type === cryptoTypeFilter);
    }

    if (purposeFilter !== 'all') {
      filtered = filtered.filter(d => (d.purpose || 'general_deposit') === purposeFilter);
    }

    if (walletSearchFilter) {
      filtered = filtered.filter(d => 
        d.wallet_address?.toLowerCase().includes(walletSearchFilter.toLowerCase())
      );
    }

    if (dateFromFilter) {
      filtered = filtered.filter(d => new Date(d.created_at) >= new Date(dateFromFilter));
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(d => new Date(d.created_at) <= toDate);
    }

    setFilteredDeposits(filtered);
    setCurrentPage(1);
  };

  const handleStatusChange = async (depositId, newStatus, reason = null, note = null) => {
    // Only prompt for reason if not already provided
    if (!reason && (newStatus === 'rejected' || newStatus === 'on_hold' || newStatus === 'reversed' || newStatus === 'failed')) {
      reason = window.prompt(`Enter reason for ${newStatus}:`);
      if (reason === null) return;
    }

    const confirmMessages = {
      'confirmed': 'Approve this deposit? This will credit the user\'s account.',
      'rejected': 'Reject this deposit?',
      'on_hold': 'Put this deposit on hold?',
      'awaiting_confirmations': 'Mark as awaiting confirmations?',
      'processing': 'Mark as processing?',
      'completed': 'Mark as completed? This will credit the user\'s account.',
      'failed': 'Mark as failed?',
      'reversed': '⚠️ WARNING: Reverse this deposit? This will deduct the amount from the user\'s account.',
    };

    // Only confirm if not already confirmed (for edit/complete flows)
    if (!note && !window.confirm(confirmMessages[newStatus] || `Change status to ${newStatus}?`)) {
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

      const response = await fetch('/api/admin/update-crypto-deposit-status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ depositId, newStatus, reason, note })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      setMessage(result.message || `✅ Status updated to ${newStatus} successfully`);
      if (result.newBalance !== undefined && result.newBalance !== null) {
        setMessage(prev => `${prev} - New balance: $${result.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      }
      
      await fetchDeposits();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error updating status:', error);
      setError(`Failed to update status: ${error.message}`);
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
      on_hold: { backgroundColor: '#fef3c7', color: '#92400e', text: 'On Hold' },
      awaiting_confirmations: { backgroundColor: '#fef3c7', color: '#92400e', text: 'Awaiting Confirmations' },
      confirmed: { backgroundColor: '#d1fae5', color: '#065f46', text: 'Confirmed' },
      processing: { backgroundColor: '#dbeafe', color: '#1e40af', text: 'Processing' },
      completed: { backgroundColor: '#d1fae5', color: '#065f46', text: 'Completed' },
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b', text: 'Rejected' },
      failed: { backgroundColor: '#fee2e2', color: '#991b1b', text: 'Failed' },
      reversed: { backgroundColor: '#fee2e2', color: '#991b1b', text: 'Reversed' },
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

  const handleEditStatus = async (deposit) => {
    const statusOptions = [
      'pending',
      'on_hold',
      'awaiting_confirmations',
      'confirmed',
      'processing',
      'completed',
      'failed',
      'reversed'
    ];

    let optionsHtml = statusOptions.map(s => `<option value="${s}" ${s === deposit.status ? 'selected' : ''}>${s}</option>`).join('');
    
    const newStatus = window.prompt(
      `Edit Status for Deposit ${deposit.id.substring(0, 8)}...\n\nCurrent Status: ${deposit.status}\n\nEnter new status (${statusOptions.join(', ')}):`,
      deposit.status
    );

    if (!newStatus || newStatus === deposit.status) return;

    if (!statusOptions.includes(newStatus)) {
      alert('Invalid status. Please choose from: ' + statusOptions.join(', '));
      return;
    }

    let reason = null;
    if (['rejected', 'failed', 'on_hold', 'reversed'].includes(newStatus)) {
      reason = window.prompt(`Enter reason for changing to ${newStatus}:`);
      if (reason === null) return;
    }

    if (!window.confirm(`Change status from "${deposit.status}" to "${newStatus}"?`)) {
      return;
    }

    await handleStatusChange(deposit.id, newStatus, reason, 'Edit status via admin');
  };

  const handleCompleteDeposit = async (depositId) => {
    if (!window.confirm('Mark this deposit as completed? This will update the completed_at timestamp.')) {
      return;
    }

    await handleStatusChange(depositId, 'completed', null, 'Marked as completed via admin');
  };

  const getAvailableActions = (deposit) => {
    const actions = [];
    const status = deposit.status;

    // Always show Edit button
    actions.push({ label: 'Edit Status', value: 'edit', color: '#8b5cf6', isEdit: true });

    // Show Complete button for confirmed/processing deposits
    if (['confirmed', 'processing'].includes(status)) {
      actions.push({ label: 'Complete', value: 'completed', color: '#10b981', isComplete: true });
    }

    // Context-sensitive actions based on current status
    switch (status) {
      case 'pending':
      case 'on_hold':
      case 'awaiting_confirmations':
        actions.push(
          { label: 'Approve', value: 'confirmed', color: '#10b981' },
          { label: 'Reject', value: 'rejected', color: '#ef4444' },
          { label: 'Processing', value: 'processing', color: '#3b82f6' }
        );
        break;
      case 'processing':
        actions.push(
          { label: 'Failed', value: 'failed', color: '#ef4444' }
        );
        break;
      case 'confirmed':
      case 'completed':
        actions.push(
          { label: 'Reverse', value: 'reversed', color: '#f97316' }
        );
        break;
      default:
        break;
    }

    return actions;
  };

  const cryptoTypes = ['all', ...new Set(deposits.map(d => d.crypto_type).filter(Boolean))];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDeposits.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
              <div style={styles.summaryLabel}>Confirmed</div>
              <div style={styles.summaryValue}>{summary.confirmed}</div>
            </div>
          </div>
          <div style={{...styles.summaryCard, ...styles.rejectedCard}}>
            <div style={styles.summaryIcon}>❌</div>
            <div style={styles.summaryContent}>
              <div style={styles.summaryLabel}>Rejected</div>
              <div style={styles.summaryValue}>{summary.rejected}</div>
            </div>
          </div>
          <div style={{...styles.summaryCard, ...styles.reversedCard}}>
            <div style={styles.summaryIcon}>↩️</div>
            <div style={styles.summaryContent}>
              <div style={styles.summaryLabel}>Reversed</div>
              <div style={styles.summaryValue}>{summary.reversed}</div>
            </div>
          </div>
        </div>

        <div style={styles.filtersPanel}>
          <h3 style={styles.filterTitle}>🔍 Filters & Search</h3>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterSelect}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="on_hold">On Hold</option>
                <option value="awaiting_confirmations">Awaiting Confirmations</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>User Email / ID</label>
              <input
                type="text"
                placeholder="Search by user..."
                value={userSearchFilter}
                onChange={(e) => setUserSearchFilter(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Crypto Type</label>
              <select value={cryptoTypeFilter} onChange={(e) => setCryptoTypeFilter(e.target.value)} style={styles.filterSelect}>
                {cryptoTypes.map(type => (
                  <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Purpose</label>
              <select value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)} style={styles.filterSelect}>
                <option value="all">All Purposes</option>
                <option value="general_deposit">General Deposit</option>
                <option value="loan_requirement">Loan Requirement</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Wallet Address</label>
              <input
                type="text"
                placeholder="Search wallet..."
                value={walletSearchFilter}
                onChange={(e) => setWalletSearchFilter(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Date From</label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Date To</label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                style={styles.filterInput}
              />
            </div>
          </div>
          
          <button
            onClick={() => {
              setStatusFilter('all');
              setUserSearchFilter('');
              setCryptoTypeFilter('all');
              setWalletSearchFilter('');
              setDateFromFilter('');
              setDateToFilter('');
              setPurposeFilter('all');
            }}
            style={styles.clearFiltersButton}
          >
            Clear All Filters
          </button>
        </div>

        <div style={styles.resultsInfo}>
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDeposits.length)} of {filteredDeposits.length} deposits
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Expand</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Account Number</th>
                <th style={styles.th}>Purpose</th>
                <th style={styles.th}>Crypto</th>
                <th style={styles.th}>Amount / Fee</th>
                <th style={styles.th}>Wallet</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="10" style={styles.emptyState}>
                    No deposits found matching your filters
                  </td>
                </tr>
              ) : (
                currentItems.map((deposit) => (
                  <>
                    <tr key={deposit.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <button
                          onClick={() => setExpandedRow(expandedRow === deposit.id ? null : deposit.id)}
                          style={styles.expandButton}
                        >
                          {expandedRow === deposit.id ? '▼' : '▶'}
                        </button>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <div style={styles.userEmail}>{deposit.user_email}</div>
                          <div style={styles.userId}>ID: {deposit.user_id?.substring(0, 8)}...</div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.accountNumber}>
                          {deposit.account_number && deposit.account_number !== 'N/A' 
                            ? deposit.account_number 
                            : 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.cryptoCell}>
                          {deposit.purpose === 'loan_requirement' ? (
                            <span style={{...styles.cryptoBadge, backgroundColor: '#fef3c7', color: '#92400e'}}>
                              💰 Loan Deposit
                            </span>
                          ) : (
                            <span style={{...styles.cryptoBadge, backgroundColor: '#dbeafe', color: '#1e40af'}}>
                              🏦 General
                            </span>
                          )}
                          {deposit.loan_id && (
                            <span style={{...styles.networkBadge, fontSize: '10px'}}>
                              ID: {deposit.loan_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.cryptoCell}>
                          <span style={styles.cryptoBadge}>{deposit.crypto_type}</span>
                          <span style={styles.networkBadge}>{deposit.network_type || 'N/A'}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.amountCell}>
                          <strong>${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                          {deposit.fee > 0 && (
                            <div style={styles.feeText}>Fee: ${parseFloat(deposit.fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          )}
                          {deposit.net_amount && (
                            <div style={styles.netAmount}>Net: ${parseFloat(deposit.net_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.walletAddress} title={deposit.wallet_address}>
                          {deposit.wallet_address?.substring(0, 8)}...
                        </span>
                      </td>
                      <td style={styles.td}>{getStatusBadge(deposit.status)}</td>
                      <td style={styles.td}>{formatDate(deposit.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {getAvailableActions(deposit).map((action, index) => (
                            <button
                              key={`${deposit.id}-${action.value}-${index}`}
                              onClick={() => {
                                if (action.isEdit) {
                                  handleEditStatus(deposit);
                                } else if (action.isComplete) {
                                  handleCompleteDeposit(deposit.id);
                                } else {
                                  handleStatusChange(deposit.id, action.value);
                                }
                              }}
                              disabled={loading}
                              style={{
                                ...styles.actionButton,
                                backgroundColor: loading ? '#ccc' : action.color,
                              }}
                              title={action.label}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === deposit.id && (
                      <tr key={`${deposit.id}-expanded`} style={styles.expandedRow}>
                        <td colSpan="10" style={styles.expandedCell}>
                          <div style={styles.expandedContent}>
                            <h4 style={styles.expandedTitle}>Full Deposit Details</h4>
                            <div style={styles.detailsGrid}>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>ID:</span>
                                <span style={styles.detailValue}>{deposit.id}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Account ID:</span>
                                <span style={styles.detailValue}>{deposit.account_id}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Transaction Hash:</span>
                                <span style={styles.detailValue}>{deposit.transaction_hash || 'N/A'}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Confirmations:</span>
                                <span style={styles.detailValue}>{deposit.confirmations || 0} / {deposit.required_confirmations || 3}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Approved By:</span>
                                <span style={styles.detailValue}>{deposit.approved_by || 'N/A'}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Approved At:</span>
                                <span style={styles.detailValue}>{formatDate(deposit.approved_at)}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Rejected By:</span>
                                <span style={styles.detailValue}>{deposit.rejected_by || 'N/A'}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Rejected At:</span>
                                <span style={styles.detailValue}>{formatDate(deposit.rejected_at)}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Rejection Reason:</span>
                                <span style={styles.detailValue}>{deposit.rejection_reason || 'N/A'}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Hold Reason:</span>
                                <span style={styles.detailValue}>{deposit.hold_reason || 'N/A'}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Completed At:</span>
                                <span style={styles.detailValue}>{formatDate(deposit.completed_at)}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Updated At:</span>
                                <span style={styles.detailValue}>{formatDate(deposit.updated_at)}</span>
                              </div>
                              <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                <span style={styles.detailLabel}>Full Wallet Address:</span>
                                <span style={{...styles.detailValue, wordBreak: 'break-all'}}>{deposit.wallet_address}</span>
                              </div>
                              {deposit.metadata && Object.keys(deposit.metadata).length > 0 && (
                                <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                  <span style={styles.detailLabel}>Metadata:</span>
                                  <pre style={styles.metadataValue}>{JSON.stringify(deposit.metadata, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                ...styles.paginationButton,
                ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
              }}
            >
              Previous
            </button>
            
            <div style={styles.paginationNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  style={{
                    ...styles.paginationNumber,
                    ...(currentPage === number ? styles.paginationNumberActive : {})
                  }}
                >
                  {number}
                </button>
              ))}
            </div>

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                ...styles.paginationButton,
                ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    padding: '20px 15px',
    maxWidth: '1800px',
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
  totalCard: { borderLeft: '4px solid #3b82f6' },
  pendingCard: { borderLeft: '4px solid #f59e0b' },
  approvedCard: { borderLeft: '4px solid #10b981' },
  rejectedCard: { borderLeft: '4px solid #ef4444' },
  reversedCard: { borderLeft: '4px solid #f59e0b' },
  summaryIcon: { fontSize: 'clamp(24px, 5vw, 32px)' },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 'clamp(11px, 2.2vw, 14px)', color: '#64748b', marginBottom: '4px' },
  summaryValue: { fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 'bold', color: '#1e293b' },
  summarySubtext: { fontSize: 'clamp(10px, 2vw, 12px)', color: '#64748b', marginTop: '4px' },
  filtersPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  filterTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#1e293b',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  clearFiltersButton: {
    padding: '8px 16px',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  resultsInfo: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '15px',
    fontWeight: '500',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflowX: 'auto',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px',
    fontSize: '13px',
    color: '#1e293b',
  },
  expandButton: {
    padding: '4px 8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  userCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userEmail: {
    fontWeight: '600',
    fontSize: '13px',
  },
  userId: {
    fontSize: '11px',
    color: '#64748b',
  },
  accountNumber: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  cryptoCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cryptoBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  networkBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderRadius: '4px',
    fontSize: '11px',
  },
  amountCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  feeText: {
    fontSize: '11px',
    color: '#ef4444',
  },
  netAmount: {
    fontSize: '11px',
    color: '#10b981',
    fontWeight: '600',
  },
  walletAddress: {
    fontFamily: 'monospace',
    fontSize: '11px',
    backgroundColor: '#f1f5f9',
    padding: '4px 6px',
    borderRadius: '4px',
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  actionButton: {
    padding: '6px 10px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  expandedRow: {
    backgroundColor: '#f8fafc',
  },
  expandedCell: {
    padding: '20px',
  },
  expandedContent: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
  },
  expandedTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#1e293b',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  detailValue: {
    fontSize: '13px',
    color: '#1e293b',
  },
  metadataValue: {
    fontSize: '11px',
    backgroundColor: '#f1f5f9',
    padding: '10px',
    borderRadius: '4px',
    overflow: 'auto',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  paginationButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
  paginationNumbers: {
    display: 'flex',
    gap: '5px',
  },
  paginationNumber: {
    padding: '8px 12px',
    backgroundColor: 'white',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  paginationNumberActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
    fontSize: '14px',
  },
  errorMessage: {
    padding: '15px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px',
  },
  successMessage: {
    padding: '15px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    gap: '20px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
