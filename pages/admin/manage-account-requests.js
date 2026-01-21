import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function ManageAccountRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAccountType, setFilterAccountType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    rejectionReason: ''
  });

  useEffect(() => {
    fetchAccountRequests();
  }, []);

  const fetchAccountRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/account-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch account requests');
      }

      setRequests(result.data || []);
    } catch (err) {
      console.error('Error fetching account requests:', err);
      setError('Failed to load account requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    if (!confirm(`Approve ${request.user_name}'s request for ${request.account_type_name}?`)) {
      return;
    }

    setProcessing(request.id);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please login again.');
      }

      const response = await fetch('/api/admin/account-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          request_id: request.id,
          action: 'approve',
          admin_id: session.user.id
        })
      });

      const result = await response.json();

      if (result.success) {
        let message = `✅ Account request approve'd successfully!`;

        // Add email notification status
        if (result.emailSent) {
          message += ` 📧 Email notification sent to user.`;
        } else if (result.emailError) {
          message += ` ⚠️ Warning: Email notification failed - ${result.emailError}`;
        }

        setSuccess(message);
        setTimeout(() => setSuccess(''), 8000);
        await fetchAccountRequests();
      } else {
        throw new Error(result.error || 'Failed to approve request');
      }
    } catch (err) {
      console.error('Error approving request:', err);
      setError('Failed to approve request: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!formData.rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    if (!selectedRequest) {
      setError('No request selected');
      return;
    }

    setProcessing(selectedRequest.id);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please login again.');
      }

      const response = await fetch('/api/admin/account-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          action: 'reject',
          rejection_reason: formData.rejectionReason,
          admin_id: session.user.id
        })
      });

      const result = await response.json();

      if (result.success) {
        let message = `✅ Account request reject'd successfully!`;

        // Add email notification status
        if (result.emailSent) {
          message += ` 📧 Email notification sent to user.`;
        } else if (result.emailError) {
          message += ` ⚠️ Warning: Email notification failed - ${result.emailError}`;
        }

        setSuccess(message);
        setShowModal(null);
        setSelectedRequest(null);
        setFormData({ rejectionReason: '' });
        setTimeout(() => setSuccess(''), 8000);
        await fetchAccountRequests();
      } else {
        throw new Error(result.error || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject request: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (requestId) => {
    if (!confirm('Are you sure you want to delete this account request? This action cannot be undone.')) {
      return;
    }

    setProcessing(requestId);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please login again.');
      }

      const response = await fetch('/api/admin/account-requests', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: requestId })
      });

      const result = await response.json();

      if (result.success) {
        let message = `✅ Account request deleted successfully!`;

        // Add email notification status (though delete might not typically send email)
        if (result.emailSent) {
          message += ` 📧 Email notification sent to user.`;
        } else if (result.emailError) {
          message += ` ⚠️ Warning: Email notification failed - ${result.emailError}`;
        }

        setSuccess(message);
        setTimeout(() => setSuccess(''), 8000);
        await fetchAccountRequests();
      } else {
        throw new Error(result.error || 'Failed to delete request');
      }
    } catch (err) {
      console.error('Error deleting request:', err);
      setError('Failed to delete request: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesAccountType = filterAccountType === 'all' || request.account_type_name === filterAccountType;
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'pending' && request.status === 'pending') ||
                      (activeTab === 'approved' && request.status === 'approved') ||
                      (activeTab === 'rejected' && request.status === 'rejected');

    let matchesDateRange = true;
    if (startDate || endDate) {
      const requestDate = new Date(request.created_at);
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = requestDate >= start && requestDate <= end;
      } else if (startDate) {
        matchesDateRange = requestDate >= new Date(startDate);
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = requestDate <= end;
      }
    }

    return matchesSearch && matchesStatus && matchesAccountType && matchesTab && matchesDateRange;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };

  const uniqueAccountTypes = [...new Set(requests.map(r => r.account_type_name).filter(Boolean))];

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📋 Account Request Management</h1>
            <p style={styles.subtitle}>Manage additional account requests from existing users</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchAccountRequests} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Requests</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
            <h3 style={styles.statLabel}>Approved</h3>
            <p style={styles.statValue}>{stats.approved}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Rejected</h3>
            <p style={styles.statValue}>{stats.rejected}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'pending', 'approved', 'rejected'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by name, email or request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={filterAccountType} onChange={(e) => setFilterAccountType(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Account Types</option>
            {uniqueAccountTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filters */}
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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.dateInputGroup}>
              <label style={styles.dateLabel}>To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                style={styles.clearDateButton}
              >
                ✕ Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Requests Grid */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading account requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No account requests found</p>
            </div>
          ) : (
            <div style={styles.requestsGrid}>
              {filteredRequests.map(request => (
                <div key={request.id} style={styles.requestCard}>
                  <div style={styles.requestHeader}>
                    <div>
                      <h3 style={styles.requestType}>
                        {request.account_type?.icon && (
                          <span style={{ marginRight: '8px' }}>{request.account_type.icon}</span>
                        )}
                        {request.account_type_name?.toUpperCase() || 'ACCOUNT REQUEST'}
                      </h3>
                      <p style={styles.requestEmail}>{request.user_name || request.user_email}</p>
                      {request.user_name && request.user_name !== request.user_email && (
                        <p style={{...styles.requestEmail, fontSize: 'clamp(0.75rem, 1.8vw, 12px)', marginTop: '2px'}}>
                          {request.user_email}
                        </p>
                      )}
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      background: request.status === 'approved' ? '#d1fae5' :
                                request.status === 'pending' ? '#fef3c7' :
                                request.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                      color: request.status === 'approved' ? '#065f46' :
                            request.status === 'pending' ? '#92400e' :
                            request.status === 'rejected' ? '#991b1b' : '#374151'
                    }}>
                      {request.status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={styles.requestBody}>
                    <div style={styles.requestInfo}>
                      <span style={styles.infoLabel}>Account Type:</span>
                      <span style={styles.infoValue}>{request.account_type_name}</span>
                    </div>
                    {request.account_type?.min_deposit > 0 && (
                      <div style={styles.requestInfo}>
                        <span style={styles.infoLabel}>Min. Deposit:</span>
                        <span style={styles.infoValue}>${request.account_type.min_deposit.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={styles.requestInfo}>
                      <span style={styles.infoLabel}>Request Date:</span>
                      <span style={styles.infoValue}>
                        {new Date(request.request_date || request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {request.reviewed_date && (
                      <div style={styles.requestInfo}>
                        <span style={styles.infoLabel}>
                          {request.status === 'approved' ? 'Approved:' : 'Reviewed:'}
                        </span>
                        <span style={styles.infoValue}>
                          {new Date(request.reviewed_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div style={styles.rejectionNote}>
                        <strong>Rejection Reason:</strong><br />
                        {request.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div style={styles.requestFooter}>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      style={styles.viewButton}
                    >
                      👁️ Quick View
                    </button>
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(request)}
                          style={styles.approveButton}
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? '⏳' : '✅'} Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal('reject');
                          }}
                          style={styles.rejectButton}
                          disabled={processing === request.id}
                        >
                          ❌ Reject
                        </button>
                      </>
                    )}
                    {request.status !== 'pending' && (
                      <span style={styles.processedText}>
                        {request.status === 'approved' ? 'Approved ✓' : 'Rejected ✗'}
                      </span>
                    )}
                    {/* Add Delete Button for all statuses */}
                    <button
                      onClick={() => handleDelete(request.id)}
                      style={{
                        ...styles.rejectButton, // Reusing reject button style for delete, can be customized
                        background: '#6b7280', // Gray color for delete button
                        marginLeft: 'auto' // Push to the right if needed
                      }}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? '⏳' : '🗑️'} Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Details Modal */}
        {selectedRequest && !showModal && (
          <div style={styles.modalOverlay} onClick={() => setSelectedRequest(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Request Details</h2>
                <button onClick={() => setSelectedRequest(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Request ID:</span>
                    <span style={styles.detailValue}>{selectedRequest.id}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>User Name:</span>
                    <span style={styles.detailValue}>{selectedRequest.user_name}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Email:</span>
                    <span style={styles.detailValue}>{selectedRequest.user_email}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Account Type:</span>
                    <span style={styles.detailValue}>{selectedRequest.account_type_name}</span>
                  </div>
                  {selectedRequest.account_type?.min_deposit > 0 && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Minimum Deposit:</span>
                      <span style={styles.detailValue}>
                        ${selectedRequest.account_type.min_deposit.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Status:</span>
                    <span style={styles.detailValue}>{selectedRequest.status}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Request Date:</span>
                    <span style={styles.detailValue}>
                      {new Date(selectedRequest.request_date || selectedRequest.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedRequest.reviewed_date && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Reviewed Date:</span>
                      <span style={styles.detailValue}>
                        {new Date(selectedRequest.reviewed_date).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedRequest.rejection_reason && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Rejection Reason:</span>
                      <span style={styles.detailValue}>{selectedRequest.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showModal === 'reject' && selectedRequest && (
          <div style={styles.modalOverlay} onClick={() => {
            setShowModal(null);
            setSelectedRequest(null);
            setFormData({ rejectionReason: '' });
          }}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>❌ Reject Account Request</h2>
                <button onClick={() => {
                  setShowModal(null);
                  setSelectedRequest(null);
                  setFormData({ rejectionReason: '' });
                }} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={{background: '#fef2f2', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ef4444'}}>
                  <h3 style={{margin: '0 0 12px 0', color: '#991b1b', fontSize: '16px'}}>Request Summary</h3>
                  <div style={{display: 'grid', gap: '8px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: '#4a5568'}}>User:</span>
                      <strong style={{color: '#991b1b'}}>{selectedRequest.user_name}</strong>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: '#4a5568'}}>Account Type:</span>
                      <strong style={{color: '#991b1b'}}>{selectedRequest.account_type_name}</strong>
                    </div>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Rejection Reason *</label>
                  <textarea
                    value={formData.rejectionReason}
                    onChange={(e) => setFormData({...formData, rejectionReason: e.target.value})}
                    style={{...styles.input, minHeight: '100px'}}
                    placeholder="Provide a clear explanation for the rejection..."
                    autoFocus
                  />
                </div>

                <p style={{color: '#64748b', fontSize: '13px', marginBottom: '16px', fontStyle: 'italic'}}>
                  ℹ️ Rejection notification will be sent to {selectedRequest.user_email}
                </p>

                <button
                  onClick={handleReject}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: !formData.rejectionReason ? '#9ca3af' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: !formData.rejectionReason ? 'not-allowed' : 'pointer'
                  }}
                  disabled={!formData.rejectionReason || processing}
                >
                  {processing ? '⏳ Processing...' : '❌ Confirm Rejection'}
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
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
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
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
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  filtersSection: {
    background: 'white',
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
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none'
  },
  dateRangeSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  dateRangeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  dateRangeInputs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },
  dateInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateLabel: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '500',
    color: '#4a5568'
  },
  dateInput: {
    padding: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    minWidth: '150px'
  },
  clearDateButton: {
    padding: '10px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
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
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#718096',
    fontWeight: '600'
  },
  requestsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: 'clamp(10px, 2vw, 15px)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '2px solid #e2e8f0'
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  requestType: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  requestEmail: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  requestBody: {
    marginBottom: '16px'
  },
  requestInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600'
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right'
  },
  rejectionNote: {
    marginTop: '12px',
    padding: '12px',
    background: '#fef2f2',
    borderLeft: '4px solid #dc2626',
    borderRadius: '6px',
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    color: '#991b1b'
  },
  requestFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center' // Align items vertically in the footer
  },
  viewButton: {
    padding: '10px 16px', // Increased padding for better touch target
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease'
  },
  approveButton: {
    padding: '10px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease'
  },
  rejectButton: {
    padding: '10px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease'
  },
  processedText: {
    padding: '10px',
    textAlign: 'center',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#9ca3af',
    fontStyle: 'italic',
    fontWeight: '600',
    marginLeft: 'auto' // Push to the right
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
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
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
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeButton: {
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
  detailsGrid: {
    display: 'grid',
    gap: '16px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    color: '#2d3748',
    fontWeight: '500'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    fontFamily: 'inherit'
  }
};