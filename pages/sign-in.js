
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        // Check if user is banned
        if (authError.message?.toLowerCase().includes('banned') || authError.message?.toLowerCase().includes('user is banned')) {
          // Fetch the professional ban message from profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('ban_display_message, is_banned, status')
            .eq('email', formData.email)
            .single();

          if (profile?.is_banned && profile?.ban_display_message) {
            throw new Error(profile.ban_display_message);
          } else if (profile?.status === 'suspended' && profile?.ban_display_message) {
            throw new Error(profile.ban_display_message);
          }
        }
        throw authError;
      }

      // Check if user's account is locked or in other restricted status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, status, ban_display_message')
        .eq('id', authData.user.id)
        .single();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        throw new Error(profile.ban_display_message || 'Your account has been restricted. Please contact support.');
      }

      if (profile?.status && !['active', 'pending'].includes(profile.status)) {
        await supabase.auth.signOut();
        throw new Error(profile.ban_display_message || `Your account is ${profile.status}. Please contact support for assistance.`);
      }

      // Redirect to user dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        <div style={styles.loginCard}>
          <div style={styles.headerSection}>
            <div style={styles.iconWrapper}>
              <span style={styles.icon}>🏦</span>
            </div>
            <h1 style={styles.title}>Sign In</h1>
            <p style={styles.subtitle}>Welcome back to Oakline Bank</p>
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
                placeholder="your.email@example.com"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.toggleButton}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span style={styles.errorIcon}>⚠️</span>
                <p style={styles.errorText}>{error}</p>
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
                  <span style={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                <>
                  <span>🔓</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div style={styles.footer}>
            <Link href="/forgot-password" style={styles.link}>
              Forgot Password?
            </Link>
            <div style={styles.secureNotice}>
              <span>🔒</span>
              <span>Secure banking • SSL encrypted</span>
            </div>
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
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden'
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '480px',
    zIndex: 1
  },
  loginCard: {
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
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(26, 62, 111, 0.3)'
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
    fontWeight: '500'
  },
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
  passwordWrapper: {
    position: 'relative',
    width: '100%'
  },
  toggleButton: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem',
    padding: '0.5rem',
    transition: 'opacity 0.2s'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1.25rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
    marginTop: '1rem'
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none'
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid #ffffff',
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
  footer: {
    marginTop: '2rem',
    textAlign: 'center'
  },
  link: {
    color: '#1A3E6F',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95rem',
    marginBottom: '1rem',
    display: 'inline-block'
  },
  secureNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500',
    marginTop: '1rem'
  }
};
