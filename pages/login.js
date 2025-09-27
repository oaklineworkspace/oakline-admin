
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Login.module.css';

export default function Login() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Redirect if already authenticated
    if (user) {
      checkAdminAndRedirect();
    }
    
    // Check for success message from signup
    if (router.query.message) {
      setMessage(router.query.message);
    }
  }, [user, router]);

  const checkAdminAndRedirect = async () => {
    try {
      // Verify admin role before redirecting to dashboard
      const { data: profile, error } = await supabase
        .from('admin_profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (!error && profile && profile.is_active && ['admin', 'superadmin', 'auditor'].includes(profile.role)) {
        router.push('/dashboard');
      } else {
        // User exists but is not admin, sign them out
        await supabase.auth.signOut();
        setError('Access denied. Admin privileges required.');
      }
    } catch (err) {
      console.error('Admin check error:', err);
      setError('Unable to verify admin access.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Sign in with Supabase
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        throw new Error(signInError.message);
      }

      // Check if user has admin privileges
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        const { data: profile, error: profileError } = await supabase
          .from('admin_profiles')
          .select('role, is_active')
          .eq('id', currentUser.id)
          .single();

        if (profileError || !profile || !profile.is_active || !['admin', 'superadmin', 'auditor'].includes(profile.role)) {
          // Sign out if not admin
          await supabase.auth.signOut();
          throw new Error('Access denied. Admin privileges required.');
        }

        // Success - redirect will happen via useEffect
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Login</h1>
          <p className={styles.subtitle}>Access your admin dashboard</p>
        </div>
        
        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className={styles.footer}>
          <p>
            Need to create an admin account?{' '}
            <Link href="/signup" className={styles.link}>
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
