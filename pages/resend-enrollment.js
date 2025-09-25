
import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../lib/supabaseClient';

export default function ResendEnrollmentPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [resendingId, setResendingId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      // Get all applications with their user status
      const { data: applicationsData, error: appsError } = await supabaseAdmin
        .from('applications')
        .select(`
          id,
          email,
          first_name,
          middle_name,
          last_name,
          created_at,
          country
        `)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Get users table to check auth status
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('application_id, email, created_at, is_active');

      if (usersError) {
        console.warn('Users table query failed:', usersError);
      }

      // Get enrollment records
      const { data: enrollmentsData, error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .select('application_id, email, is_used, created_at');

      if (enrollError) {
        console.warn('Enrollments table query failed:', enrollError);
      }

      // Check Supabase Auth users
      const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
      
      // Combine data
      const enrichedApplications = applicationsData.map(app => {
        const userRecord = usersData?.find(u => u.application_id === app.id);
        const enrollmentRecord = enrollmentsData?.find(e => e.application_id === app.id || e.email === app.email);
        const authUser = authUsersData?.users?.find(u => u.email === app.email);
        
        let status = 'pending';
        if (authUser && userRecord?.is_active) {
          status = 'completed';
        } else if (authUser) {
          status = 'auth_created';
        } else if (enrollmentRecord) {
          status = 'enrollment_sent';
        }

        return {
          ...app,
          status,
          user_record: userRecord,
          enrollment_record: enrollmentRecord,
          auth_user: authUser
        };
      });

      setApplications(enrichedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setMessage('Error loading applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEnrollment = async (application) => {
    setResendingId(application.id);
    setMessage('');

    try {
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

      const result = await response.json();

      if (response.ok) {
        setMessage(`Enrollment link sent successfully to ${application.email}!`);
        fetchApplications(); // Refresh the list
      } else {
        setMessage(`Error: ${result.error || 'Failed to send enrollment link'}`);
      }
    } catch (error) {
      console.error('Error resending enrollment:', error);
      setMessage('Error sending enrollment link');
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
        return 'Completed';
      case 'auth_created':
        return 'Auth Created';
      case 'enrollment_sent':
        return 'Link Sent';
      default:
        return 'Pending';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading applications...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Resend Enrollment Links</h1>
        <p>Generate and send magic links for users to complete their enrollment</p>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.includes('Error') ? '#fee2e2' : '#d1fae5',
          color: message.includes('Error') ? '#dc2626' : '#059669'
        }}>
          {message}
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <h3>Total Applications</h3>
          <p>{applications.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Completed</h3>
          <p>{applications.filter(app => app.status === 'completed').length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Pending</h3>
          <p>{applications.filter(app => app.status === 'pending').length}</p>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.headerCell}>Name</th>
              <th style={styles.headerCell}>Email</th>
              <th style={styles.headerCell}>Application Date</th>
              <th style={styles.headerCell}>Status</th>
              <th style={styles.headerCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} style={styles.row}>
                <td style={styles.cell}>
                  {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                </td>
                <td style={styles.cell}>{app.email}</td>
                <td style={styles.cell}>
                  {new Date(app.created_at).toLocaleDateString()}
                </td>
                <td style={styles.cell}>
                  <span style={{
                    ...styles.statusBadge,
                    ...getStatusColor(app.status)
                  }}>
                    {getStatusText(app.status)}
                  </span>
                </td>
                <td style={styles.cell}>
                  <button
                    onClick={() => handleResendEnrollment(app)}
                    disabled={resendingId === app.id}
                    style={{
                      ...styles.button,
                      opacity: resendingId === app.id ? 0.5 : 1,
                      cursor: resendingId === app.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {resendingId === app.id ? 'Sending...' : 'Send Link'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {applications.length === 0 && (
          <div style={styles.noData}>
            No applications found.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '18px'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    textAlign: 'center',
    fontWeight: '500'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  headerRow: {
    backgroundColor: '#f8fafc'
  },
  headerCell: {
    padding: '1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '2px solid #e5e7eb'
  },
  row: {
    borderBottom: '1px solid #e5e7eb'
  },
  cell: {
    padding: '1rem',
    verticalAlign: 'middle'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  noData: {
    textAlign: 'center',
    padding: '2rem',
    color: '#6b7280'
  }
};
