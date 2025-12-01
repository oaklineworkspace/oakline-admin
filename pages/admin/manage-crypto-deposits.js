import React, { useState, useEffect } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(true);

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
  const [showProofModal, setShowProofModal] = useState(null);
  const [proofImageUrl, setProofImageUrl] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    fee: '',
    confirmations: '',
    txHash: '',
    status: '',
    rejectionReason: '',
    holdReason: ''
  });
  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    amount: '',
    txHash: '',
    confirmations: '',
    status: '',
    rejectionReason: '',
    adminNotes: ''
  });

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

      // Refresh the session to get a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        setError('Session expired. Please log in again.');
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/admin/get-crypto-deposits?status=all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch deposits: ${response.status}`);
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
      if (reason === null || reason.trim() === '') {
        setError('Reason is required for this action');
        setTimeout(() => setError(''), 3000);
        return;
      }
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

      // Refresh the session to get a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        setError('Session expired. Please log in again.');
        setIsAuthenticated(false);
        return;
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
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProof = async (deposit) => {
    if (!deposit.proof_path) {
      setError('No proof of payment uploaded for this deposit');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoadingProof(true);
    setShowProofModal(deposit);
    setProofImageUrl(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        throw new Error('No active session');
      }

      // Determine storage bucket based on deposit type
      // Loan deposits are stored in 'documents' bucket, general deposits in 'crypto-deposit-proofs'
      const storageBucket = deposit.purpose === 'loan_requirement' ? 'documents' : 'crypto-deposit-proofs';
      const proofPath = deposit.proof_path;

      // Create signed URL for the proof image
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from(storageBucket)
        .createSignedUrl(proofPath, 3600); // 1 hour expiry

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        throw new Error('Failed to load proof of payment image');
      }

      setProofImageUrl(signedUrlData.signedUrl);
    } catch (error) {
      console.error('Error loading proof:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
      setShowProofModal(null);
    } finally {
      setLoadingProof(false);
    }
  };

  const openEditModal = (deposit) => {
    setEditForm({
      amount: deposit.amount || '',
      fee: deposit.fee || '',
      confirmations: deposit.confirmations || '',
      txHash: deposit.tx_hash || '',
      status: deposit.status || 'pending',
      rejectionReason: deposit.rejection_reason || '',
      holdReason: deposit.hold_reason || ''
    });
    setShowEditModal(deposit);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        throw new Error('Session expired. Please log in again.');
      }

      const response = await fetch('/api/admin/edit-crypto-deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          depositId: showEditModal.id,
          amount: editForm.amount ? parseFloat(editForm.amount) : undefined,
          fee: editForm.fee ? parseFloat(editForm.fee) : undefined,
          confirmations: editForm.confirmations ? parseInt(editForm.confirmations) : undefined,
          txHash: editForm.txHash || undefined,
          status: editForm.status,
          rejectionReason: editForm.rejectionReason || undefined,
          holdReason: editForm.holdReason || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update deposit');
      }

      setMessage('✅ Deposit updated successfully!');
      setShowEditModal(null);
      await fetchDeposits();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error updating deposit:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (deposit) => {
    setUpdateForm({
      amount: deposit.amount || '',
      txHash: deposit.tx_hash || '',
      confirmations: deposit.confirmations || '',
      status: deposit.status || 'pending',
      rejectionReason: deposit.rejection_reason || '',
      adminNotes: deposit.admin_notes || ''
    });
    setShowUpdateModal(deposit);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        throw new Error('Session expired. Please log in again.');
      }
      
      const response = await fetch('/api/admin/edit-crypto-deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          depositId: showUpdateModal.id,
          amount: updateForm.amount ? parseFloat(updateForm.amount) : undefined,
          txHash: updateForm.txHash || undefined,
          confirmations: updateForm.confirmations ? parseInt(updateForm.confirmations) : undefined,
          status: updateForm.status,
          rejectionReason: updateForm.rejectionReason || undefined,
          adminNotes: updateForm.adminNotes || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update deposit');
      }

      const successMessage = updateForm.status === 'completed' 
        ? '✅ Deposit completed successfully! Balance has been credited.'
        : `✅ Deposit status updated to ${updateForm.status} successfully!`;
      
      setMessage(successMessage);
      setShowUpdateModal(null);
      await fetchDeposits();
      
      setTimeout(() => {
        setMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error updating deposit:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeposit = async (depositId, deposit) => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to DELETE this deposit?\n\nDeposit ID: ${depositId}\nAmount: $${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\nThis action CANNOT be undone!`)) {
      return;
    }

    const confirmText = window.prompt('Type "DELETE" to confirm deletion:');
    if (confirmText !== 'DELETE') {
      setError('Deletion cancelled - confirmation text did not match');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        setError('Session expired. Please log in again.');
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/admin/delete-crypto-deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ depositId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete deposit');
      }

      setMessage(result.message || '✅ Deposit deleted successfully');
      await fetchDeposits();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error deleting deposit:', error);
      setError(`Failed to delete deposit: ${error.message}`);
      setTimeout(() => setError(''), 5000);
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

    // Show Update button for deposits that need confirmation/completion
    if (['pending', 'confirmed', 'processing'].includes(status)) {
      actions.push({ label: 'Update', value: 'update', color: '#10b981', isUpdate: true });
    }

    // Always show Edit button
    actions.push({ label: 'Edit', value: 'edit', color: '#8b5cf6', isEditDeposit: true });

    // Show View Proof if proof exists
    if (deposit.proof_path) {
      actions.push({ label: 'View Proof', value: 'view_proof', color: '#3b82f6', isViewProof: true });
    }

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

    // Always show Delete button (dangerous action)
    actions.push({ label: 'Delete', value: 'delete', color: '#dc2626', isDelete: true });

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
                  <React.Fragment key={deposit.id}>
                    <tr style={styles.tableRow}>
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
                          {deposit.user_name && deposit.user_name !== 'N/A' && (
                            <div style={styles.userName}>{deposit.user_name}</div>
                          )}
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
                        {deposit.wallet_address ? (
                          <span style={styles.walletAddress} title={deposit.wallet_address}>
                            {deposit.wallet_address.substring(0, 10)}...{deposit.wallet_address.substring(deposit.wallet_address.length - 6)}
                          </span>
                        ) : (
                          <span style={{...styles.walletAddress, color: '#ef4444'}}>No wallet</span>
                        )}
                      </td>
                      <td style={styles.td}>{getStatusBadge(deposit.status)}</td>
                      <td style={styles.td}>{formatDate(deposit.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {getAvailableActions(deposit).map((action, index) => (
                            <button
                              key={`${deposit.id}-${action.value}-${index}`}
                              onClick={() => {
                                if (action.isUpdate) {
                                  openUpdateModal(deposit);
                                } else if (action.isEditDeposit) {
                                  openEditModal(deposit);
                                } else if (action.isViewProof) {
                                  handleViewProof(deposit);
                                } else if (action.isComplete) {
                                  handleCompleteDeposit(deposit.id);
                                } else if (action.isDelete) {
                                  handleDeleteDeposit(deposit.id, deposit);
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
                                <span style={styles.detailLabel}>User Name:</span>
                                <span style={styles.detailValue}>{deposit.user_name || 'N/A'}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>User Email:</span>
                                <span style={styles.detailValue}>{deposit.user_email || 'N/A'}</span>
                              </div>
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
                              {deposit.wallet_memo && (
                                <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                  <span style={styles.detailLabel}>Wallet Memo:</span>
                                  <span style={{...styles.detailValue, wordBreak: 'break-all'}}>{deposit.wallet_memo}</span>
                                </div>
                              )}
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
                  </React.Fragment>
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
      {/* Proof of Payment Modal */}
      {showProofModal && (
        <div style={styles.modalOverlay} onClick={() => setShowProofModal(null)}>
          <div style={{...styles.modal, maxWidth: '900px'}} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>📸 Proof of Payment</h2>
              <button onClick={() => setShowProofModal(null)} style={styles.closeButton}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{marginBottom: '16px'}}>
                <p style={{margin: '0 0 8px 0', fontSize: '14px'}}>
                  <strong>Deposit ID:</strong> {showProofModal.id.slice(0, 8)}...
                </p>
                <p style={{margin: '0 0 8px 0', fontSize: '14px'}}>
                  <strong>Amount:</strong> ${parseFloat(showProofModal.amount || 0).toFixed(2)}
                </p>
                <p style={{margin: '0 0 8px 0', fontSize: '14px'}}>
                  <strong>Status:</strong> {showProofModal.status}
                </p>
              </div>

              {loadingProof ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <div style={styles.spinner}></div>
                  <p>Loading proof of payment...</p>
                </div>
              ) : proofImageUrl ? (
                <div style={{textAlign: 'center'}}>
                  <img
                    src={proofImageUrl}
                    alt="Proof of Payment"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '2px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(proofImageUrl, '_blank')}
                  />
                  <p style={{marginTop: '12px', fontSize: '13px', color: '#64748b'}}>
                    Click image to open in new tab
                  </p>
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '40px', color: '#ef4444'}}>
                  <p>Failed to load proof of payment image</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Deposit Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>📝 Edit Deposit</h2>
              <button onClick={() => setShowEditModal(null)} style={styles.closeButton}>×</button>
            </div>
            <div style={styles.modalBody}>
              <form onSubmit={handleEditSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fee (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.fee}
                    onChange={(e) => setEditForm({...editForm, fee: e.target.value})}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirmations</label>
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <button
                      type="button"
                      onClick={() => setEditForm({
                        ...editForm, 
                        confirmations: Math.max(0, parseInt(editForm.confirmations || 0) - 1)
                      })}
                      style={{...styles.btn, ...styles.btnSecondary, flex: '0 0 auto', padding: '8px 16px'}}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={editForm.confirmations}
                      onChange={(e) => setEditForm({...editForm, confirmations: e.target.value})}
                      style={{...styles.input, textAlign: 'center'}}
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setEditForm({
                        ...editForm, 
                        confirmations: parseInt(editForm.confirmations || 0) + 1
                      })}
                      style={{...styles.btn, ...styles.btnPrimary, flex: '0 0 auto', padding: '8px 16px'}}
                    >
                      +
                    </button>
                  </div>
                  <small style={{color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block'}}>
                    Current: {editForm.confirmations || 0} / {showEditModal?.required_confirmations || 3} required
                  </small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Transaction Hash</label>
                  <input
                    type="text"
                    value={editForm.txHash}
                    onChange={(e) => setEditForm({...editForm, txHash: e.target.value})}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="on_hold">On Hold</option>
                    <option value="awaiting_confirmations">Awaiting Confirmations</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="reversed">Reversed</option>
                  </select>
                </div>

                {(editForm.status === 'rejected' || editForm.status === 'failed') && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rejection Reason</label>
                    <textarea
                      value={editForm.rejectionReason}
                      onChange={(e) => setEditForm({...editForm, rejectionReason: e.target.value})}
                      style={{...styles.input, minHeight: '80px'}}
                    />
                  </div>
                )}

                {editForm.status === 'on_hold' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Hold Reason</label>
                    <textarea
                      value={editForm.holdReason}
                      onChange={(e) => setEditForm({...editForm, holdReason: e.target.value})}
                      style={{...styles.input, minHeight: '80px'}}
                    />
                  </div>
                )}

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    style={{...styles.btn, ...styles.btnSecondary}}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{...styles.btn, ...styles.btnPrimary}}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Deposit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Update Deposit Modal */}
      {showUpdateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowUpdateModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>🔄 Update Deposit Status</h2>
              <button onClick={() => setShowUpdateModal(null)} style={styles.closeButton}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{marginBottom: '20px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd'}}>
                <div style={{fontSize: '14px', color: '#0c4a6e', marginBottom: '8px'}}>
                  <strong>User:</strong> {showUpdateModal.profiles?.first_name} {showUpdateModal.profiles?.last_name}
                </div>
                <div style={{fontSize: '14px', color: '#0c4a6e'}}>
                  <strong>Current Status:</strong> <span style={{textTransform: 'capitalize'}}>{showUpdateModal.status.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <form onSubmit={handleUpdateSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={updateForm.amount}
                    onChange={(e) => setUpdateForm({...updateForm, amount: e.target.value})}
                    style={styles.input}
                    placeholder="Enter deposit amount"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Transaction Hash</label>
                  <input
                    type="text"
                    value={updateForm.txHash}
                    onChange={(e) => setUpdateForm({...updateForm, txHash: e.target.value})}
                    style={styles.input}
                    placeholder="Enter blockchain transaction hash"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirmations</label>
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <button
                      type="button"
                      onClick={() => setUpdateForm({
                        ...updateForm, 
                        confirmations: Math.max(0, parseInt(updateForm.confirmations || 0) - 1)
                      })}
                      style={{...styles.btn, ...styles.btnSecondary, flex: '0 0 auto', padding: '8px 16px'}}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={updateForm.confirmations}
                      onChange={(e) => setUpdateForm({...updateForm, confirmations: e.target.value})}
                      style={{...styles.input, textAlign: 'center'}}
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setUpdateForm({
                        ...updateForm, 
                        confirmations: parseInt(updateForm.confirmations || 0) + 1
                      })}
                      style={{...styles.btn, ...styles.btnPrimary, flex: '0 0 auto', padding: '8px 16px'}}
                    >
                      +
                    </button>
                  </div>
                  <small style={{color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block'}}>
                    Current: {updateForm.confirmations || 0} / {showUpdateModal?.required_confirmations || 3} required
                  </small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status *</label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="awaiting_confirmations">Awaiting Confirmations</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="completed">✅ Completed (Credits User)</option>
                    <option value="failed">Failed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {(updateForm.status === 'rejected' || updateForm.status === 'failed') && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rejection Reason</label>
                    <textarea
                      value={updateForm.rejectionReason}
                      onChange={(e) => setUpdateForm({...updateForm, rejectionReason: e.target.value})}
                      style={{...styles.input, minHeight: '80px'}}
                      placeholder="Explain why this deposit is being rejected"
                    />
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Admin Notes (Optional)</label>
                  <textarea
                    value={updateForm.adminNotes}
                    onChange={(e) => setUpdateForm({...updateForm, adminNotes: e.target.value})}
                    style={{...styles.input, minHeight: '80px'}}
                    placeholder="Add any internal notes about this update"
                  />
                </div>

                {updateForm.status === 'completed' && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{fontSize: '14px', color: '#166534', fontWeight: '600', marginBottom: '4px'}}>
                      ✅ Completing Deposit
                    </div>
                    <div style={{fontSize: '13px', color: '#15803d'}}>
                      This will credit ${updateForm.amount || showUpdateModal.amount} to the user's account balance.
                    </div>
                  </div>
                )}

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(null)}
                    style={{...styles.btn, ...styles.btnSecondary}}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{...styles.btn, ...styles.btnPrimary}}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : updateForm.status === 'completed' ? '✅ Complete & Credit' : 'Update Deposit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminAuth>
  );
}

const styles = {
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
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
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
    fontSize: '24px',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1,
    padding: 0
  },
  modalBody: {
    padding: '20px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit'
  },
  btn: {
    flex: 1,
    minWidth: '100px',
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    textAlign: 'center'
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  btnSecondary: {
    background: '#f1f5f9',
    color: '#475569'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px',
    flexWrap: 'wrap'
  },
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
  userName: {
    fontWeight: '700',
    fontSize: '14px',
    color: '#1e293b',
  },
  userEmail: {
    fontWeight: '500',
    fontSize: '12px',
    color: '#64748b',
  },
  userId: {
    fontSize: '11px',
    color: '#94a3b8',
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