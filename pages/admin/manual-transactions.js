
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';

export default function ManualTransactions() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    accountId: '',
    type: 'deposit',
    amount: '',
    description: '',
    transactionDate: new Date().toISOString().slice(0, 16) // Default to current date/time
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
          user_id,
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
      setMessage('❌ Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setMessage('');

    try {
      const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
      if (!selectedAccount) {
        setMessage('❌ Please select a valid account');
        setProcessing(false);
        return;
      }

      const response = await fetch('/api/admin/manual-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.accountId,
          userId: selectedAccount.user_id,
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          transactionDate: formData.transactionDate
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('✅ Transaction processed successfully!');
        setFormData({ accountId: '', type: 'deposit', amount: '', description: '', transactionDate: new Date().toISOString().slice(0, 16) });
        await fetchAccounts();
        // Optionally fetch and display recent transactions here if they are managed on this page
      } else {
        setMessage(`❌ ${result.error || 'Failed to process transaction'}`);
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      setMessage('❌ Failed to process transaction');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading accounts...</p>
        </div>
      </AdminAuth>
    );
  }

  // Dummy data for recent transactions to demonstrate the updated display
  // In a real application, this would be fetched from your backend
  const recentTransactions = [
    { type: 'wire_transfer', description: 'Sent payment for services', amount: 500000.00, created_at: '2025-10-12T10:00:00Z', user_id: 'user1', account_id: 'acc1' },
    { type: 'atm_withdrawal', description: 'Cash withdrawal', amount: 3000.00, created_at: '2025-10-12T11:30:00Z', user_id: 'user2', account_id: 'acc2' },
    { type: 'deposit', description: 'Incoming transfer', amount: 1000000.00, created_at: '2025-10-12T14:00:00Z', user_id: 'user3', account_id: 'acc3' },
    { type: 'interest', description: 'Monthly interest earned', amount: 5000.00, created_at: '2025-10-12T16:45:00Z', user_id: 'user1', account_id: 'acc1' },
    { type: 'refund', description: 'Product return refund', amount: 150.00, created_at: '2025-10-13T09:15:00Z', user_id: 'user4', account_id: 'acc4' },
    { type: 'fee', description: 'Monthly account fee', amount: 10.00, created_at: '2025-10-13T10:00:00Z', user_id: 'user2', account_id: 'acc2' },
  ];


  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💰 Manual Transactions</h1>
            <p style={styles.subtitle}>Process deposits, withdrawals, and adjustments</p>
          </div>
          <button onClick={() => router.push('/admin/admin-dashboard')} style={styles.backButton}>
            ← Dashboard
          </button>
        </div>

        {message && (
          <div style={{
            ...styles.alert,
            backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
            color: message.includes('✅') ? '#059669' : '#dc2626'
          }}>
            {message}
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Process Transaction</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Select Account *</label>
                <select
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleInputChange}
                  required
                  style={styles.select}
                >
                  <option value="">Choose an account...</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} - {account.account_type.toUpperCase()}
                      ({account.applications?.first_name} {account.applications?.last_name})
                      - Balance: ${parseFloat(account.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Transaction Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  <optgroup label="Credits (Add Money)">
                    <option value="deposit">Deposit</option>
                    <option value="transfer_in">Transfer In</option>
                    <option value="refund">Refund</option>
                    <option value="interest">Interest</option>
                    <option value="bonus">Bonus</option>
                  </optgroup>
                  <optgroup label="Debits (Deduct Money)">
                    <option value="withdrawal">Withdrawal</option>
                    <option value="atm_withdrawal">ATM Withdrawal</option>
                    <option value="debit_card">Debit Card Charge</option>
                    <option value="transfer">Transfer Out</option>
                    <option value="wire_transfer">Wire Transfer</option>
                    <option value="ach_transfer">ACH Transfer</option>
                    <option value="check">Check Payment</option>
                    <option value="fee">Service Fee</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="adjustment">Balance Adjustment (+ or -)</option>
                  </optgroup>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Amount ($) *</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min={formData.type === 'adjustment' ? undefined : '0.01'}
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder={formData.type === 'adjustment' ? 'Enter positive or negative amount' : '0.00'}
                />
                {formData.type === 'adjustment' && (
                  <small style={{color: '#64748b', marginTop: '4px'}}>
                    For adjustments, use negative (-) for deductions, positive for additions
                  </small>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description *</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Transaction description..."
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Transaction Date & Time</label>
                <input
                  type="datetime-local"
                  name="transactionDate"
                  value={formData.transactionDate}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
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
          </div>

          <div style={styles.accountsSection}>
            <h2 style={styles.sectionTitle}>All Accounts ({accounts.length})</h2>
            <div style={styles.accountsList}>
              {accounts.map(account => (
                <div key={account.id} style={styles.accountCard}>
                  <div style={styles.accountHeader}>
                    <span style={styles.accountNumber}>{account.account_number}</span>
                    <span style={styles.accountType}>{account.account_type.toUpperCase()}</span>
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

        <div style={{ ...styles.accountsSection, marginTop: '2rem' }}>
          <h2 style={styles.sectionTitle}>Recent Transactions (Demo)</h2>
          <div style={styles.transactionsList}>
            {recentTransactions.map((tx, index) => {
              const isCredit = tx.type === 'credit' || tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'interest' || tx.type === 'transfer_in' || tx.type === 'bonus';
              const isDebit = tx.type === 'debit' || tx.type === 'withdrawal' || tx.type === 'atm_withdrawal' || tx.type === 'debit_card' || tx.type === 'transfer' || tx.type === 'wire_transfer' || tx.type === 'ach_transfer' || tx.type === 'check' || tx.type === 'fee';
              const isAdjustment = tx.type === 'adjustment'; // Assuming adjustment could be +/-

              let icon = '🔄'; // Default icon
              let iconBgColor = '#fef3c7'; // Default background
              let iconColor = '#f59e0b'; // Default text color
              let amountSign = '';

              if (isCredit) {
                icon = '💰';
                iconBgColor = '#d1fae5';
                iconColor = '#059669';
                amountSign = '+';
              } else if (isDebit) {
                icon = '💸';
                iconBgColor = '#fee2e2';
                iconColor = '#dc2626';
                amountSign = '-';
              } else if (isAdjustment) {
                 icon = tx.amount >= 0 ? '➕' : '➖'; // '+' or '-' for adjustment
                 iconBgColor = tx.amount >= 0 ? '#dbeafe' : '#fecaca'; // Light blue for positive, light red for negative
                 iconColor = tx.amount >= 0 ? '#2563eb' : '#dc2626';
                 amountSign = tx.amount >= 0 ? '+' : ''; // Sign is part of the amount for adjustment
              }


              return (
                <div key={index} style={styles.transactionItem}>
                  <div style={{
                    ...styles.transactionIcon,
                    backgroundColor: iconBgColor,
                    color: iconColor
                  }}>
                    {icon}
                  </div>
                  <div style={styles.transactionDetails}>
                    <div style={styles.transactionDescription}>
                      {tx.description || tx.type}
                    </div>
                    <div style={styles.transactionDate}>
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div style={{
                    ...styles.transactionAmount,
                    color: isCredit ? '#059669' : isDebit ? '#dc2626' : isAdjustment ? iconColor : '#374151'
                  }}>
                    {amountSign}{formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: '1.5rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTop: '5px solid #0f766e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#475569',
    fontSize: '16px'
  },
  header: {
    backgroundColor: '#0f766e',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
    margin: '0.5rem 0 0 0'
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'white',
    color: '#0f766e',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  alert: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    textAlign: 'center'
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '1.5rem'
  },
  formSection: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  accountsSection: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: '1.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  field: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '0.5rem'
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  button: {
    padding: '1rem',
    backgroundColor: '#0f766e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '500px',
    overflowY: 'auto'
  },
  accountCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    backgroundColor: '#f9fafb'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  accountNumber: {
    fontWeight: '700',
    color: '#0f766e',
    fontSize: '0.95rem'
  },
  accountType: {
    backgroundColor: '#d1fae5',
    color: '#059669',
    padding: '0.25rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  accountInfo: {
    fontSize: '0.9rem'
  },
  accountOwner: {
    fontWeight: '600',
    margin: '0.25rem 0',
    color: '#1e293b'
  },
  accountEmail: {
    color: '#64748b',
    margin: '0.25rem 0'
  },
  balance: {
    margin: '0.5rem 0 0 0',
    color: '#0f766e',
    fontWeight: '500'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '500px',
    overflowY: 'auto',
    marginTop: '1rem'
  },
  transactionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb'
  },
  transactionIcon: {
    fontSize: '24px',
    marginRight: '15px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    flexShrink: 0
  },
  transactionDetails: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  transactionDescription: {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: '0.95rem'
  },
  transactionDate: {
    color: '#6b7280',
    fontSize: '0.85rem',
    marginTop: '4px'
  },
  transactionAmount: {
    fontWeight: '700',
    fontSize: '1rem',
    marginLeft: '15px',
    flexShrink: 0
  }
};
