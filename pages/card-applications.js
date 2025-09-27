
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminCardApplications() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      checkAdminAccess();
    }
  }, [authLoading, user]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || !['admin', 'superadmin', 'auditor'].includes(profile.role)) {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      fetchApplications();
    } catch (error) {
      console.error('Admin access error:', error);
      setError('Unable to verify admin access.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/get-card-applications');
      const data = await response.json();
      if (data.success) setApplications(data.applications);
      else setError('Failed to fetch applications');
    } catch (err) {
      console.error(err);
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
        headers: { 'Content-Type': 'application/json' },
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
      } else setError(data.error || 'Failed to process application');
    } catch (err) {
      console.error(err);
      setError('Error processing application');
    } finally {
      setProcessing(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🏦 Card Applications Admin</h1>
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
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.loginButton}>
              🔐 Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
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
                  <span>User ID:</span>
                  <span>{app.user_id}</span>
                </div>
                <div style={styles.detailRow}>
                  <span>Account ID:</span>
                  <span>{app.account_id}</span>
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
                  ✅ Approved on {new Date(app.approved_at).toLocaleDateString()}
                </div>
              )}

              {app.status === 'rejected' && (
                <div style={styles.statusInfo}>
                  ❌ Rejected on {new Date(app.rejected_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ... keep your styles object here
