import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

const VALID_STATUSES = ['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled', 'rejected'];
const VALID_METHODS = ['bank_transfer', 'wire_transfer', 'check', 'ach'];

export default function AdminWithdrawals() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [action, setAction] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchWithdrawals();
    const subscription = supabase
      .channel('withdrawals_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'withdrawals' }, 
        () => fetchWithdrawals()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    filterWithdrawals();
  }, [withdrawals, searchTerm, statusFilter, methodFilter, dateFilter, dateRange]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('withdrawals')
        .select(`
          *,
          accounts (account_number, user_id, application_id),
          applications:accounts.application_id (first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setWithdrawals(data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      setError('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const filterWithdrawals = () => {
    let filtered = [...withdrawals];

    if (searchTerm) {
      filtered = filtered.filter(w => 
        w.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.accounts?.account_number?.includes(searchTerm) ||
        w.applications?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.applications?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(w => w.withdrawal_method === methodFilter);
    }

    if (dateFilter === 'custom' && (dateRange.start || dateRange.end)) {
      filtered = filtered.filter(w => {
        const wDate = new Date(w.created_at);
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;
        
        if (start && end) return wDate >= start && wDate <= end;
        if (start) return wDate >= start;
        if (end) return wDate <= end;
        return true;
      });
    } else if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      filtered = filtered.filter(w => new Date(w.created_at) >= startDate);
    }

    setFilteredWithdrawals(filtered);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#FFA500',
      'approved': '#4169E1',
      'processing': '#87CEEB',
      'completed': '#28a745',
      'failed': '#dc3545',
      'cancelled': '#6c757d',
      'rejected': '#dc3545'
    };
    return colors[status] || '#999';
  };

  const getMethodLabel = (method) => {
    const labels = {
      'bank_transfer': '🏦 Bank Transfer',
      'wire_transfer': '📤 Wire Transfer',
      'check': '✓ Check',
      'ach': '🔄 ACH'
    };
    return labels[method] || method;
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/withdrawal-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          action: 'approve',
          adminNotes
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setSuccess('✅ Withdrawal approved successfully');
      setShowActionModal(false);
      fetchWithdrawals();
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason) {
      setError('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/withdrawal-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          action: 'reject',
          rejectionReason,
          adminNotes
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setSuccess('✅ Withdrawal rejected successfully');
      setShowActionModal(false);
      fetchWithdrawals();
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedWithdrawal) return;
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/withdrawal-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          action: 'complete',
          adminNotes
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setSuccess('✅ Withdrawal marked as completed');
      setShowActionModal(false);
      fetchWithdrawals();
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
    header: { marginBottom: '30px' },
    title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' },
    controls: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    },
    input: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
      backgroundColor: '#fff'
    },
    th: {
      backgroundColor: '#f8f9fa',
      padding: '12px',
      textAlign: 'left',
      fontWeight: 'bold',
      borderBottom: '2px solid #dee2e6'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #dee2e6'
    },
    statusBadge: (status) => ({
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '4px',
      backgroundColor: getStatusColor(status),
      color: '#fff',
      fontSize: '12px',
      fontWeight: 'bold'
    }),
    button: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      marginRight: '8px'
    },
    modal: {
      display: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000'
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '30px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto'
    }
  };

  if (!AdminAuth()) return null;

  return (
    <div>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💰 Withdrawal Management</h1>
          <p>Manage and approve user withdrawal requests</p>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '20px', color: '#721c24' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '12px', backgroundColor: '#d4edda', borderRadius: '4px', marginBottom: '20px', color: '#155724' }}>
            {success}
          </div>
        )}

        <div style={styles.controls}>
          <input
            type="text"
            placeholder="Search by reference, account, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.input}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.input}
          >
            <option value="all">All Status</option>
            {VALID_STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={styles.input}
          >
            <option value="all">All Methods</option>
            {VALID_METHODS.map(m => (
              <option key={m} value={m}>{getMethodLabel(m)}</option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={styles.input}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateFilter === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={styles.input}
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={styles.input}
            />
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontWeight: 'bold' }}>Total: {filteredWithdrawals.length} withdrawals</p>
        </div>

        {loading ? (
          <p>Loading withdrawals...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.map(withdrawal => (
                <tr key={withdrawal.id}>
                  <td style={styles.td}>{withdrawal.reference_number}</td>
                  <td style={styles.td}>
                    {withdrawal.applications?.first_name} {withdrawal.applications?.last_name}
                  </td>
                  <td style={styles.td}>{formatCurrency(withdrawal.amount)}</td>
                  <td style={styles.td}>{getMethodLabel(withdrawal.withdrawal_method)}</td>
                  <td style={styles.td}>
                    <div style={styles.statusBadge(withdrawal.status)}>
                      {withdrawal.status.toUpperCase()}
                    </div>
                  </td>
                  <td style={styles.td}>{new Date(withdrawal.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <button
                      onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setShowDetailModal(true);
                      }}
                      style={{
                        ...styles.button,
                        backgroundColor: '#007bff',
                        color: '#fff'
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showDetailModal && selectedWithdrawal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2>Withdrawal Details</h2>
            <div style={{ marginTop: '20px' }}>
              <p><strong>Reference:</strong> {selectedWithdrawal.reference_number}</p>
              <p><strong>User:</strong> {selectedWithdrawal.applications?.first_name} {selectedWithdrawal.applications?.last_name}</p>
              <p><strong>Email:</strong> {selectedWithdrawal.applications?.email}</p>
              <p><strong>Account:</strong> {selectedWithdrawal.accounts?.account_number}</p>
              <p><strong>Amount:</strong> {formatCurrency(selectedWithdrawal.amount)}</p>
              <p><strong>Method:</strong> {getMethodLabel(selectedWithdrawal.withdrawal_method)}</p>
              <p><strong>Status:</strong> <span style={styles.statusBadge(selectedWithdrawal.status)}>{selectedWithdrawal.status.toUpperCase()}</span></p>
              <p><strong>Destination Account:</strong> {selectedWithdrawal.destination_account || 'N/A'}</p>
              <p><strong>Destination Bank:</strong> {selectedWithdrawal.destination_bank || 'N/A'}</p>
              <p><strong>Created:</strong> {new Date(selectedWithdrawal.created_at).toLocaleString()}</p>
              {selectedWithdrawal.admin_notes && (
                <p><strong>Admin Notes:</strong> {selectedWithdrawal.admin_notes}</p>
              )}
              {selectedWithdrawal.rejection_reason && (
                <p><strong>Rejection Reason:</strong> {selectedWithdrawal.rejection_reason}</p>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {selectedWithdrawal.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setAction('approve');
                      setShowDetailModal(false);
                      setShowActionModal(true);
                    }}
                    style={{
                      ...styles.button,
                      backgroundColor: '#28a745',
                      color: '#fff'
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      setAction('reject');
                      setShowDetailModal(false);
                      setShowActionModal(true);
                    }}
                    style={{
                      ...styles.button,
                      backgroundColor: '#dc3545',
                      color: '#fff'
                    }}
                  >
                    ✗ Reject
                  </button>
                </>
              )}
              {selectedWithdrawal.status === 'approved' && (
                <button
                  onClick={() => {
                    setAction('complete');
                    setShowDetailModal(false);
                    setShowActionModal(true);
                  }}
                  style={{
                    ...styles.button,
                    backgroundColor: '#007bff',
                    color: '#fff'
                  }}
                >
                  ✓ Mark Completed
                </button>
              )}
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setAdminNotes('');
                  setRejectionReason('');
                }}
                style={{
                  ...styles.button,
                  backgroundColor: '#6c757d',
                  color: '#fff'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showActionModal && selectedWithdrawal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2>{action === 'approve' ? 'Approve Withdrawal' : action === 'reject' ? 'Reject Withdrawal' : 'Complete Withdrawal'}</h2>
            
            {action === 'reject' && (
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    ...styles.input,
                    width: '100%',
                    minHeight: '100px',
                    fontFamily: 'monospace'
                  }}
                  placeholder="Please explain why you're rejecting this withdrawal..."
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                style={{
                  ...styles.input,
                  width: '100%',
                  minHeight: '100px',
                  fontFamily: 'monospace'
                }}
                placeholder="Internal notes about this withdrawal..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {action === 'approve' && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={{
                    ...styles.button,
                    backgroundColor: '#28a745',
                    color: '#fff',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Approval'}
                </button>
              )}
              {action === 'reject' && (
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason}
                  style={{
                    ...styles.button,
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    opacity: actionLoading || !rejectionReason ? 0.6 : 1
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                </button>
              )}
              {action === 'complete' && (
                <button
                  onClick={handleMarkCompleted}
                  disabled={actionLoading}
                  style={{
                    ...styles.button,
                    backgroundColor: '#007bff',
                    color: '#fff',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Completion'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setShowDetailModal(true);
                  setAdminNotes('');
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                style={{
                  ...styles.button,
                  backgroundColor: '#6c757d',
                  color: '#fff'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}
