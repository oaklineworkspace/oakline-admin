import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await signIn(formData.email, formData.password);

      if (error) throw error;

      if (data.user) {
        const { data: adminProfile } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (adminProfile) {
          setMessage('Sign in successful! Redirecting to admin hub...');
          setTimeout(() => {
            window.location.href = '/admin';
          }, 1000);
        } else {
          setMessage('Sign in successful! Redirecting to dashboard...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        }
      }

    } catch (error) {
      setMessage(`Sign in failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 50%, #1A3E6F 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0
    }}>
      {/* Header */}
      <header style={{
        color: 'white',
        padding: '1rem 2rem',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: 'white'
          }}>
            <div style={{ fontSize: '2rem' }}>🏦</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white'
              }}>Oakline Bank</span>
              <span style={{
                fontSize: '0.9rem',
                color: '#FFC857',
                fontWeight: '500'
              }}>Secure Banking Access</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        minHeight: 'calc(100vh - 100px)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          padding: '2.5rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: '#1A3E6F',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
              boxShadow: '0 8px 32px rgba(26, 62, 111, 0.3)'
            }}>
              <span style={{ fontSize: '2rem', color: 'white' }}>🏦</span>
            </div>
            <h1 style={{
              fontSize: '2.2rem',
              fontWeight: '700',
              color: '#1A3E6F',
              marginBottom: '0.5rem',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>Welcome Back</h1>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: 0
            }}>Sign in to your Oakline Bank account</p>
          </div>

          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <label style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#1A3E6F',
                marginBottom: '0.25rem'
              }}>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                required
                value={formData.email}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#1f2937'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <label style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#1A3E6F',
                marginBottom: '0.25rem'
              }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.875rem 3.5rem 0.875rem 1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#1f2937'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0.5rem',
                    color: '#64748b',
                    transition: 'color 0.3s ease',
                    zIndex: 10
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <Link href="/reset-password" style={{
                color: '#1A3E6F',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '500',
                alignSelf: 'flex-end',
                marginTop: '0.5rem'
              }}>
                Forgot your password?
              </Link>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: '0.5rem 0'
            }}>
              <input
                type="checkbox"
                id="rememberDevice"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#059669',
                  transform: 'scale(1.2)',
                  border: '2px solid #059669',
                  borderRadius: '3px'
                }}
              />
              <label 
                htmlFor="rememberDevice"
                style={{
                  fontSize: '0.9rem',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Remember this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              style={{
                width: '100%',
                padding: '1rem 1.5rem',
                background: (loading || !formData.email || !formData.password) 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                cursor: (loading || !formData.email || !formData.password) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                marginTop: '1rem',
                boxShadow: (loading || !formData.email || !formData.password) 
                  ? 'none' 
                  : '0 8px 25px rgba(5, 150, 105, 0.4)',
                minHeight: '56px'
              }}
              onMouseEnter={(e) => {
                if (!loading && formData.email && formData.password) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 35px rgba(5, 150, 105, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && formData.email && formData.password) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(5, 150, 105, 0.4)';
                }
              }}
            >
              {loading ? (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Signing In...
                </span>
              ) : (
                <>
                  <span style={{ fontSize: '1.2rem' }}>🔐</span>
                  Sign In to My Account
                </>
              )}
            </button>
          </form>

          {message && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: message.includes('failed') ? '#dc2626' : '#065f46',
              backgroundColor: message.includes('failed') ? '#fee2e2' : '#d1fae5',
              borderLeft: `4px solid ${message.includes('failed') ? '#dc2626' : '#065f46'}`
            }}>
              {message}
            </div>
          )}

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '0.85rem',
              color: '#64748b',
              margin: 0,
              lineHeight: '1.5'
            }}>
              🔒 Your security is our priority. We use 256-bit SSL encryption.
            </p>
          </div>

          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            padding: '1rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748b',
              margin: 0
            }}>
              Don't have an account?{' '}
              <Link href="/apply" style={{
                color: '#1A3E6F',
                textDecoration: 'none',
                fontWeight: '600'
              }}>
                Open Account Today
              </Link>
            </p>
          </div>

          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            padding: '1rem 0'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <Link href="/support" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '500',
                padding: '0.5rem',
                borderRadius: '6px',
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '0.9rem' }}>💬</span>
                Need Help?
              </Link>
              <Link href="/branch-locator" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '500',
                padding: '0.5rem',
                borderRadius: '6px',
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '0.9rem' }}>📍</span>
                Find Branch
              </Link>
              <Link href="/apply" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '500',
                padding: '0.5rem',
                borderRadius: '6px',
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '0.9rem' }}>🚀</span>
                New Customer
              </Link>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            backgroundColor: '#f1f5f9',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#1A3E6F',
              margin: '0 0 0.5rem 0'
            }}>Why Choose Oakline Bank?</h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#374151'
              }}>
                <span style={{ fontSize: '0.9rem' }}>🏆</span>
                <span style={{ fontWeight: '500' }}>Award-winning digital banking</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#374151'
              }}>
                <span style={{ fontSize: '0.9rem' }}>🔒</span>
                <span style={{ fontWeight: '500' }}>Bank-level security protection</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#374151'
              }}>
                <span style={{ fontSize: '0.9rem' }}>📱</span>
                <span style={{ fontWeight: '500' }}>Mobile banking excellence</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#374151'
              }}>
                <span style={{ fontSize: '0.9rem' }}>💳</span>
                <span style={{ fontWeight: '500' }}>23 account types available</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        padding: '1rem 2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        zIndex: 100,
        boxShadow: '0 -5px 15px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{
          fontSize: '0.9rem',
          color: '#1A3E6F',
          margin: 0,
          fontWeight: '600'
        }}>
          © 2024 Oakline Bank. All rights reserved.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/privacy" style={{ color: '#2A5490', textDecoration: 'none', fontSize: '0.85rem' }}>
            Privacy Policy
          </Link>
          <Link href="/terms" style={{ color: '#2A5490', textDecoration: 'none', fontSize: '0.85rem' }}>
            Terms of Service
          </Link>
          <Link href="/contact" style={{ color: '#2A5490', textDecoration: 'none', fontSize: '0.85rem' }}>
            Contact Us
          </Link>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        input[type="checkbox"]:checked {
          background-color: #059669 !important;
          border-color: #059669 !important;
        }

        input[type="checkbox"]:focus {
          outline: 2px solid #059669;
          outline-offset: 2px;
        }

        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          background-color: white;
          border: 2px solid #059669;
          border-radius: 3px;
          display: inline-block;
          position: relative;
        }

        input[type="checkbox"]:checked::after {
          content: '✓';
          font-size: 14px;
          color: white;
          position: absolute;
          top: -2px;
          left: 1px;
        }
      `}</style>
      
      <style jsx>{`
        .helpLinks {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        
        .helpLink {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #64748b;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        
        .helpLink:hover {
          color: #1A3E6F;
          background-color: #f1f5f9;
        }
        
        .benefitsList {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .benefitItem {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #374151;
        }
        
        .benefitIcon {
          font-size: 0.9rem;
        }
        
        .benefitText {
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .helpLinks {
            gap: 1rem;
          }
          
          .helpLink {
            font-size: 0.8rem;
            padding: 0.4rem;
          }
        }
      `}</style>
    </div>
  );
}