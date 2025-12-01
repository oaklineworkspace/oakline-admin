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

  const handleApprovePayment = async (paymentId, paymentAmount) => {
    setLoadingBanner({
      visible: true,
      current: 0,
      total: 1,
      action: 'Approving Payment',
      message: `Processing $${parseFloat(paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}...`
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorBanner({
          visible: true,
          message: '❌ You must be logged in',
          duration: 3000
        });
        return;
      }

      const response = await fetch('/api/admin/approve-loan-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ paymentId, action: 'approve' })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve payment');
      }

      const successMsg = result.loan?.is_closed 
        ? `✅ Payment approved! Loan has been paid off completely!`
        : `✅ Payment approved! ${result.payment?.months_covered || 1} month(s) covered. New balance: $${result.loan?.new_balance?.toLocaleString() || '0'}`;
      
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setSuccessBanner({
        visible: true,
        message: successMsg,
        duration: 4000
      });
      
      fetchPayments();
    } catch (err) {
      console.error('Error approving payment:', err);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setErrorBanner({
        visible: true,
        message: `❌ Failed to approve payment: ${err.message}`,
        duration: 4000
      });
    }
  };

  const handleRejectPayment = async (paymentId, paymentAmount) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    setLoadingBanner({
      visible: true,
      current: 0,
      total: 1,
      action: 'Rejecting Payment',
      message: `Rejecting $${parseFloat(paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}...`
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorBanner({
          visible: true,
          message: '❌ You must be logged in',
          duration: 3000
        });
        return;
      }

      const response = await fetch('/api/admin/approve-loan-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          paymentId, 
          action: 'reject',
          rejectionReason: reason
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject payment');
      }

      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setSuccessBanner({
        visible: true,
        message: '✅ Payment rejected successfully',
        duration: 3000
      });
      
      fetchPayments();
    } catch (err) {
      console.error('Error rejecting payment:', err);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setErrorBanner({
        visible: true,
        message: `❌ Failed to reject payment: ${err.message}`,
        duration: 4000
      });
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
    const matchesType = filterType === 'all' || payment.payment_type === filterType || payment.loan_type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status) => {
    const colors = {
      completed: { bg: '#d1fae5', text: '#065f46', badge: '#10b981' },
      pending: { bg: '#fef3c7', text: '#92400e', badge: '#f59e0b' },
      failed: { bg: '#fee2e2', text: '#991b1b', badge: '#ef4444' }
    };
    return colors[status?.toLowerCase()] || colors.pending;
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
          </select>
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No payments found</p>
            </div>
          ) : (
            <div style={styles.paymentsGrid}>
              {filteredPayments.map(payment => {
                const statusColor = getStatusColor(payment.status);
                return (
                  <div key={payment.id} style={styles.paymentCard}>
                    <div style={styles.cardHeader}>
                      <div>
                        <h3 style={styles.paymentName}>{payment.user_name || payment.user_email}</h3>
                        <p style={styles.paymentEmail}>{payment.user_email}</p>
                      </div>
                      <div style={{...styles.statusBadge, backgroundColor: statusColor.bg, color: statusColor.text}}>
                        {payment.status?.toUpperCase()}
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
                      {payment.balance_after !== null && payment.balance_after !== undefined && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Balance After</span>
                          <span style={{...styles.detailValue, color: '#059669', fontWeight: '700'}}>
                            ${parseFloat(payment.balance_after).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <Link 
                        href={`/admin/loans/${payment.loan_id}`}
                        style={styles.viewLoanButton}
                      >
                        👁️ View Loan
                      </Link>
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprovePayment(payment.id, payment.amount)}
                            style={styles.approveButton}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleRejectPayment(payment.id, payment.amount)}
                            style={styles.rejectButton}
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    animation: 'fadeIn 0.4s ease-out'
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(40px, 10vw, 60px) clamp(20px, 5vw, 40px)',
    gap: '12px'
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
  paymentsGrid: {
    display: 'grid',
    gap: '0',
    gridTemplateColumns: '1fr'
  },
  paymentCard: {
    padding: 'clamp(16px, 3vw, 24px)',
    borderBottom: '1px solid #e5e7eb',
    transition: 'background 0.2s',
    animation: 'slideIn 0.4s ease-out'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'clamp(12px, 2.5vw, 16px)',
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
  statusBadge: {
    padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 12px)',
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
    marginBottom: 'clamp(12px, 2.5vw, 16px)',
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
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 'clamp(12px, 2.5vw, 16px)',
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
    marginBottom: 'clamp(12px, 2.5vw, 16px)',
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
    paddingTop: 'clamp(12px, 2.5vw, 16px)',
    borderTop: '1px solid #e5e7eb'
  },
  viewLoanButton: {
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
    whiteSpace: 'nowrap'
  },
  approveButton: {
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
  rejectButton: {
    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2.5vw, 16px)',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  }
};
