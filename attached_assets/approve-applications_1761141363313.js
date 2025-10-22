
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ApproveApplicationsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchApplications();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setError('');
      fetchApplications();
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
  };

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/applications');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch applications');
      }

      // Filter for pending applications
      const pendingApps = (result.applications || []).filter(
        app => app.application_status === 'pending'
      );
      
      setApplications(pendingApps);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId) => {
    if (!confirm('Are you sure you want to approve this application? This will create the user account and send the welcome email.')) {
      return;
    }

    setActionLoading({ ...actionLoading, [applicationId]: true });
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await fetch('/api/admin/approve-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          admin_password: ADMIN_PASSWORD
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage(`✅ Application approved! Welcome email sent to ${result.data.email}`);
        await fetchApplications();
      } else {
        setError(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      setError(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [applicationId]: false });
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🔐 Admin Access Required</h1>
          <p style={styles.subtitle}>Approve Applications</p>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter admin password"
                required
              />
            </div>
            {error && <div style={styles.errorMessage}>{error}</div>}
            <button type="submit" style={styles.loginButton}>
              🔓 Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>✅ Approve Applications</h1>
          <p style={styles.subtitle}>Review and approve pending applications</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchApplications} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading applications...</p>
        </div>
      ) : (
        <div style={styles.applicationsGrid}>
          {applications.map(app => (
            <div key={app.id} style={styles.applicationCard}>
              <div style={styles.applicationHeader}>
                <div>
                  <h3 style={styles.applicantName}>
                    {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                  </h3>
                  <p style={styles.applicantEmail}>{app.email}</p>
                </div>
                <span style={styles.statusBadge}>
                  {app.application_status}
                </span>
              </div>

              <div style={styles.applicationInfo}>
                <p><strong>Phone:</strong> {app.phone || 'N/A'}</p>
                <p><strong>DOB:</strong> {app.date_of_birth || 'N/A'}</p>
                <p><strong>Country:</strong> {app.country || 'N/A'}</p>
                <p><strong>Address:</strong> {app.address}, {app.city}, {app.state} {app.zip_code}</p>
                <p><strong>Employment:</strong> {app.employment_status || 'N/A'}</p>
                <p><strong>Income:</strong> {app.annual_income || 'N/A'}</p>
                <p><strong>Account Types:</strong> {app.account_types?.join(', ') || 'N/A'}</p>
                <p><strong>Submitted:</strong> {new Date(app.submitted_at).toLocaleString()}</p>
              </div>

              <div style={styles.actionButtons}>
                <button
                  onClick={() => handleApprove(app.id)}
                  disabled={actionLoading[app.id]}
                  style={styles.approveButton}
                >
                  {actionLoading[app.id] ? '⏳ Approving...' : '✅ Approve Application'}
                </button>
              </div>
            </div>
          ))}

          {applications.length === 0 && (
            <div style={styles.noData}>
              <p>No pending applications found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    background: '#10b981',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'white',
    fontSize: '18px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite'
  },
  errorMessage: {
    color: '#dc3545',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '10px'
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  applicationsGrid: {
    display: 'grid',
    gap: '20px'
  },
  applicationCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  applicationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  applicantName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  applicantEmail: {
    color: '#64748b',
    margin: 0,
    fontSize: '14px'
  },
  statusBadge: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  applicationInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginBottom: '20px',
    padding: '15px',
    background: '#f8fafc',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#475569'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #e2e8f0'
  },
  approveButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: 'white',
    fontSize: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px'
  },
  loginButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};
