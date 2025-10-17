
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZelleRequest() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Form state
  const [requestForm, setRequestForm] = useState({
    recipient: '',
    amount: '',
    memo: '',
    account_id: ''
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);

      // Fetch user accounts
      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');

      setAccounts(userAccounts || []);

      if (userAccounts?.length > 0) {
        setRequestForm(prev => ({ ...prev, account_id: userAccounts[0].id.toString() }));
      }

      // Fetch Zelle contacts
      const { data: zelleContacts } = await supabase
        .from('zelle_contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      setContacts(zelleContacts || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const handleRequestMoney = async (e) => {
    e.preventDefault();
    setRequesting(true);
    setMessage('');

    try {
      const amount = parseFloat(requestForm.amount);
      if (amount <= 0 || amount > 2500) {
        setMessage('Amount must be between $0.01 and $2,500');
        setRequesting(false);
        return;
      }

      // Validate recipient
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

      if (!emailRegex.test(requestForm.recipient) && !phoneRegex.test(requestForm.recipient)) {
        setMessage('Please enter a valid email address or phone number');
        setRequesting(false);
        return;
      }

      // Create Zelle request
      const { error } = await supabase
        .from('zelle_transactions')
        .insert([{
          sender_id: user.id,
          sender_account_id: parseInt(requestForm.account_id),
          recipient_contact: requestForm.recipient,
          amount: amount,
          memo: requestForm.memo || 'Zelle Request',
          transaction_type: 'request',
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setMessage('✅ Zelle request sent successfully!');
      setRequestForm({ recipient: '', amount: '', memo: '', account_id: requestForm.account_id });

    } catch (error) {
      console.error('Error requesting money:', error);
      setMessage('Error sending request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const selectContact = (contact) => {
    setRequestForm(prev => ({ 
      ...prev, 
      recipient: contact.email || contact.phone 
    }));
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Zelle Request...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
        </div>
        <div style={styles.loginPrompt}>
          <h1 style={styles.loginTitle}>Please Log In</h1>
          <p style={styles.loginMessage}>You need to be logged in to request money with Zelle</p>
          <Link href="/login" style={styles.loginButton}>Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Request Money - Zelle - Oakline Bank</title>
        <meta name="description" content="Request money quickly and securely with Zelle" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.headerInfo}>
            <Link href="/zelle" style={styles.backButton}>← Back to Zelle</Link>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div style={styles.zelleHeader}>
              <div style={styles.zelleLogo}>Z</div>
              <div>
                <h1 style={styles.title}>Request Money</h1>
                <p style={styles.subtitle}>Request money from friends and family</p>
              </div>
            </div>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
              color: message.includes('✅') ? '#155724' : '#721c24',
              borderColor: message.includes('✅') ? '#c3e6cb' : '#f5c6cb'
            }}>
              {message}
            </div>
          )}

          {/* Quick Contacts */}
          {contacts.length > 0 && (
            <div style={styles.contactsSection}>
              <h3 style={styles.contactsTitle}>Request From</h3>
              <div style={styles.contactsGrid}>
                {contacts.slice(0, 6).map((contact) => (
                  <button
                    key={contact.id}
                    style={styles.contactButton}
                    onClick={() => selectContact(contact)}
                  >
                    <div style={styles.contactAvatar}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.contactName}>{contact.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Request Money Form */}
          <div style={styles.formContainer}>
            <form onSubmit={handleRequestMoney} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>To Account *</label>
                <select
                  style={styles.select}
                  value={requestForm.account_id}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, account_id: e.target.value }))}
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type?.replace('_', ' ')?.toUpperCase()} -
                      ****{account.account_number?.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>From (Email or Phone) *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={requestForm.recipient}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, recipient: e.target.value }))}
                  placeholder="email@example.com or (555) 123-4567"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount ($) *</label>
                <input
                  type="number"
                  style={styles.input}
                  value={requestForm.amount}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  max="2500"
                  required
                />
                <small style={styles.helperText}>Daily limit: $2,500</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>What's this for? (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  value={requestForm.memo}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="Dinner, rent, etc."
                  maxLength="100"
                />
              </div>

              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  opacity: requesting ? 0.7 : 1,
                  cursor: requesting ? 'not-allowed' : 'pointer'
                }}
                disabled={requesting}
              >
                {requesting ? '🔄 Requesting...' : `💰 Request ${formatCurrency(parseFloat(requestForm.amount) || 0)}`}
              </button>
            </form>
          </div>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <Link href="/zelle/send" style={styles.actionButton}>
              <span style={styles.actionIcon}>💸</span>
              Send Money
            </Link>
            <Link href="/zelle/history" style={styles.actionButton}>
              <span style={styles.actionIcon}>📋</span>
              View History
            </Link>
          </div>

          {/* Information */}
          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}>💡 About Money Requests</h4>
            <ul style={styles.infoList}>
              <li>Requests are sent immediately to the recipient</li>
              <li>Recipients have 14 days to accept or decline</li>
              <li>You'll be notified when the request is accepted</li>
              <li>Money will appear in your account within minutes</li>
              <li>You can cancel pending requests anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)',
    borderBottom: '3px solid #059669'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  backButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  content: {
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '1.5rem'
  },
  zelleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  zelleLogo: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.3)'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  contactsSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  contactsTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  contactsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: '1rem'
  },
  contactButton: {
    background: 'none',
    border: 'none',
    padding: '0.75rem 0.5rem',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0'
  },
  contactAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 0.5rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)'
  },
  contactName: {
    fontSize: '0.8rem',
    color: '#1e293b',
    textAlign: 'center',
    fontWeight: '500'
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  select: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  helperText: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontStyle: 'italic'
  },
  submitButton: {
    width: '100%',
    padding: '1.125rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '1rem',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.3)',
    position: 'relative',
    zIndex: 10
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#1e293b',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0'
  },
  actionIcon: {
    fontSize: '1.2rem'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    color: '#1A3E6F',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600'
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#374151',
    lineHeight: '1.6',
    fontSize: '0.85rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1A3E6F',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    margin: '2rem auto',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};
