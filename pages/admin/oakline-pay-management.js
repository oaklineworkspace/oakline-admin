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
  const [selectedPayments, setSelectedPayments] = useState(new Set());

  // Claims state
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [claimUsers, setClaimUsers] = useState([]);
  const [selectedClaimUser, setSelectedClaimUser] = useState('all');
  const [claimSearchTerm, setClaimSearchTerm] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');
  const [selectedClaims, setSelectedClaims] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'tagStatus', 'paymentStatus', or 'refund'
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionForm, setActionForm] = useState({ action: '', notes: '' });
  const [refundForm, setRefundForm] = useState({ reason: '', amount: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterTags();
  }, [tags, selectedTagUser, tagSearchTerm]);

  useEffect(() => {
    filterPayments();
  }, [payments, selectedPaymentUser, paymentSearchTerm, paymentStatusFilter]);

  useEffect(() => {
    filterClaims();
  }, [claims, selectedClaimUser, claimSearchTerm, claimStatusFilter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [tagsResult, transactionsResult, claimsResult, usersResult] = await Promise.all([
        supabase.from('oakline_pay_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('oakline_pay_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('oakline_pay_pending_claims').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('user_id, email, first_name, last_name')
      ]);

      if (tagsResult.error) throw tagsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (claimsResult.error) throw claimsResult.error;

      setTags(tagsResult.data || []);
      setPayments(transactionsResult.data || []);
      setClaims(claimsResult.data || []);
      
      const uniqueUsers = Array.from(new Map((usersResult.data || []).map(u => [u.user_id, { user_id: u.user_id, email: u.email, name: `${u.first_name} ${u.last_name}` }])).values());
      setTagUsers(uniqueUsers);
      setPaymentUsers(uniqueUsers);
      setClaimUsers(uniqueUsers);
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

  const filterClaims = () => {
    let filtered = [...claims];

    if (selectedClaimUser !== 'all') {
      filtered = filtered.filter(c => c.sender_id === selectedClaimUser);
    }

    if (claimSearchTerm) {
      const search = claimSearchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.recipient_email?.toLowerCase().includes(search) ||
        c.claim_token?.toLowerCase().includes(search) ||
        c.sender_name?.toLowerCase().includes(search)
      );
    }

    if (claimStatusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === claimStatusFilter);
    }

    setFilteredClaims(filtered);
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

  const handleRefundPayment = (payment) => {
    setSelectedItem(payment);
    setModalType('refund');
    setRefundForm({ reason: '', amount: payment.amount });
    setShowModal(true);
  };

  const togglePaymentSelection = (paymentId) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  const toggleSelectAllPayments = () => {
    if (selectedPayments.size === filteredPayments.length && selectedPayments.size > 0) {
      setSelectedPayments(new Set());
    } else {
      const allIds = new Set(filteredPayments.map(p => p.id));
      setSelectedPayments(allIds);
    }
  };

  const toggleClaimSelection = (claimId) => {
    const newSelected = new Set(selectedClaims);
    if (newSelected.has(claimId)) {
      newSelected.delete(claimId);
    } else {
      newSelected.add(claimId);
    }
    setSelectedClaims(newSelected);
  };

  const toggleSelectAllClaims = () => {
    if (selectedClaims.size === filteredClaims.length && selectedClaims.size > 0) {
      setSelectedClaims(new Set());
    } else {
      const allIds = new Set(filteredClaims.map(c => c.id));
      setSelectedClaims(allIds);
    }
  };

  const handleClaimAction = (claim, action) => {
    setSelectedItem(claim);
    setModalType(`claim_${action}`);
    setActionForm({ action, notes: '' });
    setShowModal(true);
  };

  const handleBulkClaimAction = async (action) => {
    if (selectedClaims.size === 0) {
      setError(`Please select claims to ${action}`);
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedClaims.size} claim(s)?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        setActionLoading(false);
        return;
      }

      const response = await fetch('/api/admin/handle-oakline-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          claimIds: Array.from(selectedClaims),
          action
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `Failed to ${action} claims`);
        setActionLoading(false);
        return;
      }

      setSuccess(`✅ ${selectedClaims.size} claim(s) ${action}ed successfully!`);
      setSelectedClaims(new Set());
      setTimeout(() => fetchAllData(), 500);
    } catch (error) {
      console.error('Error:', error);
      setError('❌ ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeletePayments = async () => {
    if (selectedPayments.size === 0) {
      setError('Please select payments to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedPayments.size} payment(s)? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        setActionLoading(false);
        return;
      }

      const response = await fetch('/api/admin/bulk-delete-oakline-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ paymentIds: Array.from(selectedPayments) })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to delete payments');
        setActionLoading(false);
        return;
      }

      setSuccess(`✅ ${selectedPayments.size} payment(s) deleted successfully!`);
      setSelectedPayments(new Set());
      setTimeout(() => fetchAllData(), 500);
    } catch (error) {
      console.error('Error:', error);
      setError('❌ ' + error.message);
    } finally {
      setActionLoading(false);
    }
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
        body: JSON.stringify({ paymentId, isTransaction: true })
      });

      if (!response.ok) throw new Error('Failed to delete transaction');
      setSuccess('✅ Transaction deleted successfully!');
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
      } else if (modalType.startsWith('claim_')) {
        const action = modalType.replace('claim_', '');
        const response = await fetch('/api/admin/handle-oakline-claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            claimIds: [selectedItem.id],
            action
          })
        });

        if (!response.ok) throw new Error('Failed to process claim');
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
      } else if (modalType === 'refund') {
        const response = await fetch('/api/admin/refund-oakline-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            paymentId: selectedItem.id,
            refundReason: refundForm.reason || 'Customer refund request',
            refundAmount: parseFloat(refundForm.amount)
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to process refund');
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
      cancelled: { bg: '#fee2e2', color: '#991b1b' },
      refunded: { bg: '#e0e7ff', color: '#3730a3' }
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
    totalVolume: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    totalClaims: claims.length,
    pendingClaims: claims.filter(c => c.status === 'pending').length,
    claimedClaims: claims.filter(c => c.status === 'claimed').length,
    claimVolume: claims.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '20px',
      paddingBottom: '100px',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    },
    header: {
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '16px'
    },
    headerContent: {
      flex: 1,
      minWidth: '250px'
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
    tabs: {
      display: 'flex',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '5px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      gap: '5px',
      flexWrap: 'wrap',
      overflowX: 'auto'
    },
    tab: {
      flex: '1 1 auto',
      minWidth: '120px',
      padding: '12px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
      fontWeight: '500',
      color: '#666',
      transition: 'all 0.3s',
      whiteSpace: 'nowrap'
    },
    activeTab: {
      backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      color: 'white'
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
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      color: '#718096',
      fontWeight: '500'
    },
    statValue: {
      margin: 0,
      fontSize: 'clamp(1.5rem, 4vw, 28px)',
      color: '#1A3E6F',
      fontWeight: '700'
    },
    filterSection: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '20px',
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    searchInput: {
      flex: 1,
      minWidth: '250px',
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      outline: 'none',
      boxSizing: 'border-box'
    },
    select: {
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      cursor: 'pointer',
      outline: 'none',
      minWidth: '150px',
      backgroundColor: 'white',
      boxSizing: 'border-box'
    },
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: 'clamp(1.5rem, 4vw, 24px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 'clamp(0.85rem, 1.8vw, 14px)',
      minWidth: '700px'
    },
    th: {
      backgroundColor: '#f9fafb',
      padding: '16px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#1a202c',
      borderBottom: '2px solid #e5e7eb',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #e5e7eb'
    },
    actionButtons: {
      display: 'flex',
      gap: 'clamp(0.25rem, 1vw, 0.5rem)',
      flexWrap: 'wrap'
    },
    actionButton: {
      padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 12px)',
      borderRadius: '6px',
      border: 'none',
      fontSize: 'clamp(10px, 1.2vw, 12px)',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      whiteSpace: 'nowrap'
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
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '500',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    successBanner: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '500',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#718096',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
      zIndex: '1000',
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '32px',
      maxWidth: '500px',
      width: '100%',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    formGroup: {
      marginBottom: '1rem'
    },
    formLabel: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '600',
      fontSize: 'clamp(12px, 1.5vw, 14px)',
      color: '#374151'
    },
    formInput: {
      width: '100%',
      padding: 'clamp(8px, 1.5vw, 10px)',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: 'clamp(12px, 1.5vw, 14px)',
      boxSizing: 'border-box'
    },
    submitButton: {
      width: '100%',
      padding: 'clamp(8px, 1.5vw, 10px)',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: 'clamp(12px, 1.5vw, 14px)',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '1rem'
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>💳 Oakline Pay Management</h1>
            <p style={styles.subtitle}>Manage Oakline Tags and Payment History</p>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button></div>}
        {success && <div style={styles.successBanner}>{success} <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button></div>}

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
          <div style={{ ...styles.statCard, borderLeft: '4px solid #8b5cf6' }}>
            <h3 style={styles.statLabel}>Total Claims</h3>
            <p style={styles.statValue}>{stats.totalClaims}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #ec4899' }}>
            <h3 style={styles.statLabel}>Pending Claims</h3>
            <p style={styles.statValue}>{stats.pendingClaims}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #f97316' }}>
            <h3 style={styles.statLabel}>Claim Volume</h3>
            <p style={styles.statValue}>${(stats.claimVolume / 1000).toFixed(0)}K</p>
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
          <button
            onClick={() => setActiveTab('claims')}
            style={activeTab === 'claims' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          >
            📋 Pending Claims
          </button>
        </div>

        {/* Tags View */}
        {activeTab === 'tags' && (
          <>
            <div style={styles.filterSection}>
              <input
                type="text"
                placeholder="🔍 Search..."
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

        {/* Claims View */}
        {activeTab === 'claims' && (
          <>
            <div style={styles.filterSection}>
              <input
                type="text"
                placeholder="🔍 Search by email, token, or sender..."
                value={claimSearchTerm}
                onChange={(e) => setClaimSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select value={selectedClaimUser} onChange={(e) => setSelectedClaimUser(e.target.value)} style={styles.select}>
                <option value="all">All Users</option>
                {claimUsers.map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.name}</option>
                ))}
              </select>
              <select value={claimStatusFilter} onChange={(e) => setClaimStatusFilter(e.target.value)} style={styles.select}>
                <option value="all">Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="claimed">Claimed</option>
                <option value="expired">Expired</option>
              </select>
              {selectedClaims.size > 0 && (
                <>
                  <button 
                    onClick={() => handleBulkClaimAction('approve')}
                    style={{ ...styles.select, backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '600', border: 'none' }}
                    disabled={actionLoading}
                  >
                    ✓ Approve {selectedClaims.size} Selected
                  </button>
                  <button 
                    onClick={() => handleBulkClaimAction('reject')}
                    style={{ ...styles.select, backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600', border: 'none' }}
                    disabled={actionLoading}
                  >
                    ✗ Reject {selectedClaims.size} Selected
                  </button>
                </>
              )}
            </div>

            {loading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : filteredClaims.length === 0 ? (
              <div style={styles.emptyState}>No claims found</div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: '30px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedClaims.size === filteredClaims.length && filteredClaims.length > 0}
                          onChange={toggleSelectAllClaims}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Sender</th>
                      <th style={styles.th}>Recipient Email</th>
                      <th style={styles.th}>Claim Token</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Approval</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map(claim => (
                      <tr key={claim.id} style={selectedClaims.has(claim.id) ? { backgroundColor: '#f0fdf4' } : {}}>
                        <td style={{ ...styles.td, textAlign: 'center', width: '30px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedClaims.has(claim.id)}
                            onChange={() => toggleClaimSelection(claim.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={styles.td}><strong>{formatCurrency(claim.amount)}</strong></td>
                        <td style={styles.td}>{claim.sender_name || '—'}</td>
                        <td style={styles.td}>{claim.recipient_email || '—'}</td>
                        <td style={styles.td}>{(claim.claim_token || '').slice(0, 8)}...</td>
                        <td style={styles.td}>{getStatusBadge(claim.status)}</td>
                        <td style={styles.td}>{getStatusBadge(claim.approval_status)}</td>
                        <td style={styles.td}>{formatDateTime(claim.created_at)}</td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            {claim.approval_status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleClaimAction(claim, 'approve')}
                                  style={{ ...styles.actionButton, ...styles.successButton }}
                                >
                                  ✓ Approve
                                </button>
                                <button 
                                  onClick={() => handleClaimAction(claim, 'reject')}
                                  style={{ ...styles.actionButton, ...styles.dangerButton }}
                                >
                                  ✗ Reject
                                </button>
                              </>
                            )}
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
                placeholder="🔍 Search..."
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
                <option value="all">Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {selectedPayments.size > 0 && (
                <button 
                  onClick={handleBulkDeletePayments}
                  style={{ ...styles.select, backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600', border: 'none' }}
                  disabled={actionLoading}
                >
                  🗑️ Delete {selectedPayments.size} Selected
                </button>
              )}
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
                      <th style={{ ...styles.th, width: '30px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0}
                          onChange={toggleSelectAllPayments}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Recipient</th>
                      <th style={styles.th}>Reference</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(payment => (
                      <tr key={payment.id} style={selectedPayments.has(payment.id) ? { backgroundColor: '#f0fdf4' } : {}}>
                        <td style={{ ...styles.td, textAlign: 'center', width: '30px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedPayments.has(payment.id)}
                            onChange={() => togglePaymentSelection(payment.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={styles.td}><strong>{formatCurrency(payment.amount)}</strong></td>
                        <td style={styles.td}>{payment.recipient_email || payment.recipient || '—'}</td>
                        <td style={styles.td}>{(payment.reference_number || payment.transaction_id || '').slice(0, 8)}...</td>
                        <td style={styles.td}>{getStatusBadge(payment.status)}</td>
                        <td style={styles.td}>{payment.type || payment.transaction_type || '—'}</td>
                        <td style={styles.td}>{formatDateTime(payment.created_at)}</td>
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
                            {payment.status === 'completed' && (
                              <button 
                                onClick={() => handleRefundPayment(payment)}
                                style={{ ...styles.actionButton, backgroundColor: '#7c3aed', color: 'white' }}
                              >
                                ↶ Refund
                              </button>
                            )}
                            {payment.status !== 'completed' && payment.status !== 'cancelled' && payment.status !== 'refunded' && (
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
                {modalType === 'tagStatus' ? 'Update Tag Status' : modalType === 'refund' ? 'Process Refund' : modalType.startsWith('claim_') ? `${modalType.replace('claim_', '').toUpperCase()} Card Payment Claim` : 'Update Payment Status'}
              </h2>
              <form onSubmit={submitAction}>
                {modalType === 'refund' ? (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Original Amount: <strong>{formatCurrency(selectedItem?.amount)}</strong></label>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Refund Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={selectedItem?.amount}
                        value={refundForm.amount}
                        onChange={(e) => setRefundForm({ ...refundForm, amount: parseFloat(e.target.value) })}
                        style={styles.formInput}
                        placeholder="Enter refund amount"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Refund Reason</label>
                      <textarea
                        value={refundForm.reason}
                        onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                        style={{ ...styles.formInput, minHeight: '80px' }}
                        placeholder="e.g., Customer requested, duplicate charge, product issue..."
                      />
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
                <button type="submit" style={styles.submitButton} disabled={actionLoading}>
                  {actionLoading ? '⏳ Processing...' : modalType === 'refund' ? '↶ Process Refund' : '✅ Confirm Action'}
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
