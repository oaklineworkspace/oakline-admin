
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function VerificationsPage() {
  const router = useRouter();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Stats
  const [stats, setStats] = useState({
    totalPending: 0,
    totalSubmitted: 0,
    approvedToday: 0,
    rejectedToday: 0
  });

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter, typeFilter, searchEmail, dateRange]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/admin/verifications/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          statusFilter,
          typeFilter,
          searchEmail,
          dateRange
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verifications');
      }

      const result = await response.json();
      setVerifications(result.verifications || []);
      setStats(result.stats || stats);
    } catch (err) {
      console.error('Error fetching verifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [actionModal, setActionModal] = useState({ show: false, type: '', verification: null });

  const handleViewMedia = async (verification) => {
    setSelectedVerification(verification);
    setShowImageModal(true);
  };

  const handleApprove = (verification) => {
    setActionModal({ show: true, type: 'approve', verification });
  };

  const handleReject = (verification) => {
    setActionModal({ show: true, type: 'reject', verification });
  };

  const executeAction = async () => {
    const { type, verification } = actionModal;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const endpoint = type === 'approve' 
        ? '/api/admin/verifications/approve'
        : '/api/admin/verifications/reject';
      
      const body = {
        verificationId: verification.id,
        ...(type === 'reject' && { 
          rejectionReason: document.getElementById('rejection-reason')?.value || 'Not specified',
          adminNotes: document.getElementById('admin-notes')?.value || ''
        }),
        ...(type === 'approve' && {
          adminNotes: document.getElementById('admin-notes')?.value || ''
        })
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to process verification');
      }

      setActionModal({ show: false, type: '', verification: null });
      await fetchVerifications();
      setError('');
    } catch (err) {
      console.error('Error processing verification:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnforceVerification = async (verification) => {
    if (!confirm(`Mark ${verification.email} as requiring verification?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          requires_verification: true,
          verification_reason: 'Admin enforced verification',
          verification_required_at: new Date().toISOString()
        })
        .eq('id', verification.user_id);

      if (updateError) throw updateError;

      await fetchVerifications();
    } catch (err) {
      console.error('Error enforcing verification:', err);
      setError(err.message);
    }
  };

  const filteredVerifications = verifications;
  const totalPages = Math.ceil(filteredVerifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVerifications = filteredVerifications.slice(startIndex, startIndex + itemsPerPage);

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🛡️ Identity Verifications</h1>
            <p style={styles.subtitle}>Manage selfie and video verification requests</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchVerifications} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/verifications/analytics" style={styles.analyticsButton}>
              📊 Analytics
            </Link>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={() => setError('')} style={styles.closeButton}>✕</button>
          </div>
        )}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending Review</h3>
            <p style={styles.statValue}>{stats.totalPending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
            <h3 style={styles.statLabel}>Submitted</h3>
            <p style={styles.statValue}>{stats.totalSubmitted}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Approved Today</h3>
            <p style={styles.statValue}>{stats.approvedToday}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
            <h3 style={styles.statLabel}>Rejected Today</h3>
            <p style={styles.statValue}>{stats.rejectedToday}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={styles.searchInput}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Types</option>
            <option value="selfie">Selfie</option>
            <option value="video">Video</option>
            <option value="liveness">Liveness</option>
          </select>
        </div>

        {/* Verifications Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading verifications...</p>
            </div>
          ) : paginatedVerifications.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>🔍</p>
              <p style={styles.emptyText}>No verifications found</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.th}>Expires</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVerifications.map((verification) => (
                  <tr key={verification.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div>
                        <div style={styles.userEmail}>{verification.email}</div>
                        <div style={styles.userId}>ID: {verification.user_id?.substring(0, 8)}...</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={getTypeBadge(verification.verification_type)}>
                        {verification.verification_type}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={getStatusBadge(verification.status)}>
                        {verification.status}
                      </span>
                    </td>
                    <td style={styles.td}>{verification.reason}</td>
                    <td style={styles.td}>{formatDate(verification.submitted_at)}</td>
                    <td style={styles.td}>{formatDate(verification.expires_at)}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {(verification.image_path || verification.video_path) && (
                          <button
                            onClick={() => handleViewMedia(verification)}
                            style={{...styles.viewButton, background: '#3b82f6'}}
                          >
                            👁️ View
                          </button>
                        )}
                        {verification.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleApprove(verification)}
                              style={{...styles.viewButton, background: '#10b981'}}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleReject(verification)}
                              style={{...styles.viewButton, background: '#ef4444'}}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEnforceVerification(verification)}
                          style={{...styles.viewButton, background: '#f59e0b'}}
                        >
                          🔒 Enforce
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              ← Previous
            </button>
            <span style={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={styles.paginationButton}
            >
              Next →
            </button>
          </div>
        )}

        {/* Image/Video Modal */}
        {showImageModal && selectedVerification && (
          <div style={styles.modalOverlay} onClick={() => setShowImageModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Verification Media - {selectedVerification.email}</h2>
                <button onClick={() => setShowImageModal(false)} style={styles.closeBtn}>×</button>
              </div>
              <div style={styles.modalBody}>
                {selectedVerification.video_path && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3>Video Verification</h3>
                    <video 
                      controls 
                      style={{ width: '100%', maxHeight: '500px', borderRadius: '8px' }}
                      src={selectedVerification.video_path}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}
                {selectedVerification.image_path && (
                  <div>
                    <h3>Selfie Verification</h3>
                    <img 
                      src={selectedVerification.image_path} 
                      alt="Verification selfie"
                      style={{ width: '100%', borderRadius: '8px' }}
                    />
                  </div>
                )}
                {!selectedVerification.video_path && !selectedVerification.image_path && (
                  <p style={{ textAlign: 'center', color: '#718096' }}>No media uploaded yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Modal */}
        {actionModal.show && actionModal.verification && (
          <div style={styles.modalOverlay} onClick={() => setActionModal({ show: false, type: '', verification: null })}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {actionModal.type === 'approve' ? '✓ Approve' : '✕ Reject'} Verification
                </h2>
                <button onClick={() => setActionModal({ show: false, type: '', verification: null })} style={styles.closeBtn}>×</button>
              </div>
              <div style={styles.modalBody}>
                <p><strong>User:</strong> {actionModal.verification.email}</p>
                <p><strong>Type:</strong> {actionModal.verification.verification_type}</p>
                <p><strong>Submitted:</strong> {formatDate(actionModal.verification.submitted_at)}</p>
                
                {actionModal.type === 'reject' && (
                  <div style={{ marginTop: '20px' }}>
                    <label style={styles.label}>Rejection Reason *</label>
                    <textarea
                      id="rejection-reason"
                      style={styles.textarea}
                      rows={3}
                      placeholder="Enter reason for rejection..."
                      required
                    />
                  </div>
                )}
                
                <div style={{ marginTop: '20px' }}>
                  <label style={styles.label}>Admin Notes (Optional)</label>
                  <textarea
                    id="admin-notes"
                    style={styles.textarea}
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setActionModal({ show: false, type: '', verification: null })}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  style={{
                    ...styles.confirmButton,
                    background: actionModal.type === 'approve' ? '#10b981' : '#ef4444'
                  }}
                >
                  {actionModal.type === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const getStatusBadge = (status) => {
  const styles = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    submitted: { bg: '#dbeafe', color: '#1e40af' },
    under_review: { bg: '#e0f2fe', color: '#075985' },
    approved: { bg: '#d1fae5', color: '#065f46' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
    expired: { bg: '#f3f4f6', color: '#6b7280' }
  };
  const style = styles[status] || styles.pending;
  return {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: style.bg,
    color: style.color,
    textTransform: 'uppercase'
  };
};

const getTypeBadge = (type) => {
  return {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    textTransform: 'capitalize'
  };
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
    padding: '24px',
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
    fontSize: '28px',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: '14px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  analyticsButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: '28px',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  filtersSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '150px'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  tr: {
    borderBottom: '1px solid #f7fafc'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#2d3748'
  },
  userEmail: {
    fontWeight: '600',
    color: '#1A3E6F'
  },
  userId: {
    fontSize: '12px',
    color: '#718096'
  },
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px'
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
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '18px',
    color: '#718096',
    fontWeight: '600'
  },
  pagination: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#2d3748'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
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
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  cancelButton: {
    padding: '12px 24px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#475569',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
    display: 'block'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none'
  }
};
