
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function LoanPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expandedPayment, setExpandedPayment] = useState(null);
  const [showProofModal, setShowProofModal] = useState(null);
  const [proofImageUrl, setProofImageUrl] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updateForm, setUpdateForm] = useState({
    paymentAmount: '',
    principalAmount: '',
    interestAmount: '',
    lateFee: '',
    status: '',
    rejectionReason: '',
    adminNotes: '',
    refundReason: '',
    refundAmount: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const response = await fetch('/api/admin/get-loan-payments', { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch payments');
      }

      setPayments(result.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payments: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (payment) => {
    setUpdateForm({
      paymentAmount: payment.payment_amount || payment.amount || '',
      principalAmount: payment.principal_amount || '',
      interestAmount: payment.interest_amount || '',
      lateFee: payment.late_fee || '',
      status: payment.status || 'pending',
      rejectionReason: payment.rejection_reason || '',
      adminNotes: payment.notes || payment.admin_notes || '',
      refundReason: payment.refund_reason || '',
      refundAmount: payment.refund_amount || ''
    });
    setShowUpdateModal(payment);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setProcessing(showUpdateModal.id);
    setError('');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      // Determine action based on status
      let action = 'approve';
      if (updateForm.status === 'rejected') {
        action = 'reject';
      } else if (updateForm.status === 'failed') {
        action = 'fail';
      } else if (updateForm.status === 'refund_requested') {
        action = 'refund_request';
      } else if (updateForm.status === 'refund_completed') {
        action = 'refund_approve';
      } else if (updateForm.status === 'refund_rejected') {
        action = 'refund_reject';
      }

      const response = await fetch('/api/admin/approve-loan-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          paymentId: showUpdateModal.id,
          action: action,
          rejectionReason: updateForm.rejectionReason || undefined,
          refundReason: updateForm.refundReason || undefined,
          adminId: user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to update payment');
      }

      const successMessage = updateForm.status === 'approved' || updateForm.status === 'completed'
        ? '✅ Payment approved successfully! Loan balance has been updated.'
        : `✅ Payment status updated to ${updateForm.status} successfully!`;

      setMessage(successMessage);
      setShowUpdateModal(null);
      await fetchPayments();

      setTimeout(() => {
        setMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error updating payment:', error);
      setError(error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeletePayment = async () => {
    if (!showDeleteConfirm) return;

    setProcessing(showDeleteConfirm.id);
    setError('');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const response = await fetch('/api/admin/delete-loan-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          paymentId: showDeleteConfirm.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to delete payment');
      }

      setMessage('✅ Payment deleted successfully!');
      setTimeout(() => {
        setMessage('');
        setShowDeleteConfirm(null);
      }, 2000);
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      setError(error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewProof = async (payment) => {
    if (!payment.proof_path) {
      setError('No proof of payment uploaded for this payment');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoadingProof(true);
    setShowProofModal(payment);
    setProofImageUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // Determine if this is a loan deposit or regular payment
      const isLoanDeposit = payment.is_deposit === true;
      
      // Call the admin API to get the signed URL
      const response = await fetch('/api/admin/get-proof-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          proofPath: payment.proof_path,
          isLoanDeposit: isLoanDeposit
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to load proof of payment');
      }

      setProofImageUrl(result.url);
    } catch (error) {
      console.error('Error loading proof:', error);
      setError(error.message || 'Failed to load proof of payment image');
      setTimeout(() => setError(''), 5000);
      setShowProofModal(null);
    } finally {
      setLoadingProof(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      approved: '#10b981',
      completed: '#059669',
      rejected: '#ef4444',
      failed: '#ef4444',
      cancelled: '#6b7280',
      refund_requested: '#f59e0b',
      refund_processing: '#3b82f6',
      refund_completed: '#10b981',
      refund_rejected: '#ef4444',
      refund_failed: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusEmoji = (status) => {
    const emojis = {
      pending: '⏳',
      processing: '🔄',
      approved: '✅',
      completed: '🎉',
      rejected: '❌',
      failed: '❌',
      cancelled: '🚫',
      refund_requested: '💰',
      refund_processing: '🔄',
      refund_completed: '✅',
      refund_rejected: '❌',
      refund_failed: '❌'
    };
    return emojis[status] || '📋';
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesSearch = !searchTerm ||
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.loan_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    totalPayments: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + (parseFloat(p.payment_amount || p.amount || 0)), 0),
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    approvedPayments: payments.filter(p => p.status === 'approved' || p.status === 'completed').length,
    rejectedPayments: payments.filter(p => p.status === 'rejected').length
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>💰 Loan Payments Management</h1>
            <p style={styles.subtitle}>Track and manage all loan payment submissions</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchPayments} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-loans" style={styles.backButton}>
              ← Back to Loans
            </Link>
          </div>
        </header>

        {error && (
          <div style={{...styles.alert, ...styles.alertError}}>
            {error}
          </div>
        )}

        {message && (
          <div style={{...styles.alert, ...styles.alertSuccess}}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading payments...</p>
          </div>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
                <h3 style={styles.statLabel}>Total Payments</h3>
                <p style={styles.statValue}>{stats.totalPayments}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
                <h3 style={styles.statLabel}>Total Amount</h3>
                <p style={styles.statValue}>${stats.totalAmount.toFixed(2)}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
                <h3 style={styles.statLabel}>Pending</h3>
                <p style={styles.statValue}>{stats.pendingPayments}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
                <h3 style={styles.statLabel}>Approved</h3>
                <p style={styles.statValue}>{stats.approvedPayments}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
                <h3 style={styles.statLabel}>Rejected</h3>
                <p style={styles.statValue}>{stats.rejectedPayments}</p>
              </div>
            </div>

            <div style={styles.filtersContainer}>
              <input
                type="text"
                placeholder="Search by email, name, reference, or loan type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
                <option value="refund_requested">Refund Requested</option>
                <option value="refund_completed">Refund Completed</option>
              </select>
            </div>

            <div style={styles.tableContainer}>
              {filteredPayments.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyIcon}>📋</p>
                  <p style={styles.emptyText}>No payments found</p>
                </div>
              ) : (
                <div style={styles.cardsGrid}>
                  {filteredPayments.map((payment) => {
                    const isExpanded = expandedPayment === payment.id;

                    return (
                      <div key={payment.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                          <div>
                            <h3 style={styles.paymentAmount}>
                              ${parseFloat(payment.payment_amount || payment.amount || 0).toFixed(2)}
                            </h3>
                            <p style={styles.userName}>
                              {payment.user_name || 'N/A'}
                            </p>
                            <p style={styles.userEmail}>{payment.user_email || 'N/A'}</p>
                            <p style={styles.loanType}>{payment.loan_type || 'N/A'}</p>
                          </div>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: getStatusColor(payment.status) + '20',
                            color: getStatusColor(payment.status)
                          }}>
                            {getStatusEmoji(payment.status)} {payment.status}
                          </span>
                        </div>

                        <div style={styles.cardBody}>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Purpose:</span>
                            <span style={{...styles.infoValue, color: '#1e40af', fontWeight: '600'}}>
                              {payment.payment_purpose || 'Regular Payment'}
                            </span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Payment Method:</span>
                            <span style={{...styles.infoValue, textTransform: 'capitalize'}}>
                              {payment.actual_payment_method?.replace(/_/g, ' ') || 'Account Balance'}
                            </span>
                          </div>
                          {!payment.is_deposit && (
                            <>
                              <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Principal:</span>
                                <span style={styles.infoValue}>
                                  ${parseFloat(payment.principal_amount || 0).toFixed(2)}
                                </span>
                              </div>
                              <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Interest:</span>
                                <span style={styles.infoValue}>
                                  ${parseFloat(payment.interest_amount || 0).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                          {payment.late_fee > 0 && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Late Fee:</span>
                              <span style={{...styles.infoValue, color: '#ef4444'}}>
                                ${parseFloat(payment.late_fee).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Payment Date:</span>
                            <span style={styles.infoValue}>
                              {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {payment.reference_number && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Reference:</span>
                              <span style={styles.infoValue}>{payment.reference_number}</span>
                            </div>
                          )}
                          {payment.proof_path && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Proof:</span>
                              <span style={{...styles.infoValue, color: '#059669', fontWeight: '600'}}>
                                ✅ Uploaded
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={styles.cardFooter}>
                          <button
                            onClick={() => openUpdateModal(payment)}
                            style={{...styles.btn, ...styles.btnSuccess}}
                            disabled={processing === payment.id}
                          >
                            📊 Update Status
                          </button>
                          {payment.proof_path && (
                            <button
                              onClick={() => handleViewProof(payment)}
                              style={{...styles.btn, ...styles.btnInfo}}
                              disabled={processing === payment.id}
                            >
                              🖼️ Proof
                            </button>
                          )}
                          <button
                            onClick={() => setShowDeleteConfirm(payment)}
                            style={{...styles.btn, ...styles.btnDanger}}
                            disabled={processing === payment.id}
                          >
                            🗑️ Delete
                          </button>
                          <button
                            onClick={() => setExpandedPayment(isExpanded ? null : payment.id)}
                            style={{...styles.btn, ...styles.btnInfo}}
                          >
                            {isExpanded ? '▲' : '▼'} Details
                          </button>
                        </div>

                        {isExpanded && (
                          <div style={styles.expandedSection}>
                            <h4 style={styles.detailsTitle}>Complete Payment Information</h4>
                            <div style={styles.detailsGrid}>
                              <div style={styles.detailItem}>
                                <strong>Payment ID:</strong> {payment.id.slice(0, 8)}...
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Loan ID:</strong> {payment.loan_id?.slice(0, 8) || 'N/A'}...
                              </div>
                              <div style={styles.detailItem}>
                                <strong>User ID:</strong> {payment.user_id?.slice(0, 8) || 'N/A'}...
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Phone:</strong> {payment.user_phone || 'N/A'}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Payment Method:</strong> {payment.actual_payment_method?.replace(/_/g, ' ') || 'N/A'}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Payment Purpose:</strong> {payment.payment_purpose || 'N/A'}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Is Deposit:</strong> {payment.is_deposit ? 'Yes ✓' : 'No'}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Loan Status:</strong> {payment.loan_status || 'N/A'}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Loan Principal:</strong> ${parseFloat(payment.loan_principal || 0).toFixed(2)}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Remaining Balance:</strong> ${parseFloat(payment.loan_remaining_balance || 0).toFixed(2)}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Monthly Payment:</strong> ${parseFloat(payment.loan_monthly_payment || 0).toFixed(2)}
                              </div>
                              {payment.tx_hash && (
                                <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                  <strong>Transaction Hash:</strong>
                                  <code style={styles.code}>{payment.tx_hash}</code>
                                </div>
                              )}
                              {payment.confirmations !== undefined && (
                                <div style={styles.detailItem}>
                                  <strong>Confirmations:</strong> {payment.confirmations}/{payment.required_confirmations || 3}
                                </div>
                              )}
                              {payment.processed_at && (
                                <div style={styles.detailItem}>
                                  <strong>Processed:</strong> {new Date(payment.processed_at).toLocaleString()}
                                </div>
                              )}
                              {payment.approved_at && (
                                <div style={styles.detailItem}>
                                  <strong>Approved:</strong> {new Date(payment.approved_at).toLocaleString()}
                                </div>
                              )}
                              {payment.rejected_at && (
                                <div style={styles.detailItem}>
                                  <strong>Rejected:</strong> {new Date(payment.rejected_at).toLocaleString()}
                                </div>
                              )}
                              {payment.rejection_reason && (
                                <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                  <strong>Rejection Reason:</strong>
                                  <p style={styles.notes}>{payment.rejection_reason}</p>
                                </div>
                              )}
                              {payment.notes && (
                                <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                  <strong>Admin Notes:</strong>
                                  <p style={styles.notes}>{payment.notes}</p>
                                </div>
                              )}
                              {payment.refund_reason && (
                                <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                  <strong>Refund Reason:</strong>
                                  <p style={styles.notes}>{payment.refund_reason}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
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
                <div style={{...styles.formGroup, marginBottom: '16px'}}>
                  <p style={{margin: '0 0 8px 0', fontSize: 'clamp(0.85rem, 2vw, 14px)'}}>
                    <strong>Payment ID:</strong> {showProofModal.id.slice(0, 8)}...
                  </p>
                  <p style={{margin: '0 0 8px 0', fontSize: 'clamp(0.85rem, 2vw, 14px)'}}>
                    <strong>Amount:</strong> ${parseFloat(showProofModal.payment_amount || showProofModal.amount || 0).toFixed(2)}
                  </p>
                  <p style={{margin: '0 0 8px 0', fontSize: 'clamp(0.85rem, 2vw, 14px)'}}>
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
                    <p style={{marginTop: '12px', fontSize: 'clamp(0.8rem, 2vw, 13px)', color: '#64748b'}}>
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

        {/* Update Payment Modal */}
        {showUpdateModal && (
          <div style={styles.modalOverlay} onClick={() => setShowUpdateModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Update Payment Status</h2>
                <button onClick={() => setShowUpdateModal(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                {error && (
                  <div style={{...styles.alert, ...styles.alertError, marginBottom: '16px'}}>
                    {error}
                  </div>
                )}
                {message && (
                  <div style={{...styles.alert, ...styles.alertSuccess, marginBottom: '16px'}}>
                    {message}
                  </div>
                )}
                <form onSubmit={handleUpdateSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Payment Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={updateForm.paymentAmount}
                      onChange={(e) => setUpdateForm({...updateForm, paymentAmount: e.target.value})}
                      style={styles.input}
                      disabled
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Principal Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={updateForm.principalAmount}
                      onChange={(e) => setUpdateForm({...updateForm, principalAmount: e.target.value})}
                      style={styles.input}
                      disabled
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Interest Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={updateForm.interestAmount}
                      onChange={(e) => setUpdateForm({...updateForm, interestAmount: e.target.value})}
                      style={styles.input}
                      disabled
                    />
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
                      <option value="processing">Processing</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refund_requested">Refund Requested</option>
                      <option value="refund_processing">Refund Processing</option>
                      <option value="refund_completed">Refund Completed</option>
                      <option value="refund_rejected">Refund Rejected</option>
                    </select>
                  </div>

                  {(updateForm.status === 'rejected' || updateForm.status === 'failed') && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Rejection Reason</label>
                      <textarea
                        value={updateForm.rejectionReason}
                        onChange={(e) => setUpdateForm({...updateForm, rejectionReason: e.target.value})}
                        style={{...styles.input, minHeight: '80px'}}
                        placeholder="Provide a reason for rejection..."
                      />
                    </div>
                  )}

                  {updateForm.status.startsWith('refund') && (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Refund Reason</label>
                        <textarea
                          value={updateForm.refundReason}
                          onChange={(e) => setUpdateForm({...updateForm, refundReason: e.target.value})}
                          style={{...styles.input, minHeight: '80px'}}
                          placeholder="Provide a reason for refund..."
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Refund Amount (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={updateForm.refundAmount}
                          onChange={(e) => setUpdateForm({...updateForm, refundAmount: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                    </>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Admin Notes</label>
                    <textarea
                      value={updateForm.adminNotes}
                      onChange={(e) => setUpdateForm({...updateForm, adminNotes: e.target.value})}
                      style={{...styles.input, minHeight: '100px'}}
                      placeholder="Add any additional notes..."
                    />
                  </div>

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
                      disabled={processing === showUpdateModal.id}
                    >
                      {processing === showUpdateModal.id ? 'Updating...' : 'Update Payment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(null)}>
            <div style={{...styles.modal, maxWidth: '400px'}} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>⚠️ Confirm Delete</h2>
                <button onClick={() => setShowDeleteConfirm(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                {error && (
                  <div style={{...styles.alert, ...styles.alertError, marginBottom: '16px'}}>
                    {error}
                  </div>
                )}
                {message && (
                  <div style={{...styles.alert, ...styles.alertSuccess, marginBottom: '16px'}}>
                    {message}
                  </div>
                )}
                <p style={{marginBottom: '20px', fontSize: 'clamp(0.9rem, 2.2vw, 15px)', lineHeight: '1.5'}}>
                  Are you sure you want to delete this payment record? This action cannot be undone.
                </p>
                {showDeleteConfirm && (
                  <div style={{background: '#fef2f2', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fecaca'}}>
                    <p style={{margin: 0, fontSize: 'clamp(0.85rem, 2vw, 14px)', color: '#991b1b'}}>
                      <strong>Payment ID:</strong> {showDeleteConfirm.id.slice(0, 8)}...
                    </p>
                    {showDeleteConfirm.payment_amount > 0 && (
                      <p style={{margin: '4px 0 0 0', fontSize: 'clamp(0.85rem, 2vw, 14px)', color: '#991b1b'}}>
                        <strong>Amount:</strong> ${parseFloat(showDeleteConfirm.payment_amount || showDeleteConfirm.amount).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
                <p style={{fontSize: 'clamp(0.85rem, 2vw, 14px)', color: '#dc2626', fontWeight: '600'}}>
                  ⚠️ This will remove the payment from loan_payments table
                </p>
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{...styles.btn, ...styles.btnSecondary}}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePayment}
                    style={{...styles.btn, ...styles.btnDanger}}
                    disabled={processing === showDeleteConfirm.id}
                  >
                    {processing === showDeleteConfirm.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
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
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: '500',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  alertError: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5'
  },
  alertSuccess: {
    background: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7'
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
  filtersContainer: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  select: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    minWidth: '180px'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
  cardsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardHeader: {
    padding: 'clamp(12px, 3vw, 16px)',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  paymentAmount: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    fontWeight: '700',
    color: '#059669'
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#334155'
  },
  userEmail: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    color: '#64748b'
  },
  loanType: {
    margin: 0,
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    color: '#1e40af',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  cardBody: {
    padding: 'clamp(12px, 3vw, 16px)'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600'
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right'
  },
  cardFooter: {
    padding: 'clamp(12px, 3vw, 16px)',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  expandedSection: {
    padding: 'clamp(12px, 3vw, 16px)',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0'
  },
  detailsTitle: {
    margin: '0 0 12px 0',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '600',
    color: '#1e40af'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  detailItem: {
    fontSize: 'clamp(0.8rem, 2vw, 14px)'
  },
  notes: {
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    margin: '8px 0 0 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    lineHeight: '1.6'
  },
  code: {
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontFamily: 'monospace',
    display: 'block',
    marginTop: '4px',
    wordBreak: 'break-all'
  },
  btn: {
    flex: 1,
    minWidth: '100px',
    padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)',
    borderRadius: '6px',
    border: 'none',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
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
  btnInfo: {
    background: '#dbeafe',
    color: '#1e40af'
  },
  btnDanger: {
    background: '#dc2626',
    color: 'white'
  },
  btnSuccess: {
    background: '#10b981',
    color: 'white'
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
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    fontFamily: 'inherit'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px',
    flexWrap: 'wrap'
  }
};
