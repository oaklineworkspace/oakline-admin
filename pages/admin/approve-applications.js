import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth'; // Import AdminAuth component

export default function ApproveApplications() {
  // Removed 'isAuthenticated' state as it's now managed by AdminAuth
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedApp, setExpandedApp] = useState(null);
  // Removed 'router' import as it's no longer directly used for navigation

  useEffect(() => {
    // Removed the localStorage check and router.push logic
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

  const handleApprove = async (applicationId) => {
    if (!confirm('Are you sure you want to approve this application? This will create the user, accounts, and cards.')) {
      return;
    }

    setProcessing(applicationId);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/approve-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Approval failed:', result);
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Failed to approve application';
        throw new Error(errorMessage);
      }

      setSuccessMessage(
        `Application approved successfully! ${result.data.userCreated ? 'User created with temporary password.' : 'Existing user updated.'}`
      );

      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      setError('Failed to approve application: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const toggleExpanded = (appId) => {
    setExpandedApp(expandedApp === appId ? null : appId);
  };

  return (
    // Wrap the entire component content with AdminAuth for authentication
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Approve Applications</h1>
            <p style={styles.subtitle}>Review and approve pending user applications</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchApplications} style={styles.refreshButton} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            {/* Updated Link href */}
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

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
                        <span style={styles.infoLabel}>Accounts:</span>
                        <span style={styles.infoValue}>
                          {app.account_types.join(', ')}
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
                          {app.mothers_maiden_name && (
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Mother's Maiden Name:</span>
                              <span style={styles.detailValue}>{app.mothers_maiden_name}</span>
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
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Agree to Terms:</span>
                            <span style={styles.detailValue}>{app.agree_to_terms ? '✅ Yes' : '❌ No'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => toggleExpanded(app.id)}
                      style={styles.detailsButton}
                    >
                      {expandedApp === app.id ? 'Hide Details' : 'Show Details'}
                    </button>
                    <button
                      onClick={() => handleApprove(app.id)}
                      style={styles.approveButton}
                      disabled={processing === app.id}
                    >
                      {processing === app.id ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    padding: '20px',
  },
  header: {
    background: 'white',
    padding: '24px',
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
    fontSize: '28px',
    color: '#1a202c',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: '14px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  refreshButton: {
    padding: '10px 20px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  backButton: {
    padding: '10px 20px',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
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
    fontSize: '14px',
    fontWeight: '500',
  },
  successBanner: {
    background: '#c6f6d5',
    color: '#2f855a',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  loadingText: {
    textAlign: 'center',
    color: '#718096',
    fontSize: '16px',
    padding: '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyStateIcon: {
    fontSize: '64px',
    margin: '0 0 16px 0',
  },
  emptyStateText: {
    fontSize: '20px',
    color: '#2d3748',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  emptyStateSubtext: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  applicationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  },
  applicationCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    background: '#fafafa',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  applicantName: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    color: '#1a202c',
    fontWeight: '600',
  },
  applicantEmail: {
    margin: 0,
    fontSize: '14px',
    color: '#718096',
  },
  statusBadge: {
    padding: '4px 12px',
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
  },
  infoLabel: {
    color: '#718096',
    fontWeight: '500',
  },
  infoValue: {
    color: '#2d3748',
    fontWeight: '600',
  },
  expandedDetails: {
    marginTop: '16px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
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
    fontSize: '12px',
    color: '#718096',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '14px',
    color: '#2d3748',
  },
  cardFooter: {
    display: 'flex',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  detailsButton: {
    flex: 1,
    padding: '10px',
    background: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  approveButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  // The rest of the styles are unchanged and included for completeness.
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  loginCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  error: {
    color: '#c53030',
    fontSize: '14px',
    textAlign: 'center',
  },
  loginButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};