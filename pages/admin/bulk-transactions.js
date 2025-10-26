
import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default function BulkTransactions() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [bulkData, setBulkData] = useState({
    type: 'deposit',
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabaseAdmin
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

  const handleAccountToggle = (accountId) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(acc => acc.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedAccounts.length === 0) {
      setMessage('Please select at least one account');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/bulk-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bulkData,
          accountIds: selectedAccounts
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Successfully processed ${selectedAccounts.length} transactions!`);
        setBulkData({ type: 'deposit', amount: '', description: '' });
        setSelectedAccounts([]);
        fetchAccounts(); // Refresh accounts
      } else {
        setMessage(result.error || 'Failed to process bulk transactions');
      }
    } catch (error) {
      console.error('Error processing bulk transactions:', error);
      setMessage('Failed to process bulk transactions');
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
        <h1 style={styles.title}>Bulk Transactions</h1>
        <p style={styles.subtitle}>Process transactions for multiple accounts simultaneously</p>
      </div>

      <div style={styles.content}>
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Transaction Details</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Transaction Type</label>
              <select
                value={bulkData.type}
                onChange={(e) => setBulkData({...bulkData, type: e.target.value})}
                style={styles.select}
              >
                <option value="deposit">Bulk Deposit</option>
                <option value="withdrawal">Bulk Withdrawal</option>
                <option value="adjustment">Bulk Adjustment</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Amount per Account ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={bulkData.amount}
                onChange={(e) => setBulkData({...bulkData, amount: e.target.value})}
                required
                style={styles.input}
                placeholder="0.00"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <input
                type="text"
                value={bulkData.description}
                onChange={(e) => setBulkData({...bulkData, description: e.target.value})}
                required
                style={styles.input}
                placeholder="Bulk transaction description..."
              />
            </div>

            <div style={styles.summaryBox}>
              <h3 style={styles.summaryTitle}>Transaction Summary</h3>
              <p>Selected Accounts: <strong>{selectedAccounts.length}</strong></p>
              <p>Amount per Account: <strong>${bulkData.amount || '0.00'}</strong></p>
              <p>Total Amount: <strong>${((parseFloat(bulkData.amount) || 0) * selectedAccounts.length).toFixed(2)}</strong></p>
            </div>

            <button 
              type="submit" 
              disabled={processing || selectedAccounts.length === 0}
              style={{
                ...styles.button,
                opacity: (processing || selectedAccounts.length === 0) ? 0.6 : 1,
                cursor: (processing || selectedAccounts.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {processing ? 'Processing...' : `Process ${selectedAccounts.length} Transactions`}
            </button>
          </form>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('Success') ? '#d1fae5' : '#fee2e2',
              color: message.includes('Success') ? '#059669' : '#dc2626'
            }}>
              {message}
            </div>
          )}
        </div>

        <div style={styles.accountsSection}>
          <div style={styles.accountsHeader}>
            <h2 style={styles.sectionTitle}>Select Accounts ({accounts.length})</h2>
            <button
              type="button"
              onClick={handleSelectAll}
              style={styles.selectAllButton}
            >
              {selectedAccounts.length === accounts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={styles.accountsList}>
            {accounts.map(account => (
              <div 
                key={account.id} 
                style={{
                  ...styles.accountCard,
                  backgroundColor: selectedAccounts.includes(account.id) ? '#dbeafe' : '#f9fafb',
                  borderColor: selectedAccounts.includes(account.id) ? '#3b82f6' : '#e5e7eb'
                }}
                onClick={() => handleAccountToggle(account.id)}
              >
                <div style={styles.accountCardContent}>
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(account.id)}
                    onChange={() => handleAccountToggle(account.id)}
                    style={styles.checkbox}
                  />
                  
                  <div style={styles.accountDetails}>
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
    gridTemplateColumns: '400px 1fr',
    gap: '30px'
  },
  formSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    height: 'fit-content'
  },
  accountsSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  accountsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  selectAllButton: {
    padding: '8px 16px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
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
  summaryBox: {
    backgroundColor: '#f3f4f6',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db'
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 12px 0'
  },
  button: {
    padding: '14px 28px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500'
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
    gap: '8px',
    maxHeight: '600px',
    overflowY: 'auto'
  },
  accountCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  accountCardContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  checkbox: {
    marginTop: '4px'
  },
  accountDetails: {
    flex: 1
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
