
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import AdminAuth from '../../components/AdminAuth';

export default function IssueDebitCard() {
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [dailyLimit, setDailyLimit] = useState('1000.00');
  const [monthlyLimit, setMonthlyLimit] = useState('10000.00');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [issuedCard, setIssuedCard] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  };

  const fetchUserAccounts = async (userId) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('accounts')
        .select('id, account_number, account_type, balance, status')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to fetch user accounts');
    }
  };

  const handleUserChange = (userId) => {
    setSelectedUser(userId);
    setSelectedAccount('');
    setAccounts([]);
    setCardholderName('');
    
    if (userId) {
      fetchUserAccounts(userId);
      const user = users.find(u => u.id === userId);
      if (user) {
        setCardholderName(`${user.first_name} ${user.last_name}`);
      }
    }
  };

  const handleIssueCard = async (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedAccount || !cardholderName) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Call the PostgreSQL function to issue the card
      const { data, error } = await supabaseAdmin.rpc('issue_debit_card', {
        p_user_id: selectedUser,
        p_account_id: selectedAccount,
        p_cardholder_name: cardholderName,
        p_daily_limit: parseFloat(dailyLimit),
        p_monthly_limit: parseFloat(monthlyLimit)
      });

      if (error) throw error;

      const result = data;
      
      if (result.success) {
        setIssuedCard(result);
        setMessage('✅ Debit card issued successfully!');
        
        // Reset form
        setSelectedUser('');
        setSelectedAccount('');
        setCardholderName('');
        setDailyLimit('1000.00');
        setMonthlyLimit('10000.00');
        setAccounts([]);
      } else {
        setError(result.error || 'Failed to issue card');
      }
    } catch (error) {
      console.error('Error issuing card:', error);
      setError('Failed to issue card: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <AdminAuth>
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 Issue Debit Card</h1>
        <Link href="/admin/admin-dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {issuedCard && (
        <div style={styles.cardDetails}>
          <h3>🎉 Card Issued Successfully!</h3>
          <div style={styles.cardInfo}>
            <p><strong>Card Number:</strong> {issuedCard.card_number}</p>
            <p><strong>CVV:</strong> {issuedCard.cvv}</p>
            <p><strong>Expiry Date:</strong> {issuedCard.expiry_date}</p>
            <p><strong>Daily Limit:</strong> ${dailyLimit}</p>
            <p><strong>Monthly Limit:</strong> ${monthlyLimit}</p>
          </div>
          <button 
            onClick={() => setIssuedCard(null)} 
            style={styles.closeButton}
          >
            Issue Another Card
          </button>
        </div>
      )}

      <div style={styles.formContainer}>
        <form onSubmit={handleIssueCard} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Select User *</label>
            <select
              value={selectedUser}
              onChange={(e) => handleUserChange(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">Choose a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {accounts.length > 0 && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Select Account *</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">Choose an account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_type.replace(/_/g, ' ').toUpperCase()} - 
                    ****{account.account_number.slice(-4)} - 
                    Balance: ${parseFloat(account.balance).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Cardholder Name *</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              style={styles.input}
              placeholder="Full name as it appears on the card"
              required
            />
          </div>

          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Daily Limit ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10000"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Monthly Limit ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100000"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={loading || !selectedUser || !selectedAccount}
          >
            {loading ? '🔄 Issuing Card...' : '💳 Issue Debit Card'}
          </button>
        </form>
      </div>
    </div>
  
    </AdminAuth>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'Arial, sans-serif'
  },
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  loginCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e0e0e0'
  },
  title: {
    color: '#2c3e50',
    fontSize: '2rem',
    margin: 0
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem'
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  label: {
    fontWeight: 'bold',
    color: '#2c3e50',
    fontSize: '0.9rem'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: 'white'
  },
  submitButton: {
    padding: '1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  loginButton: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%'
  },
  success: {
    padding: '1rem',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  error: {
    padding: '1rem',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  cardDetails: {
    backgroundColor: '#e8f5e8',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    border: '2px solid #28a745'
  },
  cardInfo: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '4px',
    margin: '1rem 0',
    fontFamily: 'monospace'
  },
  closeButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
