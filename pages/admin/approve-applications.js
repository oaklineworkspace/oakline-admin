import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminButton from '../../components/AdminButton';
import AdminFooter from '../../components/AdminFooter';

// Note: This page uses API routes, not direct Supabase client

export default function ApproveApplications() {
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedApp, setExpandedApp] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(null);
  const [approvalConfig, setApprovalConfig] = useState({
    accountNumberMode: 'auto',
    manualAccountNumbers: {},
    cardTypes: {}
  });
  const [approvalResult, setApprovalResult] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/get-applications-with-status?status=pending');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch applications');
      }

      setApplications(result.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (app) => {
    // Get all account types from the application
    let accountTypes = app.account_types || [];

    // Ensure it's an array
    if (!Array.isArray(accountTypes)) {
      accountTypes = ['checking_account'];
    }

    // If empty, default to checking
    if (accountTypes.length === 0) {
      accountTypes = ['checking_account'];
    }

    console.log('Opening approval modal for account types:', accountTypes);

    const initialManualNumbers = {};
    const initialCardTypes = {};
    accountTypes.forEach(type => {
      initialManualNumbers[type] = '';
      initialCardTypes[type] = 'debit';
    });

    setApprovalConfig({
      accountNumberMode: 'auto',
      manualAccountNumbers: initialManualNumbers,
      cardTypes: initialCardTypes
    });
    setShowApprovalModal(app);
  };

  const handleAccountNumberChange = (accountType, value) => {
    setApprovalConfig(prev => ({
      ...prev,
      manualAccountNumbers: {
        ...prev.manualAccountNumbers,
        [accountType]: value
      }
    }));
  };

  const handleCardTypeChange = (accountType, value) => {
    setApprovalConfig(prev => ({
      ...prev,
      cardTypes: {
        ...prev.cardTypes,
        [accountType]: value
      }
    }));
  };

  const handleApprove = async () => {
    if (!showApprovalModal) return;

    setProcessing(showApprovalModal.id);
    setError('');
    setSuccessMessage('');
    setApprovalResult(null);

    try {
      const response = await fetch('/api/admin/approve-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: showApprovalModal.id,
          accountNumberMode: approvalConfig.accountNumberMode,
          manualAccountNumbers: approvalConfig.accountNumberMode === 'manual' 
            ? approvalConfig.manualAccountNumbers 
            : {},
          cardTypes: approvalConfig.cardTypes
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Approval failed:', result);
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Failed to approve application';
        throw new Error(errorMessage);
      }

      // Close the approval modal first
      setShowApprovalModal(null);

      // Set approval result to show success modal
      setApprovalResult(result.data);
      setSuccessMessage(
        `✅ Application approved! Created ${result.data.accountsCreated} accounts and ${result.data.cardsCreated} cards.`
      );

      // Refresh applications list
      await fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      setError('Failed to approve application: ' + error.message);
      setShowApprovalModal(null);
    } finally {
      setProcessing(null);
    }
  };

  const toggleExpanded = (appId) => {
    setExpandedApp(expandedApp === appId ? null : appId);
  };

  const getAccountTypes = (app) => {
    let types = app.account_types || [];

    // Ensure it's an array
    if (!Array.isArray(types)) {
      types = ['checking_account'];
    }

    // If empty, default to checking
    if (types.length === 0) {
      types = ['checking_account'];
    }

    return types;
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💼 Approve Applications</h1>
            <p style={styles.subtitle}>Review and approve pending user applications with full control</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchApplications} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

        {approvalResult && (
          <div style={styles.resultModal}>
            <h3 style={styles.resultTitle}>✅ Approval Successful</h3>
            <div style={styles.resultDetails}>
              <p><strong>Email:</strong> {approvalResult.email}</p>
              <p><strong>Temporary Password:</strong> <code style={styles.code}>{approvalResult.tempPassword}</code></p>
              <p><strong>User ID:</strong> <code style={styles.code}>{approvalResult.userId}</code></p>

              <h4 style={styles.sectionHeading}>📊 Accounts Created ({approvalResult.accountsCreated})</h4>
              {approvalResult.accounts.map((acc, idx) => (
                <div key={idx} style={styles.accountDetail}>
                  <span>💳 {acc.type.replace(/_/g, ' ').toUpperCase()}</span>
                  <span>Account: {acc.number}</span>
                  <span style={{color: '#059669'}}>Balance: ${parseFloat(acc.balance).toFixed(2)}</span>
                  <span>Status: {acc.status.toUpperCase()}</span>
                </div>
              ))}

              <h4 style={styles.sectionHeading}>💳 Cards Issued ({approvalResult.cardsCreated})</h4>
              {approvalResult.cards.map((card, idx) => (
                <div key={idx} style={styles.cardDetail}>
                  <span>{card.brand ? card.brand.toUpperCase() : 'DEBIT'} {card.category ? card.category.toUpperCase() : ''} Card</span>
                  <span>****-****-****-{card.lastFour}</span>
                  <span>Expires: {new Date(card.expiryDate).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setApprovalResult(null)} style={styles.closeResultButton}>
              Close
            </button>
          </div>
        )}

        <div style={styles.content}>
          {loading && <p style={styles.loadingText}>Loading applications...</p>}

          {!loading && applications.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateIcon}>✅</p>
              <p style={styles.emptyStateText}>No pending applications</p>
              <p style={styles.emptyStateSubtext}>All applications have been processed</p>
            </div>
          )}

          {!loading && applications.length > 0 && (
            <div style={styles.applicationsGrid}>
              {applications.map((app) => (
                <div key={app.id} style={styles.applicationCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.applicantName}>
                        {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                      </h3>
                      <p style={styles.applicantEmail}>{app.email}</p>
                    </div>
                    <span style={styles.statusBadge}>PENDING</span>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Submitted:</span>
                      <span style={styles.infoValue}>
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </span>
                    </div>

                    {app.phone && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Phone:</span>
                        <span style={styles.infoValue}>{app.phone}</span>
                      </div>
                    )}

                    {app.date_of_birth && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>DOB:</span>
                        <span style={styles.infoValue}>
                          {new Date(app.date_of_birth).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Country:</span>
                      <span style={styles.infoValue}>{app.country || 'N/A'}</span>
                    </div>

                    {app.ssn && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>SSN:</span>
                        <span style={styles.infoValue}>***-**-{app.ssn.slice(-4)}</span>
                      </div>
                    )}

                    {app.id_number && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>ID Number:</span>
                        <span style={styles.infoValue}>***{app.id_number.slice(-4)}</span>
                      </div>
                    )}

                    {app.account_types && app.account_types.length > 0 && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Requested Accounts:</span>
                        <span style={styles.infoValue}>
                          {app.account_types.map(t => t.replace(/_/g, ' ')).join(', ')}
                        </span>
                      </div>
                    )}

                    {expandedApp === app.id && (
                      <div style={styles.expandedDetails}>
                        <div style={styles.detailsGrid}>
                          {app.address && (
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Full Address:</span>
                              <span style={styles.detailValue}>
                                {app.address}
                                {app.city && `, ${app.city}`}
                                {app.state && `, ${app.state}`}
                                {app.zip_code && ` ${app.zip_code}`}
                              </span>
                            </div>
                          )}
                          {app.employment_status && (
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Employment Status:</span>
                              <span style={styles.detailValue}>{app.employment_status}</span>
                            </div>
                          )}
                          {app.annual_income && (
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Annual Income:</span>
                              <span style={styles.detailValue}>{app.annual_income}</span>
                            </div>
                          )}
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Application ID:</span>
                            <span style={styles.detailValue}>{app.id}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => toggleExpanded(app.id)}
                      style={styles.detailsButton}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                      }}
                    >
                      {expandedApp === app.id ? '⬆️ Hide Details' : '⬇️ Show Details'}
                    </button>
                    <button
                      onClick={() => openApprovalModal(app)}
                      disabled={processing === app.id}
                      style={{
                        ...styles.approveButton,
                        ...(processing === app.id ? styles.buttonDisabled : {})
                      }}
                      onMouseEnter={(e) => {
                        if (!processing) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                      }}
                    >
                      {processing === app.id ? '⏳ Approving...' : '✅ Approve Application'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showApprovalModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>⚙️ Configure Account Approval</h2>
              <p style={styles.modalSubtitle}>
                {showApprovalModal.first_name} {showApprovalModal.last_name} - {showApprovalModal.email}
              </p>

              <div style={styles.modalSection}>
                <label style={styles.label}>Account Number Generation</label>
                <select
                  value={approvalConfig.accountNumberMode}
                  onChange={(e) => setApprovalConfig(prev => ({ ...prev, accountNumberMode: e.target.value }))}
                  style={styles.select}
                >
                  <option value="auto">🤖 Automatic - System generates account numbers</option>
                  <option value="manual">✏️ Manual - Enter account numbers manually</option>
                </select>
              </div>

              <div style={styles.accountsConfig}>
                <h3 style={styles.sectionHeading}>📊 Accounts to Create</h3>
                {getAccountTypes(showApprovalModal).map((accountType) => (
                  <div key={accountType} style={styles.accountConfigItem}>
                    <h4 style={styles.accountTypeTitle}>
                      💳 {accountType.replace(/_/g, ' ').toUpperCase()}
                    </h4>

                    {approvalConfig.accountNumberMode === 'manual' && (
                      <div style={styles.field}>
                        <label style={styles.fieldLabel}>Account Number</label>
                        <input
                          type="text"
                          value={approvalConfig.manualAccountNumbers[accountType] || ''}
                          onChange={(e) => handleAccountNumberChange(accountType, e.target.value)}
                          placeholder="e.g., 123456789012"
                          style={styles.input}
                          required={approvalConfig.accountNumberMode === 'manual'}
                        />
                      </div>
                    )}

                    <div style={styles.field}>
                      <label style={styles.fieldLabel}>Card Type</label>
                      <select
                        value={approvalConfig.cardTypes[accountType] || 'debit'}
                        onChange={(e) => handleCardTypeChange(accountType, e.target.value)}
                        style={styles.select}
                      >
                        <option value="debit">💳 Debit Card</option>
                        <option value="credit">💎 Credit Card</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowApprovalModal(null)}
                  style={styles.cancelButton}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  style={{
                    ...styles.approveModalButton,
                    ...(processing ? styles.buttonDisabled : {})
                  }}
                >
                  {processing ? '⏳ Processing...' : '✅ Approve & Create'}
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
    background: '#f5f7fa',
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
    gap: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1a202c',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
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
    transition: 'all 0.3s ease',
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
    display: 'inline-block',
    transition: 'all 0.3s ease',
  },
  errorBanner: {
    background: '#fed7d7',
    color: '#c53030',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
  },
  successBanner: {
    background: '#c6f6d5',
    color: '#2f855a',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
  },
  resultModal: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    marginBottom: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '2px solid #48bb78'
  },
  resultTitle: {
    margin: '0 0 1rem 0',
    fontSize: 'clamp(1.25rem, 3.5vw, 20px)',
    color: '#2f855a'
  },
  resultDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  code: {
    background: '#edf2f7',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: 'clamp(0.8rem, 2vw, 13px)'
  },
  sectionHeading: {
    margin: '1rem 0 0.5rem 0',
    fontSize: 'clamp(1rem, 2.5vw, 16px)',
    color: '#2d3748',
    fontWeight: '600'
  },
  accountDetail: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    padding: '0.75rem',
    background: '#f7fafc',
    borderRadius: '6px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    marginBottom: '0.5rem'
  },
  cardDetail: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    padding: '0.75rem',
    background: '#edf2f7',
    borderRadius: '6px',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    marginBottom: '0.5rem'
  },
  closeResultButton: {
    marginTop: '1.5rem',
    padding: '0.75rem 1.5rem',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%'
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  loadingText: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    padding: '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(2rem, 6vw, 60px) 20px',
  },
  emptyStateIcon: {
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px',
  },
  emptyStateText: {
    fontSize: 'clamp(1.1rem, 3vw, 20px)',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  emptyStateSubtext: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    margin: 0,
  },
  applicationsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))',
  },
  applicationCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: 'clamp(1rem, 3vw, 20px)',
    background: 'white',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px',
  },
  applicantName: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1a202c',
    fontWeight: '600',
  },
  applicantEmail: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096',
  },
  statusBadge: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  cardBody: {
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600',
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right',
  },
  expandedDetails: {
    marginTop: '16px',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
  },
  detailsGrid: {
    display: 'grid',
    gap: '12px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#2d3748',
  },
  cardFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  detailsButton: {
    padding: 'clamp(0.75rem, 2.5vw, 14px) clamp(1.5rem, 4vw, 28px)',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
  },
  approveButton: {
    padding: 'clamp(0.75rem, 2.5vw, 14px) clamp(1.5rem, 4vw, 28px)',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.6,
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
    padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001,
    position: 'relative',
  },
  modalTitle: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    color: '#1a202c',
    fontWeight: '700',
  },
  modalSubtitle: {
    margin: '0 0 20px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
  },
  modalSection: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748',
  },
  select: {
    width: '100%',
    padding: 'clamp(0.65rem, 2vw, 12px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    cursor: 'pointer',
  },
  accountsConfig: {
    marginBottom: '20px',
  },
  accountConfigItem: {
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  accountTypeTitle: {
    margin: '0 0 12px 0',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    color: '#2d3748',
    fontWeight: '600',
  },
  field: {
    marginBottom: '12px',
  },
  fieldLabel: {
    display: 'block',
    marginBottom: '6px',
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '600',
    color: '#4a5568',
  },
  input: {
    width: '100%',
    padding: 'clamp(0.65rem, 2vw, 10px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  cancelButton: {
    padding: 'clamp(0.65rem, 2vw, 12px) clamp(1rem, 3vw, 24px)',
    background: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  approveModalButton: {
    flex: 1,
    padding: 'clamp(0.75rem, 2.5vw, 14px) clamp(1.5rem, 4vw, 28px)',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
  },
};