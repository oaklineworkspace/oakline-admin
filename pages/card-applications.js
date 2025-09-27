
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AdminRoute from '../components/AdminRoute';

function AdminCardApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch card applications from Supabase with profile information
      const { data, error } = await supabase
        .from('card_applications')
        .select(`
          *,
          profiles!inner(
            full_name,
            email
          ),
          accounts!inner(
            account_number,
            account_type,
            balance
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        throw new Error(`Failed to fetch applications: ${error.message}`);
      }

      setApplications(data || []);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError(`Error loading applications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplication = async (applicationId, action) => {
    setProcessing(applicationId);
    setError('');
    setMessage('');
    
    try {
      const application = applications.find(app => app.id === applicationId);
      
      if (action === 'approve') {
        // Generate card number and details
        const cardNumber = generateCardNumber();
        const cvv = generateCVV();
        const expiryDate = generateExpiryDate();

        // Create card record
        const { error: cardError } = await supabase
          .from('cards')
          .insert({
            user_id: application.user_id,
            account_id: application.account_id,
            card_number: cardNumber,
            cvv: cvv,
            expiry_date: expiryDate,
            cardholder_name: application.cardholder_name,
            card_type: application.card_type || 'debit',
            status: 'active',
            is_locked: false,
            daily_limit: 1000.00,
            monthly_limit: 10000.00,
            daily_spent: 0.00,
            monthly_spent: 0.00,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (cardError) throw cardError;

        // Update application status
        const { error: updateError } = await supabase
          .from('card_applications')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (updateError) throw updateError;

        setMessage(`✅ Card application approved! Card number: ${cardNumber}`);
      } else {
        // Reject application
        const { error: updateError } = await supabase
          .from('card_applications')
          .update({ 
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (updateError) throw updateError;

        setMessage('❌ Card application rejected.');
      }

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: user?.id,
          action: `card_application_${action}d`,
          target_type: 'card_application',
          target_id: applicationId,
          details: {
            cardholder_name: application.cardholder_name,
            card_type: application.card_type,
            action: action
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        console.warn('Audit log error:', auditError);
      }

      // Update local state
      setApplications(apps =>
        apps.map(app =>
          app.id === applicationId
            ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' }
            : app
        )
      );

    } catch (err) {
      console.error('Error processing application:', err);
      setError(`Error processing application: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  // Helper functions for card generation
  const generateCardNumber = () => {
    const prefix = '4532'; // Visa prefix
    const remaining = Array.from({length: 12}, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}${remaining}`;
  };

  const generateCVV = () => {
    return Array.from({length: 3}, () => Math.floor(Math.random() * 10)).join('');
  };

  const generateExpiryDate = () => {
    const currentDate = new Date();
    const expiryYear = currentDate.getFullYear() + 4;
    const expiryMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${expiryMonth}/${expiryYear}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>💳 Debit Card Applications</h1>
          <p style={styles.subtitle}>Review and process card applications</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchApplications} style={styles.refreshButton} disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <Link href="/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {loading && <div style={styles.loading}>Loading applications...</div>}
      {error && <div style={styles.errorMessage}>{error}</div>}
      {message && <div style={styles.successMessage}>{message}</div>}

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
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      app.status === 'pending'
                        ? '#fbbf24'
                        : app.status === 'approved'
                        ? '#10b981'
                        : '#ef4444',
                  }}
                >
                  {app.status}
                </span>
              </div>

              <div style={styles.applicationDetails}>
                <div style={styles.detailRow}>
                  <span>Applicant:</span>
                  <span>{app.cardholder_name}</span>
                </div>
                <div style={styles.detailRow}>
                  <span>Profile Name:</span>
                  <span>{app.profiles?.full_name || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span>Email:</span>
                  <span>{app.profiles?.email || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span>Account:</span>
                  <span>{app.accounts?.account_number || 'N/A'} ({app.accounts?.account_type || 'N/A'})</span>
                </div>
                <div style={styles.detailRow}>
                  <span>Account Balance:</span>
                  <span>${parseFloat(app.accounts?.balance || 0).toFixed(2)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span>Applied:</span>
                  <span>{new Date(app.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {app.status === 'pending' && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => handleApplication(app.id, 'approve')}
                    style={styles.approveButton}
                    disabled={processing === app.id}
                  >
                    {processing === app.id ? 'Processing...' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => handleApplication(app.id, 'reject')}
                    style={styles.rejectButton}
                    disabled={processing === app.id}
                  >
                    {processing === app.id ? 'Processing...' : '❌ Reject'}
                  </button>
                </div>
              )}

              {app.status === 'approved' && (
                <div style={styles.statusInfo}>
                  ✅ Approved on {new Date(app.approved_at || app.updated_at).toLocaleDateString()}
                </div>
              )}

              {app.status === 'rejected' && (
                <div style={styles.statusInfo}>
                  ❌ Rejected on {new Date(app.rejected_at || app.updated_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CardApplicationsPage() {
  return (
    <AdminRoute>
      <AdminCardApplications />
    </AdminRoute>
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
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#555',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  errorMessage: {
    color: '#dc3545',
    background: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  successMessage: {
    color: '#155724',
    background: '#d4edda',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  applicationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '25px'
  },
  noApplications: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  applicationCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  applicationTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  statusBadge: {
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  applicationDetails: {
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  approveButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    flex: 1
  },
  rejectButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    flex: 1
  },
  statusInfo: {
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#666',
    textAlign: 'center'
  }
};
