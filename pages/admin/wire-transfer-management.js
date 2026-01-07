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

  useEffect(() => {
    fetchUsers();
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

  const openSuspendModal = (user) => {
    setSelectedUser(user);
    setModalAction('suspend');
    setSuspensionReason('');
    setShowModal(true);
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

    return matchesSearch && matchesStatus;
  });

  const suspendedCount = users.filter(u => u.wire_transfer_suspended).length;
  const activeCount = users.filter(u => !u.wire_transfer_suspended).length;

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1e293b',
      margin: 0
    },
    backLink: {
      color: '#3b82f6',
      textDecoration: 'none',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    statsRow: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    statCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      minWidth: '180px',
      flex: 1
    },
    statLabel: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '8px'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#1e293b'
    },
    filtersRow: {
      display: 'flex',
      gap: '16px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    searchInput: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      fontSize: '14px',
      minWidth: '250px'
    },
    select: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '14px 16px',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      fontWeight: '600',
      color: '#475569',
      fontSize: '13px',
      textTransform: 'uppercase'
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #f1f5f9',
      color: '#334155',
      fontSize: '14px'
    },
    statusBadge: (suspended) => ({
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: suspended ? '#fef2f2' : '#f0fdf4',
      color: suspended ? '#dc2626' : '#16a34a'
    }),
    actionButton: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    suspendButton: {
      backgroundColor: '#fef2f2',
      color: '#dc2626'
    },
    enableButton: {
      backgroundColor: '#f0fdf4',
      color: '#16a34a'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '16px'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      marginBottom: '16px'
    },
    modalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    },
    cancelButton: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      backgroundColor: 'white',
      color: '#64748b',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    confirmButton: (action) => ({
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: action === 'suspend' ? '#dc2626' : '#16a34a',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    }),
    alert: (type) => ({
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      backgroundColor: type === 'error' ? '#fef2f2' : '#f0fdf4',
      color: type === 'error' ? '#dc2626' : '#16a34a',
      border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`
    }),
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#64748b'
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <Link href="/admin" style={styles.backLink}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>Wire Transfer Management</h1>
          </div>
          <button
            onClick={fetchUsers}
            style={{ ...styles.actionButton, backgroundColor: '#3b82f6', color: 'white' }}
          >
            🔄 Refresh
          </button>
        </div>

        {error && <div style={styles.alert('error')}>{error}</div>}
        {success && <div style={styles.alert('success')}>{success}</div>}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Users</div>
            <div style={styles.statValue}>{users.length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Wire Transfers Active</div>
            <div style={{ ...styles.statValue, color: '#16a34a' }}>{activeCount}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Wire Transfers Suspended</div>
            <div style={{ ...styles.statValue, color: '#dc2626' }}>{suspendedCount}</div>
          </div>
        </div>

        <div style={styles.filtersRow}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>

        <div style={styles.card}>
          {loading ? (
            <div style={styles.emptyState}>Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>No users found</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Wire Transfer Status</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Suspended At</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td style={styles.td}>
                      <strong>{user.first_name} {user.last_name}</strong>
                    </td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge(user.wire_transfer_suspended)}>
                        {user.wire_transfer_suspended ? '🚫 Suspended' : '✓ Active'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {user.wire_transfer_suspension_reason || '-'}
                    </td>
                    <td style={styles.td}>
                      {user.wire_transfer_suspended_at 
                        ? new Date(user.wire_transfer_suspended_at).toLocaleString()
                        : '-'
                      }
                    </td>
                    <td style={styles.td}>
                      {user.wire_transfer_suspended ? (
                        <button
                          onClick={() => openUnsuspendModal(user)}
                          style={{ ...styles.actionButton, ...styles.enableButton }}
                        >
                          ✓ Enable
                        </button>
                      ) : (
                        <button
                          onClick={() => openSuspendModal(user)}
                          style={{ ...styles.actionButton, ...styles.suspendButton }}
                        >
                          🚫 Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && selectedUser && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>
                {modalAction === 'suspend' 
                  ? '🚫 Suspend Wire Transfers' 
                  : '✓ Enable Wire Transfers'
                }
              </h2>
              <p style={{ marginBottom: '16px', color: '#64748b' }}>
                User: <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> ({selectedUser.email})
              </p>

              {modalAction === 'suspend' && (
                <>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Suspension Reason *
                  </label>
                  <textarea
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="Enter reason for suspending wire transfers..."
                    style={styles.textarea}
                  />
                </>
              )}

              {modalAction === 'unsuspend' && (
                <p style={{ marginBottom: '16px', color: '#475569' }}>
                  This will enable wire transfer access for this user. They will be able to initiate wire transfers again.
                </p>
              )}

              <div style={styles.modalButtons}>
                <button
                  onClick={() => setShowModal(false)}
                  style={styles.cancelButton}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={styles.confirmButton(modalAction)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : (modalAction === 'suspend' ? 'Suspend' : 'Enable')}
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