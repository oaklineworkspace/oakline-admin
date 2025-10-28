import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      
      if (authLoading) {
        console.log('Auth still loading...');
        return;
      }
      
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('Checking admin access for user:', user.id);

      // Check if user has admin role in admin_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        console.error('User ID:', user.id);
        setError(`Unable to verify admin access. Error: ${profileError.message}`);
        setLoading(false);
        return;
      }

      console.log('Admin profile found:', profile);

      if (!profile) {
        console.error('No admin profile found for user:', user.id);
        setError('No admin profile found. Please contact support.');
        setTimeout(() => router.push('/login'), 2000);
        setLoading(false);
        return;
      }

      if (!['admin', 'super_admin', 'manager'].includes(profile.role)) {
        console.error('Invalid role:', profile.role);
        setError('Access denied. Admin privileges required.');
        setTimeout(() => router.push('/login'), 2000);
        setLoading(false);
        return;
      }

      console.log('Admin access granted with role:', profile.role);
      setIsAdmin(true);
      setError('');
    } catch (error) {
      console.error('Admin access check error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Access Denied</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/login')} style={styles.loginButton}>
          Go to Login
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.errorContainer}>
        <h2>Admin Access Required</h2>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }

  return children;
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
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    padding: '20px'
  },
  loginButton: {
    background: '#1e3c72',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '20px'
  }
};
