import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';

export default function AdminCardApplications() {
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/get-card-applications');
      const data = await response.json();
      
      if (data.success) {
        setApplications(data.applications);
      } else {
        setError('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApplication = async (applicationId, action) => {
    setProcessing(applicationId);
    try {
      const response = await fetch('/api/admin/approve-card-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId, action }),
      });

      const data = await response.json();
      
      if (data.success) {
        setApplications(apps => 
          apps.map(app => 
            app.id === applicationId 
              ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' }
              : app
          )
        );
      } else {
        setError(data.error || 'Failed to process application');
      }
    } catch (error) {
      console.error('Error processing application:', error);
      setError('Error processing application');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💳 Debit Card Applications</h1>
          <div style={styles.headerActions}>
            <button onClick={fetchApplications} style={styles.refreshButton}>
              🔄 Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {loading && <div style={styles.loading}>Loading applications...</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.applicationsGrid}>
          {applications.length === 0 && !loading ? (
            <div style={styles.noApplications}>
              <h3>No card applications found</h3>
              <p>Applications will appear here when users apply for debit cards.</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} style={styles.applicationCard}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.applicationTitle}>
                    {app.card_type || 'Debit Card'} Application
                  </h3>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: app.status === 'pending' ? '#fbbf24' : 
                                   app.status === 'approved' ? '#10b981' : '#ef4444'
                  }}>
                    {app.status}
                  </span>
                </div>

                <div style={styles.applicationDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Applicant:</span>
                    <span>{app.users?.name || 'Unknown'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Email:</span>
                    <span>{app.users?.email || 'N/A'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Account:</span>
                    <span>{app.accounts?.account_type} - ****{app.accounts?.account_number?.slice(-4)}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Balance:</span>
                    <span>${parseFloat(app.accounts?.balance || 0).toFixed(2)}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Applied:</span>
                    <span>{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div style={styles.actionButtons}>
                    <button
                      style={styles.approveButton}
                      onClick={() => handleApplication(app.id, 'approve')}
                      disabled={processing === app.id}
                    >
                      {processing === app.id ? '⏳ Processing...' : '✅ Approve'}
                    </button>
                    <button
                      style={styles.rejectButton}
                      onClick={() => handleApplication(app.id, 'reject')}
                      disabled={processing === app.id}
                    >
                      {processing === app.id ? '⏳ Processing...' : '❌ Reject'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  refreshButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none'
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    fontSize: '18px',
    color: '#666'
  },
  error: {
    color: '#dc3545',
    background: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  applicationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px'
  },
  noApplications: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#666'
  },
  applicationCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  applicationTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  statusBadge: {
    padding: '5px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  applicationDetails: {
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee'
  },
  label: {
    fontWeight: '500',
    color: '#555'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px'
  },
  approveButton: {
    flex: 1,
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  rejectButton: {
    flex: 1,
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500'
  }
};
