import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function WireTransferManagement() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalAction, setModalAction] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [restrictionReasons, setRestrictionReasons] = useState([]);
  const [reasonsLoading, setReasonsLoading] = useState(false);

  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [selfieUser, setSelfieUser] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchRestrictionReasons();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/get-wire-transfer-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setUsers(result.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestrictionReasons = async () => {
    try {
      setReasonsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/get-all-restriction-reasons', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (response.ok && result.reasons) {
        const reasons = result.reasons;
        if (Array.isArray(reasons)) {
          setRestrictionReasons(reasons);
        } else {
          const flattenedReasons = [];
          Object.keys(reasons).forEach(actionType => {
            if (typeof reasons[actionType] === 'object') {
              Object.keys(reasons[actionType]).forEach(category => {
                const categoryReasons = reasons[actionType][category];
                if (Array.isArray(categoryReasons)) {
                  categoryReasons.forEach(reason => {
                    flattenedReasons.push({
                      id: reason.id,
                      category: category,
                      action_type: actionType,
                      reason_text: reason.text || reason.reason_text,
                      severity_level: reason.severity || reason.severity_level
                    });
                  });
                }
              });
            }
          });
          setRestrictionReasons(flattenedReasons);
        }
      }
    } catch (err) {
      console.error('Error fetching restriction reasons:', err);
    } finally {
      setReasonsLoading(false);
    }
  };

  const openSelfieModal = (user) => {
    setSelfieUser(user);
    setShowSelfieModal(true);
  };

  const openSuspendModal = (user) => {
    setSelectedUser(user);
    setModalAction('suspend');
    setSuspensionReason('');
    setSelectedReasonId('');
    setShowModal(true);
  };

  const handleReasonSelect = (e) => {
    const reasonId = e.target.value;
    setSelectedReasonId(reasonId);
    if (reasonId) {
      const reason = restrictionReasons.find(r => r.id === reasonId);
      if (reason) {
        setSuspensionReason(reason.reason_text);
      }
    } else {
      setSuspensionReason('');
    }
  };

  const openUnsuspendModal = (user) => {
    setSelectedUser(user);
    setModalAction('unsuspend');
    setSuspensionReason('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;

    if (modalAction === 'suspend' && !suspensionReason.trim()) {
      setError('Please provide a reason for suspension');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        setActionLoading(false);
        return;
      }

      const response = await fetch('/api/admin/update-user-wire-transfer-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: modalAction,
          reason: modalAction === 'suspend' ? suspensionReason : null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update wire transfer status');
      }

      setSuccess(modalAction === 'suspend' 
        ? `Wire transfers suspended for ${selectedUser.email}` 
        : `Wire transfers enabled for ${selectedUser.email}`
      );
      setShowModal(false);
      setSelectedUser(null);
      setSuspensionReason('');
      fetchUsers();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'suspended' && user.wire_transfer_suspended) ||
      (statusFilter === 'active' && !user.wire_transfer_suspended);

    const matchesUser = userFilter === 'all' || user.id === userFilter;

    return matchesSearch && matchesStatus && matchesUser;
  });

  const suspendedCount = users.filter(u => u.wire_transfer_suspended).length;
  const activeCount = users.filter(u => !u.wire_transfer_suspended).length;

  const getStatusBadge = (suspended) => {
    const style = suspended 
      ? { bg: '#fee2e2', color: '#991b1b' }
      : { bg: '#d1fae5', color: '#065f46' };

    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
        fontWeight: '700',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      }}>
        {suspended ? 'Suspended' : 'Active'}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Wire Transfer Management</h1>
            <p style={styles.subtitle}>Manage user wire transfer permissions</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchUsers} style={styles.refreshButton} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Users</h3>
            <p style={styles.statValue}>{users.length}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Wire Active</h3>
            <p style={styles.statValue}>{activeCount}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Wire Suspended</h3>
            <p style={styles.statValue}>{suspendedCount}</p>
          </div>
        </div>

        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.email}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>👥</p>
              <p style={styles.emptyText}>No users found</p>
            </div>
          ) : (
            <div style={styles.usersGrid}>
              {filteredUsers.map((user) => (
                <div key={user.id} style={styles.userCard}>
                  <div style={styles.userHeader}>
                    <div style={styles.userInfoContainer}>
                      <h3 style={styles.userName}>
                        {user.first_name} {user.last_name}
                      </h3>
                      <p style={styles.userEmail}>{user.email}</p>
                    </div>
                    {getStatusBadge(user.wire_transfer_suspended)}
                  </div>

                  <div style={styles.userBody}>
                    <div style={styles.userInfo}>
                      <span style={styles.infoLabel}>Wire Status:</span>
                      <span style={{
                        ...styles.infoValue, 
                        color: user.wire_transfer_suspended ? '#dc2626' : '#059669',
                        fontWeight: '700'
                      }}>
                        {user.wire_transfer_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                    {user.wire_transfer_suspension_reason && (
                      <div style={styles.userInfo}>
                        <span style={styles.infoLabel}>Reason:</span>
                        <span style={styles.infoValue}>{user.wire_transfer_suspension_reason}</span>
                      </div>
                    )}
                    <div style={styles.userInfo}>
                      <span style={styles.infoLabel}>Suspended At:</span>
                      <span style={styles.infoValue}>
                        {formatDateTime(user.wire_transfer_suspended_at)}
                      </span>
                    </div>
                  </div>

                  <div style={styles.userFooter}>
                    {user.selfie?.image_path && (
                      <button
                        onClick={() => openSelfieModal(user)}
                        style={styles.viewSelfieButton}
                      >
                        View Selfie
                      </button>
                    )}
                    {user.wire_transfer_suspended ? (
                      <button
                        onClick={() => openUnsuspendModal(user)}
                        style={styles.liftSuspensionButton}
                      >
                        Lift Suspension
                      </button>
                    ) : (
                      <button
                        onClick={() => openSuspendModal(user)}
                        style={styles.suspendButton}
                      >
                        Suspend Wire Transfer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showModal && selectedUser && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {modalAction === 'suspend' 
                    ? 'Suspend Wire Transfers' 
                    : 'Lift Wire Transfer Suspension'
                  }
                </h2>
                <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.infoBox}>
                  <strong>User:</strong> {selectedUser.first_name} {selectedUser.last_name}<br />
                  <strong>Email:</strong> {selectedUser.email}
                </div>

                {modalAction === 'suspend' && (
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Select Reason *</label>
                    <select
                      value={selectedReasonId}
                      onChange={handleReasonSelect}
                      style={styles.reasonSelect}
                      disabled={reasonsLoading}
                    >
                      <option value="">
                        {reasonsLoading ? 'Loading reasons...' : '-- Select a reason --'}
                      </option>
                      {restrictionReasons.map(reason => (
                        <option key={reason.id} value={reason.id}>
                          {reason.category}: {reason.reason_text.substring(0, 60)}
                          {reason.reason_text.length > 60 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                    
                    {selectedReasonId && (
                      <div style={styles.selectedReasonPreview}>
                        <strong>Selected Reason:</strong>
                        <p style={{ margin: '8px 0 0', fontSize: 'clamp(0.8rem, 2vw, 13px)' }}>
                          {suspensionReason}
                        </p>
                      </div>
                    )}

                    <label style={{...styles.formLabel, marginTop: '16px'}}>Or enter custom reason:</label>
                    <textarea
                      value={suspensionReason}
                      onChange={(e) => {
                        setSuspensionReason(e.target.value);
                        setSelectedReasonId('');
                      }}
                      placeholder="Enter custom reason for suspending wire transfers..."
                      style={styles.formTextarea}
                      rows={3}
                    />
                  </div>
                )}

                {modalAction === 'unsuspend' && (
                  <p style={{ marginTop: '16px', color: '#475569', fontSize: 'clamp(0.85rem, 2vw, 14px)' }}>
                    This will enable wire transfer access for this user. They will be able to initiate wire transfers again.
                  </p>
                )}
              </div>
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowModal(false)}
                  style={styles.cancelButton}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={modalAction === 'suspend' ? styles.confirmSuspendButton : styles.confirmLiftButton}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : (modalAction === 'suspend' ? 'Suspend' : 'Lift Suspension')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSelfieModal && selfieUser && (
          <div style={styles.modalOverlay} onClick={() => setShowSelfieModal(false)}>
            <div style={styles.selfieModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>User Selfie</h2>
                <button onClick={() => setShowSelfieModal(false)} style={styles.closeBtn}>×</button>
              </div>
              <div style={styles.selfieModalBody}>
                <div style={styles.infoBox}>
                  <strong>User:</strong> {selfieUser.first_name} {selfieUser.last_name}<br />
                  <strong>Email:</strong> {selfieUser.email}
                </div>
                {selfieUser.selfie?.image_path ? (
                  <div style={styles.selfieImageContainer}>
                    <img
                      src={selfieUser.selfie.image_path}
                      alt={`Selfie for ${selfieUser.first_name} ${selfieUser.last_name}`}
                      style={styles.selfieImage}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none', textAlign: 'center', padding: '40px', color: '#718096' }}>
                      <p style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</p>
                      <p>Unable to load selfie image</p>
                    </div>
                    <div style={styles.selfieInfo}>
                      <p><strong>Type:</strong> {selfieUser.selfie.verification_type || 'Selfie'}</p>
                      <p><strong>Status:</strong> {selfieUser.selfie.status || 'Submitted'}</p>
                      <p><strong>Submitted:</strong> {selfieUser.selfie.created_at ? new Date(selfieUser.selfie.created_at).toLocaleString() : '-'}</p>
                    </div>
                  </div>
                ) : (
                  <div style={styles.noSelfie}>
                    <p style={{ fontSize: '48px', marginBottom: '12px' }}>📷</p>
                    <p>No selfie available for this user</p>
                  </div>
                )}
              </div>
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowSelfieModal(false)}
                  style={styles.cancelButton}
                >
                  Close
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
    padding: 'clamp(1rem, 3vw, 24px)',
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
    margin: '0 0 4px 0',
    fontSize: 'clamp(1.25rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.8rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(0.75rem, 2vw, 16px)',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(0.75rem, 2vw, 16px)',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'clamp(8px, 2vw, 16px)',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(0.7rem, 1.8vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: 'clamp(1.25rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  filtersSection: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    minWidth: '150px',
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    outline: 'none'
  },
  filterSelect: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '100px'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(12px, 3vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px 20px',
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
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  emptyIcon: {
    fontSize: 'clamp(2rem, 5vw, 48px)',
    marginBottom: '12px'
  },
  emptyText: {
    fontSize: 'clamp(0.9rem, 2.5vw, 16px)',
    color: '#718096',
    fontWeight: '600'
  },
  usersGrid: {
    display: 'grid',
    gap: 'clamp(12px, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))'
  },
  userCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(8px, 2vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease'
  },
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '8px'
  },
  userInfoContainer: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    margin: '0 0 2px 0',
    fontSize: 'clamp(0.95rem, 2.5vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600',
    wordBreak: 'break-word'
  },
  userEmail: {
    margin: 0,
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    color: '#718096',
    wordBreak: 'break-all'
  },
  userBody: {
    marginBottom: '12px'
  },
  userInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    gap: '8px'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600',
    flexShrink: 0
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right',
    wordBreak: 'break-word'
  },
  userFooter: {
    display: 'flex',
    gap: '8px',
    flexDirection: 'column'
  },
  suspendButton: {
    width: '100%',
    padding: 'clamp(10px, 2.5vw, 14px)',
    backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
  },
  liftSuspensionButton: {
    width: '100%',
    padding: 'clamp(10px, 2.5vw, 14px)',
    backgroundImage: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
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
    padding: '16px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(1.1rem, 3vw, 20px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },
  infoBox: {
    padding: '14px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    lineHeight: '1.6',
    color: '#475569'
  },
  formGroup: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  formTextarea: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px'
  },
  modalFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap'
  },
  cancelButton: {
    padding: '10px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#475569',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmSuspendButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    color: 'white',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmLiftButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    backgroundImage: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  viewSelfieButton: {
    width: '100%',
    padding: 'clamp(10px, 2.5vw, 14px)',
    backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
  },
  reasonSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  selectedReasonPreview: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    color: '#92400e',
    border: '1px solid #fcd34d'
  },
  selfieModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
  },
  selfieModalBody: {
    padding: '20px'
  },
  selfieImageContainer: {
    marginTop: '16px',
    textAlign: 'center'
  },
  selfieImage: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    objectFit: 'contain'
  },
  selfieInfo: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    color: '#475569',
    textAlign: 'left'
  },
  noSelfie: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#718096'
  }
};
