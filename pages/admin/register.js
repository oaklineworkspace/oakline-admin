
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AdminRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  const checkSuperAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return;
      }

      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!adminProfile || adminProfile.role !== 'super_admin') {
        router.push('/admin/dashboard');
        return;
      }

      setCurrentAdmin(adminProfile);
    } catch (err) {
      console.error('Access check error:', err);
      router.push('/admin/login');
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin');
      }

      setSuccess(`Admin created successfully! Email: ${formData.email}`);
      setFormData({ email: '', password: '', confirmPassword: '', role: 'admin' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Verifying permissions...</p>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        <div style={styles.registerCard}>
          <div style={styles.headerSection}>
            <div style={styles.iconWrapper}>
              <span style={styles.icon}>👥</span>
            </div>
            <h1 style={styles.title}>Create Admin Account</h1>
            <p style={styles.subtitle}>Add new administrator to Oakline Bank</p>
            <div style={styles.badge}>
              <span style={styles.badgeIcon}>👑</span>
              <span style={styles.badgeText}>Super Admin Only</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="admin@oaklinebank.com"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="Re-enter password"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Role & Permissions</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="admin">👤 Admin - View transactions & users</option>
                <option value="manager">📊 Manager - Approve users & applications</option>
                <option value="super_admin">👑 Super Admin - Full system access</option>
              </select>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span style={styles.errorIcon}>⚠️</span>
                <p style={styles.errorText}>{error}</p>
              </div>
            )}

            {success && (
              <div style={styles.successBox}>
                <span style={styles.successIcon}>✅</span>
                <p style={styles.successText}>{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {})
              }}
            >
              {loading ? (
                <>
                  <span style={styles.buttonSpinner}></span>
                  Creating Admin...
                </>
              ) : (
                <>
                  <span>➕</span>
                  Create Admin Account
                </>
              )}
            </button>
          </form>

          <div style={styles.footer}>
            <button
              onClick={() => router.push('/admin/dashboard')}
              style={styles.backButton}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  },
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #FFC857',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    color: '#ffffff',
    fontSize: '1.25rem',
    fontWeight: '600'
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '520px',
    zIndex: 1
  },
  registerCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '3rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 200, 87, 0.2)'
  },
  headerSection: {
    textAlign: 'center',
    marginBottom: '2.5rem'
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    margin: '0 auto 1.5rem',
    background: 'linear-gradient(135deg, #FFC857 0%, #FFD687 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(255, 200, 87, 0.4)'
  },
  icon: {
    fontSize: '2.5rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1A3E6F',
    marginBottom: '0.5rem',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: '500',
    marginBottom: '1rem'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #FFC857 0%, #FFD687 100%)',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1A3E6F',
    boxShadow: '0 4px 12px rgba(255, 200, 87, 0.3)'
  },
  badgeIcon: {
    fontSize: '1rem'
  },
  badgeText: {},
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1A3E6F',
    marginBottom: '0.25rem'
  },
  input: {
    width: '100%',
    padding: '1rem 1.25rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#1e293b',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '1rem 1.25rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#1e293b',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    backgroundColor: '#ffffff'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1.25rem',
    background: 'linear-gradient(135deg, #FFC857 0%, #FFD687 100%)',
    color: '#1A3E6F',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(255, 200, 87, 0.4)',
    marginTop: '1rem'
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  buttonSpinner: {
    width: '18px',
    height: '18px',
    border: '3px solid rgba(26, 62, 111, 0.3)',
    borderTop: '3px solid #1A3E6F',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#fef2f2',
    border: '2px solid #fca5a5',
    borderRadius: '12px'
  },
  errorIcon: {
    fontSize: '1.25rem',
    flexShrink: 0
  },
  errorText: {
    fontSize: '0.95rem',
    color: '#dc2626',
    fontWeight: '600',
    margin: 0
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#f0fdf4',
    border: '2px solid #86efac',
    borderRadius: '12px'
  },
  successIcon: {
    fontSize: '1.25rem',
    flexShrink: 0
  },
  successText: {
    fontSize: '0.95rem',
    color: '#059669',
    fontWeight: '600',
    margin: 0
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#1A3E6F',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease'
  }
};
