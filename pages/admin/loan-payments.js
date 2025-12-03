
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

// Add CSS animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes spinnerRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.querySelector('#loan-payments-animations')) {
    styleSheet.id = 'loan-payments-animations';
    document.head.appendChild(styleSheet);
  }
}

export default function LoanPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterLoanType, setFilterLoanType] = useState('all');

  // Modal states
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });

  const [successBanner, setSuccessBanner] = useState({
    visible: false,
    message: '',
    duration: 3000
  });

  const [errorBanner, setErrorBanner] = useState({
    visible: false,
    message: '',
    duration: 3000
  });

  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [showProofModal, setShowProofModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [proofImageUrl, setProofImageUrl] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [processing, setProcessing] = useState(null);

  // Enhanced modal states for professional UX
  const [modalState, setModalState] = useState({
    loading: false,
    success: false,
    error: false,
    message: '',
    actionType: 'approve' // Track action type for correct display after form reset
  });

  const [updateForm, setUpdateForm] = useState({
    amount: '',
    principalAmount: '',
    interestAmount: '',
    lateFee: '',
    confirmations: '',
    action: 'approve', // Default to approve
    rejectionReason: '',
    adminNotes: ''
  });

  useEffect(() => {
    fetchPayments();
    
    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchPayments();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Auto-hide success banner
  useEffect(() => {
    if (successBanner.visible) {
      const timer = setTimeout(() => {
        setSuccessBanner({ visible: false, message: '', duration: 3000 });
      }, successBanner.duration);
      return () => clearTimeout(timer);
    }
  }, [successBanner.visible]);

  // Auto-hide error banner
  useEffect(() => {
    if (errorBanner.visible) {
      const timer = setTimeout(() => {
        setErrorBanner({ visible: false, message: '', duration: 3000 });
      }, errorBanner.duration);
      return () => clearTimeout(timer);
    }
  }, [errorBanner.visible]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorBanner({
          visible: true,
          message: '❌ You must be logged in',
          duration: 3000
        });
        return;
      }

      const response = await fetch('/api/admin/get-loan-payments', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch loan payments');
      }

      const data = await response.json();
      setPayments(data.payments || []);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setErrorBanner({
        visible: true,
        message: `❌ Error: ${err.message}`,
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (payment) => {
    // Reset form to clean state for each payment
    setUpdateForm({
      amount: payment.amount || '',
      principalAmount: payment.principal_amount || '',
      interestAmount: payment.interest_amount || '',
      lateFee: payment.late_fee || '',
      confirmations: payment.confirmations || '',
      status: payment.status || 'pending',
      action: 'approve', // Default to approve
      rejectionReason: '', // Start clean for each payment
      adminNotes: '' // Start clean for each payment
    });
    setModalState({ loading: false, success: false, error: false, message: '', actionType: 'approve' });
    setShowUpdateModal(payment);
  };

  const closeUpdateModal = () => {
    // Reset everything when closing
    setShowUpdateModal(null);
    setModalState({ loading: false, success: false, error: false, message: '', actionType: 'approve' });
    setUpdateForm({
      amount: '',
      principalAmount: '',
      interestAmount: '',
      lateFee: '',
      confirmations: '',
      action: 'approve',
      rejectionReason: '',
      adminNotes: ''
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    
    // Determine if using status-based update or action-based update
    const usingStatusUpdate = updateForm.status && updateForm.status !== showUpdateModal.status;
    
    if (!usingStatusUpdate) {
      // Validate action for action-based updates
      if (!['approve', 'reject'].includes(updateForm.action)) {
        setModalState({ loading: false, success: false, error: true, message: 'Please select Approve or Reject action' });
        return;
      }

      // Require rejection reason for reject action
      if (updateForm.action === 'reject' && !updateForm.rejectionReason.trim()) {
        setModalState({ loading: false, success: false, error: true, message: 'Please provide a rejection reason' });
        return;
      }
    } else {
      // Require rejection reason for failed status
      if (updateForm.status === 'failed' && !updateForm.rejectionReason.trim()) {
        setModalState({ loading: false, success: false, error: true, message: 'Please provide a rejection reason for failed status' });
        return;
      }
    }

    const actionType = usingStatusUpdate 
      ? (updateForm.status === 'completed' ? 'approve' : updateForm.status === 'failed' ? 'reject' : 'update')
      : updateForm.action;

    setModalState({ loading: true, success: false, error: false, message: 'Processing payment...', actionType });
    setProcessing(showUpdateModal.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      // If using status update and status is 'completed', use approve action
      const finalAction = usingStatusUpdate && updateForm.status === 'completed' 
        ? 'approve' 
        : usingStatusUpdate && updateForm.status === 'failed'
        ? 'reject'
        : updateForm.action;

      const response = await fetch('/api/admin/approve-loan-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          paymentId: showUpdateModal.id,
          action: finalAction,
          amount: updateForm.amount ? parseFloat(updateForm.amount) : undefined,
          principalAmount: updateForm.principalAmount ? parseFloat(updateForm.principalAmount) : undefined,
          interestAmount: updateForm.interestAmount ? parseFloat(updateForm.interestAmount) : undefined,
          lateFee: updateForm.lateFee ? parseFloat(updateForm.lateFee) : undefined,
          confirmations: updateForm.confirmations ? parseInt(updateForm.confirmations) : undefined,
          rejectionReason: updateForm.rejectionReason || undefined,
          adminNotes: updateForm.adminNotes || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to process payment');
      }

      // Capture action before any state changes
      const currentAction = finalAction;
      const isApproval = currentAction === 'approve';
      
      const successMessage = isApproval 
        ? `Payment approved successfully! ${result.loan?.is_closed ? 'Loan has been fully paid off!' : `Remaining balance: $${result.loan?.new_balance?.toLocaleString() || '0'}`}${result.payment?.treasury_credited ? ' Treasury credited.' : ''}${result.email_sent ? ' Email notification sent.' : ''}`
        : `Payment rejected. ${result.payment?.refunded ? 'Funds refunded to user account.' : ''}${result.email_sent ? ' Email notification sent.' : ''}`;

      const bannerEmoji = isApproval ? '✅' : '🔄';

      // Show in-modal success message (keep actionType for correct display)
      setModalState({ loading: false, success: true, error: false, message: successMessage, actionType: currentAction });

      // Auto-close modal and show page banner after delay
      setTimeout(async () => {
        closeUpdateModal();
        setSuccessBanner({
          visible: true,
          message: `${bannerEmoji} ${successMessage}`,
          duration: 5000
        });
        await fetchPayments();
      }, 2000);

    } catch (error) {
      console.error('Error processing payment:', error);
      setModalState({ loading: false, success: false, error: true, message: error.message });
    } finally {
      setProcessing(null);
    }
  };

  const handleViewProof = async (payment) => {
    if (!payment.proof_path) {
      setErrorBanner({
        visible: true,
        message: '❌ No proof of payment uploaded for this payment',
        duration: 3000
      });
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

      // Loan payments are stored in 'loan-payment-proofs' bucket
      const isLoanDeposit = payment.payment_type === 'deposit' || payment.is_deposit;
      
      const response = await fetch('/api/admin/get-proof-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          proofPath: payment.proof_path,
          isLoanDeposit: true // Always use loan deposit bucket for loan payments
        })
      });

      const result = await response.json();

      if (!response.ok || !result.url) {
        console.error('Error getting proof URL:', result);
        throw new Error(result.error || 'Failed to load proof of payment image');
      }

      setProofImageUrl(result.url);
    } catch (error) {
      console.error('Error loading proof:', error);
      setErrorBanner({
        visible: true,
        message: `❌ ${error.message}`,
        duration: 5000
      });
      setShowProofModal(null);
    } finally {
      setLoadingProof(false);
    }
  };

  // Open modal specifically for reject action with pre-selected reject
  const openRejectModal = (payment) => {
    setUpdateForm({
      amount: payment.amount || '',
      principalAmount: payment.principal_amount || '',
      interestAmount: payment.interest_amount || '',
      lateFee: payment.late_fee || '',
      confirmations: payment.confirmations || '',
      action: 'reject', // Pre-select reject
      rejectionReason: '', // Start clean
      adminNotes: '' // Start clean
    });
    setModalState({ loading: false, success: false, error: false, message: '', actionType: 'reject' });
    setShowUpdateModal(payment);
  };

  const handleQuickAction = async (payment, action) => {
    // For reject, open modal to collect rejection reason
    if (action === 'reject') {
      openRejectModal(payment);
      return;
    }

    // For approve, proceed with quick action
    setProcessing(payment.id);
    setErrorBanner({ visible: false, message: '', duration: 3000 });
    setSuccessBanner({ visible: false, message: '', duration: 3000 });

    setLoadingBanner({
      visible: true,
      current: 1,
      total: 1,
      action: 'Approving',
      message: 'Approving payment and crediting treasury...'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const response = await fetch('/api/admin/approve-loan-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          paymentId: payment.id,
          action: 'approve'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to approve payment');
      }

      const successMessage = `✅ Payment approved! ${result.loan?.is_closed ? 'Loan fully paid off!' : `New balance: $${result.loan?.new_balance?.toLocaleString() || '0'}`}${result.payment?.treasury_credited ? ' Treasury credited.' : ''}${result.email_sent ? ' Email sent.' : ''}`;

      setSuccessBanner({
        visible: true,
        message: successMessage,
        duration: 5000
      });
      
      await fetchPayments();
    } catch (error) {
      console.error('Error approving payment:', error);
      setErrorBanner({
        visible: true,
        message: `❌ Failed to approve payment: ${error.message}`,
        duration: 4000
      });
    } finally {
      setProcessing(null);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
    }
  };

  const handleDeletePayment = async () => {
    if (!showDeleteConfirm) return;

    setProcessing(showDeleteConfirm.id);
    setErrorBanner({ visible: false, message: '', duration: 3000 });
    setSuccessBanner({ visible: false, message: '', duration: 3000 });

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

      setSuccessBanner({
        visible: true,
        message: '✅ Payment deleted successfully!',
        duration: 3000
      });
      
      setTimeout(() => {
        setShowDeleteConfirm(null);
      }, 1000);
      
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      setErrorBanner({
        visible: true,
        message: `❌ ${error.message}`,
        duration: 4000
      });
    } finally {
      setProcessing(null);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.loans?.loan_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesType = filterType === 'all' || payment.payment_type === filterType;
    const matchesLoanType = filterLoanType === 'all' || payment.loan_type === filterLoanType;

    return matchesSearch && matchesStatus && matchesType && matchesLoanType;
  });

  // Separate payments into deposit and regular categories
  const depositPayments = filteredPayments.filter(p => p.payment_type === 'deposit' || p.is_deposit);
  const regularPayments = filteredPayments.filter(p => p.payment_type !== 'deposit' && !p.is_deposit);

  const getStatusColor = (status) => {
    const colors = {
      completed: { bg: '#d1fae5', text: '#065f46', badge: '#10b981' },
      pending: { bg: '#fef3c7', text: '#92400e', badge: '#f59e0b' },
      failed: { bg: '#fee2e2', text: '#991b1b', badge: '#ef4444' }
    };
    return colors[status?.toLowerCase()] || colors.pending;
  };

  const getStatusEmoji = (status) => {
    const emojis = {
      completed: '✅',
      pending: '⏳',
      failed: '❌'
    };
    return emojis[status?.toLowerCase()] || '📋';
  };

  const PaymentCard = ({ payment }) => {
    const statusColor = getStatusColor(payment.status);
    const isDeposit = payment.payment_type === 'deposit' || payment.is_deposit;
    
    return (
      <div style={styles.paymentCard}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.paymentName}>{payment.user_name || payment.user_email}</h3>
            <p style={styles.paymentEmail}>{payment.user_email}</p>
            {isDeposit && (
              <span style={{...styles.depositBadge}}>💰 10% Minimum Deposit</span>
            )}
          </div>
          <div style={{...styles.statusBadge, backgroundColor: statusColor.bg, color: statusColor.text}}>
            {getStatusEmoji(payment.status)} {payment.status?.toUpperCase()}
          </div>
        </div>

        <div style={styles.amountDisplay}>
          <span style={styles.amountLabel}>Payment Amount</span>
          <span style={styles.amountValue}>
            ${parseFloat(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {payment.late_fee && parseFloat(payment.late_fee) > 0 && (
            <span style={styles.lateFeeTag}>Late Fee: ${parseFloat(payment.late_fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          )}
          {payment.fee && parseFloat(payment.fee) > 0 && (
            <span style={styles.feeTag}>Processing Fee: ${parseFloat(payment.fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          )}
        </div>

        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Payment Date</span>
            <span style={styles.detailValue}>
              {new Date(payment.payment_date).toLocaleDateString()}
            </span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Type</span>
            <span style={styles.detailValue}>
              {payment.payment_type?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Loan Type</span>
            <span style={styles.detailValue}>
              {payment.loan_type?.toUpperCase()}
            </span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Account</span>
            <span style={styles.detailValue}>
              {payment.account_number}
            </span>
          </div>
          {payment.principal_amount !== null && payment.principal_amount !== undefined && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Principal</span>
              <span style={styles.detailValue}>
                ${parseFloat(payment.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {payment.interest_amount !== null && payment.interest_amount !== undefined && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Interest</span>
              <span style={styles.detailValue}>
                ${parseFloat(payment.interest_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {payment.balance_after !== null && payment.balance_after !== undefined && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Balance After</span>
              <span style={{...styles.detailValue, color: '#059669', fontWeight: '700'}}>
                ${parseFloat(payment.balance_after).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {payment.deposit_method && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Method</span>
              <span style={styles.detailValue}>
                {payment.deposit_method?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          )}
          {payment.confirmations !== null && payment.confirmations !== undefined && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Confirmations</span>
              <span style={styles.detailValue}>
                {payment.confirmations}/{payment.required_confirmations || 3}
              </span>
            </div>
          )}
          {payment.metadata?.months_covered && payment.metadata.months_covered > 1 && (
            <div style={{...styles.detailItem, backgroundColor: '#dbeafe', padding: '12px', borderRadius: '6px', gridColumn: 'span 2'}}>
              <span style={{...styles.detailLabel, color: '#1e40af'}}>⚡ Prepayment</span>
              <span style={{...styles.detailValue, color: '#1e40af'}}>
                {payment.metadata.months_covered} months covered
              </span>
            </div>
          )}
        </div>

        {payment.notes && (
          <div style={styles.notesSection}>
            <span style={styles.notesLabel}>Notes:</span>
            <span style={styles.notesText}>{payment.notes}</span>
          </div>
        )}

        <div style={styles.cardFooter}>
          {payment.status === 'pending' && (
            <>
              <button
                onClick={() => handleQuickAction(payment, 'approve')}
                style={styles.approveButton}
                disabled={processing === payment.id}
              >
                {processing === payment.id ? (
                  <span style={styles.buttonSpinner}></span>
                ) : '✅'} Approve
              </button>
              <button
                onClick={() => handleQuickAction(payment, 'reject')}
                style={styles.rejectButton}
                disabled={processing === payment.id}
              >
                {processing === payment.id ? (
                  <span style={styles.buttonSpinner}></span>
                ) : '❌'} Reject
              </button>
            </>
          )}
          <Link 
            href={`/admin/loans/${payment.loan_id}`}
            style={styles.viewLoanButton}
          >
            👁️ View Loan
          </Link>
          <button
            onClick={() => openUpdateModal(payment)}
            style={styles.updateButton}
          >
            📊 Update
          </button>
          {payment.proof_path && (
            <button
              onClick={() => handleViewProof(payment)}
              style={styles.proofButton}
            >
              🖼️ Proof
            </button>
          )}
          {payment.status === 'pending' && (
            <button
              onClick={() => setShowDeleteConfirm(payment)}
              style={styles.deleteButton}
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <AdminLoadingBanner
          visible={loadingBanner.visible}
          current={loadingBanner.current}
          total={loadingBanner.total}
          action={loadingBanner.action}
          message={loadingBanner.message}
        />

        {successBanner.visible && (
          <div style={styles.successBanner} animation="slideIn">
            {successBanner.message}
          </div>
        )}

        {errorBanner.visible && (
          <div style={styles.errorBannerTop} animation="slideIn">
            {errorBanner.message}
          </div>
        )}

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💳 Loan Payments</h1>
            <p style={styles.subtitle}>Manage and track all loan payment activities</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchPayments} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-loans" style={styles.backButton}>
              ← Back to Loans
            </Link>
          </div>
        </div>

        {stats && (
          <div style={styles.statsGrid}>
            <div style={{...styles.statCard, borderLeftColor: '#3b82f6'}}>
              <div style={styles.statIcon}>📊</div>
              <h3 style={styles.statLabel}>Total Payments</h3>
              <p style={styles.statValue}>{stats.totalPayments}</p>
            </div>
            <div style={{...styles.statCard, borderLeftColor: '#10b981'}}>
              <div style={styles.statIcon}>💰</div>
              <h3 style={styles.statLabel}>Total Amount</h3>
              <p style={styles.statValue}>${(stats.totalAmount || 0).toLocaleString()}</p>
            </div>
            <div style={{...styles.statCard, borderLeftColor: '#059669'}}>
              <div style={styles.statIcon}>✅</div>
              <h3 style={styles.statLabel}>Approved</h3>
              <p style={styles.statValue}>{stats.completedPayments || 0}</p>
            </div>
            <div style={{...styles.statCard, borderLeftColor: '#f59e0b'}}>
              <div style={styles.statIcon}>⏳</div>
              <h3 style={styles.statLabel}>Pending</h3>
              <p style={styles.statValue}>{stats.pendingPayments || 0}</p>
            </div>
            <div style={{...styles.statCard, borderLeftColor: '#ef4444'}}>
              <div style={styles.statIcon}>❌</div>
              <h3 style={styles.statLabel}>Rejected</h3>
              <p style={styles.statValue}>{stats.failedPayments || 0}</p>
            </div>
          </div>
        )}

        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by email, name, reference, or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={styles.filterSelect}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Approved</option>
            <option value="pending">Pending</option>
            <option value="failed">Rejected</option>
          </select>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)} 
            style={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="regular">Regular</option>
            <option value="manual">Manual</option>
            <option value="auto_payment">Auto Payment</option>
            <option value="early_payoff">Early Payoff</option>
            <option value="deposit">Deposit (10%)</option>
          </select>
          <select 
            value={filterLoanType} 
            onChange={(e) => setFilterLoanType(e.target.value)} 
            style={styles.filterSelect}
          >
            <option value="all">All Loan Types</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="auto">Auto</option>
            <option value="mortgage">Mortgage</option>
            <option value="student">Student</option>
          </select>
        </div>

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading payments...</p>
          </div>
        ) : (
          <>
            {/* Minimum Deposit Payments Section */}
            {depositPayments.length > 0 && (
              <div style={styles.sectionContainer}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>💰 Minimum Loan Deposits (10%)</h2>
                  <span style={styles.sectionCount}>{depositPayments.length} payment{depositPayments.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={styles.paymentsGrid}>
                  {depositPayments.map(payment => (
                    <PaymentCard key={payment.id} payment={payment} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Payments Section */}
            {regularPayments.length > 0 && (
              <div style={styles.sectionContainer}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>📅 Regular Loan Payments</h2>
                  <span style={styles.sectionCount}>{regularPayments.length} payment{regularPayments.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={styles.paymentsGrid}>
                  {regularPayments.map(payment => (
                    <PaymentCard key={payment.id} payment={payment} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {depositPayments.length === 0 && regularPayments.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>📋</p>
                <p style={styles.emptyText}>No payments found</p>
              </div>
            )}
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
                    <strong>Amount:</strong> ${parseFloat(showProofModal.amount || 0).toFixed(2)}
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

        {/* Update Payment Modal - Professional with in-modal states */}
        {showUpdateModal && (
          <div style={styles.modalOverlay} onClick={!modalState.loading ? closeUpdateModal : undefined}>
            <div style={{...styles.modal, maxWidth: '520px'}} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {modalState.success ? '✅' : modalState.error ? '❌' : '📊'} 
                  {modalState.success ? ' Success' : modalState.error ? ' Error' : ' Update Payment Status'}
                </h2>
                {!modalState.loading && (
                  <button onClick={closeUpdateModal} style={styles.closeButton}>×</button>
                )}
              </div>
              <div style={styles.modalBody}>
                {/* Loading State */}
                {modalState.loading && (
                  <div style={{textAlign: 'center', padding: '40px 20px'}}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      border: '4px solid #e2e8f0',
                      borderTop: '4px solid #3b82f6',
                      borderRadius: '50%',
                      margin: '0 auto 20px',
                      animation: 'spinnerRotate 1s linear infinite'
                    }}></div>
                    <p style={{color: '#64748b', fontSize: '16px', margin: 0}}>
                      {modalState.actionType === 'approve' ? 'Approving payment...' : 'Rejecting payment...'}
                    </p>
                    <p style={{color: '#94a3b8', fontSize: '14px', marginTop: '8px'}}>
                      {modalState.actionType === 'approve' 
                        ? 'Crediting treasury and sending notification...'
                        : 'Processing refund and sending notification...'}
                    </p>
                  </div>
                )}

                {/* Success State */}
                {modalState.success && (
                  <div style={{textAlign: 'center', padding: '40px 20px'}}>
                    <div style={{
                      width: '70px',
                      height: '70px',
                      background: modalState.actionType === 'approve' ? '#d1fae5' : '#fef3c7',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      fontSize: '32px'
                    }}>
                      {modalState.actionType === 'approve' ? '✅' : '🔄'}
                    </div>
                    <h3 style={{
                      color: modalState.actionType === 'approve' ? '#065f46' : '#92400e',
                      fontSize: '20px',
                      fontWeight: '600',
                      margin: '0 0 12px 0'
                    }}>
                      {modalState.actionType === 'approve' ? 'Payment Approved!' : 'Payment Rejected'}
                    </h3>
                    <p style={{color: '#64748b', fontSize: '14px', margin: 0, lineHeight: '1.6'}}>
                      {modalState.message}
                    </p>
                  </div>
                )}

                {/* Error State */}
                {modalState.error && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <p style={{color: '#991b1b', margin: 0, fontSize: '14px'}}>
                      <strong>Error:</strong> {modalState.message}
                    </p>
                  </div>
                )}

                {/* Form - Only show when not loading and not success */}
                {!modalState.loading && !modalState.success && (
                  <form onSubmit={handleUpdateSubmit}>
                    {/* Payment Info Summary */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '20px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px'}}>
                        <div>
                          <span style={{color: '#64748b'}}>Amount:</span>
                          <strong style={{color: '#1e293b', marginLeft: '8px'}}>
                            ${parseFloat(showUpdateModal.amount || 0).toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          <span style={{color: '#64748b'}}>Current Status:</span>
                          <span style={{color: '#1e293b', marginLeft: '8px', textTransform: 'capitalize'}}>
                            {showUpdateModal.status || 'Pending'}
                          </span>
                        </div>
                        <div>
                          <span style={{color: '#64748b'}}>Type:</span>
                          <span style={{color: '#1e293b', marginLeft: '8px', textTransform: 'capitalize'}}>
                            {showUpdateModal.payment_type || 'Regular'}
                          </span>
                        </div>
                        <div>
                          <span style={{color: '#64748b'}}>User:</span>
                          <span style={{color: '#1e293b', marginLeft: '8px'}}>
                            {showUpdateModal.user_name || showUpdateModal.user_email || 'N/A'}
                          </span>
                        </div>
                        <div style={{gridColumn: 'span 2'}}>
                          <span style={{color: '#64748b'}}>Loan:</span>
                          <span style={{color: '#1e293b', marginLeft: '8px', textTransform: 'capitalize'}}>
                            {showUpdateModal.loan_type || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Selector */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Update Status *</label>
                      <select
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                        style={styles.input}
                        required
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">✅ Completed (Approve & Credit)</option>
                        <option value="failed">❌ Failed (Reject & Refund)</option>
                      </select>
                    </div>

                    {/* Amount Fields */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Payment Amount (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={updateForm.amount}
                        onChange={(e) => setUpdateForm({...updateForm, amount: e.target.value})}
                        style={styles.input}
                        placeholder="Enter payment amount"
                      />
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Principal Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={updateForm.principalAmount}
                          onChange={(e) => setUpdateForm({...updateForm, principalAmount: e.target.value})}
                          style={styles.input}
                          placeholder="Principal"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Interest Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={updateForm.interestAmount}
                          onChange={(e) => setUpdateForm({...updateForm, interestAmount: e.target.value})}
                          style={styles.input}
                          placeholder="Interest"
                        />
                      </div>
                    </div>

                    {/* Rejection Reason - Show when status is failed */}
                    {updateForm.status === 'failed' && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Rejection Reason *</label>
                        <textarea
                          value={updateForm.rejectionReason}
                          onChange={(e) => setUpdateForm({...updateForm, rejectionReason: e.target.value})}
                          style={{...styles.input, minHeight: '80px'}}
                          placeholder="Enter reason for rejection (required)"
                          required
                        />
                      </div>
                    )}

                    {/* Admin Notes */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Admin Notes (Optional)</label>
                      <textarea
                        value={updateForm.adminNotes}
                        onChange={(e) => setUpdateForm({...updateForm, adminNotes: e.target.value})}
                        style={{...styles.input, minHeight: '80px'}}
                        placeholder="Add any additional notes for this action"
                      />
                    </div>

                    {/* Crypto confirmations if applicable */}
                    {showUpdateModal.deposit_method === 'crypto' && (
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
                    )}

                    {/* Action Info Banner */}
                    <div style={{
                      background: updateForm.status === 'completed' ? '#ecfdf5' : updateForm.status === 'failed' ? '#fef2f2' : '#f0f9ff',
                      border: `1px solid ${updateForm.status === 'completed' ? '#a7f3d0' : updateForm.status === 'failed' ? '#fecaca' : '#bae6fd'}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '20px'
                    }}>
                      <p style={{
                        color: updateForm.status === 'completed' ? '#065f46' : updateForm.status === 'failed' ? '#991b1b' : '#0c4a6e',
                        margin: 0,
                        fontSize: '13px',
                        lineHeight: '1.5'
                      }}>
                        {updateForm.status === 'completed' 
                          ? '✅ This will credit the bank treasury, update loan balance, and send an approval email to the user.'
                          : updateForm.status === 'failed'
                          ? '❌ This will refund the payment amount to the user\'s account and send a rejection email notification.'
                          : 'ℹ️ Payment will remain in pending status. No balance changes will be made.'}
                      </p>
                    </div>

                    {/* Inline validation message for failed status without reason */}
                    {updateForm.status === 'failed' && !updateForm.rejectionReason.trim() && (
                      <div style={{
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        marginBottom: '16px'
                      }}>
                        <p style={{color: '#92400e', margin: 0, fontSize: '13px'}}>
                          ⚠️ Please enter a rejection reason above before submitting.
                        </p>
                      </div>
                    )}

                    <div style={styles.modalActions}>
                      <button
                        type="button"
                        onClick={closeUpdateModal}
                        style={{...styles.btn, ...styles.btnSecondary}}
                        disabled={processing === showUpdateModal.id}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{
                          ...styles.btn,
                          ...(updateForm.status === 'completed' ? styles.btnPrimary : updateForm.status === 'failed' ? styles.btnDanger : styles.btnSecondary),
                          ...(updateForm.status === 'failed' && !updateForm.rejectionReason.trim() ? {
                            opacity: 0.6,
                            cursor: 'not-allowed'
                          } : {})
                        }}
                        disabled={processing === showUpdateModal.id || (updateForm.status === 'failed' && !updateForm.rejectionReason.trim())}
                      >
                        {processing === showUpdateModal.id 
                          ? (updateForm.status === 'completed' ? 'Approving...' : updateForm.status === 'failed' ? 'Rejecting...' : 'Updating...')
                          : (updateForm.status === 'completed' ? '✅ Approve & Complete' : updateForm.status === 'failed' ? '❌ Reject & Refund' : 'Update Payment')}
                      </button>
                    </div>
                  </form>
                )}
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
                <p style={{marginBottom: '20px', fontSize: 'clamp(0.9rem, 2.2vw, 15px)', lineHeight: '1.5'}}>
                  Are you sure you want to delete this payment record? This action cannot be undone.
                </p>
                <div style={{background: '#fef2f2', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fecaca'}}>
                  <p style={{margin: 0, fontSize: 'clamp(0.85rem, 2vw, 14px)', color: '#991b1b'}}>
                    <strong>Payment ID:</strong> {showDeleteConfirm.id.slice(0, 8)}...
                  </p>
                  <p style={{margin: '4px 0 0 0', fontSize: 'clamp(0.85rem, 2vw, 14px)', color: '#991b1b'}}>
                    <strong>Amount:</strong> ${parseFloat(showDeleteConfirm.amount).toFixed(2)}
                  </p>
                </div>
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
      <AdminFooter />
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb',
    padding: 'clamp(12px, 3vw, 24px)',
    paddingBottom: '100px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'clamp(20px, 4vw, 32px)',
    flexWrap: 'wrap',
    gap: '16px',
    animation: 'slideIn 0.4s ease-out'
  },
  title: {
    fontSize: 'clamp(24px, 6vw, 32px)',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: 'clamp(13px, 2.5vw, 16px)',
    color: '#6b7280',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 20px)',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    whiteSpace: 'nowrap'
  },
  backButton: {
    padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 20px)',
    background: '#6b7280',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    whiteSpace: 'nowrap'
  },
  successBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#d1fae5',
    color: '#065f46',
    padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out'
  },
  errorBannerTop: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fee2e2',
    color: '#991b1b',
    padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 'clamp(12px, 3vw, 16px)',
    marginBottom: 'clamp(20px, 4vw, 32px)',
    animation: 'slideIn 0.5s ease-out'
  },
  statCard: {
    background: 'white',
    padding: 'clamp(16px, 3vw, 20px)',
    borderRadius: '12px',
    borderLeft: '4px solid',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  statIcon: {
    fontSize: '24px'
  },
  statLabel: {
    fontSize: 'clamp(11px, 2.2vw, 12px)',
    color: '#6b7280',
    fontWeight: '600',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  filtersSection: {
    display: 'flex',
    gap: 'clamp(8px, 2vw, 12px)',
    marginBottom: 'clamp(16px, 3vw, 24px)',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: '1 1 250px',
    padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 16px)',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    minWidth: '200px'
  },
  filterSelect: {
    padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 16px)',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    background: 'white',
    cursor: 'pointer',
    minWidth: '130px'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(40px, 10vw, 60px) clamp(20px, 5vw, 40px)',
    gap: '16px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spinnerRotate 1s linear infinite'
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(40px, 10vw, 60px) clamp(20px, 5vw, 40px)',
    gap: '12px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '48px',
    margin: 0
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    fontWeight: '600',
    margin: 0
  },
  sectionContainer: {
    marginBottom: 'clamp(24px, 5vw, 40px)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'clamp(12px, 3vw, 16px)',
    padding: 'clamp(12px, 3vw, 16px)',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: 'clamp(18px, 4vw, 24px)',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  sectionCount: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '6px 12px',
    borderRadius: '6px'
  },
  paymentsGrid: {
    display: 'grid',
    gap: 'clamp(12px, 3vw, 16px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  paymentCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    animation: 'slideIn 0.4s ease-out'
  },
  cardHeader: {
    padding: 'clamp(12px, 3vw, 16px)',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap'
  },
  paymentName: {
    fontSize: 'clamp(16px, 3vw, 18px)',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0'
  },
  paymentEmail: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    color: '#6b7280',
    margin: 0
  },
  depositBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: 'clamp(10px, 2vw, 12px)',
    fontWeight: '700',
    marginTop: '6px'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(10px, 2vw, 12px)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap'
  },
  amountDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: 'clamp(12px, 2.5vw, 16px)',
    background: '#f9fafb',
    borderRadius: '8px',
    margin: 'clamp(12px, 2.5vw, 16px)',
    border: '1px solid #e5e7eb'
  },
  amountLabel: {
    fontSize: 'clamp(11px, 2.2vw, 12px)',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  amountValue: {
    fontSize: 'clamp(20px, 5vw, 28px)',
    fontWeight: '700',
    color: '#059669'
  },
  lateFeeTag: {
    fontSize: 'clamp(11px, 2.2vw, 12px)',
    color: '#ef4444',
    fontWeight: '600',
    background: '#fee2e2',
    padding: '6px 10px',
    borderRadius: '4px',
    width: 'fit-content'
  },
  feeTag: {
    fontSize: 'clamp(11px, 2.2vw, 12px)',
    color: '#f59e0b',
    fontWeight: '600',
    background: '#fef3c7',
    padding: '6px 10px',
    borderRadius: '4px',
    width: 'fit-content'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 'clamp(12px, 2.5vw, 16px)',
    padding: '0 clamp(12px, 2.5vw, 16px)',
    marginBottom: 'clamp(12px, 2.5vw, 16px)'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: 'clamp(11px, 2.2vw, 12px)',
    color: '#6b7280',
    fontWeight: '600'
  },
  detailValue: {
    fontSize: 'clamp(13px, 2.5vw, 15px)',
    color: '#111827',
    fontWeight: '600',
    wordBreak: 'break-word'
  },
  notesSection: {
    padding: 'clamp(12px, 2.5vw, 16px)',
    background: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    display: 'flex',
    gap: '8px',
    margin: '0 clamp(12px, 2.5vw, 16px) clamp(12px, 2.5vw, 16px)',
    flexWrap: 'wrap'
  },
  notesLabel: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '700',
    color: '#92400e'
  },
  notesText: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    color: '#78350f',
    flex: 1
  },
  cardFooter: {
    display: 'flex',
    gap: 'clamp(8px, 2vw, 12px)',
    flexWrap: 'wrap',
    padding: 'clamp(12px, 2.5vw, 16px)',
    borderTop: '1px solid #e5e7eb'
  },
  viewLoanButton: {
    flex: 1,
    minWidth: '100px',
    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2.5vw, 16px)',
    background: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    textAlign: 'center'
  },
  updateButton: {
    flex: 1,
    minWidth: '100px',
    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2.5vw, 16px)',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  proofButton: {
    flex: 1,
    minWidth: '100px',
    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2.5vw, 16px)',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  deleteButton: {
    flex: '0 0 auto',
    minWidth: '48px',
    padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 12px)',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  approveButton: {
    flex: 1,
    minWidth: '90px',
    padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2.5vw, 16px)',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
  },
  rejectButton: {
    flex: 1,
    minWidth: '90px',
    padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2.5vw, 16px)',
    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
  },
  buttonSpinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spinnerRotate 0.8s linear infinite'
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
  btnDanger: {
    background: '#dc2626',
    color: 'white'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px',
    flexWrap: 'wrap'
  }
};
