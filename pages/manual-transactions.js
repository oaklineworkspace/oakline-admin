
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ManualTransactions() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    accountId: '',
    type: 'deposit',
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          account_number,
          account_type,
          balance,
          applications (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setMessage('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/manual-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Transaction processed successfully!');
        setFormData({ accountId: '', type: 'deposit', amount: '', description: '' });
        fetchAccounts(); // Refresh accounts to show updated balances
      } else {
        setMessage(result.error || 'Failed to process transaction');
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      setMessage('Failed to process transaction');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading accounts...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Manual Transactions</h1>
        <p style={styles.subtitle}>Process deposits, withdrawals, and adjustments</p>
      </div>

      <div style={styles.content}>
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Process Transaction</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Select Account</label>
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
                    ({account.applications?.first_name} {account.applications?.last_name}) 
                    - Balance: ${parseFloat(account.balance || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Transaction Type</label>
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
              <label style={styles.label}>Amount ($)</label>
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
              <label style={styles.label}>Description</label>
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
              disabled={processing}
              style={{
                ...styles.button,
                opacity: processing ? 0.6 : 1,
                cursor: processing ? 'not-allowed' : 'pointer'
              }}
            >
              {processing ? 'Processing...' : 'Process Transaction'}
            </button>
          </form>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('success') ? '#d1fae5' : '#fee2e2',
              color: message.includes('success') ? '#059669' : '#dc2626'
            }}>
              {message}
            </div>
          )}
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
                    {account.applications?.first_name} {account.applications?.last_name}
                  </p>
                  <p style={styles.accountEmail}>{account.applications?.email}</p>
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
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px'
  },
  header: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '16px',
    margin: 0
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  accountsSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
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
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginTop: '20px',
    fontSize: '14px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
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
