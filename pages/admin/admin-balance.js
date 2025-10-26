import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import AdminAuth from '../../components/AdminAuth';

export default function AdminBalance() {
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [operation, setOperation] = useState('set'); // 'set', 'add', 'subtract'
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch applications with user data
      const { data: applicationsData, error: appError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (appError) {
        console.error('Error fetching applications:', appError);
        throw new Error('Failed to fetch applications: ' + appError.message);
      }

      setUsers(applicationsData || []);

      // Fetch all accounts with application data
      const { data: accountsData, error: accountsError } = await supabaseAdmin
        .from('accounts')
        .select(`
          *,
          applications!accounts_application_id_fkey(
            id,
            first_name,
            last_name,
            email,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
        throw new Error('Failed to fetch accounts: ' + accountsError.message);
      }

      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    setSelectedAccount('');

    // Filter accounts for selected user
    const userAccounts = accounts.filter(acc => 
      acc.application_id === userId || acc.user_id === userId
    );

    if (userAccounts.length === 1) {
      setSelectedAccount(userAccounts[0].id);
    }
  };

  const updateBalance = async (e) => {
    e.preventDefault();
    if (!selectedAccount || !balanceAmount) {
      setError('Please select an account and enter an amount');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      // Get current account with user info
      const { data: currentAccount, error: fetchError } = await supabaseAdmin
        .from('accounts')
        .select('balance, account_number, account_type, application_id')
        .eq('id', selectedAccount)
        .single();

      if (fetchError) throw fetchError;

      let newBalance;
      const amount = parseFloat(balanceAmount);
      const currentBalance = parseFloat(currentAccount.balance) || 0;

      switch (operation) {
        case 'set':
          newBalance = amount;
          break;
        case 'add':
          newBalance = currentBalance + amount;
          break;
        case 'subtract':
          newBalance = Math.max(0, currentBalance - amount); // Prevent negative balance
          break;
        default:
          newBalance = amount;
      }

      // Update balance in accounts table
      const { error: updateError } = await supabaseAdmin
        .from('accounts')
        .update({ 
          balance: newBalance.toFixed(2),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAccount);

      if (updateError) throw updateError;

      // Create transaction record
      const transactionAmount = operation === 'set' ? newBalance : Math.abs(amount);
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          account_id: selectedAccount,
          account_number: currentAccount.account_number,
          type: operation === 'subtract' ? 'debit' : 'credit',
          amount: transactionAmount,
          description: `Admin ${operation} balance: ${operation === 'set' ? 'Set to' : operation === 'add' ? 'Added' : 'Subtracted'} $${amount.toFixed(2)}`,
          status: 'completed',
          balance_after: newBalance.toFixed(2),
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('Transaction record error:', transactionError);
      }

      // Log the admin action for audit trail
      const adminAction = {
        action: 'balance_update',
        account_id: selectedAccount,
        account_number: currentAccount.account_number,
        operation: operation,
        amount: amount,
        previous_balance: currentBalance,
        new_balance: newBalance,
        admin_timestamp: new Date().toISOString()
      };

      // You can also insert into an audit_logs table if you have one
      console.log('Admin Action:', adminAction);

      setMessage(`✅ Balance updated successfully! 
        Previous: $${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
        New: $${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      setBalanceAmount('');
      setSelectedAccount('');
      setSelectedUser('');
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating balance:', error);
      setError(`❌ Failed to update balance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getUserAccounts = (userId) => {
    return accounts.filter(acc => 
      acc.application_id === userId || acc.user_id === userId
    );
  };

  // Function to handle manual balance updates via API
  const handleUpdateBalance = async (accountId) => {
    const newBalance = prompt('Enter new balance:');
    if (!newBalance || isNaN(newBalance)) {
      alert('Invalid balance amount');
      return;
    }

    try {
      const response = await fetch('/api/admin/manual-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId,
          amount: parseFloat(newBalance),
          type: 'balance_update',
          description: 'Admin balance update'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update balance');
      }

      alert('Balance updated successfully!');
      fetchData(); // Refresh data after successful update
    } catch (error) {
      console.error('Error updating balance:', error);
      alert('Failed to update balance: ' + error.message);
    }
  };

  

  return (
    <AdminAuth>
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💰 Admin Balance Management</h1>
        <button onClick={() => router.push('/admin/admin-dashboard')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Update User Balance</h2>
        <form onSubmit={updateBalance} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Select User</label>
              <select
                value={selectedUser}
                onChange={handleUserChange}
                style={styles.select}
                required
              >
                <option value="">Choose a user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} - {user.email}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Select Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">Choose an account...</option>
                  {getUserAccounts(selectedUser).map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type} - ****{account.account_number?.slice(-4)} 
                      (Current: ${parseFloat(account.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Operation</label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                style={styles.select}
              >
                <option value="set">Set Balance To</option>
                <option value="add">Add To Balance</option>
                <option value="subtract">Subtract From Balance</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                style={styles.input}
                placeholder="Enter amount"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !selectedAccount}
            style={{
              ...styles.submitButton,
              opacity: (loading || !selectedAccount) ? 0.5 : 1,
              cursor: (loading || !selectedAccount) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Updating...' : `${operation.charAt(0).toUpperCase() + operation.slice(1)} Balance`}
          </button>
        </form>
      </div>

      {/* Account Summary */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Account Summary</h2>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryNumber}>{users.length}</span>
            <span style={styles.summaryLabel}>Total Users</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryNumber}>{accounts.length}</span>
            <span style={styles.summaryLabel}>Total Accounts</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryNumber}>
              ${accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={styles.summaryLabel}>Total Balance</span>
          </div>
        </div>
      </div>

      {/* Display all accounts with an option to manually update balance */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>All Accounts</h2>
        <div style={styles.accountList}>
          {accounts.map(account => (
            <div key={account.id} style={styles.accountItem}>
              <div style={styles.accountDetails}>
                <span style={styles.accountName}>
                  {account.applications?.first_name || 'N/A'} {account.applications?.last_name || 'N/A'}
                </span>
                <span style={styles.accountEmail}>{account.applications?.email || 'N/A'}</span>
                <span style={styles.accountType}>{account.account_type} - ****{account.account_number?.slice(-4)}</span>
              </div>
              <div style={styles.accountBalanceContainer}>
                <span style={styles.accountBalance}>
                  ${parseFloat(account.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button 
                  onClick={() => handleUpdateBalance(account.id)}
                  style={styles.updateButton}
                  disabled={loading}
                >
                  Update Balance
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  
    </AdminAuth>
  );
}

const styles = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
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
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    margin: 0
  },
  backButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGrid: {
    display: 'grid',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none'
  },
  select: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
  },
  submitButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loginButton: {
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  success: {
    background: '#d1fae5',
    border: '1px solid #86efac',
    color: '#065f46',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  error: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px'
  },
  summaryItem: {
    textAlign: 'center',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  summaryNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '4px'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500'
  },
  accountList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  accountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #eee'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  accountName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e3a8a'
  },
  accountEmail: {
    fontSize: '13px',
    color: '#64748b'
  },
  accountType: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  accountBalanceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  accountBalance: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#15803d'
  },
  updateButton: {
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  }
};