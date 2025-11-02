import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../../components/AdminAuth';
import { supabase } from '../../../lib/supabaseClient';

export default function LoanDetail() {
  const router = useRouter();
  const { loanId } = router.query;
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [depositInfo, setDepositInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (loanId) {
      fetchLoanDetail();
    }
  }, [loanId]);

  const fetchLoanDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch(`/api/admin/get-loan-detail?loanId=${loanId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch loan details');
      
      const data = await response.json();
      setLoan(data.loan);
      setPayments(data.payments);
      setDepositInfo(data.depositInfo);
      setAuditLogs(data.auditLogs);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching loan details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLoan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/approve-loan-with-disbursement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loanId,
          approvalNotes
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve loan');
      }

      setSuccess('Loan approved and funds disbursed successfully!');
      setShowApproveModal(false);
      setApprovalNotes('');
      await fetchLoanDetail();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectLoan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/update-loan-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loanId,
          status: 'rejected',
          reason: rejectionReason
        })
      });

      if (!response.ok) throw new Error('Failed to reject loan');

      setSuccess('Loan rejected successfully');
      setShowRejectModal(false);
      setRejectionReason('');
      await fetchLoanDetail();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.container}>
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading loan details...</p>
          </div>
        </div>
      </AdminAuth>
    );
  }

  if (!loan) {
    return (
      <AdminAuth>
        <div style={styles.container}>
          <div style={styles.errorState}>
            <p>Loan not found</p>
            <Link href="/admin/admin-loans" style={styles.backLink}>← Back to Loans</Link>
          </div>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Loan Details</h1>
            <p style={styles.subtitle}>Comprehensive loan information and management</p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/admin/admin-loans" style={styles.backButton}>
              ← Back to Loans
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        <div style={styles.grid}>
          <div style={styles.mainSection}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Loan Information</h2>
                <span style={{
                  ...styles.statusBadge,
                  background: loan.status === 'active' ? '#d1fae5' :
                            loan.status === 'pending' ? '#fef3c7' :
                            loan.status === 'approved' ? '#dbeafe' :
                            loan.status === 'rejected' ? '#fee2e2' :
                            loan.status === 'closed' ? '#e5e7eb' : '#f3f4f6',
                  color: loan.status === 'active' ? '#065f46' :
                        loan.status === 'pending' ? '#92400e' :
                        loan.status === 'approved' ? '#1e40af' :
                        loan.status === 'rejected' ? '#991b1b' :
                        loan.status === 'closed' ? '#374151' : '#6b7280'
                }}>
                  {loan.status?.toUpperCase()}
                </span>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Loan ID</span>
                    <span style={styles.infoValue}>{loan.id}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Loan Type</span>
                    <span style={styles.infoValue}>{loan.loan_type?.toUpperCase()}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Principal Amount</span>
                    <span style={styles.infoValue}>${parseFloat(loan.principal).toLocaleString()}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Remaining Balance</span>
                    <span style={{...styles.infoValue, color: '#059669', fontWeight: '700'}}>
                      ${parseFloat(loan.remaining_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Interest Rate</span>
                    <span style={styles.infoValue}>{loan.interest_rate}% APR</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Term</span>
                    <span style={styles.infoValue}>{loan.term_months} months</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Monthly Payment</span>
                    <span style={styles.infoValue}>${parseFloat(loan.monthly_payment_amount || 0).toLocaleString()}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Payments Made</span>
                    <span style={styles.infoValue}>{loan.payments_made || 0} of {loan.term_months}</span>
                  </div>
                  {loan.next_payment_date && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Next Payment Due</span>
                      <span style={styles.infoValue}>
                        {new Date(loan.next_payment_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {loan.disbursed_at && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Disbursed On</span>
                      <span style={styles.infoValue}>
                        {new Date(loan.disbursed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {loan.purpose && (
                    <div style={{...styles.infoItem, gridColumn: '1 / -1'}}>
                      <span style={styles.infoLabel}>Purpose</span>
                      <span style={styles.infoValue}>{loan.purpose}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Borrower Information</h2>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Name</span>
                    <span style={styles.infoValue}>{loan.user_name}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Email</span>
                    <span style={styles.infoValue}>{loan.user_email}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Account Number</span>
                    <span style={styles.infoValue}>{loan.account_number}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Account Type</span>
                    <span style={styles.infoValue}>{loan.account_type?.toUpperCase()}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Account Balance</span>
                    <span style={styles.infoValue}>${parseFloat(loan.account_balance || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {depositInfo && loan.deposit_required && loan.deposit_required > 0 && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.cardTitle}>Deposit Verification</h2>
                  {depositInfo.verified ? (
                    <span style={{...styles.statusBadge, background: '#d1fae5', color: '#065f46'}}>
                      ✓ VERIFIED
                    </span>
                  ) : (
                    <span style={{...styles.statusBadge, background: '#fee2e2', color: '#991b1b'}}>
                      ✗ NOT VERIFIED
                    </span>
                  )}
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Required Deposit</span>
                      <span style={styles.infoValue}>${parseFloat(loan.deposit_required).toLocaleString()}</span>
                    </div>
                    {depositInfo.verified && (
                      <>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Deposit Type</span>
                          <span style={styles.infoValue}>
                            {depositInfo.type === 'crypto' ? 'Crypto Deposit' : 'Bank Transfer'}
                          </span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Amount Deposited</span>
                          <span style={styles.infoValue}>${parseFloat(depositInfo.amount).toLocaleString()}</span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Deposit Date</span>
                          <span style={styles.infoValue}>
                            {new Date(depositInfo.date).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {!depositInfo.verified && (
                    <div style={styles.warningBox}>
                      ⚠️ Required deposit of ${parseFloat(loan.deposit_required).toLocaleString()} has not been verified. 
                      Loan approval is blocked until deposit is confirmed.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Payment History</h2>
                <span style={styles.badge}>{payments.length} Payments</span>
              </div>
              <div style={styles.cardBody}>
                {payments.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <div style={styles.paymentsTable}>
                    {payments.map((payment) => (
                      <div key={payment.id} style={styles.paymentRow}>
                        <div style={styles.paymentInfo}>
                          <span style={styles.paymentDate}>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                          <span style={styles.paymentType}>{payment.payment_type}</span>
                        </div>
                        <div style={styles.paymentAmounts}>
                          <div style={styles.paymentDetail}>
                            <span>Total: ${parseFloat(payment.amount).toLocaleString()}</span>
                          </div>
                          <div style={styles.paymentDetail}>
                            <span>Principal: ${parseFloat(payment.principal_amount || 0).toLocaleString()}</span>
                          </div>
                          <div style={styles.paymentDetail}>
                            <span>Interest: ${parseFloat(payment.interest_amount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <span style={{
                          ...styles.paymentStatus,
                          background: payment.status === 'completed' ? '#d1fae5' :
                                    payment.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color: payment.status === 'completed' ? '#065f46' :
                                payment.status === 'pending' ? '#92400e' : '#991b1b'
                        }}>
                          {payment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.sidebar}>
            {loan.status === 'pending' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.cardTitle}>Actions</h2>
                </div>
                <div style={styles.cardBody}>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    style={{
                      ...styles.actionButton,
                      background: depositInfo?.verified || !loan.deposit_required ? '#10b981' : '#9ca3af',
                      cursor: depositInfo?.verified || !loan.deposit_required ? 'pointer' : 'not-allowed'
                    }}
                    disabled={loan.deposit_required && !depositInfo?.verified}
                  >
                    ✓ Approve & Disburse
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    style={{...styles.actionButton, background: '#ef4444'}}
                  >
                    ✗ Reject Loan
                  </button>
                  {loan.deposit_required && !depositInfo?.verified && (
                    <div style={styles.actionWarning}>
                      Approval requires deposit verification
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Audit Trail</h2>
              </div>
              <div style={styles.cardBody}>
                {auditLogs.length === 0 ? (
                  <p style={styles.emptyText}>No audit logs</p>
                ) : (
                  <div style={styles.auditList}>
                    {auditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} style={styles.auditItem}>
                        <div style={styles.auditAction}>{log.action}</div>
                        <div style={styles.auditDate}>
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showApproveModal && (
          <div style={styles.modalOverlay} onClick={() => setShowApproveModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Approve Loan & Disburse Funds</h2>
                <button onClick={() => setShowApproveModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <p style={styles.modalText}>
                  This will approve the loan and automatically disburse ${parseFloat(loan.principal).toLocaleString()} 
                  to the borrower's account. The loan will become active and the first payment will be due in 30 days.
                </p>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Approval Notes (Optional)</label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    style={styles.textarea}
                    placeholder="Add any notes about this approval..."
                    rows="4"
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button onClick={() => setShowApproveModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button onClick={handleApproveLoan} style={styles.confirmButton}>
                  Approve & Disburse
                </button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Reject Loan Application</h2>
                <button onClick={() => setShowRejectModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={styles.textarea}
                    placeholder="Explain why this loan is being rejected..."
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button onClick={() => setShowRejectModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button onClick={handleRejectLoan} style={styles.rejectButton}>
                  Reject Loan
                </button>
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
  backButton: {
    padding: '10px 20px',
    background: '#6b7280',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '24px',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr'
    }
  },
  mainSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  cardBody: {
    padding: '24px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: '16px',
    color: '#111827',
    fontWeight: '600'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  badge: {
    padding: '4px 12px',
    background: '#e5e7eb',
    color: '#374151',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600'
  },
  warningBox: {
    marginTop: '16px',
    padding: '16px',
    background: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  paymentsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  paymentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  paymentDate: {
    fontSize: '14px',
    color: '#111827',
    fontWeight: '600'
  },
  paymentType: {
    fontSize: '12px',
    color: '#6b7280'
  },
  paymentAmounts: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px'
  },
  paymentDetail: {
    color: '#4b5563'
  },
  paymentStatus: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  actionButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    transition: 'all 0.2s'
  },
  actionWarning: {
    padding: '12px',
    background: '#fef3c7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#92400e',
    textAlign: 'center'
  },
  auditList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  auditItem: {
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '6px',
    borderLeft: '3px solid #3b82f6'
  },
  auditAction: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px'
  },
  auditDate: {
    fontSize: '12px',
    color: '#6b7280'
  },
  errorBanner: {
    padding: '16px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #fca5a5'
  },
  successBanner: {
    padding: '16px',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #6ee7b7'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
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
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
    fontSize: '18px',
    color: '#6b7280'
  },
  backLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '14px',
    textAlign: 'center'
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
    zIndex: 1000
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px'
  },
  modalBody: {
    padding: '24px'
  },
  modalText: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  cancelButton: {
    padding: '10px 20px',
    background: '#e5e7eb',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '10px 20px',
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer'
  },
  rejectButton: {
    padding: '10px 20px',
    background: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer'
  }
};
