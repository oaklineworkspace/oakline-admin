import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ManageAccountModesPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [reasonModal, setReasonModal] = useState({ open: false, userId: null, action: null, userName: '' });
  const [freezeReason, setFreezeReason] = useState('');
  const [unfreezeAmount, setUnfreezeAmount] = useState('');
  const [freezeReasons, setFreezeReasons] = useState([]);
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [reasonsLoading, setReasonsLoading] = useState(false);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const headers = await getAuthHeaders();
      const queryParam = filter !== 'all' ? `?filter=${filter}` : '';
      const response = await fetch(`/api/admin/get-users-account-modes${queryParam}`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFreezeReasons = async () => {
    setReasonsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/get-freeze-reasons', { headers });
      const data = await response.json();
      if (response.ok) {
        setFreezeReasons(data.freezeReasons || []);
      }
    } catch (err) {
      console.error('Error fetching freeze reasons:', err);
    } finally {
      setReasonsLoading(false);
    }
  };

  const handleAction = async (userId, action, userName) => {
    if (action === 'freeze' || action === 'set_unlimited') {
      setFreezeReason('');
      setUnfreezeAmount('');
      setSelectedReasonId('');
      if (action === 'freeze' && freezeReasons.length === 0) {
        fetchFreezeReasons();
      }
      setReasonModal({ open: true, userId, action, userName });
      return;
    }

    executeAction(userId, action, '', null);
  };

  const handleReasonSelect = (reasonId) => {
    setSelectedReasonId(reasonId);
    if (reasonId && reasonId !== 'custom') {
      const selected = freezeReasons.find(r => r.id === reasonId);
      if (selected) {
        setFreezeReason(selected.reason_text);
        setUnfreezeAmount(selected.amount_required?.toString() || '0');
      }
    } else {
      setFreezeReason('');
      setUnfreezeAmount('');
    }
  };

  const executeAction = async (userId, action, reasonText, amountRequired) => {
    setActionLoading({ ...actionLoading, [`${action}_${userId}`]: true });
    setError('');
    setSuccess('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/manage-account-mode', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          action,
          reason: reasonText,
          amountRequired: amountRequired
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      const actionLabels = {
        freeze: 'frozen',
        unfreeze: 'unfrozen',
        set_unlimited: 'set to unlimited',
        remove_unlimited: 'removed from unlimited'
      };

      setSuccess(`Account successfully ${actionLabels[action]}`);
      await fetchUsers();
    } catch (err) {
      console.error('Error performing action:', err);
      setError(err.message);
    } finally {
      setActionLoading({ ...actionLoading, [`${action}_${userId}`]: false });
      setReasonModal({ open: false, userId: null, action: null, userName: '' });
      setFreezeReason('');
      setUnfreezeAmount('');
      setSelectedReasonId('');
    }
  };

  const handleReasonSubmit = () => {
    if (reasonModal.userId && reasonModal.action) {
      const amountRequired = reasonModal.action === 'freeze' ? parseFloat(unfreezeAmount) || 0 : null;
      executeAction(reasonModal.userId, reasonModal.action, freezeReason, amountRequired);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Account Mode Management</h1>
            <p style={styles.subtitle}>Manage frozen and unlimited account statuses</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchUsers} style={styles.refreshButton}>
              Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {success && <div style={styles.successMessage}>{success}</div>}

        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>Filter by Status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Users</option>
            <option value="frozen">Frozen Only</option>
            <option value="unlimited">Unlimited Only</option>
          </select>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{users.length}</div>
            <div style={styles.statLabel}>Total Users</div>
          </div>
          <div style={{ ...styles.statCard, ...styles.frozenStat }}>
            <div style={styles.statNumber}>{users.filter(u => u.is_frozen).length}</div>
            <div style={styles.statLabel}>Frozen</div>
          </div>
          <div style={{ ...styles.statCard, ...styles.unlimitedStat }}>
            <div style={styles.statNumber}>{users.filter(u => u.is_unlimited).length}</div>
            <div style={styles.statLabel}>Unlimited</div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={styles.noData}>
            <p>No users found matching the filter criteria.</p>
          </div>
        ) : (
          <div style={styles.cardGrid}>
            {users.map((user) => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    background: user.status === 'active' ? '#10b981' : '#f59e0b'
                  }}>
                    {user.status || 'active'}
                  </span>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.modeRow}>
                    <div style={styles.modeColumn}>
                      <div style={styles.modeLabel}>Frozen Status</div>
                      {user.is_frozen ? (
                        <div style={styles.modeInfo}>
                          <span style={styles.frozenBadge}>FROZEN</span>
                          {user.frozen_reason && (
                            <div style={styles.modeReason}>{user.frozen_reason}</div>
                          )}
                          {user.freeze_amount_required > 0 && (
                            <div style={styles.unfreezeAmount}>
                              Unfreeze: ${parseFloat(user.freeze_amount_required).toLocaleString()}
                            </div>
                          )}
                          <div style={styles.modeDate}>{formatDate(user.frozen_at)}</div>
                        </div>
                      ) : (
                        <span style={styles.normalBadge}>Normal</span>
                      )}
                    </div>
                    <div style={styles.modeColumn}>
                      <div style={styles.modeLabel}>Unlimited Status</div>
                      {user.is_unlimited ? (
                        <div style={styles.modeInfo}>
                          <span style={styles.unlimitedBadge}>UNLIMITED</span>
                          {user.unlimited_reason && (
                            <div style={styles.modeReason}>{user.unlimited_reason}</div>
                          )}
                          <div style={styles.modeDate}>{formatDate(user.unlimited_at)}</div>
                        </div>
                      ) : (
                        <span style={styles.normalBadge}>Standard</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.cardActions}>
                  {user.is_frozen ? (
                    <button
                      onClick={() => handleAction(user.id, 'unfreeze', `${user.first_name} ${user.last_name}`)}
                      disabled={actionLoading[`unfreeze_${user.id}`]}
                      style={styles.unfreezeButton}
                    >
                      {actionLoading[`unfreeze_${user.id}`] ? '...' : 'Unfreeze'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(user.id, 'freeze', `${user.first_name} ${user.last_name}`)}
                      disabled={actionLoading[`freeze_${user.id}`]}
                      style={styles.freezeButton}
                    >
                      {actionLoading[`freeze_${user.id}`] ? '...' : 'Freeze'}
                    </button>
                  )}

                  {user.is_unlimited ? (
                    <button
                      onClick={() => handleAction(user.id, 'remove_unlimited', `${user.first_name} ${user.last_name}`)}
                      disabled={actionLoading[`remove_unlimited_${user.id}`]}
                      style={styles.removeUnlimitedButton}
                    >
                      {actionLoading[`remove_unlimited_${user.id}`] ? '...' : 'Remove Unlimited'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(user.id, 'set_unlimited', `${user.first_name} ${user.last_name}`)}
                      disabled={actionLoading[`set_unlimited_${user.id}`]}
                      style={styles.setUnlimitedButton}
                    >
                      {actionLoading[`set_unlimited_${user.id}`] ? '...' : 'Set Unlimited'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {reasonModal.open && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>
                {reasonModal.action === 'freeze' ? 'Freeze Account' : 'Set Unlimited Mode'}
              </h3>
              <p style={styles.modalSubtitle}>
                User: <strong>{reasonModal.userName}</strong>
              </p>
              
              {reasonModal.action === 'freeze' ? (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Select Freeze Reason:</label>
                    {reasonsLoading ? (
                      <p style={{ color: '#666', fontSize: '14px' }}>Loading reasons...</p>
                    ) : (
                      <select
                        value={selectedReasonId}
                        onChange={(e) => handleReasonSelect(e.target.value)}
                        style={styles.reasonSelect}
                      >
                        <option value="">-- Select a reason --</option>
                        {freezeReasons.map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            [{reason.category}] {reason.reason_text} (${parseFloat(reason.amount_required || 0).toLocaleString()})
                          </option>
                        ))}
                        <option value="custom">-- Custom Reason --</option>
                      </select>
                    )}
                  </div>

                  {selectedReasonId === 'custom' && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Custom Reason:</label>
                      <textarea
                        value={freezeReason}
                        onChange={(e) => setFreezeReason(e.target.value)}
                        placeholder="Enter custom reason for freezing account..."
                        style={styles.textarea}
                        rows={3}
                      />
                    </div>
                  )}

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Amount Required to Unfreeze ($):</label>
                    <input
                      type="number"
                      value={unfreezeAmount}
                      onChange={(e) => setUnfreezeAmount(e.target.value)}
                      placeholder="Enter amount (e.g., 250)"
                      style={styles.amountInput}
                      min="0"
                      step="0.01"
                    />
                    {unfreezeAmount && parseFloat(unfreezeAmount) > 0 && (
                      <div style={styles.amountPreview}>
                        User will need to pay <strong>${parseFloat(unfreezeAmount).toLocaleString()}</strong> to unfreeze
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Unlimited Reason:</label>
                  <textarea
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Enter reason for unlimited access..."
                    style={styles.textarea}
                    rows={3}
                  />
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  onClick={() => {
                    setReasonModal({ open: false, userId: null, action: null, userName: '' });
                    setFreezeReason('');
                    setUnfreezeAmount('');
                    setSelectedReasonId('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReasonSubmit}
                  disabled={reasonModal.action === 'freeze' ? (!selectedReasonId || (selectedReasonId === 'custom' && !freezeReason.trim())) : !freezeReason.trim()}
                  style={{
                    ...(reasonModal.action === 'freeze' ? styles.freezeButton : styles.setUnlimitedButton),
                    opacity: (reasonModal.action === 'freeze' ? (!selectedReasonId || (selectedReasonId === 'custom' && !freezeReason.trim())) : !freezeReason.trim()) ? 0.5 : 1
                  }}
                >
                  Confirm
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
    background: 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)',
    padding: '15px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '5px'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
  },
  backButton: {
    background: '#64748b',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600'
  },
  errorMessage: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  successMessage: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  filterSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '25px'
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500'
  },
  filterSelect: {
    padding: '10px 15px',
    borderRadius: '8px',
    border: '2px solid #374151',
    background: '#1f2937',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: '#374151',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center'
  },
  frozenStat: {
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
  },
  unlimitedStat: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'white'
  },
  statLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    marginTop: '5px'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: 'white'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #374151',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  noData: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#94a3b8',
    background: '#374151',
    borderRadius: '12px'
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px'
  },
  userCard: {
    background: '#374151',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #4b5563'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '15px',
    background: '#1f2937',
    gap: '10px',
    flexWrap: 'wrap'
  },
  cardBody: {
    padding: '15px'
  },
  modeRow: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  modeColumn: {
    flex: '1',
    minWidth: '120px'
  },
  modeLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: '8px',
    fontWeight: '600'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    padding: '15px',
    borderTop: '1px solid #4b5563',
    flexWrap: 'wrap'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  userName: {
    fontWeight: '600',
    color: 'white'
  },
  userEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase'
  },
  modeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  modeReason: {
    fontSize: '11px',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  modeDate: {
    fontSize: '10px',
    color: '#6b7280'
  },
  frozenBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    background: '#dc2626'
  },
  unlimitedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    background: '#10b981'
  },
  normalBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#9ca3af',
    background: '#4b5563'
  },
  freezeButton: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '100px',
    textAlign: 'center'
  },
  unfreezeButton: {
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '100px',
    textAlign: 'center'
  },
  setUnlimitedButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '100px',
    textAlign: 'center'
  },
  removeUnlimitedButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '100px',
    textAlign: 'center'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    padding: '30px',
    borderRadius: '16px',
    maxWidth: '450px',
    width: '90%'
  },
  modalTitle: {
    margin: '0 0 10px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937'
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  cancelButton: {
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  reasonSelect: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box'
  },
  amountDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#fef3c7',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f59e0b'
  },
  amountLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#92400e'
  },
  amountValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#b45309'
  },
  unfreezeAmount: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    padding: '3px 8px',
    borderRadius: '4px',
    marginTop: '4px',
    display: 'inline-block'
  },
  amountInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  amountPreview: {
    marginTop: '10px',
    padding: '12px',
    background: '#fef3c7',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#92400e',
    textAlign: 'center'
  },
  reasonSelect: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    boxSizing: 'border-box',
    background: '#fff',
    cursor: 'pointer'
  }
};
