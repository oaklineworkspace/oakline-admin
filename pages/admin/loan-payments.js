import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function LoanPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/get-loan-payments', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch loan payments');

      const data = await response.json();
      setPayments(data.payments || []);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to approve this payment? This will update the loan balance.')) {
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in');
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

      alert('✅ Payment approved successfully!');
      fetchPayments();
    } catch (err) {
      console.error('Error approving payment:', err);
      alert('❌ Failed to approve payment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (paymentId) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in');
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

      alert('✅ Payment rejected successfully');
      fetchPayments();
    } catch (err) {
      console.error('Error rejecting payment:', err);
      alert('❌ Failed to reject payment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: { bg: '#2ECC71', color: 'white', text: 'Approved' },
      pending: { bg: '#F1C40F', color: '#333', text: 'Pending Approval' },
      failed: { bg: '#E74C3C', color: 'white', text: 'Rejected' }
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
        {style.text}
      </span>
    );
  };


  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.account_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesType = filterType === 'all' || payment.payment_type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💰 Loan Payments</h1>
            <p style={styles.subtitle}>Complete payment history and tracking</p>
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

        {error && <div style={styles.errorBanner}>{error}</div>}

        {stats && (
          <div style={styles.statsGrid}>
            <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
              <h3 style={styles.statLabel}>Total Payments</h3>
              <p style={styles.statValue}>{stats.totalPayments}</p>
            </div>
            <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
              <h3 style={styles.statLabel}>Total Amount</h3>
              <p style={styles.statValue}>${stats.totalAmount.toLocaleString()}</p>
            </div>
            <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
              <h3 style={styles.statLabel}>Completed</h3>
              <p style={styles.statValue}>{stats.completedPayments}</p>
            </div>
            <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
              <h3 style={styles.statLabel}>Pending</h3>
              <p style={styles.statValue}>{stats.pendingPayments}</p>
            </div>
            <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
              <h3 style={styles.statLabel}>Failed</h3>
              <p style={styles.statValue}>{stats.failedPayments}</p>
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
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
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
            <option value="late_fee">Late Fee</option>
          </select>
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No payments found</p>
            </div>
          ) : (
            <div style={styles.paymentsGrid}>
              {filteredPayments.map(payment => (
                <div key={payment.id} style={styles.paymentCard}>
                  <div style={styles.paymentHeader}>
                    <div>
                      <h3 style={styles.paymentUser}>{payment.user_name || payment.user_email}</h3>
                      <p style={styles.paymentEmail}>{payment.user_email}</p>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div style={styles.paymentBody}>
                    <div style={styles.amountSection}>
                      <div style={styles.mainAmount}>
                        <span style={styles.amountLabel}>Payment Amount</span>
                        <span style={styles.amountValue}>
                          ${parseFloat(payment.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div style={styles.breakdown}>
                        <div style={styles.breakdownItem}>
                          <span>Principal:</span>
                          <span>${parseFloat(payment.principal_amount || 0).toLocaleString()}</span>
                        </div>
                        <div style={styles.breakdownItem}>
                          <span>Interest:</span>
                          <span>${parseFloat(payment.interest_amount || 0).toLocaleString()}</span>
                        </div>
                        {payment.late_fee > 0 && (
                          <div style={styles.breakdownItem}>
                            <span>Late Fee:</span>
                            <span style={{color: '#ef4444'}}>
                              ${parseFloat(payment.late_fee).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={styles.detailsGrid}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Payment Date</span>
                        <span style={styles.detailValue}>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Payment Type</span>
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
                          {payment.account_number} ({payment.account_type})
                        </span>
                      </div>
                      {payment.reference_number && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Reference</span>
                          <span style={styles.detailValue}>
                            {payment.reference_number.slice(0, 16)}...
                          </span>
                        </div>
                      )}
                      {payment.balance_after !== null && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Balance After</span>
                          <span style={{...styles.detailValue, color: '#059669', fontWeight: '700'}}>
                            ${parseFloat(payment.balance_after).toLocaleString()}
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
                  </div>

                  <div style={styles.paymentFooter}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Link 
                        href={`/admin/loans/${payment.loan_id}`}
                        style={styles.viewLoanButton}
                      >
                        👁️ View Loan
                      </Link>
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprovePayment(payment.id)}
                            disabled={actionLoading}
                            style={styles.approveButton}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleRejectPayment(payment.id)}
                            disabled={actionLoading}
                            style={styles.rejectButton}
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                    </div>
                    <span style={styles.timestamp}>
                      {new Date(payment.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  refreshButton: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  backButton: {
    padding: '10px 20px',
    background: '#6b7280',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  filtersSection: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: '1 1 300px',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '250px'
  },
  filterSelect: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
    minWidth: '150px'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  paymentsGrid: {
    display: 'grid',
    gap: '0',
    gridTemplateColumns: '1fr'
  },
  paymentCard: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    transition: 'background 0.2s'
  },
  paymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  paymentUser: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0'
  },
  paymentEmail: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  paymentBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  amountSection: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  mainAmount: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  amountLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  amountValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#059669'
  },
  breakdown: {
    display: 'flex',
    gap: '20px',
    marginLeft: 'auto'
  },
  breakdownItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  detailLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '15px',
    color: '#111827',
    fontWeight: '600'
  },
  notesSection: {
    padding: '16px',
    background: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    display: 'flex',
    gap: '8px'
  },
  notesLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#92400e'
  },
  notesText: {
    fontSize: '14px',
    color: '#78350f',
    flex: 1
  },
  paymentFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb'
  },
  viewLoanButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    border: 'none',
    cursor: 'pointer'
  },
  approveButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  rejectButton: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  timestamp: {
    fontSize: '13px',
    color: '#9ca3af'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    gap: '16px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    margin: '0 0 16px 0'
  },
  emptyText: {
    fontSize: '18px',
    color: '#9ca3af',
    margin: 0
  },
  errorBanner: {
    padding: '16px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #fca5a5'
  }
};