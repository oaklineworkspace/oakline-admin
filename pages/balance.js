
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

export default function AdminBalance() {
  const { user, signOut } = useAuth();
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [operation, setOperation] = useState('set'); // 'set', 'add', 'subtract'
  const [reason, setReason] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch users and accounts from Supabase
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch active users with their profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (usersError) throw usersError;

      // Fetch all accounts with user information
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      setUsers(usersData || []);
      setAccounts(accountsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter accounts based on selected user
  const getFilteredAccounts = () => {
    if (!selectedUser) return [];
    return accounts.filter(account => account.user_id === selectedUser);
  };

  // Get selected account details
  const getSelectedAccountDetails = () => {
    return accounts.find(account => account.id === selectedAccount);
  };

  // Handle balance modification
  const handleBalanceUpdate = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount || !balanceAmount || !reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const accountDetails = getSelectedAccountDetails();
      if (!accountDetails) {
        throw new Error('Account not found');
      }

      let newBalance;
      const currentBalance = accountDetails.balance || 0;

      // Calculate new balance based on operation
      switch (operation) {
        case 'set':
          newBalance = amount;
          break;
        case 'add':
          newBalance = currentBalance + amount;
          break;
        case 'subtract':
          newBalance = currentBalance - amount;
          break;
        default:
          throw new Error('Invalid operation');
      }

      // Prevent negative balances for certain account types
      if (newBalance < 0 && accountDetails.account_type !== 'credit') {
        setError('Balance cannot be negative for this account type');
        setProcessing(false);
        return;
      }

      // Update account balance in Supabase
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAccount);

      if (updateError) throw updateError;

      // Create transaction record
      const transactionData = {
        account_id: selectedAccount,
        user_id: selectedUser,
        amount: operation === 'subtract' ? -amount : amount,
        transaction_type: 'admin_adjustment',
        description: `Admin balance ${operation}: ${reason}`,
        status: 'completed',
        created_by: user.id,
        metadata: {
          previous_balance: currentBalance,
          new_balance: newBalance,
          operation: operation,
          admin_reason: reason
        }
      };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (transactionError) throw transactionError;

      // Create audit log entry
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'balance_adjustment',
          target_type: 'account',
          target_id: selectedAccount,
          details: {
            operation,
            amount,
            previous_balance: currentBalance,
            new_balance: newBalance,
            reason
          }
        });

      setSuccess(`Balance updated successfully! New balance: $${newBalance.toLocaleString()}`);
      
      // Reset form
      setSelectedUser('');
      setSelectedAccount('');
      setBalanceAmount('');
      setOperation('set');
      setReason('');
      
      // Refresh data
      await fetchData();

    } catch (error) {
      console.error('Error updating balance:', error);
      setError('Failed to update balance. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>💰 Balance Management</h1>
            <p style={styles.subtitle}>Modify customer account balances</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchData} style={styles.refreshButton}>
              🔄 Refresh
            </button>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <div style={styles.content}>
            {/* Statistics */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <h3>Total Users</h3>
                <p style={styles.statNumber}>{users.length}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Total Accounts</h3>
                <p style={styles.statNumber}>{accounts.length}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Total Balance</h3>
                <p style={styles.statNumber}>
                  ${accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0).toLocaleString()}
                </p>
              </div>
              <div style={styles.statCard}>
                <h3>Available Accounts</h3>
                <p style={styles.statNumber}>{getFilteredAccounts().length}</p>
              </div>
            </div>

            <div style={styles.formContainer}>
              {/* Balance Modification Form */}
              <div style={styles.formCard}>
                <h2 style={styles.formTitle}>Update Account Balance</h2>
                <form onSubmit={handleBalanceUpdate} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Select User *</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => {
                        setSelectedUser(e.target.value);
                        setSelectedAccount(''); // Reset account selection
                      }}
                      style={styles.select}
                      required
                    >
                      <option value="">Choose a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Select Account *</label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      style={styles.select}
                      disabled={!selectedUser}
                      required
                    >
                      <option value="">Choose an account...</option>
                      {getFilteredAccounts().map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_type} - Current: ${account.balance?.toLocaleString() || '0.00'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedAccount && (
                    <div style={styles.accountInfo}>
                      <h4>Current Account Details:</h4>
                      <p><strong>Balance:</strong> ${getSelectedAccountDetails()?.balance?.toLocaleString() || '0.00'}</p>
                      <p><strong>Type:</strong> {getSelectedAccountDetails()?.account_type}</p>
                      <p><strong>Status:</strong> {getSelectedAccountDetails()?.status}</p>
                    </div>
                  )}

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Operation Type *</label>
                    <select
                      value={operation}
                      onChange={(e) => setOperation(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="set">Set Balance To</option>
                      <option value="add">Add Amount</option>
                      <option value="subtract">Subtract Amount</option>
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Amount ($) * 
                      {operation === 'set' && ' (New Balance)'}
                      {operation === 'add' && ' (Amount to Add)'}
                      {operation === 'subtract' && ' (Amount to Subtract)'}
                    </label>
                    <input
                      type="number"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      style={styles.input}
                      placeholder="Enter amount..."
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Reason for Adjustment *</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={styles.textarea}
                      placeholder="Enter reason for balance adjustment..."
                      required
                      rows={3}
                    />
                  </div>

                  {selectedAccount && balanceAmount && (
                    <div style={styles.preview}>
                      <h4>Preview:</h4>
                      <p>
                        Current Balance: ${getSelectedAccountDetails()?.balance?.toLocaleString() || '0.00'}
                      </p>
                      <p>
                        {operation === 'set' && `New Balance: $${parseFloat(balanceAmount).toLocaleString()}`}
                        {operation === 'add' && `New Balance: $${((getSelectedAccountDetails()?.balance || 0) + parseFloat(balanceAmount)).toLocaleString()}`}
                        {operation === 'subtract' && `New Balance: $${((getSelectedAccountDetails()?.balance || 0) - parseFloat(balanceAmount)).toLocaleString()}`}
                      </p>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    style={styles.submitButton}
                    disabled={processing || !selectedAccount || !balanceAmount || !reason.trim()}
                  >
                    {processing ? 'Updating Balance...' : '💰 Update Balance'}
                  </button>
                </form>
              </div>

              {/* Recent Account List */}
              <div style={styles.accountsList}>
                <h2 style={styles.formTitle}>Recent Accounts</h2>
                <div style={styles.accountsGrid}>
                  {accounts.slice(0, 10).map(account => (
                    <div key={account.id} style={styles.accountCard}>
                      <div style={styles.accountHeader}>
                        <h4>{account.profiles?.full_name}</h4>
                        <span style={styles.accountType}>{account.account_type}</span>
                      </div>
                      <div style={styles.accountDetails}>
                        <p><strong>Balance:</strong> ${account.balance?.toLocaleString() || '0.00'}</p>
                        <p><strong>Status:</strong> {account.status}</p>
                        <p><strong>Created:</strong> {new Date(account.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  refreshButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
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
  error: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  success: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '10px 0 0 0'
  },
  formContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '25px'
  },
  formCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '25px',
    textAlign: 'center'
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
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057'
  },
  select: {
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  input: {
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px'
  },
  textarea: {
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  accountInfo: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },
  preview: {
    background: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #bbdefb'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    marginTop: '10px'
  },
  accountsList: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  accountsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    maxHeight: '600px',
    overflowY: 'auto'
  },
  accountCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '15px',
    background: '#f8f9fa'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  accountType: {
    background: '#6c757d',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  accountDetails: {
    fontSize: '14px',
    color: '#666'
  }
};
