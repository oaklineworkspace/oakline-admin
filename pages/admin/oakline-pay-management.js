import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

export default function OaklinePayManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tags');
  
  // Tags state
  const [tags, setTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [tagUsers, setTagUsers] = useState([]);
  const [selectedTagUser, setSelectedTagUser] = useState('all');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  
  // Payments state
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [paymentUsers, setPaymentUsers] = useState([]);
  const [selectedPaymentUser, setSelectedPaymentUser] = useState('all');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'tagStatus' or 'paymentStatus'
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionForm, setActionForm] = useState({ action: '', notes: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterTags();
  }, [tags, selectedTagUser, tagSearchTerm]);

  useEffect(() => {
    filterPayments();
  }, [payments, selectedPaymentUser, paymentSearchTerm, paymentStatusFilter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [tagsResult, paymentsResult, usersResult] = await Promise.all([
        supabase.from('oakline_pay_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('oakline_pay_pending_payments').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('user_id, email, first_name, last_name')
      ]);

      if (tagsResult.error) throw tagsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      setTags(tagsResult.data || []);
      setPayments(paymentsResult.data || []);
      
      const uniqueUsers = Array.from(new Map((usersResult.data || []).map(u => [u.user_id, { user_id: u.user_id, email: u.email, name: `${u.first_name} ${u.last_name}` }])).values());
      setTagUsers(uniqueUsers);
      setPaymentUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch Oakline Pay data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterTags = () => {
    let filtered = [...tags];

    if (selectedTagUser !== 'all') {
      filtered = filtered.filter(tag => tag.user_id === selectedTagUser);
    }

    if (tagSearchTerm) {
      const search = tagSearchTerm.toLowerCase();
      filtered = filtered.filter(tag =>
        tag.oakline_tag?.toLowerCase().includes(search) ||
        tag.display_name?.toLowerCase().includes(search)
      );
    }

    setFilteredTags(filtered);
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (selectedPaymentUser !== 'all') {
      filtered = filtered.filter(p => p.sender_id === selectedPaymentUser);
    }

    if (paymentSearchTerm) {
      const search = paymentSearchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.recipient_email?.toLowerCase().includes(search) ||
        p.reference_number?.toLowerCase().includes(search)
      );
    }

    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === paymentStatusFilter);
    }

    setFilteredPayments(filtered);
  };

  const handleTagAction = (tag, action) => {
    setSelectedItem(tag);
    setModalType('tagStatus');
    setActionForm({ action, notes: '' });
    setShowModal(true);
  };

  const handlePaymentAction = (payment, action) => {
    setSelectedItem(payment);
    setModalType('paymentStatus');
    setActionForm({ action, notes: '' });
    setShowModal(true);
  };

  const handleDeleteTag = async (tagId) => {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) return;
    
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/delete-oakline-tag', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tagId })
      });

      if (!response.ok) throw new Error('Failed to delete tag');
      setSuccess('✅ Tag deleted successfully!');
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      setError('❌ ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) return;
    
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/delete-oakline-payment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ paymentId })
      });

      if (!response.ok) throw new Error('Failed to delete payment');
      setSuccess('✅ Payment deleted successfully!');
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      setError('❌ ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const submitAction = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      if (modalType === 'tagStatus') {
        const endpoint = actionForm.action === 'activate' 
          ? '/api/admin/update-oakline-tag'
          : '/api/admin/update-oakline-tag';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            tagId: selectedItem.id,
            is_active: actionForm.action === 'activate' ? true : false,
            is_public: selectedItem.is_public,
            allow_requests: selectedItem.allow_requests
          })
        });

        if (!response.ok) throw new Error('Failed to update tag');
      } else if (modalType === 'paymentStatus') {
        const response = await fetch('/api/admin/update-oakline-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            paymentId: selectedItem.id,
            status: actionForm.action
          })
        });

        if (!response.ok) throw new Error('Failed to update payment');
      }

      setSuccess(`✅ Action completed successfully!`);
      setShowModal(false);
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      setError('❌ ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status, type = 'tag') => {
    const colors = {
      active: { bg: '#d1fae5', color: '#065f46' },
      inactive: { bg: '#fee2e2', color: '#991b1b' },
      completed: { bg: '#d1fae5', color: '#065f46' },
      pending: { bg: '#fef3c7', color: '#92400e' },
      expired: { bg: '#fee2e2', color: '#991b1b' },
      cancelled: { bg: '#fee2e2', color: '#991b1b' }
    };

    const style = colors[status?.toLowerCase()] || colors.pending;
    const label = type === 'tag' && status === 'active' ? 'ACTIVE' : type === 'tag' && status === 'inactive' ? 'INACTIVE' : status?.toUpperCase();

    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}>
        {label}
      </span>
    );
  };

  const stats = {
    totalTags: tags.length,
    activeTags: tags.filter(t => t.is_active).length,
    totalPayments: payments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    completedPayments: payments.filter(p => p.status === 'completed').length,
    totalVolume: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  };

  const styles = {
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: 'clamp(1rem, 3vw, 2rem)',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, #1A3E6F 0%, #3b82f6 100%)',
      color: 'white',
      padding: 'clamp(1.5rem, 4vw, 2.5rem)',
      borderRadius: '8px',
      marginBottom: '2rem',
      boxShadow: '0 4px 15px rgba(26, 62, 111, 0.2)'
    },
    title: {
      fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
      fontWeight: '700',
      margin: '0 0 0.5rem 0'
    },
    subtitle: {
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      opacity: '0.9'
    },
    tabs: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '2rem',
      borderBottom: '2px solid #e5e7eb'
    },
    tab: {
      padding: '12px 20px',
      backgroundColor: 'transparent',
      color: '#6b7280',
      border: 'none',
      borderBottom: '3px solid transparent',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    activeTab: {
      color: '#3b82f6',
      borderBottomColor: '#3b82f6'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    },
    statCard: {
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    statLabel: {
      fontSize: '12px',
      color: '#6b7280',
      margin: '0',
      fontWeight: '600'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1f2937',
      margin: '0.5rem 0 0 0'
    },
    filterSection: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    },
    searchInput: {
      flex: '1 1 200px',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none'
    },
    select: {
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 'clamp(0.75rem, 1.8vw, 14px)'
    },
    th: {
      backgroundColor: '#f3f4f6',
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#374151',
      borderBottom: '2px solid #e5e7eb'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb'
    },
    actionButtons: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap'
    },
    actionButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    dangerButton: {
      backgroundColor: '#dc2626',
      color: 'white'
    },
    successButton: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    errorBanner: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '1rem'
    },
    successBanner: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '1rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '2rem',
      color: '#6b7280'
    },
    modal: {
      position: 'fixed',
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
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '2rem',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
    },
    formGroup: {
      marginBottom: '1rem'
    },
    formLabel: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '600',
      fontSize: '14px',
      color: '#374151'
    },
    formInput: {
      width: '100%',
      padding: '10px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    submitButton: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '1rem'
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💳 Oakline Pay Management</h1>
          <p style={styles.subtitle}>Manage Oakline Tags and Payment History</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #3b82f6' }}>
            <h3 style={styles.statLabel}>Total Tags</h3>
            <p style={styles.statValue}>{stats.totalTags}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
            <h3 style={styles.statLabel}>Active Tags</h3>
            <p style={styles.statValue}>{stats.activeTags}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
            <h3 style={styles.statLabel}>Total Payments</h3>
            <p style={styles.statValue}>{stats.totalPayments}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #fbbf24' }}>
            <h3 style={styles.statLabel}>Pending</h3>
            <p style={styles.statValue}>{stats.pendingPayments}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
            <h3 style={styles.statLabel}>Completed</h3>
            <p style={styles.statValue}>{stats.completedPayments}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #7c3aed' }}>
            <h3 style={styles.statLabel}>Total Volume</h3>
            <p style={styles.statValue}>${(stats.totalVolume / 1000).toFixed(0)}K</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('tags')}
            style={activeTab === 'tags' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          >
            🏷️ Oakline Tags
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            style={activeTab === 'payments' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          >
            💰 Payment History
          </button>
        </div>

        {/* Tags View */}
        {activeTab === 'tags' && (
          <>
            <div style={styles.filterSection}>
              <input
                type="text"
                placeholder="🔍 Search tags..."
                value={tagSearchTerm}
                onChange={(e) => setTagSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={selectedTagUser} onChange={(e) => setSelectedTagUser(e.target.value)} style={styles.select}>
                <option value="all">All Users</option>
                {tagUsers.map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.name}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : filteredTags.length === 0 ? (
              <div style={styles.emptyState}>No tags found</div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Oakline Tag</th>
                      <th style={styles.th}>Display Name</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Public</th>
                      <th style={styles.th}>Allows Requests</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTags.map(tag => (
                      <tr key={tag.id}>
                        <td style={styles.td}>@{tag.oakline_tag}</td>
                        <td style={styles.td}>{tag.display_name || '—'}</td>
                        <td style={styles.td}>{getStatusBadge(tag.is_active ? 'active' : 'inactive', 'tag')}</td>
                        <td style={styles.td}>{tag.is_public ? '✓' : '✗'}</td>
                        <td style={styles.td}>{tag.allow_requests ? '✓' : '✗'}</td>
                        <td style={styles.td}>{formatDateTime(tag.created_at)}</td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button 
                              onClick={() => handleTagAction(tag, tag.is_active ? 'deactivate' : 'activate')}
                              style={{ ...styles.actionButton, ...styles.primaryButton }}
                            >
                              {tag.is_active ? '🔒 Deactivate' : '🔓 Activate'}
                            </button>
                            <button 
                              onClick={() => handleDeleteTag(tag.id)}
                              style={{ ...styles.actionButton, ...styles.dangerButton }}
                              disabled={actionLoading}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Payments View */}
        {activeTab === 'payments' && (
          <>
            <div style={styles.filterSection}>
              <input
                type="text"
                placeholder="🔍 Search payments..."
                value={paymentSearchTerm}
                onChange={(e) => setPaymentSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={selectedPaymentUser} onChange={(e) => setSelectedPaymentUser(e.target.value)} style={styles.select}>
                <option value="all">All Users</option>
                {paymentUsers.map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.name}</option>
                ))}
              </select>
              <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} style={styles.select}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {loading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : filteredPayments.length === 0 ? (
              <div style={styles.emptyState}>No payments found</div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Recipient</th>
                      <th style={styles.th}>Reference</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Expires</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(payment => (
                      <tr key={payment.id}>
                        <td style={styles.td}><strong>{formatCurrency(payment.amount)}</strong></td>
                        <td style={styles.td}>{payment.recipient_email}</td>
                        <td style={styles.td}>{payment.reference_number.slice(0, 8)}...</td>
                        <td style={styles.td}>{getStatusBadge(payment.status)}</td>
                        <td style={styles.td}>{formatDateTime(payment.created_at)}</td>
                        <td style={styles.td}>{formatDateTime(payment.expires_at)}</td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            {payment.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handlePaymentAction(payment, 'completed')}
                                  style={{ ...styles.actionButton, ...styles.successButton }}
                                >
                                  ✓ Complete
                                </button>
                                <button 
                                  onClick={() => handlePaymentAction(payment, 'cancelled')}
                                  style={{ ...styles.actionButton, ...styles.dangerButton }}
                                >
                                  ✗ Cancel
                                </button>
                              </>
                            )}
                            {payment.status !== 'completed' && payment.status !== 'cancelled' && (
                              <button 
                                onClick={() => handlePaymentAction(payment, 'expired')}
                                style={{ ...styles.actionButton, ...styles.dangerButton }}
                              >
                                ⏱️ Expire
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeletePayment(payment.id)}
                              style={{ ...styles.actionButton, ...styles.dangerButton }}
                              disabled={actionLoading}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Action Modal */}
        {showModal && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '18px', fontWeight: '700' }}>
                {modalType === 'tagStatus' ? 'Update Tag Status' : 'Update Payment Status'}
              </h2>
              <form onSubmit={submitAction}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Action: {actionForm.action?.toUpperCase()}</label>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Notes (Optional)</label>
                  <textarea
                    value={actionForm.notes}
                    onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                    style={{ ...styles.formInput, minHeight: '80px' }}
                    placeholder="Add any notes..."
                  />
                </div>
                <button type="submit" style={styles.submitButton} disabled={actionLoading}>
                  {actionLoading ? '⏳ Processing...' : '✅ Confirm Action'}
                </button>
              </form>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}
