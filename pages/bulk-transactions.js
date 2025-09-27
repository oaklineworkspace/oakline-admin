
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function BulkTransactions() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [bulkData, setBulkData] = useState({
    type: 'deposit',
    amount: '',
    description: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchAccounts();
  }, []);

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
      setError('Please select at least one account');
      return;
    }

    if (!bulkData.amount || parseFloat(bulkData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setMessage('');
    setError('');

    try {
      const transactionPromises = selectedAccounts.map(async (accountId) => {
        const account = accounts.find(acc => acc.id === accountId);
        const currentBalance = parseFloat(account.balance || 0);
        const amount = parseFloat(bulkData.amount);
        
        let newBalance;
        if (bulkData.type === 'deposit' || bulkData.type === 'adjustment') {
          newBalance = currentBalance + amount;
        } else {
          newBalance = currentBalance - amount;
          if (newBalance < 0) {
            throw new Error(`Insufficient funds in account ${account.account_number}`);
          }
        }

        // Update account balance
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
            balance: newBalance.toFixed(2),
            updated_at: new Date().toISOString()
          })
          .eq('id', accountId);

        if (updateError) throw updateError;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            account_id: accountId,
            user_id: account.user_id,
            type: bulkData.type,
            amount: amount.toFixed(2),
            description: bulkData.description,
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (transactionError) throw transactionError;

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            admin_id: user?.id,
            action: `bulk_${bulkData.type}`,
            target_type: 'account',
            target_id: accountId,
            details: {
              account_number: account.account_number,
              amount: amount,
              previous_balance: currentBalance,
              new_balance: newBalance,
              description: bulkData.description
            },
            created_at: new Date().toISOString()
          });

        if (auditError) {
          console.warn('Audit log error:', auditError);
        }

        return { accountId, success: true };
      });

      await Promise.all(transactionPromises);

      setMessage(`✅ Successfully processed ${selectedAccounts.length} transactions!`);
      setBulkData({ type: 'deposit', amount: '', description: '' });
      setSelectedAccounts([]);
      
      // Refresh accounts to show updated balances
      await fetchAccounts();
      
    } catch (error) {
      console.error('Error processing bulk transactions:', error);
      setError(`Failed to process bulk transactions: ${error.message}`);
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
        <div style={styles.headerContent}>
          <h1 style={styles.title}>📦 Bulk Transactions</h1>
          <p style={styles.subtitle}>Process transactions for multiple accounts simultaneously</p>
        </div>
        <Link href="/dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {message && <div style={styles.successMessage}>{message}</div>}
      {error && <div style={styles.errorMessage}>{error}</div>}

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
                        {account.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p style={styles.accountEmail}>{account.profiles?.email || 'No email'}</p>
                      <p style={styles.balance}>
                        Balance: <strong>${parseFloat(account.balance || 0).toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {accounts.length === 0 && (
            <div style={styles.noData}>
              No active accounts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BulkTransactionsPage() {
  return (
    <AdminRoute>
      <BulkTransactions />
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    color: '#64748b',
    fontSize: '16px',
    margin: 0
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontStyle: 'italic'
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
