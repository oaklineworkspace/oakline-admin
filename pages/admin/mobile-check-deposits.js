
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function MobileCheckDeposits() {
  const router = useRouter();
  const [checkDeposits, setCheckDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedDeposit, setSelectedDeposit] = useState(null);

  useEffect(() => {
    fetchCheckDeposits();
  }, []);

  const fetchCheckDeposits = async () => {
    try {
      const response = await fetch('/api/admin/get-check-deposits');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch check deposits');

      setCheckDeposits(data.deposits || []);
    } catch (error) {
      console.error('Error fetching check deposits:', error);
      setMessage('❌ Failed to load check deposits: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (depositId, accountId, amount) => {
    if (!confirm(`Approve check deposit of $${amount}?`)) return;

    setProcessing(depositId);
    setMessage('');

    try {
      const response = await fetch('/api/admin/process-check-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId,
          accountId,
          action: 'approve',
          amount: parseFloat(amount)
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Check deposit approved! New balance: $${result.newBalance.toFixed(2)}`);
        await fetchCheckDeposits();
      } else {
        setMessage(`❌ ${result.error || 'Failed to approve deposit'}`);
      }
    } catch (error) {
      console.error('Error approving deposit:', error);
      setMessage('❌ Failed to approve deposit');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (depositId, reason) => {
    const rejectionReason = reason || prompt('Enter rejection reason:');
    if (!rejectionReason) return;

    setProcessing(depositId);
    setMessage('');

    try {
      const response = await fetch('/api/admin/process-check-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId,
          action: 'reject',
          reason: rejectionReason
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Check deposit rejected`);
        await fetchCheckDeposits();
      } else {
        setMessage(`❌ ${result.error || 'Failed to reject deposit'}`);
      }
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      setMessage('❌ Failed to reject deposit');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#f59e0b', label: 'Pending Review' },
      approved: { bg: '#d1fae5', color: '#059669', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
      processing: { bg: '#dbeafe', color: '#3b82f6', label: 'Processing' }
    };
    return styles[status] || styles.pending;
  };

  const filteredDeposits = checkDeposits.filter(deposit => 
    filterStatus === 'all' || deposit.status === filterStatus
  );

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading check deposits...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📸 Mobile Check Deposits</h1>
            <p style={styles.subtitle}>Review and process mobile check deposits</p>
          </div>
          <button onClick={() => router.push('/admin/admin-dashboard')} style={styles.backButton}>
            ← Dashboard
          </button>
        </div>

        {message && (
          <div style={{
            ...styles.alert,
            backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
            color: message.includes('✅') ? '#059669' : '#dc2626'
          }}>
            {message}
          </div>
        )}

        <div style={styles.filtersBar}>
          <h2 style={styles.sectionTitle}>
            Check Deposits ({filteredDeposits.length})
          </h2>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
            <option value="processing">🔄 Processing</option>
          </select>
        </div>

        <div style={styles.depositsGrid}>
          {filteredDeposits.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No check deposits found</p>
            </div>
          ) : (
            filteredDeposits.map((deposit) => {
              const statusStyle = getStatusBadgeStyle(deposit.status);
              const isPending = deposit.status === 'pending';

              return (
                <div key={deposit.id} style={styles.depositCard}>
                  <div style={styles.depositHeader}>
                    <div>
                      <h3 style={styles.depositAmount}>
                        ${parseFloat(deposit.amount || 0).toFixed(2)}
                      </h3>
                      <p style={styles.depositDate}>
                        {new Date(deposit.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color
                    }}>
                      {statusStyle.label}
                    </span>
                  </div>

                  <div style={styles.depositInfo}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Account:</span>
                      <span style={styles.infoValue}>
                        {deposit.accounts?.account_number || 'N/A'}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Account Holder:</span>
                      <span style={styles.infoValue}>
                        {deposit.accounts?.applications?.first_name} {deposit.accounts?.applications?.last_name}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Check Number:</span>
                      <span style={styles.infoValue}>
                        {deposit.check_number || 'Not provided'}
                      </span>
                    </div>
                    {deposit.memo && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Memo:</span>
                        <span style={styles.infoValue}>{deposit.memo}</span>
                      </div>
                    )}
                  </div>

                  {deposit.front_image_url && (
                    <div style={styles.checkImagesSection}>
                      <p style={styles.checkImageLabel}>Check Images:</p>
                      <div style={styles.checkImages}>
                        <div style={styles.checkImageContainer}>
                          <p style={styles.checkImageTitle}>Front</p>
                          <img
                            src={deposit.front_image_url}
                            alt="Check Front"
                            style={styles.checkImage}
                            onClick={() => setSelectedDeposit(deposit)}
                          />
                        </div>
                        {deposit.back_image_url && (
                          <div style={styles.checkImageContainer}>
                            <p style={styles.checkImageTitle}>Back</p>
                            <img
                              src={deposit.back_image_url}
                              alt="Check Back"
                              style={styles.checkImage}
                              onClick={() => setSelectedDeposit(deposit)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isPending && (
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleApprove(deposit.id, deposit.account_id, deposit.amount)}
                        disabled={processing === deposit.id}
                        style={styles.approveButton}
                      >
                        {processing === deposit.id ? 'Processing...' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(deposit.id)}
                        disabled={processing === deposit.id}
                        style={styles.rejectButton}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {deposit.rejection_reason && (
                    <div style={styles.rejectionReason}>
                      <strong>Rejection Reason:</strong> {deposit.rejection_reason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {selectedDeposit && (
          <div style={styles.modal} onClick={() => setSelectedDeposit(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.modalClose} onClick={() => setSelectedDeposit(null)}>
                ✕
              </button>
              <h3 style={styles.modalTitle}>Check Images - ${parseFloat(selectedDeposit.amount).toFixed(2)}</h3>
              <div style={styles.modalImages}>
                {selectedDeposit.front_image_url && (
                  <div>
                    <p style={styles.modalImageLabel}>Front</p>
                    <img src={selectedDeposit.front_image_url} alt="Check Front" style={styles.modalImage} />
                  </div>
                )}
                {selectedDeposit.back_image_url && (
                  <div>
                    <p style={styles.modalImageLabel}>Back</p>
                    <img src={selectedDeposit.back_image_url} alt="Check Back" style={styles.modalImage} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: 'clamp(1rem, 3vw, 1.5rem)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTop: '5px solid #0f766e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#475569',
    fontSize: '16px'
  },
  header: {
    backgroundColor: '#0f766e',
    padding: 'clamp(1.5rem, 4vw, 2rem)',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
    margin: '0.5rem 0 0 0'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
    backgroundColor: 'white',
    color: '#0f766e',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  alert: {
    padding: 'clamp(0.75rem, 2vw, 1rem)',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '500',
    textAlign: 'center'
  },
  filtersBar: {
    backgroundColor: 'white',
    padding: 'clamp(1rem, 3vw, 1.5rem)',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
    fontWeight: '700',
    color: '#0f766e',
    margin: 0
  },
  filterSelect: {
    padding: '0.65rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  depositsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))',
    gap: 'clamp(1rem, 3vw, 1.5rem)'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '4rem',
    margin: '0 0 1rem 0'
  },
  emptyText: {
    fontSize: '1.1rem',
    color: '#64748b'
  },
  depositCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.25rem, 3vw, 1.5rem)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
  },
  depositHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #f1f5f9'
  },
  depositAmount: {
    fontSize: 'clamp(1.5rem, 3vw, 1.75rem)',
    fontWeight: '800',
    color: '#0f766e',
    margin: '0 0 0.25rem 0'
  },
  depositDate: {
    fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
    color: '#64748b',
    margin: 0
  },
  statusBadge: {
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  depositInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem'
  },
  infoLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 0.9rem)',
    color: '#64748b',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 'clamp(0.85rem, 2vw, 0.9rem)',
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right'
  },
  checkImagesSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '2px solid #f1f5f9'
  },
  checkImageLabel: {
    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '0.75rem'
  },
  checkImages: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem'
  },
  checkImageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  checkImageTitle: {
    fontSize: 'clamp(0.8rem, 1.8vw, 0.85rem)',
    fontWeight: '600',
    color: '#64748b',
    margin: 0
  },
  checkImage: {
    width: '100%',
    height: 'auto',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'scale(1.05)'
    }
  },
  actionButtons: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.25rem'
  },
  approveButton: {
    flex: 1,
    padding: '0.85rem',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 0.95rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#047857'
    }
  },
  rejectButton: {
    flex: 1,
    padding: '0.85rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 0.95rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#b91c1c'
    }
  },
  rejectionReason: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: 'clamp(0.85rem, 2vw, 0.9rem)'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative'
  },
  modalClose: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b',
    padding: '0.5rem',
    lineHeight: 1
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: '1.5rem'
  },
  modalImages: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  modalImageLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '0.75rem'
  },
  modalImage: {
    width: '100%',
    height: 'auto',
    borderRadius: '8px',
    border: '2px solid #e2e8f0'
  }
};
