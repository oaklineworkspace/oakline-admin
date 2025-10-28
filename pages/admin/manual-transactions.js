import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';

// Placeholder for AdminFooter component - actual implementation would be in a separate file
const AdminFooter = () => {
  const router = useRouter();
  const footerLinks = [
    { href: '/admin/admin-dashboard', label: 'Dashboard' },
    { href: '/admin/approve-applications', label: 'Approve Applications' },
    { href: '/admin/manual-transactions', label: 'Manual Transactions' },
    { href: '/admin/pages/admin', label: 'Admin Pages' },
    { href: '/admin/manage-accounts', label: 'Manage Accounts' }
  ];

  const styles = {
    footer: {
      position: 'sticky',
      bottom: 0,
      left: 0,
      width: '100%',
      backgroundColor: '#0f766e',
      padding: '1rem 0',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1.5rem',
      boxShadow: '0 -2px 5px rgba(0,0,0,0.1)',
      zIndex: 1000,
      flexWrap: 'wrap'
    },
    link: {
      color: 'white',
      textDecoration: 'none',
      fontSize: '0.9rem',
      fontWeight: '500',
      transition: 'opacity 0.2s',
    },
    linkHover: { // For demonstration, actual hover would be in CSS or onMouseEnter
      opacity: 0.8
    }
  };

  return (
    <footer style={styles.footer}>
      {footerLinks.map((link) => (
        <a
          key={link.href}
          href="#" // Prevent default navigation for now, to be handled by router.push
          onClick={(e) => {
            e.preventDefault();
            router.push(link.href);
          }}
          style={styles.link}
          // onMouseEnter={(e) => e.target.style.opacity = styles.linkHover.opacity}
          // onMouseLeave={(e) => e.target.style.opacity = 1}
        >
          {link.label}
        </a>
      ))}
    </footer>
  );
};

const CREDIT_TYPES = [
  { value: 'deposit_adjust', label: 'Deposit Adjust', icon: '💰' },
  { value: 'transfer_in', label: 'Transfer In', icon: '📥' },
  { value: 'refund', label: 'Refund', icon: '↩️' },
  { value: 'interest', label: 'Interest', icon: '📈' },
  { value: 'bonus', label: 'Bonus', icon: '🎁' },
  { value: 'check_deposit', label: 'Check Deposit', icon: '✅' }
];

const DEBIT_TYPES = [
  { value: 'withdrawal', label: 'Withdrawal', icon: '💸' },
  { value: 'atm_withdrawal', label: 'ATM Withdrawal', icon: '🏧' },
  { value: 'debit_card', label: 'Debit Card Charge', icon: '💳' },
  { value: 'transfer_out', label: 'Transfer Out', icon: '📤' },
  { value: 'wire_transfer', label: 'Wire Transfer', icon: '🌐' },
  { value: 'ach_transfer', label: 'ACH Transfer', icon: '🔄' },
  { value: 'check_payment', label: 'Check Payment', icon: '📝' },
  { value: 'service_fee', label: 'Service Fee', icon: '💵' },
  { value: 'other', label: 'Other', icon: '📋' }
];

const FLEXIBLE_TYPES = [
  { value: 'check_deposit', label: 'Check Deposit (can be credit or debit)', icon: '✅' },
  { value: 'wire_transfer', label: 'Wire Transfer (can be credit or debit)', icon: '🌐' }
];

export default function ManualTransactions() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    accountId: '',
    transactionType: 'deposit_adjust',
    amount: '',
    description: '',
    status: 'completed',
    creditDebitOverride: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        fetch('/api/admin/get-accounts'),
        fetch('/api/admin/get-transactions')
      ]);

      const accountsData = await accountsRes.json();
      const transactionsData = await transactionsRes.json();

      if (!accountsRes.ok) throw new Error(accountsData.error || 'Failed to fetch accounts');
      if (!transactionsRes.ok) throw new Error(transactionsData.error || 'Failed to fetch transactions');

      setAccounts(accountsData.accounts || []);
      setTransactions(transactionsData.transactions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('❌ Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFlexibleType = (type) => {
    return FLEXIBLE_TYPES.some(t => t.value === type);
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
          transactionType: formData.transactionType,
          amount: parseFloat(formData.amount),
          description: formData.description,
          status: formData.status,
          creditDebitOverride: formData.creditDebitOverride
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message}! New balance: $${result.newBalance.toFixed(2)}`);
        setFormData({
          accountId: '',
          transactionType: 'deposit_adjust',
          amount: '',
          description: '',
          status: 'completed',
          creditDebitOverride: ''
        });
        await fetchData();
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

  const getTransactionColor = (transaction) => {
    return transaction.type === 'credit' ? '#059669' : '#dc2626';
  };

  const getTransactionBgColor = (transaction) => {
    return transaction.type === 'credit' ? '#d1fae5' : '#fee2e2';
  };

  const getTransactionIcon = (transaction) => {
    // Match icon based on description keywords since transactions table doesn't have transaction_type
    const description = (transaction.description || '').toLowerCase();
    const typeObj = [...CREDIT_TYPES, ...DEBIT_TYPES].find(t => 
      description.includes(t.value.replace(/_/g, ' '))
    );
    return typeObj?.icon || (transaction.type === 'credit' ? '💰' : '💸');
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      completed: { bg: '#d1fae5', color: '#059669' },
      pending: { bg: '#fef3c7', color: '#f59e0b' },
      failed: { bg: '#fee2e2', color: '#dc2626' }
    };
    return styles[status] || styles.pending;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💰 Manual Transactions</h1>
            <p style={styles.subtitle}>Process deposits, withdrawals, and adjustments with full control</p>
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
            <h2 style={styles.sectionTitle}>Create Transaction</h2>
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
                  name="transactionType"
                  value={formData.transactionType}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  <optgroup label="💚 Credits (Add Money)">
                    {CREDIT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="❤️ Debits (Deduct Money)">
                    {DEBIT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {isFlexibleType(formData.transactionType) && (
                <div style={styles.field}>
                  <label style={styles.label}>Credit or Debit Override</label>
                  <select
                    name="creditDebitOverride"
                    value={formData.creditDebitOverride}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="">Auto-detect</option>
                    <option value="credit">Force Credit (+)</option>
                    <option value="debit">Force Debit (-)</option>
                  </select>
                  <small style={{color: '#64748b', marginTop: '4px'}}>
                    This transaction type can be either credit or debit
                  </small>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Amount ($) *</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="0.00"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Optional transaction description..."
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  <option value="completed">✅ Completed (updates balance)</option>
                  <option value="pending">⏳ Pending (no balance change)</option>
                  <option value="failed">❌ Failed (no balance change)</option>
                </select>
                <small style={{color: '#64748b', marginTop: '4px'}}>
                  Only "completed" transactions will update the account balance
                </small>
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
                {processing ? 'Processing...' : '💳 Process Transaction'}
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
          <div style={styles.transactionHeader}>
            <h2 style={styles.sectionTitle}>Transaction History ({filteredTransactions.length})</h2>
            <div style={styles.filters}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Types</option>
                <option value="credit">💚 Credits</option>
                <option value="debit">❤️ Debits</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="completed">✅ Completed</option>
                <option value="pending">⏳ Pending</option>
                <option value="failed">❌ Failed</option>
              </select>
            </div>
          </div>

          <div style={styles.transactionsList}>
            {filteredTransactions.length === 0 ? (
              <div style={styles.emptyState}>No transactions found</div>
            ) : (
              filteredTransactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                const statusStyle = getStatusBadgeStyle(tx.status);

                return (
                  <div key={tx.id} style={styles.transactionItem}>
                    <div style={{
                      ...styles.transactionIcon,
                      backgroundColor: getTransactionBgColor(tx),
                      color: getTransactionColor(tx)
                    }}>
                      {getTransactionIcon(tx)}
                    </div>
                    <div style={styles.transactionDetails}>
                      <div style={styles.transactionDescription}>
                        {tx.description}
                      </div>
                      <div style={styles.transactionMeta}>
                        <span style={styles.transactionDate}>
                          {new Date(tx.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color
                        }}>
                          {tx.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={styles.accountRef}>
                        {tx.accounts?.account_number} - {tx.accounts?.applications?.first_name} {tx.accounts?.applications?.last_name}
                      </div>
                    </div>
                    <div style={{
                      ...styles.transactionAmount,
                      color: getTransactionColor(tx)
                    }}>
                      {isCredit ? '+' : '-'}${parseFloat(tx.amount || 0).toFixed(2)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: 'clamp(1rem, 3vw, 1.5rem)'
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
    padding: 'clamp(1.5rem, 4vw, 2rem)',
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
    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
    backgroundColor: 'white',
    color: '#0f766e',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  alert: {
    padding: 'clamp(0.75rem, 2vw, 1rem)',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '500',
    textAlign: 'center'
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: 'clamp(1rem, 3vw, 1.5rem)'
  },
  formSection: {
    backgroundColor: 'white',
    padding: 'clamp(1.5rem, 4vw, 2rem)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  accountsSection: {
    backgroundColor: 'white',
    padding: 'clamp(1.5rem, 4vw, 2rem)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: '1.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(1rem, 3vw, 1.25rem)'
  },
  field: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '0.5rem'
  },
  input: {
    padding: 'clamp(0.65rem, 2vw, 0.75rem)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: 'clamp(0.65rem, 2vw, 0.75rem)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  button: {
    padding: 'clamp(0.85rem, 2.5vw, 1rem)',
    backgroundColor: '#0f766e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
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
    padding: 'clamp(0.85rem, 2.5vw, 1rem)',
    backgroundColor: '#f9fafb'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  accountNumber: {
    fontWeight: '700',
    color: '#0f766e',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
  },
  accountType: {
    backgroundColor: '#d1fae5',
    color: '#059669',
    padding: '0.25rem 0.75rem',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 0.8rem)',
    fontWeight: '600'
  },
  accountInfo: {
    fontSize: 'clamp(0.85rem, 2vw, 0.9rem)'
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
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  filters: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  filterSelect: {
    padding: '0.5rem 0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 2vw, 0.85rem)',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '600px',
    overflowY: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  transactionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: 'clamp(0.85rem, 2.5vw, 1rem)',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb',
    gap: '0.75rem'
  },
  transactionIcon: {
    fontSize: 'clamp(20px, 4vw, 24px)',
    width: 'clamp(40px, 8vw, 48px)',
    height: 'clamp(40px, 8vw, 48px)',
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
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: 0
  },
  transactionDescription: {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  transactionMeta: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  transactionDate: {
    color: '#6b7280',
    fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)'
  },
  statusBadge: {
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: 'clamp(0.7rem, 1.6vw, 0.75rem)',
    fontWeight: '600'
  },
  accountRef: {
    color: '#6b7280',
    fontSize: 'clamp(0.75rem, 1.8vw, 0.8rem)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  transactionAmount: {
    fontWeight: '700',
    fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  }
};