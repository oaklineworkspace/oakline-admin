
import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '../lib/supabaseClient';

export default function LinkCard() {
  const [linkToken, setLinkToken] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadSavedAccounts();
    }
  }, [user]);

  const loadSavedAccounts = async () => {
    try {
      const { data: plaidItems, error: itemsError } = await supabase
        .from('plaid_items')
        .select('id, institution_name')
        .eq('user_id', user.id);

      if (itemsError) throw itemsError;

      if (plaidItems && plaidItems.length > 0) {
        const { data: plaidAccounts, error: accountsError } = await supabase
          .from('plaid_accounts')
          .select('*')
          .in('plaid_item_id', plaidItems.map(item => item.id));

        if (accountsError) throw accountsError;
        setSavedAccounts(plaidAccounts || []);
      }
    } catch (err) {
      console.error('Error loading saved accounts:', err);
    }
  };

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const createLinkToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/create-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || 'guest-user',
        }),
      });

      const data = await response.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
      } else {
        setError('Failed to create link token');
      }
    } catch (err) {
      console.error('Error creating link token:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSuccess = useCallback(async (publicToken, metadata) => {
    setLoading(true);
    setError(null);
    console.log('Plaid Link success, metadata:', metadata);
    try {
      // Exchange public token for access token
      const exchangeResponse = await fetch('/api/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token: publicToken,
          user_id: user?.id,
        }),
      });

      const exchangeData = await exchangeResponse.json();
      
      if (exchangeData.access_token) {
        setAccessToken(exchangeData.access_token);

        // Get account details
        const accountsResponse = await fetch('/api/get-accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: exchangeData.access_token,
          }),
        });

        const accountsData = await accountsResponse.json();
        
        if (accountsData.accounts) {
          setAccounts(accountsData.accounts);
        }
      } else {
        setError('Failed to exchange token');
      }
    } catch (err) {
      console.error('Error in onSuccess:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onExit = useCallback((err, metadata) => {
    console.log('Plaid Link exit:', { err, metadata });
    if (err != null) {
      setError(`Plaid Error: ${err.error_message || err.display_message || 'Unknown error'}`);
    }
    setLoading(false);
  }, []);

  const config = {
    token: linkToken,
    onSuccess,
    onExit,
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken === null) {
      createLinkToken();
    }
  }, [linkToken]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Link Your External Bank Card</h1>
        <p style={styles.subtitle}>
          Connect your external bank accounts to Oakline Bank using Plaid
        </p>

        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Processing...</p>
          </div>
        )}

        {!accounts.length && (
          <div style={styles.buttonContainer}>
            <button
              onClick={() => open()}
              disabled={!ready || loading}
              style={{
                ...styles.button,
                opacity: !ready || loading ? 0.6 : 1,
                cursor: !ready || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Connecting...' : 'Connect Bank Account'}
            </button>
            <p style={styles.helpText}>
              <strong>Plaid Sandbox Instructions:</strong><br />
              1. Select any bank from the list<br />
              2. Use these credentials:<br />
              <strong>Username:</strong> user_good<br />
              <strong>Password:</strong> pass_good<br />
              3. If you see "No eligible accounts", try:<br />
              • Selecting different account types in the Plaid flow<br />
              • Or click "Return" and the connection should still work
            </p>
          </div>
        )}

        {savedAccounts.length > 0 && accounts.length === 0 && (
          <div style={styles.accountsContainer}>
            <h2 style={styles.accountsTitle}>Your Saved Bank Accounts</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              These accounts are connected to your Oakline Bank profile
            </p>
            {savedAccounts.map((account) => (
              <div key={account.account_id} style={styles.accountCard}>
                <div style={styles.accountHeader}>
                  <h3 style={styles.accountName}>{account.name}</h3>
                  <span style={styles.accountType}>{account.subtype}</span>
                </div>
                <div style={styles.accountDetails}>
                  <div style={styles.balanceRow}>
                    <span>Available Balance:</span>
                    <strong>
                      ${account.available_balance?.toFixed(2) || '0.00'}
                    </strong>
                  </div>
                  <div style={styles.balanceRow}>
                    <span>Current Balance:</span>
                    <strong>
                      ${account.current_balance?.toFixed(2) || '0.00'}
                    </strong>
                  </div>
                  <div style={styles.accountMask}>
                    Account: ****{account.mask}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setLinkToken(null);
              }}
              style={styles.resetButton}
            >
              Link Another Account
            </button>
          </div>
        )}

        {accounts.length > 0 && (
          <div style={styles.accountsContainer}>
            <h2 style={styles.accountsTitle}>Connected Accounts</h2>
            {accounts.map((account) => (
              <div key={account.account_id} style={styles.accountCard}>
                <div style={styles.accountHeader}>
                  <h3 style={styles.accountName}>{account.name}</h3>
                  <span style={styles.accountType}>{account.subtype}</span>
                </div>
                <div style={styles.accountDetails}>
                  <div style={styles.balanceRow}>
                    <span>Available Balance:</span>
                    <strong>
                      ${account.balances.available?.toFixed(2) || '0.00'}
                    </strong>
                  </div>
                  <div style={styles.balanceRow}>
                    <span>Current Balance:</span>
                    <strong>
                      ${account.balances.current?.toFixed(2) || '0.00'}
                    </strong>
                  </div>
                  <div style={styles.accountMask}>
                    Account: ****{account.mask}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setAccounts([]);
                setAccessToken(null);
                setLinkToken(null);
              }}
              style={styles.resetButton}
            >
              Link Another Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    padding: '40px 20px',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '10px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '40px',
  },
  error: {
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#c33',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #0066cc',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  buttonContainer: {
    textAlign: 'center',
    padding: '20px 0',
  },
  button: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
  },
  helpText: {
    marginTop: '24px',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
  },
  accountsContainer: {
    marginTop: '20px',
  },
  accountsTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#1a1a1a',
  },
  accountCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
    backgroundColor: '#fafafa',
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e0e0e0',
  },
  accountName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  accountType: {
    backgroundColor: '#0066cc',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  accountDetails: {
    fontSize: '14px',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    color: '#333',
  },
  accountMask: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#666',
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s ease',
  },
};
