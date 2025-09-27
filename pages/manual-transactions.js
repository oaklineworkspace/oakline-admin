
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function ManualTransactions() {
  const { user, signOut } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    accountId: '',
    type: 'deposit',
    amount: '',
    description: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch accounts with profile data from Supabase
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          account_number,
          account_type,
          balance,
          status,
          user_id,
          profiles!inner(
            full_name,
            email
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching accounts:', error);
        throw new Error(`Failed to fetch accounts: ${error.message}`);
      }

      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError(`Failed to load accounts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.accountId || !formData.amount || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setProcessing(true);
    setMessage('');
    setError('');

    try {
      const account = accounts.find(acc => acc.id === formData.accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const currentBalance = parseFloat(account.balance || 0);
      const amount = parseFloat(formData.amount);
      
      let newBalance;
      let transactionAmount = amount;

      if (formData.type === 'deposit' || formData.type === 'adjustment') {
        newBalance = currentBalance + amount;
      } else if (formData.type === 'withdrawal') {
        newBalance = currentBalance - amount;
        transactionAmount = -amount;
        
        if (newBalance < 0) {
          throw new Error(`Insufficient funds in account ${account.account_number}`);
        }
      } else {
        throw new Error('Invalid transaction type');
      }

      // Update account balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ 
          balance: newBalance.toFixed(2),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.accountId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          account_id: formData.accountId,
          user_id: account.user_id,
          type: formData.type,
          amount: transactionAmount.toFixed(2),
          description: formData.description,
          status: 'completed',
          created_by: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: user?.id,
          action: `manual_${formData.type}`,
          target_type: 'account',
          target_id: formData.accountId,
          details: {
            account_number: account.account_number,
            amount: amount,
            previous_balance: currentBalance,
            new_balance: newBalance,
            description: formData.description
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        console.warn('Audit log error:', auditError);
      }

      setMessage('✅ Transaction processed successfully!');
      setFormData({ accountId: '', type: 'deposit', amount: '', description: '' });
      
      // Refresh accounts to show updated balances
      await fetchAccounts();
      
    } catch (error) {
      console.error('Error processing transaction:', error);
      setError(`Failed to process transaction: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>💰 Manual Transactions</h1>
            <p style={styles.subtitle}>Process deposits, withdrawals, and adjustments</p>
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

        {loading && <div style={styles.loading}>Loading accounts...</div>}

        {message && (
          <div style={styles.successMessage}>{message}</div>
        )}

        {error && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        <div style={styles.content}>
          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Process Transaction</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Select Account *</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                  required
                  style={styles.select}
                >
                  <option value="">Choose an account...</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} - {account.account_type} 
                      ({account.profiles?.full_name}) 
                      - Balance: ${parseFloat(account.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Transaction Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  style={styles.select}
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="adjustment">Balance Adjustment</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  style={styles.input}
                  placeholder="0.00"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  style={styles.input}
                  placeholder="Transaction description..."
                />
              </div>

              <button 
                type="submit" 
                disabled={processing || loading}
                style={{
                  ...styles.button,
                  opacity: (processing || loading) ? 0.6 : 1,
                  cursor: (processing || loading) ? 'not-allowed' : 'pointer'
                }}
              >
                {processing ? 'Processing...' : 'Process Transaction'}
              </button>
            </form>
          </div>

          <div style={styles.accountsSection}>
            <h2 style={styles.sectionTitle}>All Accounts ({accounts.length})</h2>
            <div style={styles.accountsList}>
              {accounts.map(account => (
                <div key={account.id} style={styles.accountCard}>
                  <div style={styles.accountHeader}>
                    <span style={styles.accountNumber}>{account.account_number}</span>
                    <span style={styles.accountType}>{account.account_type}</span>
                  </div>
                  <div style={styles.accountInfo}>
                    <p style={styles.accountOwner}>
                      {account.profiles?.full_name}
                    </p>
                    <p style={styles.accountEmail}>{account.profiles?.email}</p>
                    <p style={styles.balance}>
                      Balance: <strong>${parseFloat(account.balance || 0).toFixed(2)}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}

export default ManualTransactions;

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
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b',
    background: 'white',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #a7f3d0'
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fecaca'
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px'
  },
  formSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  accountsSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
  },
  button: {
    padding: '14px 28px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '500px',
    overflowY: 'auto'
  },
  accountCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#f9fafb'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  accountNumber: {
    fontWeight: 'bold',
    color: '#1e293b'
  },
  accountType: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  accountInfo: {
    fontSize: '14px'
  },
  accountOwner: {
    fontWeight: '500',
    margin: '4px 0',
    color: '#374151'
  },
  accountEmail: {
    color: '#6b7280',
    margin: '4px 0'
  },
  balance: {
    margin: '4px 0',
    color: '#059669'
  }
};
