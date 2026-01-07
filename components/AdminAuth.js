import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import AdminNavBar from './AdminNavBar';

export default function AdminAuth({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    checkAdminStatus();
    setupTokenRefresh();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await verifyAdminUser(session.user);
        setupTokenRefresh();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        clearTokenRefresh();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed successfully');
      }
    });

    // Handle visibility change to proactively refresh token when page becomes active
    const handleVisibilityChange = async () => {
      if (!document.hidden && isAuthenticated) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Check if token expires within 5 minutes and refresh proactively
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = expiresAt - now;
            
            if (timeUntilExpiry < 300) {
              console.log('Proactively refreshing token on focus...');
              await supabase.auth.refreshSession();
            }
          } else {
            setError('Session expired. Please log in again.');
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch (err) {
          console.error('Error checking session on visibility change:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      authListener?.subscription?.unsubscribe();
      clearTokenRefresh();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  const setupTokenRefresh = () => {
    clearTokenRefresh();
    // Check token every 2 minutes and refresh if expiring within 5 minutes
    // This is less aggressive than 30 seconds but still keeps the session alive
    refreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          const expiresAt = currentSession.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;
          
          // Refresh if token expires within 5 minutes (300 seconds)
          if (timeUntilExpiry < 300) {
            console.log('Token expiring soon, refreshing...');
            const { data: { session }, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('Token refresh failed:', error);
              // Only logout on specific refresh token errors
              if (error.message.includes('refresh_token_not_found') || 
                  error.message.includes('invalid_grant') ||
                  error.message.includes('Token expired')) {
                setError('Session expired. Please log in again.');
                setIsAuthenticated(false);
                setUser(null);
              }
            } else if (session) {
              console.log('Token refreshed successfully, new expiry:', new Date(session.expires_at * 1000).toISOString());
            }
          }
        } else {
          // No session found during refresh check
          console.log('No session found during refresh check');
        }
      } catch (err) {
        console.error('Error refreshing token:', err);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes instead of 30 seconds
  };

  const clearTokenRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      if (session?.user) {
        await verifyAdminUser(session.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAdminUser = async (authUser) => {
    try {
      const { data: adminProfile, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (adminError || !adminProfile) {
        setError('Access denied. You are not authorized as an admin.');
        setIsAuthenticated(false);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }

      setIsAuthenticated(true);
      setUser({ ...authUser, role: adminProfile.role });
      setError('');
    } catch (err) {
      console.error('Error verifying admin:', err);
      setError('Error verifying admin access');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        await verifyAdminUser(data.user);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setEmail('');
      setPassword('');
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
                placeholder="Enter admin email"
                required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
                placeholder="Enter password"
                required
              />
            </div>
            {error && <p style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
            <button 
              type="submit"
              disabled={isLoading}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                backgroundColor: isLoading ? '#ccc' : '#0070f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
            Only authorized admin users can access this area
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ padding: '16px 20px 0 20px' }}>
        <AdminNavBar />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user && (
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Logged in as: <strong style={{ color: '#1e293b' }}>{user.email}</strong> 
                <span style={{ 
                  marginLeft: '8px', 
                  padding: '2px 8px', 
                  backgroundColor: '#dbeafe', 
                  color: '#1d4ed8',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {user.role}
                </span>
              </span>
            )}
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#ef4444', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
      <div style={{ padding: '0 20px 20px 20px' }}>
        {children}
      </div>
    </div>
  );
}
