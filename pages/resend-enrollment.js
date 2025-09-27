
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AdminRoute from '../components/AdminRoute';

function ResendEnrollmentPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all applications from the applications table
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          email,
          first_name,
          middle_name,
          last_name,
          created_at,
          country,
          status
        `)
        .order('created_at', { ascending: false });

      if (appsError) {
        console.error('Applications fetch error:', appsError);
        throw appsError;
      }

      // Fetch user profiles to check enrollment status
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at, is_active');

      if (profilesError) {
        console.warn('Profiles fetch error:', profilesError);
      }

      // Fetch enrollment records from enrollments table if it exists
      const { data: enrollmentsData, error: enrollError } = await supabase
        .from('enrollments')
        .select('application_id, email, is_used, created_at');

      if (enrollError) {
        console.warn('Enrollments table query failed:', enrollError);
      }

      // Get Supabase Auth users to check authentication status
      let authUsersData = [];
      try {
        const { data: authData } = await supabase.auth.admin.listUsers();
        authUsersData = authData?.users || [];
      } catch (authError) {
        console.warn('Auth users fetch failed:', authError);
      }

      // Combine data to determine enrollment status
      const enrichedApplications = applicationsData?.map(app => {
        const profileRecord = profilesData?.find(p => p.email === app.email);
        const enrollmentRecord = enrollmentsData?.find(e => 
          e.application_id === app.id || e.email === app.email
        );
        const authUser = authUsersData.find(u => u.email === app.email);
        
        // Determine enrollment status
        let enrollmentStatus = 'pending';
        if (authUser && profileRecord?.is_active) {
          enrollmentStatus = 'completed';
        } else if (authUser) {
          enrollmentStatus = 'auth_created';
        } else if (enrollmentRecord) {
          enrollmentStatus = 'enrollment_sent';
        }

        return {
          ...app,
          enrollmentStatus,
          profile_record: profileRecord,
          enrollment_record: enrollmentRecord,
          auth_user: authUser
        };
      }) || [];

      setApplications(enrichedApplications);

    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEnrollment = async (application) => {
    setResendingId(application.id);
    setMessage('');
    setError('');

    try {
      // Create enrollment record in Supabase
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .upsert({
          application_id: application.id,
          email: application.email,
          first_name: application.first_name,
          middle_name: application.middle_name,
          last_name: application.last_name,
          country: application.country,
          is_used: false,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'application_id'
        })
        .select()
        .single();

      if (enrollmentError) {
        throw enrollmentError;
      }

      // Here you would typically call an API endpoint to send the enrollment email
      // For now, we'll simulate the email sending process
      const response = await fetch('/api/resend-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId: application.id,
          email: application.email,
          firstName: application.first_name,
          middleName: application.middle_name,
          lastName: application.last_name,
          country: application.country
        })
      });

      if (response.ok) {
        setMessage(`✅ Enrollment link sent successfully to ${application.email}!`);
        // Refresh the applications list
        await fetchApplications();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send enrollment link');
      }

    } catch (error) {
      console.error('Error resending enrollment:', error);
      setError(`❌ Failed to send enrollment link: ${error.message}`);
    } finally {
      setResendingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return { backgroundColor: '#d1fae5', color: '#059669' };
      case 'auth_created':
        return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
      case 'enrollment_sent':
        return { backgroundColor: '#fef3c7', color: '#d97706' };
      default:
        return { backgroundColor: '#fee2e2', color: '#dc2626' };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return '✅ Completed';
      case 'auth_created':
        return '🔐 Auth Created';
      case 'enrollment_sent':
        return '📧 Link Sent';
      default:
        return '⏳ Pending';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading applications...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>📧 Resend Enrollment Links</h1>
          <p style={styles.subtitle}>Generate and send magic links for users to complete their enrollment</p>
          <p style={styles.welcomeText}>Admin: {user?.email}</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchApplications} style={styles.refreshButton} disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
            🏠 Dashboard
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {message && (
        <div style={styles.successMessage}>
          {message}
        </div>
      )}

      {/* Statistics Cards */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>{applications.length}</h3>
            <p style={styles.statLabel}>Total Applications</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>
              {applications.filter(app => app.enrollmentStatus === 'completed').length}
            </h3>
            <p style={styles.statLabel}>Completed</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📧</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>
              {applications.filter(app => app.enrollmentStatus === 'enrollment_sent').length}
            </h3>
            <p style={styles.statLabel}>Link Sent</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>
              {applications.filter(app => app.enrollmentStatus === 'pending').length}
            </h3>
            <p style={styles.statLabel}>Pending</p>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <h2 style={styles.tableTitle}>📋 Application Enrollment Status</h2>
          <p style={styles.tableSubtitle}>Manage user enrollment links and track completion status</p>
        </div>

        {applications.length === 0 ? (
          <div style={styles.noData}>
            <div style={styles.noDataIcon}>📭</div>
            <h3>No Applications Found</h3>
            <p>There are currently no applications in the system.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.headerCell}>👤 Name</th>
                <th style={styles.headerCell}>📧 Email</th>
                <th style={styles.headerCell}>📅 Application Date</th>
                <th style={styles.headerCell}>🌍 Country</th>
                <th style={styles.headerCell}>📊 Status</th>
                <th style={styles.headerCell}>⚡ Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} style={styles.row}>
                  <td style={styles.cell}>
                    <div style={styles.nameCell}>
                      <strong>
                        {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                      </strong>
                    </div>
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.emailCell}>{app.email}</div>
                  </td>
                  <td style={styles.cell}>
                    {new Date(app.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td style={styles.cell}>
                    <span style={styles.countryBadge}>{app.country || 'N/A'}</span>
                  </td>
                  <td style={styles.cell}>
                    <span style={{
                      ...styles.statusBadge,
                      ...getStatusColor(app.enrollmentStatus)
                    }}>
                      {getStatusText(app.enrollmentStatus)}
                    </span>
                  </td>
                  <td style={styles.cell}>
                    <button
                      onClick={() => handleResendEnrollment(app)}
                      disabled={resendingId === app.id || app.enrollmentStatus === 'completed'}
                      style={{
                        ...styles.actionButton,
                        ...(resendingId === app.id ? styles.actionButtonLoading : {}),
                        ...(app.enrollmentStatus === 'completed' ? styles.actionButtonDisabled : {})
                      }}
                    >
                      {resendingId === app.id ? '📤 Sending...' : 
                       app.enrollmentStatus === 'completed' ? '✅ Complete' : '📧 Send Link'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Help Section */}
      <div style={styles.helpSection}>
        <h3 style={styles.helpTitle}>💡 Help & Information</h3>
        <div style={styles.helpGrid}>
          <div style={styles.helpCard}>
            <h4>📧 Enrollment Process</h4>
            <p>Send magic links to users who haven't completed their enrollment. The link allows them to set up their account and complete registration.</p>
          </div>
          <div style={styles.helpCard}>
            <h4>📊 Status Meanings</h4>
            <ul style={styles.helpList}>
              <li><strong>Pending:</strong> No enrollment link sent yet</li>
              <li><strong>Link Sent:</strong> Enrollment link has been sent</li>
              <li><strong>Auth Created:</strong> User account created but not active</li>
              <li><strong>Completed:</strong> Full enrollment completed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResendEnrollment() {
  return (
    <AdminRoute>
      <ResendEnrollmentPage />
    </AdminRoute>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: '20px',
    paddingBottom: '80px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '20px'
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  welcomeText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'transform 0.2s'
  },
  backButton: {
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none'
  },
  errorMessage: {
    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    color: '#dc2626',
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #fecaca',
    fontSize: '14px',
    fontWeight: '500'
  },
  successMessage: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    color: '#166534',
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #bbf7d0',
    fontSize: '14px',
    fontWeight: '500'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    padding: '25px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    border: '1px solid rgba(30, 58, 95, 0.1)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  statIcon: {
    fontSize: '2.5rem',
    display: 'block'
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    textAlign: 'left'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3a5f',
    margin: '0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    margin: '0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginBottom: '30px'
  },
  tableHeader: {
    padding: '25px',
    borderBottom: '2px solid #f1f5f9',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
  },
  tableTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 8px 0'
  },
  tableSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  headerRow: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  },
  headerCell: {
    padding: '16px 20px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
    borderBottom: '2px solid #e5e7eb'
  },
  row: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  cell: {
    padding: '16px 20px',
    verticalAlign: 'middle',
    fontSize: '14px'
  },
  nameCell: {
    fontWeight: '500',
    color: '#1f2937'
  },
  emailCell: {
    color: '#4f46e5',
    fontFamily: 'monospace'
  },
  countryBadge: {
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    color: '#1e40af',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
    minWidth: '80px',
    display: 'inline-block'
  },
  actionButton: {
    background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '100px'
  },
  actionButtonLoading: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    cursor: 'not-allowed'
  },
  actionButtonDisabled: {
    background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    cursor: 'not-allowed'
  },
  noData: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b'
  },
  noDataIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  },
  helpSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
  },
  helpTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px'
  },
  helpGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  helpCard: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  helpList: {
    margin: '10px 0',
    paddingLeft: '20px',
    fontSize: '14px',
    lineHeight: '1.6'
  }
};
