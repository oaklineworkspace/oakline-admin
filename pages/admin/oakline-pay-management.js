import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

const PAYMENT_STATUSES = ['pending', 'completed', 'expired', 'cancelled'];
const REQUEST_STATUSES = ['pending', 'accepted', 'declined', 'cancelled', 'expired'];

export default function OaklinePayManagement() {
  const router = useRouter();
  const [activeView, setActiveView] = useState('tags'); // 'tags' or 'payments'
  
  // Tags state
  const [tags, setTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [tagStatusFilter, setTagStatusFilter] = useState('all');
  
  // Payments state
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentDateFilter, setPaymentDateFilter] = useState('all');
  const [paymentDateRange, setPaymentDateRange] = useState({ start: '', end: '' });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });

  // Modal states
  const [showTagModal, setShowTagModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [tagForm, setTagForm] = useState({
    is_active: true,
    is_public: true,
    allow_requests: true
  });
  const [paymentForm, setPaymentForm] = useState({
    status: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTags();
  }, [tags, tagSearchTerm, tagStatusFilter]);

  useEffect(() => {
    filterPayments();
  }, [payments, paymentSearchTerm, paymentStatusFilter, paymentDateFilter, paymentDateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [tagsResult, paymentsResult] = await Promise.all([
        supabase
          .from('oakline_pay_profiles')
          .select(`
            *,
            user:user_id (id, email)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('oakline_pay_pending_payments')
          .select(`
            *,
            sender:sender_id (id, email),
            claimed:claimed_by (id, email)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (tagsResult.error) throw tagsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      setTags(tagsResult.data || []);
      setPayments(paymentsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch Oakline Pay data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterTags = () => {
    let filtered = [...tags];

    if (tagSearchTerm) {
      const search = tagSearchTerm.toLowerCase();
      filtered = filtered.filter(tag =>
        tag.oakline_tag?.toLowerCase().includes(search) ||
        tag.display_name?.toLowerCase().includes(search) ||
        tag.user?.email?.toLowerCase().includes(search)
      );
    }

    if (tagStatusFilter !== 'all') {
      if (tagStatusFilter === 'active') {
        filtered = filtered.filter(tag => tag.is_active === true);
      } else if (tagStatusFilter === 'inactive') {
        filtered = filtered.filter(tag => tag.is_active === false);
      }
    }

    setFilteredTags(filtered);
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (paymentSearchTerm) {
      const search = paymentSearchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.recipient_email?.toLowerCase().includes(search) ||
        p.sender?.email?.toLowerCase().includes(search) ||
        p.reference_number?.toLowerCase().includes(search)
      );
    }

    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === paymentStatusFilter);
    }

    if (paymentDateFilter === 'custom' && (paymentDateRange.start || paymentDateRange.end)) {
      filtered = filtered.filter(p => {
        const pDate = new Date(p.created_at);
        const start = paymentDateRange.start ? new Date(paymentDateRange.start) : null;
        const end = paymentDateRange.end ? new Date(paymentDateRange.end + 'T23:59:59') : null;
        
        if (start && end) return pDate >= start && pDate <= end;
        if (start) return pDate >= start;
        if (end) return pDate <= end;
        return true;
      });
    } else if (paymentDateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();

      switch (paymentDateFilter) {
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

      filtered = filtered.filter(p => new Date(p.created_at) >= startDate);
    }

    setFilteredPayments(filtered);
  };

  const handleEditTag = (tag) => {
    setSelectedTag(tag);
    setTagForm({
      is_active: tag.is_active,
      is_public: tag.is_public,
      allow_requests: tag.allow_requests
    });
    setShowTagModal(true);
  };

  const handleUpdateTag = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/update-oakline-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tagId: selectedTag.id,
          is_active: tagForm.is_active,
          is_public: tagForm.is_public,
          allow_requests: tagForm.allow_requests
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update tag');
      }

      setSuccess('✅ Oakline tag updated successfully!');
      setShowTagModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating tag:', error);
      setError('❌ Failed to update tag: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setPaymentForm({ status: payment.status });
    setShowPaymentModal(true);
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/update-oakline-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          status: paymentForm.status
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update payment');
      }

      setSuccess('✅ Payment status updated successfully!');
      setShowPaymentModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating payment:', error);
      setError('❌ Failed to update payment: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getPaymentStatusBadge = (status) => {
    const styles = {
      completed: { bg: '#d1fae5', color: '#065f46' },
      pending: { bg: '#fef3c7', color: '#92400e' },
      cancelled: { bg: '#fee2e2', color: '#991b1b' },
      expired: { bg: '#dbeafe', color: '#1e40af' }
    };

    const style = styles[status?.toLowerCase()] || styles.pending;

    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
        fontWeight: '700',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}>
        {status || 'Unknown'}
      </span>
    );
  };

  const getTagStatusBadge = (isActive) => {
    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
        fontWeight: '700',
        backgroundColor: isActive ? '#d1fae5' : '#fee2e2',
        color: isActive ? '#065f46' : '#991b1b',
        textTransform: 'uppercase'
      }}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
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

  const styles = {
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: 'clamp(1rem, 3vw, 2rem)',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    },
    header: {
      marginBottom: '2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    title: {
      fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
      fontWeight: '700',
      margin: '0 0 0.5rem 0',
      color: '#1f2937'
    },
    subtitle: {
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      color: '#6b7280',
      margin: '0'
    },
    headerActions: {
      display: 'flex',
      gap: 'clamp(0.5rem, 2vw, 1rem)',
      flexWrap: 'wrap',
      justifyContent: 'flex-end'
    },
    backButton: {
      padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
      backgroundColor: '#718096',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block'
    },
    refreshButton: {
      padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
      backgroundColor: '#4299e1',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    errorBanner: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '500'
    },
    successBanner: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '500'
    },
    viewTabs: {
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
    filtersSection: {
      display: 'flex',
      gap: 'clamp(0.5rem, 2vw, 1rem)',
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    },
    searchInput: {
      flex: '1 1 200px',
      padding: 'clamp(0.5rem, 2vw, 10px) clamp(0.75rem, 2vw, 12px)',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      outline: 'none',
      transition: 'border-color 0.3s ease'
    },
    filterSelect: {
      padding: 'clamp(0.5rem, 2vw, 10px) clamp(0.75rem, 2vw, 12px)',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      backgroundColor: 'white',
      cursor: 'pointer',
      minWidth: '120px'
    },
    dateRangeSection: {
      backgroundColor: '#f3f4f6',
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1.5rem'
    },
    dateRangeLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.75rem',
      fontWeight: '600',
      fontSize: 'clamp(0.85rem, 2vw, 14px)'
    },
    dateRangeInputs: {
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap'
    },
    dateInputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    },
    dateLabel: {
      fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
      fontWeight: '600',
      color: '#4b5563'
    },
    dateInput: {
      padding: 'clamp(0.5rem, 2vw, 8px) clamp(0.75rem, 2vw, 12px)',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)'
    },
    clearDateButton: {
      padding: 'clamp(0.5rem, 2vw, 8px) clamp(0.75rem, 2vw, 12px)',
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '600',
      alignSelf: 'flex-end'
    },
    tableContainer: {
      marginBottom: '2rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: '#f9fafb',
      borderRadius: '8px'
    },
    emptyIcon: {
      fontSize: '2rem',
      margin: '0'
    },
    emptyText: {
      color: '#6b7280',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      margin: '0.5rem 0 0 0'
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem'
    },
    card: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    cardHeader: {
      marginBottom: '1rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    cardTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#1f2937',
      margin: '0'
    },
    cardBody: {
      marginBottom: '1rem'
    },
    cardInfo: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.5rem',
      fontSize: 'clamp(0.75rem, 1.8vw, 12px)'
    },
    cardLabel: {
      color: '#6b7280',
      fontWeight: '600'
    },
    cardValue: {
      color: '#1f2937',
      fontWeight: '500'
    },
    cardFooter: {
      display: 'flex',
      gap: '0.5rem'
    },
    editButton: {
      flex: '1',
      padding: '8px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    deleteButton: {
      flex: '1',
      padding: '8px',
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    modalOverlay: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '1000'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      padding: '1.5rem',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '700',
      margin: '0'
    },
    closeBtn: {
      fontSize: '24px',
      fontWeight: 'bold',
      cursor: 'pointer',
      border: 'none',
      background: 'none',
      color: '#6b7280'
    },
    modalBody: {
      padding: '1.5rem'
    },
    formGroup: {
      marginBottom: '1rem'
    },
    formLabel: {
      display: 'block',
      marginBottom: '0.5rem',
      fontSize: '12px',
      fontWeight: '700',
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
    checkboxContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.75rem'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    checkboxLabel: {
      fontSize: '13px',
      cursor: 'pointer',
      fontWeight: '500'
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

  const stats = {
    totalTags: tags.length,
    activeTags: tags.filter(t => t.is_active).length,
    totalPayments: payments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    completedPayments: payments.filter(p => p.status === 'completed').length,
    totalPaymentVolume: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  };

  return (
    <AdminAuth>
      <AdminLoadingBanner
        isVisible={loadingBanner.visible}
        current={loadingBanner.current}
        total={loadingBanner.total}
        action={loadingBanner.action}
        message={loadingBanner.message}
      />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💳 Oakline Pay Management</h1>
            <p style={styles.subtitle}>Manage Oakline Tags and Payment History</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchData} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* View Tabs */}
        <div style={styles.viewTabs}>
          <button
            onClick={() => setActiveView('tags')}
            style={activeView === 'tags' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          >
            🏷️ Oakline Tags ({stats.totalTags})
          </button>
          <button
            onClick={() => setActiveView('payments')}
            style={activeView === 'payments' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          >
            💰 Payment History ({stats.totalPayments})
          </button>
        </div>

        {/* Tags View */}
        {activeView === 'tags' && (
          <div style={styles.tableContainer}>
            <div style={styles.filtersSection}>
              <input
                type="text"
                placeholder="🔍 Search by tag, name or email..."
                value={tagSearchTerm}
                onChange={(e) => setTagSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={tagStatusFilter} onChange={(e) => setTagStatusFilter(e.target.value)} style={styles.filterSelect}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {loading ? (
              <div style={styles.emptyState}>
                <p>Loading Oakline tags...</p>
              </div>
            ) : filteredTags.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>🏷️</p>
                <p style={styles.emptyText}>No Oakline tags found</p>
              </div>
            ) : (
              <div style={styles.cardGrid}>
                {filteredTags.map((tag) => (
                  <div key={tag.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>@{tag.oakline_tag}</h3>
                      {getTagStatusBadge(tag.is_active)}
                    </div>
                    <div style={styles.cardBody}>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Name:</span>
                        <span style={styles.cardValue}>{tag.display_name || 'N/A'}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Email:</span>
                        <span style={styles.cardValue}>{tag.user?.email || 'N/A'}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Public:</span>
                        <span style={styles.cardValue}>{tag.is_public ? '✓ Yes' : '✗ No'}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Allow Requests:</span>
                        <span style={styles.cardValue}>{tag.allow_requests ? '✓ Yes' : '✗ No'}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Created:</span>
                        <span style={styles.cardValue}>{formatDateTime(tag.created_at)}</span>
                      </div>
                    </div>
                    <div style={styles.cardFooter}>
                      <button onClick={() => handleEditTag(tag)} style={styles.editButton}>
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments View */}
        {activeView === 'payments' && (
          <div style={styles.tableContainer}>
            <div style={styles.filtersSection}>
              <input
                type="text"
                placeholder="🔍 Search by email, recipient or reference..."
                value={paymentSearchTerm}
                onChange={(e) => setPaymentSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} style={styles.filterSelect}>
                <option value="all">All Status</option>
                {PAYMENT_STATUSES.map(status => (
                  <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
              <select value={paymentDateFilter} onChange={(e) => setPaymentDateFilter(e.target.value)} style={styles.filterSelect}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {paymentDateFilter === 'custom' && (
              <div style={styles.dateRangeSection}>
                <div style={styles.dateRangeLabel}>
                  <span>📅</span>
                  <span>Filter by Date Range:</span>
                </div>
                <div style={styles.dateRangeInputs}>
                  <div style={styles.dateInputGroup}>
                    <label style={styles.dateLabel}>From:</label>
                    <input
                      type="date"
                      value={paymentDateRange.start}
                      onChange={(e) => setPaymentDateRange({ ...paymentDateRange, start: e.target.value })}
                      style={styles.dateInput}
                    />
                  </div>
                  <div style={styles.dateInputGroup}>
                    <label style={styles.dateLabel}>To:</label>
                    <input
                      type="date"
                      value={paymentDateRange.end}
                      onChange={(e) => setPaymentDateRange({ ...paymentDateRange, end: e.target.value })}
                      style={styles.dateInput}
                    />
                  </div>
                  {(paymentDateRange.start || paymentDateRange.end) && (
                    <button
                      onClick={() => setPaymentDateRange({ start: '', end: '' })}
                      style={styles.clearDateButton}
                    >
                      ✕ Clear Dates
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div style={styles.emptyState}>
                <p>Loading payments...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>💰</p>
                <p style={styles.emptyText}>No payments found</p>
              </div>
            ) : (
              <div style={styles.cardGrid}>
                {filteredPayments.map((payment) => (
                  <div key={payment.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{formatCurrency(payment.amount)}</h3>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                    <div style={styles.cardBody}>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Sender:</span>
                        <span style={styles.cardValue}>{payment.sender?.email || 'N/A'}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Recipient:</span>
                        <span style={styles.cardValue}>{payment.recipient_email}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Reference:</span>
                        <span style={styles.cardValue}>{payment.reference_number.slice(0, 8)}...</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Memo:</span>
                        <span style={styles.cardValue}>{payment.memo || 'No memo'}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Created:</span>
                        <span style={styles.cardValue}>{formatDateTime(payment.created_at)}</span>
                      </div>
                      <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Expires:</span>
                        <span style={styles.cardValue}>{formatDateTime(payment.expires_at)}</span>
                      </div>
                    </div>
                    <div style={styles.cardFooter}>
                      <button onClick={() => handleEditPayment(payment)} style={styles.editButton}>
                        ✏️ Edit Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tag Modal */}
        {showTagModal && selectedTag && (
          <div style={styles.modalOverlay} onClick={() => setShowTagModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Edit Oakline Tag: @{selectedTag.oakline_tag}</h2>
                <button onClick={() => setShowTagModal(false)} style={styles.closeBtn}>×</button>
              </div>
              <form onSubmit={handleUpdateTag}>
                <div style={styles.modalBody}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>User Email</label>
                    <input
                      type="text"
                      value={selectedTag.user?.email || ''}
                      disabled
                      style={{ ...styles.formInput, backgroundColor: '#f3f4f6' }}
                    />
                  </div>

                  <div style={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={tagForm.is_active}
                      onChange={(e) => setTagForm({ ...tagForm, is_active: e.target.checked })}
                      style={styles.checkbox}
                    />
                    <label htmlFor="is_active" style={styles.checkboxLabel}>Active</label>
                  </div>

                  <div style={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={tagForm.is_public}
                      onChange={(e) => setTagForm({ ...tagForm, is_public: e.target.checked })}
                      style={styles.checkbox}
                    />
                    <label htmlFor="is_public" style={styles.checkboxLabel}>Public Profile</label>
                  </div>

                  <div style={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      id="allow_requests"
                      checked={tagForm.allow_requests}
                      onChange={(e) => setTagForm({ ...tagForm, allow_requests: e.target.checked })}
                      style={styles.checkbox}
                    />
                    <label htmlFor="allow_requests" style={styles.checkboxLabel}>Allow Payment Requests</label>
                  </div>

                  <button type="submit" style={styles.submitButton} disabled={actionLoading}>
                    {actionLoading ? '⏳ Updating...' : '✅ Update Tag'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedPayment && (
          <div style={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Update Payment Status</h2>
                <button onClick={() => setShowPaymentModal(false)} style={styles.closeBtn}>×</button>
              </div>
              <form onSubmit={handleUpdatePayment}>
                <div style={styles.modalBody}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Amount</label>
                    <input
                      type="text"
                      value={formatCurrency(selectedPayment.amount)}
                      disabled
                      style={{ ...styles.formInput, backgroundColor: '#f3f4f6' }}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Status *</label>
                    <select
                      value={paymentForm.status}
                      onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
                      style={styles.formInput}
                      required
                    >
                      {PAYMENT_STATUSES.map(status => (
                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" style={styles.submitButton} disabled={actionLoading}>
                    {actionLoading ? '⏳ Updating...' : '✅ Update Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}
