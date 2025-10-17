
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ResendEnrollmentPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, completed

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      console.log('Fetching applications...');
      
      // Fetch applications directly from Supabase with better error handling
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .order('submitted_at', { ascending: false });

      console.log('Applications data:', appsData);
      console.log('Applications error:', appsError);

      if (appsError) {
        console.error('Applications fetch error:', appsError);
        setMessage('Error loading applications: ' + appsError.message);
        setLoading(false);
        return;
      }

      if (!appsData || appsData.length === 0) {
        setApplications([]);
        setMessage('No applications found');
        setLoading(false);
        return;
      }

      // Fetch enrollments with error handling
      const { data: enrollmentsData, error: enrollError } = await supabase
        .from('enrollments')
        .select('*');

      console.log('Enrollments data:', enrollmentsData);
      if (enrollError) {
        console.error('Enrollments fetch error:', enrollError);
      }

      // Fetch profiles to check enrollment status with error handling
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, enrollment_completed');

      console.log('Profiles data:', profilesData);
      if (profileError) {
        console.error('Profiles fetch error:', profileError);
      }

      // Combine data
      const enrichedApps = appsData.map(app => {
        const enrollment = enrollmentsData?.find(e => e.email === app.email);
        const profile = profilesData?.find(p => p.email === app.email);
        
        let status = 'pending';
        if (profile?.enrollment_completed) {
          status = 'completed';
        } else if (enrollment) {
          status = 'enrollment_sent';
        }
        
        return {
          ...app,
          status,
          enrollment_completed: profile?.enrollment_completed || false
        };
      });

      console.log('Enriched applications:', enrichedApps);
      setApplications(enrichedApps);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setMessage('Error loading applications: ' + (error?.message || 'Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEnrollment = async (application) => {
    // Check if enrollment is already completed
    if (application.enrollment_completed) {
      setMessage(`❌ User has completed enrollment. Cannot resend link.`);
      return;
    }

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
        setMessage(`✅ Enrollment link sent successfully to ${application.email}!`);
        fetchApplications();
      } else {
        setMessage(`❌ Error: ${result.error || 'Failed to send enrollment link'}`);
      }
    } catch (error) {
      console.error('Error resending enrollment:', error);
      setMessage('❌ Error sending enrollment link');
    } finally {
      setResendingId(null);
    }
  };

  const getEnrollmentStatus = (app) => {
    if (app.enrollment_completed) return 'completed';
    if (app.status === 'auth_created' || app.status === 'enrollment_sent') return 'pending';
    return 'not_sent';
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: { bg: '#d1fae5', color: '#065f46', text: '✓ Completed' },
      pending: { bg: '#fef3c7', color: '#92400e', text: '⏳ Pending' },
      not_sent: { bg: '#fee2e2', color: '#991b1b', text: '✉️ Not Sent' }
    };
    const style = styles[status] || styles.not_sent;
    
    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
        whiteSpace: 'nowrap'
      }}>
        {style.text}
      </span>
    );
  };

  const filteredApps = applications.filter(app => {
    if (filter === 'all') return true;
    const enrollStatus = getEnrollmentStatus(app);
    if (filter === 'pending') return enrollStatus === 'pending';
    if (filter === 'completed') return enrollStatus === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📧 Enrollment Management</h1>
        <p style={styles.subtitle}>Send and manage enrollment links for applicants</p>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
          color: message.includes('✅') ? '#065f46' : '#991b1b'
        }}>
          {message}
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{applications.length}</div>
          <div style={styles.statLabel}>Total Applications</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {applications.filter(app => getEnrollmentStatus(app) === 'completed').length}
          </div>
          <div style={styles.statLabel}>Completed</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {applications.filter(app => getEnrollmentStatus(app) === 'pending').length}
          </div>
          <div style={styles.statLabel}>Pending</div>
        </div>
      </div>

      <div style={styles.filterBar}>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.filterButtonActive : {})
          }}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          style={{
            ...styles.filterButton,
            ...(filter === 'pending' ? styles.filterButtonActive : {})
          }}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('completed')}
          style={{
            ...styles.filterButton,
            ...(filter === 'completed' ? styles.filterButtonActive : {})
          }}
        >
          Completed
        </button>
      </div>

      <div style={styles.tableContainer}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.headerCell}>User</th>
                <th style={styles.headerCell}>Email</th>
                <th style={styles.headerCell}>Application Date</th>
                <th style={styles.headerCell}>Enrollment Status</th>
                <th style={styles.headerCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr key={app.id} style={styles.row}>
                  <td style={styles.cell}>
                    <div style={styles.userName}>
                      {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                    </div>
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.email}>{app.email}</div>
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.date}>
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : (app.created_at ? new Date(app.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A')}
                    </div>
                  </td>
                  <td style={styles.cell}>
                    {getStatusBadge(getEnrollmentStatus(app))}
                  </td>
                  <td style={styles.cell}>
                    <button
                      onClick={() => handleResendEnrollment(app)}
                      disabled={resendingId === app.id || app.enrollment_completed}
                      style={{
                        ...styles.actionButton,
                        opacity: (resendingId === app.id || app.enrollment_completed) ? 0.6 : 1,
                        cursor: (resendingId === app.id || app.enrollment_completed) ? 'not-allowed' : 'pointer',
                        backgroundColor: app.enrollment_completed ? '#6b7280' : '#1a365d'
                      }}
                    >
                      {app.enrollment_completed ? '✅ Completed' : resendingId === app.id ? '⏳ Sending...' : '📧 Send Link'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredApps.length === 0 && (
            <div style={styles.noData}>
              <div style={styles.noDataIcon}>📭</div>
              <p>No applications found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '1rem',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center'
  },
  title: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: 'clamp(14px, 3vw, 16px)',
    color: '#64748b'
  },
  loading: {
    textAlign: 'center',
    padding: '4rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a365d',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: 'clamp(28px, 6vw, 36px)',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  statLabel: {
    fontSize: 'clamp(12px, 3vw, 14px)',
    color: '#64748b',
    fontWeight: '500'
  },
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: 'white',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    backgroundColor: '#1a365d',
    color: 'white',
    borderColor: '#1a365d'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '600px'
  },
  headerRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0'
  },
  headerCell: {
    padding: '1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#475569',
    fontSize: 'clamp(12px, 3vw, 14px)',
    whiteSpace: 'nowrap'
  },
  row: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s'
  },
  cell: {
    padding: '1rem',
    verticalAlign: 'middle',
    fontSize: 'clamp(13px, 3vw, 14px)'
  },
  userName: {
    fontWeight: '600',
    color: '#1a365d'
  },
  email: {
    color: '#64748b'
  },
  date: {
    color: '#64748b',
    fontSize: 'clamp(12px, 3vw, 13px)'
  },
  actionButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 3vw, 14px)',
    fontWeight: '600',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  noData: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  noDataIcon: {
    fontSize: '48px',
    marginBottom: '1rem'
  }
};
