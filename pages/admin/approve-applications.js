import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminButton from '../../components/AdminButton';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [applicationToReject, setApplicationToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewingDocuments, setViewingDocuments] = useState(null);
  const [documentUrls, setDocumentUrls] = useState({ front: null, back: null });
  
  // New state for filtering and tabs
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch directly from API without checking session first
      const response = await fetch('/api/admin/get-applications-with-status?status=all', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch applications: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Fetched applications:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch applications');
      }

      // Fetch accounts for each application
      const applicationsWithAccounts = await Promise.all(
        (result.applications || []).map(async (app) => {
          if (app.user_id) {
            try {
              const accountsResponse = await fetch(`/api/admin/get-user-accounts?userId=${app.user_id}`, {
                method: 'GET',
                credentials: 'include'
              });
              
              if (accountsResponse.ok) {
                const accountsData = await accountsResponse.json();
                return {
                  ...app,
                  accounts: accountsData.accounts || []
                };
              }
            } catch (err) {
              console.error('Error fetching accounts for user:', app.user_id, err);
            }
          }
          return {
            ...app,
            accounts: []
          };
        })
      );

      setApplications(applicationsWithAccounts);
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

  const handleOpenApprovalModal = (app) => {
    console.log('Opening approval modal for application:', app.id);
    openApprovalModal(app);
  };

  const handleRejectApplication = async () => {
    if (!applicationToReject) return;

    setProcessing(applicationToReject.id);
    setError('');

    try {
      const response = await fetch('/api/admin/reject-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: applicationToReject.id,
          rejectionReason: rejectionReason || 'Application rejected by admin'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject application');
      }

      setSuccessMessage('❌ Application rejected successfully');
      setTimeout(() => setSuccessMessage(''), 5000);

      setShowRejectModal(false);
      setApplicationToReject(null);
      setRejectionReason('');

      await fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewDocuments = async (app) => {
    setViewingDocuments(app);
    setDocumentUrls({ front: null, back: null });
    setError('');

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/get-document-urls', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          userId: app.user_id,
          email: app.email,
          applicationId: app.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to load documents');
        return;
      }

      setDocumentUrls(result.documents);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      const { supabase } = await import('../../lib/supabaseClient');
      await supabase.auth.signOut();
      router.push('/admin');
    } catch (err) {
      console.error('Logout error:', err);
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

  // Filter applications based on activeTab, search, and date range
  const filteredApplications = applications.filter(app => {
    // Tab filtering
    const matchesTab = activeTab === 'all' || app.application_status === activeTab;
    
    const matchesSearch = app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date range filtering
    let matchesDateRange = true;
    if (startDate || endDate) {
      const appDate = new Date(app.submitted_at);
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = appDate >= start && appDate <= end;
      } else if (startDate) {
        matchesDateRange = appDate >= new Date(startDate);
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = appDate <= end;
      }
    }
    
    return matchesTab && matchesSearch && matchesDateRange;
  });

  // Calculate statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.application_status === 'pending').length,
    approved: applications.filter(a => a.application_status === 'approved').length,
    rejected: applications.filter(a => a.application_status === 'rejected').length,
    underReview: applications.filter(a => a.application_status === 'under_review').length
  };

  // Status badge styling helper
  const getStatusStyle = (status) => {
    const statusStyles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e' },
      approved: { backgroundColor: '#d1fae5', color: '#065f46' },
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
      under_review: { backgroundColor: '#dbeafe', color: '#1e40af' },
      completed: { backgroundColor: '#d1fae5', color: '#065f46' }
    };
    return statusStyles[status] || statusStyles.pending;
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💼 Application Management System</h1>
            <p style={styles.subtitle}>Review and approve pending user applications with comprehensive oversight</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchApplications} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Applications</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending Review</h3>
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
          <div style={{...styles.statCard, borderLeft: '4px solid #7c3aed'}}>
            <h3 style={styles.statLabel}>Under Review</h3>
            <p style={styles.statValue}>{stats.underReview}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'pending', 'approved', 'rejected', 'under_review'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by name, email or application ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
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

        {approvalResult && (
          <div style={styles.resultModal}>
            <h3 style={styles.resultTitle}>✅ Approval Successful</h3>
            <div style={styles.resultDetails}>
              <p><strong>Email:</strong> {approvalResult.email}</p>
              <p><strong>Temporary Password:</strong> <code style={styles.code}>{approvalResult.tempPassword}</code></p>
              <p><strong>User ID:</strong> <code style={styles.code}>{approvalResult.userId}</code></p>

              <h4 style={styles.sectionHeading}>🔗 User Access Links</h4>
              <div style={styles.linkSection}>
                <a 
                  href={`https://www.theoaklinebank.com/login?redirect=/security`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.accessLink}
                >
                  🔑 Login to Account
                </a>
                <a 
                  href={`https://www.theoaklinebank.com/reset-password?redirect=/dashboard`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.accessLinkSecondary}
                >
                  🔐 Reset Password
                </a>
              </div>

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

        {/* Applications Table/Grid */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No applications found</p>
            </div>
          ) : (
            <div style={styles.applicationsGrid}>
              {filteredApplications.map((app) => (
                <div key={app.id} style={styles.applicationCard}>
                    <div style={styles.cardHeader}>
                      <div>
                        <h3 style={styles.applicantName}>
                          {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                        </h3>
                        <p style={styles.applicantEmail}>{app.email}</p>
                      </div>
                      <span style={{
                        ...styles.statusBadge,
                        ...getStatusStyle(app.application_status)
                      }}>
                        {app.application_status?.toUpperCase().replace(/_/g, ' ') || 'PENDING'}
                      </span>
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
                        <span style={styles.infoValue}>{app.ssn}</span>
                      </div>
                    )}

                    {app.id_number && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>ID Number:</span>
                        <span style={styles.infoValue}>{app.id_number}</span>
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

                        {/* Display user's accounts */}
                        {app.accounts && app.accounts.length > 0 && (
                          <div style={styles.accountsSection}>
                            <h4 style={styles.accountsSectionTitle}>💳 User Accounts ({app.accounts.length})</h4>
                            <div style={styles.accountsGrid}>
                              {app.accounts.map((account, idx) => (
                                <div key={account.id || idx} style={styles.accountCard}>
                                  <div style={styles.accountHeader}>
                                    <span style={styles.accountType}>
                                      {account.account_type?.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                    <span style={{
                                      ...styles.accountStatusBadge,
                                      ...getStatusStyle(account.status)
                                    }}>
                                      {account.status?.toUpperCase()}
                                    </span>
                                  </div>
                                  <div style={styles.accountDetails}>
                                    <div style={styles.accountRow}>
                                      <span style={styles.accountLabel}>Account #:</span>
                                      <span style={styles.accountValue}>{account.account_number}</span>
                                    </div>
                                    <div style={styles.accountRow}>
                                      <span style={styles.accountLabel}>Balance:</span>
                                      <span style={styles.accountValue}>
                                        ${parseFloat(account.balance || 0).toFixed(2)}
                                      </span>
                                    </div>
                                    {account.min_deposit > 0 && (
                                      <div style={styles.accountRow}>
                                        <span style={styles.accountLabel}>Min. Deposit:</span>
                                        <span style={styles.accountValue}>
                                          ${parseFloat(account.min_deposit).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    <div style={styles.accountRow}>
                                      <span style={styles.accountLabel}>Created:</span>
                                      <span style={styles.accountValue}>
                                        {new Date(account.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {app.user_id && (!app.accounts || app.accounts.length === 0) && (
                          <div style={styles.noAccounts}>
                            <p style={styles.noAccountsText}>No accounts created yet for this user</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => toggleExpanded(app.id)}
                      style={styles.detailsButton}
                    >
                      {expandedApp === app.id ? '⬆️ Hide Details' : '⬇️ Show Details'}
                    </button>
                    <button
                      onClick={() => handleViewDocuments(app)}
                      style={styles.viewDocsButton}
                    >
                      📄 View Documents
                    </button>
                    <button
                      onClick={() => {
                        setApplicationToReject(app);
                        setShowRejectModal(true);
                      }}
                      disabled={processing === app.id || app.application_status !== 'pending'}
                      style={{
                        ...styles.rejectButton,
                        ...(processing === app.id || app.application_status !== 'pending' ? styles.buttonDisabled : {})
                      }}
                    >
                      {processing === app.id ? '⏳ Processing...' : '❌ Reject'}
                    </button>
                    <button
                      onClick={() => handleOpenApprovalModal(app)}
                      disabled={processing === app.id || app.application_status !== 'pending'}
                      style={{
                        ...styles.approveButton,
                        ...(processing === app.id || app.application_status !== 'pending' ? styles.buttonDisabled : {})
                      }}
                    >
                      {processing === app.id ? '⏳ Approving...' : '✅ Approve'}
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

        {showRejectModal && applicationToReject && (
          <div style={styles.modalOverlay} onClick={() => {
            setShowRejectModal(false);
            setApplicationToReject(null);
            setRejectionReason('');
          }}>
            <div style={styles.rejectModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.rejectHeader}>
                <h2 style={styles.rejectTitle}>❌ Reject Application</h2>
                <p style={styles.rejectSubtitle}>
                  Application ID: {applicationToReject.id}
                </p>
              </div>

              <div style={styles.rejectContent}>
                <p style={styles.rejectWarning}>
                  ⚠️ This will permanently reject the application and clear the applicant from the system.
                </p>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Rejection Reason (Optional)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    style={styles.textarea}
                    rows="4"
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setApplicationToReject(null);
                      setRejectionReason('');
                    }}
                    style={styles.cancelButton}
                    disabled={processing === applicationToReject.id}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectApplication}
                    style={styles.confirmRejectButton}
                    disabled={processing === applicationToReject.id}
                  >
                    {processing === applicationToReject.id ? '⏳ Rejecting...' : '❌ Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewingDocuments && (
          <div style={styles.modalOverlay} onClick={() => setViewingDocuments(null)}>
            <div style={styles.documentsModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.documentsHeader}>
                <h2 style={styles.documentsTitle}>📄 ID Documents</h2>
                <button onClick={() => setViewingDocuments(null)} style={styles.closeButton}>✕</button>
              </div>
              
              <div style={styles.documentsContent}>
                <p style={styles.documentsSubtitle}>
                  {viewingDocuments.first_name} {viewingDocuments.last_name} - {viewingDocuments.email}
                </p>

                {documentUrls.front || documentUrls.back ? (
                  <div style={styles.documentsGrid}>
                    {documentUrls.front && (
                      <div style={styles.documentImageContainer}>
                        <h4 style={styles.documentLabel}>Front Side</h4>
                        <img src={documentUrls.front} alt="ID Front" style={styles.documentImage} />
                        <a href={documentUrls.front} target="_blank" rel="noopener noreferrer" style={styles.downloadLink}>
                          📥 Download Front
                        </a>
                      </div>
                    )}
                    {documentUrls.back && (
                      <div style={styles.documentImageContainer}>
                        <h4 style={styles.documentLabel}>Back Side</h4>
                        <img src={documentUrls.back} alt="ID Back" style={styles.documentImage} />
                        <a href={documentUrls.back} target="_blank" rel="noopener noreferrer" style={styles.downloadLink}>
                          📥 Download Back
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={styles.noDocuments}>
                    <p style={styles.noDocumentsIcon}>📭</p>
                    <p style={styles.noDocumentsText}>No documents uploaded yet</p>
                  </div>
                )}
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
  linkSection: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
    marginBottom: '1rem',
    flexWrap: 'wrap'
  },
  accessLink: {
    flex: 1,
    minWidth: '200px',
    padding: '0.75rem 1rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  accessLinkSecondary: {
    flex: 1,
    minWidth: '200px',
    padding: '0.75rem 1rem',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
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
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  approveButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  rejectButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  buttonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
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
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem'
  },
  rejectModal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    margin: 'auto'
  },
  rejectHeader: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    padding: 'clamp(2rem, 6vw, 2.5rem) clamp(1.5rem, 4vw, 2rem)',
    textAlign: 'center'
  },
  rejectTitle: {
    fontSize: 'clamp(1.5rem, 5vw, 1.75rem)',
    fontWeight: '700',
    margin: '0 0 0.5rem 0'
  },
  rejectSubtitle: {
    fontSize: 'clamp(1rem, 3vw, 1.125rem)',
    opacity: 0.9,
    margin: 0
  },
  rejectContent: {
    padding: 'clamp(1.5rem, 4vw, 2rem)',
    overflowY: 'auto'
  },
  rejectWarning: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '12px',
    padding: '1rem',
    color: '#991b1b',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem'
  },
  confirmRejectButton: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.75rem, 3vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
    borderRadius: '12px',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
  },
  successModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    maxWidth: '450px',
    width: '100%',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '60px',
    color: '#2e7d32',
    marginBottom: '10px',
  },
  successTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1b5e20',
    margin: '0',
  },
  successMessage: {
    fontSize: '16px',
    color: '#333',
    lineHeight: '1.6',
    margin: '10px 0',
  },
  successCloseButton: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.75rem, 3vw, 1rem) clamp(2rem, 6vw, 3rem)',
    borderRadius: '12px',
    fontSize: 'clamp(1rem, 3vw, 1.125rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 8px 20px rgba(30, 60, 114, 0.3)',
    minWidth: '120px'
  },
  viewDocsButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  documentsModal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  documentsHeader: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: 'white',
    padding: 'clamp(2rem, 6vw, 2.5rem) clamp(1.5rem, 4vw, 2rem)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '20px 20px 0 0'
  },
  documentsTitle: {
    fontSize: 'clamp(1.5rem, 5vw, 1.75rem)',
    fontWeight: '700',
    margin: 0
  },
  documentsContent: {
    padding: 'clamp(1.5rem, 4vw, 2rem)',
  },
  documentsSubtitle: {
    fontSize: 'clamp(1rem, 3vw, 1.125rem)',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  documentInfo: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  documentImageContainer: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    textAlign: 'center'
  },
  documentLabel: {
    fontSize: 'clamp(1rem, 3vw, 1.125rem)',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  documentImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #e2e8f0'
  },
  downloadLink: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  noDocuments: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  noDocumentsIcon: {
    fontSize: 'clamp(3rem, 8vw, 4rem)',
    marginBottom: '1rem'
  },
  noDocumentsText: {
    fontSize: 'clamp(1rem, 3vw, 1.125rem)',
    color: '#64748b',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
    padding: 'clamp(1rem, 3vw, 20px)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: 'clamp(0.75rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '600',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: 'clamp(1.5rem, 4vw, 32px)',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    background: 'white',
    padding: '12px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '100px',
    padding: '10px 16px',
    background: '#f7fafc',
    border: '2px solid transparent',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#4a5568',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderColor: '#1e40af'
  },
  filtersSection: {
    background: 'white',
    padding: 'clamp(1rem, 3vw, 20px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  dateRangeSection: {
    background: 'white',
    padding: 'clamp(1rem, 3vw, 20px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  dateRangeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  dateRangeInputs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  dateInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dateLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#4a5568'
  },
  dateInput: {
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  clearDateButton: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
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
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  accountsSection: {
    marginTop: '20px',
    padding: '16px',
    background: '#ffffff',
    borderRadius: '8px',
    border: '2px solid #e2e8f0'
  },
  accountsSectionTitle: {
    fontSize: 'clamp(1rem, 2.5vw, 16px)',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  accountsGrid: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
  },
  accountCard: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    gap: '8px'
  },
  accountType: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  accountStatusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: 'clamp(0.7rem, 1.6vw, 11px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  accountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'clamp(0.8rem, 2vw, 13px)'
  },
  accountLabel: {
    color: '#718096',
    fontWeight: '500'
  },
  accountValue: {
    color: '#2d3748',
    fontWeight: '600',
    textAlign: 'right'
  },
  noAccounts: {
    marginTop: '16px',
    padding: '20px',
    textAlign: 'center',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px dashed #cbd5e0'
  },
  noAccountsText: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    margin: 0
  }
};