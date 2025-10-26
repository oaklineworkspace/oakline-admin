import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AdminAuth({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAdminStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await verifyAdminUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
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
    <div>
      <div style={{ backgroundColor: '#0070f3', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Panel</h1>
          {user && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
            Logged in as: {user.email} ({user.role})
          </p>}
        </div>
        <button 
          onClick={handleLogout}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: 'white', 
            color: '#0070f3', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}
