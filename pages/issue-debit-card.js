
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function IssueDebitCard() {
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch users from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  };

  const fetchUserAccounts = async (userId) => {
    try {
      const { data, error } = await supabase
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
      const selectedUserData = users.find(u => u.id === userId);
      if (selectedUserData) {
        setCardholderName(selectedUserData.full_name);
      }
    }
  };

  const generateCardNumber = () => {
    const prefix = '4532'; // Visa prefix
    const remaining = Array.from({length: 12}, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}${remaining}`;
  };

  const generateCVV = () => {
    return Array.from({length: 3}, () => Math.floor(Math.random() * 10)).join('');
  };

  const generateExpiryDate = () => {
    const currentDate = new Date();
    const expiryYear = currentDate.getFullYear() + 4;
    const expiryMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${expiryMonth}/${expiryYear}`;
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
      // Generate card details
      const cardNumber = generateCardNumber();
      const cvv = generateCVV();
      const expiryDate = generateExpiryDate();

      // Create card record in Supabase
      const { data: newCard, error: cardError } = await supabase
        .from('cards')
        .insert({
          user_id: selectedUser,
          account_id: selectedAccount,
          card_number: cardNumber,
          cvv: cvv,
          expiry_date: expiryDate,
          cardholder_name: cardholderName,
          card_type: 'debit',
          status: 'active',
          is_locked: false,
          daily_limit: parseFloat(dailyLimit),
          monthly_limit: parseFloat(monthlyLimit),
          daily_spent: 0.00,
          monthly_spent: 0.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'card_issued',
          target_type: 'card',
          target_id: newCard.id,
          details: {
            cardholder_name: cardholderName,
            card_type: 'debit',
            daily_limit: parseFloat(dailyLimit),
            monthly_limit: parseFloat(monthlyLimit)
          }
        });

      setIssuedCard({
        card_number: cardNumber,
        cvv: cvv,
        expiry_date: expiryDate,
        success: true
      });

      setMessage('✅ Debit card issued successfully!');
      
      // Reset form
      setSelectedUser('');
      setSelectedAccount('');
      setCardholderName('');
      setDailyLimit('1000.00');
      setMonthlyLimit('10000.00');
      setAccounts([]);

    } catch (error) {
      console.error('Error issuing card:', error);
      setError('Failed to issue card: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>💳 Issue Debit Card</h1>
            <p style={styles.subtitle}>Issue new debit cards for customers</p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
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
                    {user.full_name} ({user.email})
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
    </AdminRoute>
  );
}

export default IssueDebitCard;

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#555',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  label: {
    fontWeight: 'bold',
    color: '#1e3c72',
    fontSize: '14px'
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  select: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
  },
  submitButton: {
    padding: '15px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  success: {
    padding: '15px',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  error: {
    padding: '15px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  cardDetails: {
    backgroundColor: '#e8f5e8',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    border: '2px solid #28a745'
  },
  cardInfo: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    margin: '15px 0',
    fontFamily: 'monospace',
    fontSize: '14px'
  },
  closeButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};
