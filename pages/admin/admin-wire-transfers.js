import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function AdminWireTransfers() {
  const router = useRouter();
  const [wireTransfers, setWireTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    reason: '',
    adminNotes: '',
    selectedReason: ''
  });

  useEffect(() => {
    fetchWireTransfers();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchWireTransfers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/get-wire-transfers', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch wire transfers');
      const data = await response.json();

      setWireTransfers(data.wireTransfers || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching wire transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!selectedTransfer) {
      setError('No wire transfer selected');
      return;
    }

    if (['reject', 'cancel', 'reverse', 'hold'].includes(action)) {
      if (!formData.selectedReason && !formData.reason) {
        setError('Please select or enter a reason');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please login again.');
      }

      const finalReason = formData.selectedReason === 'Other' ? formData.reason : formData.selectedReason;

      const response = await fetch('/api/admin/update-wire-transfer-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          wireTransferId: selectedTransfer.id,
          action,
          reason: finalReason,
          adminNotes: formData.adminNotes,
          userEmail: selectedTransfer.user_email,
          userName: selectedTransfer.user_name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} wire transfer`);
      }

      setSuccess(`Wire transfer ${action}ed successfully! Email notification sent to user.`);
      setShowModal(null);
      setSelectedTransfer(null);
      setFormData({ reason: '', adminNotes: '', selectedReason: '' });
      await fetchWireTransfers();
    } catch (error) {
      console.error(`Wire transfer ${action} error:`, error);
      setError(error.message || `Failed to ${action} wire transfer`);
    } finally {
      setLoading(false);
    }
  };

  const filteredWireTransfers = wireTransfers.filter(transfer => {
    const matchesSearch = transfer.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transfer.transfer_type === filterType;
    const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus;
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'pending' && transfer.status === 'pending') ||
                      (activeTab === 'processing' && transfer.status === 'processing') ||
                      (activeTab === 'completed' && transfer.status === 'completed') ||
                      (activeTab === 'on_hold' && transfer.status === 'on_hold');
    
    let matchesDateRange = true;
    if (startDate || endDate) {
      const transferDate = new Date(transfer.created_at);
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = transferDate >= start && transferDate <= end;
      } else if (startDate) {
        matchesDateRange = transferDate >= new Date(startDate);
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = transferDate <= end;
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesTab && matchesDateRange;
  });

  const stats = {
    total: wireTransfers.length,
    pending: wireTransfers.filter(t => t.status === 'pending').length,
    processing: wireTransfers.filter(t => t.status === 'processing').length,
    completed: wireTransfers.filter(t => t.status === 'completed').length,
    on_hold: wireTransfers.filter(t => t.status === 'on_hold').length,
    totalAmount: wireTransfers.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0),
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: '#fef3c7', text: '#92400e' },
      processing: { bg: '#dbeafe', text: '#1e40af' },
      completed: { bg: '#d1fae5', text: '#065f46' },
      failed: { bg: '#fee2e2', text: '#991b1b' },
      cancelled: { bg: '#f3f4f6', text: '#4b5563' },
      rejected: { bg: '#fee2e2', text: '#dc2626' },
      on_hold: { bg: '#ffedd5', text: '#ea580c' },
      reversed: { bg: '#e0e7ff', text: '#4338ca' }
    };
    return colors[status] || colors.pending;
  };

  const renderActionModal = () => {
    if (!showModal || !selectedTransfer) return null;

    const modalConfig = {
      approve: {
        title: '✅ Approve Wire Transfer',
        color: '#059669',
        buttonText: 'Approve Transfer',
        buttonColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      },
      reject: {
        title: '❌ Reject Wire Transfer',
        color: '#dc2626',
        buttonText: 'Reject Transfer',
        buttonColor: '#dc2626',
        needsReason: true,
        reasons: ['Insufficient documentation', 'Suspicious activity detected', 'Invalid beneficiary information', 'Compliance requirements not met', 'Duplicate transfer request', 'Account restrictions', 'Other']
      },
      cancel: {
        title: '⚠️ Cancel Wire Transfer',
        color: '#f59e0b',
        buttonText: 'Cancel Transfer',
        buttonColor: '#f59e0b',
        needsReason: true,
        reasons: ['User request', 'Duplicate transaction', 'Incorrect details', 'Fraudulent activity suspected', 'System error', 'Other']
      },
      reverse: {
        title: '🔄 Reverse Wire Transfer',
        color: '#3b82f6',
        buttonText: 'Reverse Transfer',
        buttonColor: '#3b82f6',
        needsReason: true,
        reasons: ['User request', 'Sent to wrong account', 'Duplicate transaction', 'Incorrect amount', 'Fraudulent transaction', 'Bank error', 'Other']
      },
      hold: {
        title: '⏸️ Place Wire Transfer On Hold',
        color: '#f97316',
        buttonText: 'Place On Hold',
        buttonColor: '#f97316',
        needsReason: true,
        reasons: ['Under investigation', 'Additional verification required', 'Compliance review', 'Suspicious activity', 'Large amount verification', 'Other']
      },
      release: {
        title: '▶️ Release Wire Transfer',
        color: '#059669',
        buttonText: 'Release Transfer',
        buttonColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      },
      complete: {
        title: '✅ Mark Transfer as Completed',
        color: '#059669',
        buttonText: 'Mark as Completed',
        buttonColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      }
    };

    const config = modalConfig[showModal];

    return (
      <div style={styles.modalOverlay} onClick={() => {
        setShowModal(null);
        setSelectedTransfer(null);
        setFormData({ reason: '', adminNotes: '', selectedReason: '' });
      }}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2 style={{...styles.modalTitle, color: config.color}}>{config.title}</h2>
            <button onClick={() => {
              setShowModal(null);
              setSelectedTransfer(null);
              setFormData({ reason: '', adminNotes: '', selectedReason: '' });
            }} style={styles.closeButton}>×</button>
          </div>
          <div style={styles.modalBody}>
            <div style={{background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px'}}>
              <h3 style={{margin: '0 0 12px 0', color: '#1e293b', fontSize: '16px'}}>Transfer Summary</h3>
              <div style={{display: 'grid', gap: '8px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>User:</span>
                  <strong style={{color: '#1e293b'}}>{selectedTransfer.user_name}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Email:</span>
                  <strong style={{color: '#1e293b', fontSize: '14px'}}>{selectedTransfer.user_email}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Type:</span>
                  <strong style={{color: '#1e293b', textTransform: 'capitalize'}}>{selectedTransfer.transfer_type}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Amount:</span>
                  <strong style={{color: '#1e293b', fontSize: '18px'}}>${parseFloat(selectedTransfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Recipient:</span>
                  <strong style={{color: '#1e293b'}}>{selectedTransfer.recipient_name}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Bank:</span>
                  <strong style={{color: '#1e293b', fontSize: '13px'}}>{selectedTransfer.recipient_bank}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Current Status:</span>
                  <strong style={{...styles.statusBadge, ...getStatusColor(selectedTransfer.status)}}>
                    {selectedTransfer.status.replace('_', ' ').toUpperCase()}
                  </strong>
                </div>
              </div>
            </div>

            {config.needsReason && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Reason for {showModal.charAt(0).toUpperCase() + showModal.slice(1)} *</label>
                <select
                  value={formData.selectedReason}
                  onChange={(e) => setFormData({...formData, selectedReason: e.target.value, reason: e.target.value === 'Other' ? formData.reason : ''})}
                  style={styles.input}
                >
                  <option value="">-- Select a reason --</option>
                  {config.reasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                {formData.selectedReason === 'Other' && (
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    style={{...styles.input, minHeight: '80px', marginTop: '12px'}}
                    placeholder="Enter custom reason..."
                  />
                )}
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Admin Notes (Optional)</label>
              <textarea
                value={formData.adminNotes}
                onChange={(e) => setFormData({...formData, adminNotes: e.target.value})}
                style={{...styles.input, minHeight: '60px'}}
                placeholder="Add any internal notes..."
              />
            </div>

            <p style={{color: '#64748b', fontSize: '13px', marginBottom: '16px', fontStyle: 'italic'}}>
              ℹ️ An email notification will be sent to {selectedTransfer.user_email}
            </p>

            <button
              onClick={() => handleAction(showModal)}
              disabled={loading || (config.needsReason && !formData.selectedReason)}
              style={{
                width: '100%',
                padding: '14px',
                background: (config.needsReason && !formData.selectedReason) ? '#9ca3af' : config.buttonColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: (config.needsReason && !formData.selectedReason) ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '⏳ Processing...' : config.buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💸 Wire Transfers Management</h1>
            <p style={styles.subtitle}>Comprehensive wire transfer administration and monitoring</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchWireTransfers} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Transfers</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
            <h3 style={styles.statLabel}>Processing</h3>
            <p style={styles.statValue}>{stats.processing}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
            <h3 style={styles.statLabel}>Completed</h3>
            <p style={styles.statValue}>{stats.completed}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f97316'}}>
            <h3 style={styles.statLabel}>On Hold</h3>
            <p style={styles.statValue}>{stats.on_hold}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #7c3aed'}}>
            <h3 style={styles.statLabel}>Total Amount</h3>
            <p style={styles.statValue}>${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div style={styles.tabs}>
          {['all', 'pending', 'processing', 'completed', 'on_hold'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace('_', ' ').charAt(0).toUpperCase() + tab.replace('_', ' ').slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by name, email, recipient or transfer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Types</option>
            <option value="domestic">Domestic</option>
            <option value="international">International</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="reversed">Reversed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

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

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading wire transfers...</p>
            </div>
          ) : filteredWireTransfers.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No wire transfers found</p>
            </div>
          ) : (
            <div style={styles.transfersGrid}>
              {filteredWireTransfers.map(transfer => {
                const statusColor = getStatusColor(transfer.status);
                return (
                  <div key={transfer.id} style={styles.transferCard}>
                    <div style={styles.transferHeader}>
                      <div>
                        <h3 style={styles.transferType}>
                          {transfer.transfer_type === 'domestic' ? '🏠' : '🌍'} {transfer.transfer_type?.toUpperCase() || 'WIRE'}
                        </h3>
                        <p style={styles.transferEmail}>{transfer.user_name || transfer.user_email}</p>
                        {transfer.user_name && transfer.user_name !== transfer.user_email && (
                          <p style={{...styles.transferEmail, fontSize: 'clamp(0.75rem, 1.8vw, 12px)', marginTop: '2px'}}>
                            {transfer.user_email}
                          </p>
                        )}
                      </div>
                      <span style={{...styles.statusBadge, backgroundColor: statusColor.bg, color: statusColor.text}}>
                        {transfer.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div style={styles.transferBody}>
                      <div style={styles.transferInfo}>
                        <span style={styles.infoLabel}>Total Amount:</span>
                        <span style={styles.infoValue}>${parseFloat(transfer.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={styles.transferInfo}>
                        <span style={styles.infoLabel}>Recipient:</span>
                        <span style={styles.infoValue}>{transfer.recipient_name}</span>
                      </div>
                      <div style={styles.transferInfo}>
                        <span style={styles.infoLabel}>Bank:</span>
                        <span style={{...styles.infoValue, fontSize: '13px'}}>{transfer.recipient_bank}</span>
                      </div>
                      {transfer.swift_code && (
                        <div style={styles.transferInfo}>
                          <span style={styles.infoLabel}>SWIFT:</span>
                          <span style={styles.infoValue}>{transfer.swift_code}</span>
                        </div>
                      )}
                      {transfer.routing_number && (
                        <div style={styles.transferInfo}>
                          <span style={styles.infoLabel}>Routing:</span>
                          <span style={styles.infoValue}>{transfer.routing_number}</span>
                        </div>
                      )}
                      <div style={styles.transferInfo}>
                        <span style={styles.infoLabel}>Created:</span>
                        <span style={styles.infoValue}>{new Date(transfer.created_at).toLocaleDateString()}</span>
                      </div>
                      {transfer.urgent_transfer && (
                        <div style={{...styles.urgentBadge}}>
                          ⚡ URGENT TRANSFER
                        </div>
                      )}
                    </div>

                    <div style={styles.transferFooter}>
                      {transfer.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('approve');
                            }}
                            style={styles.approveButton}
                          >
                            ✅ Approve
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('reject');
                            }}
                            style={styles.rejectButton}
                          >
                            ❌ Reject
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('hold');
                            }}
                            style={styles.holdButton}
                          >
                            ⏸️ Hold
                          </button>
                        </>
                      )}
                      {transfer.status === 'processing' && (
                        <>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('complete');
                            }}
                            style={styles.approveButton}
                          >
                            ✅ Complete
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('hold');
                            }}
                            style={styles.holdButton}
                          >
                            ⏸️ Hold
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('cancel');
                            }}
                            style={styles.cancelButton}
                          >
                            ⚠️ Cancel
                          </button>
                        </>
                      )}
                      {transfer.status === 'on_hold' && (
                        <>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('release');
                            }}
                            style={styles.approveButton}
                          >
                            ▶️ Release
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('reject');
                            }}
                            style={styles.rejectButton}
                          >
                            ❌ Reject
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowModal('cancel');
                            }}
                            style={styles.cancelButton}
                          >
                            ⚠️ Cancel
                          </button>
                        </>
                      )}
                      {transfer.status === 'completed' && (
                        <button 
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setShowModal('reverse');
                          }}
                          style={styles.reverseButton}
                        >
                          🔄 Reverse
                        </button>
                      )}
                      {['rejected', 'cancelled', 'reversed', 'failed'].includes(transfer.status) && (
                        <div style={{padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '14px'}}>
                          No actions available
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {renderActionModal()}

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
  transfersGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  transferCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: 'clamp(10px, 2vw, 15px)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  transferHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  transferType: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  transferEmail: {
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
  transferBody: {
    marginBottom: '16px'
  },
  transferInfo: {
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
  urgentBadge: {
    marginTop: '12px',
    padding: '8px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)'
  },
  transferFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  approveButton: {
    padding: '10px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1
  },
  rejectButton: {
    flex: 1,
    padding: '10px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  holdButton: {
    flex: 1,
    padding: '10px',
    background: '#f97316',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    padding: '10px',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  reverseButton: {
    flex: 1,
    padding: '10px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
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
    outline: 'none'
  }
};
