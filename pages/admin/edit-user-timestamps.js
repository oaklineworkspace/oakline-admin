
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function EditUserTimestamps() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/get-users');
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTimestamps = async (userId) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/get-user-timestamps?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setUserData(data);
        setSelectedUser(userId);
      } else {
        setError(data.error || 'Failed to fetch user timestamps');
      }
    } catch (err) {
      setError('Error fetching user timestamps: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTimestamp = async (table, recordId, field, value) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/update-user-timestamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table,
          recordId,
          field,
          value
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Successfully updated ${field} in ${table}`);
        // Refresh data
        await fetchUserTimestamps(selectedUser);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update timestamp');
      }
    } catch (err) {
      setError('Error updating timestamp: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const renderTimestampField = (table, recordId, fieldName, currentValue, label) => {
    return (
      <div key={`${table}-${recordId}-${fieldName}`} style={styles.fieldRow}>
        <label style={styles.fieldLabel}>{label}</label>
        <div style={styles.fieldInputGroup}>
          <input
            type="datetime-local"
            defaultValue={formatDateForInput(currentValue)}
            style={styles.dateInput}
            id={`${table}-${recordId}-${fieldName}`}
          />
          <button
            onClick={() => {
              const input = document.getElementById(`${table}-${recordId}-${fieldName}`);
              const newValue = input.value ? new Date(input.value).toISOString() : null;
              handleUpdateTimestamp(table, recordId, fieldName, newValue);
            }}
            style={styles.updateButton}
            disabled={saving}
          >
            {saving ? 'Updating...' : 'Update'}
          </button>
        </div>
        <span style={styles.currentValue}>
          Current: {currentValue ? new Date(currentValue).toLocaleString() : 'Not set'}
        </span>
      </div>
    );
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const email = user.email?.toLowerCase() || '';
    const firstName = user.profiles?.first_name?.toLowerCase() || '';
    const lastName = user.profiles?.last_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return email.includes(query) || firstName.includes(query) || lastName.includes(query);
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>⏰ Edit User Timestamps</h1>
            <p style={styles.subtitle}>Manually update dates and timestamps across all user tables</p>
          </div>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {success && <div style={styles.successMessage}>{success}</div>}

        <div style={styles.contentWrapper}>
          <div style={styles.userSelectionPanel}>
            <h2 style={styles.panelTitle}>Select User</h2>
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            <div style={styles.userList}>
              {loading && !userData ? (
                <div style={styles.loadingText}>Loading users...</div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    style={{
                      ...styles.userItem,
                      ...(selectedUser === user.id ? styles.userItemActive : {})
                    }}
                    onClick={() => fetchUserTimestamps(user.id)}
                  >
                    <div style={styles.userName}>
                      {user.profiles?.first_name} {user.profiles?.last_name}
                    </div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.timestampEditPanel}>
            {loading && userData ? (
              <div style={styles.loadingText}>Loading timestamps...</div>
            ) : userData ? (
              <div>
                <h2 style={styles.panelTitle}>Edit Timestamps for {userData.user?.email}</h2>

                {/* Applications */}
                {userData.application && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>📝 Application</h3>
                    {renderTimestampField('applications', userData.application.id, 'submitted_at', userData.application.submitted_at, 'Submitted At')}
                    {renderTimestampField('applications', userData.application.id, 'processed_at', userData.application.processed_at, 'Processed At')}
                    {renderTimestampField('applications', userData.application.id, 'updated_at', userData.application.updated_at, 'Updated At')}
                  </div>
                )}

                {/* Profile */}
                {userData.profile && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>👤 Profile</h3>
                    {renderTimestampField('profiles', userData.profile.id, 'created_at', userData.profile.created_at, 'Created At')}
                    {renderTimestampField('profiles', userData.profile.id, 'updated_at', userData.profile.updated_at, 'Updated At')}
                    {renderTimestampField('profiles', userData.profile.id, 'enrollment_completed_at', userData.profile.enrollment_completed_at, 'Enrollment Completed At')}
                  </div>
                )}

                {/* Accounts */}
                {userData.accounts && userData.accounts.length > 0 && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>💳 Accounts ({userData.accounts.length})</h3>
                    {userData.accounts.map((account, idx) => (
                      <div key={account.id} style={styles.recordGroup}>
                        <h4 style={styles.recordTitle}>
                          Account {idx + 1}: {account.account_type} - {account.account_number}
                        </h4>
                        {renderTimestampField('accounts', account.id, 'created_at', account.created_at, 'Created At')}
                        {renderTimestampField('accounts', account.id, 'updated_at', account.updated_at, 'Updated At')}
                        {renderTimestampField('accounts', account.id, 'approved_at', account.approved_at, 'Approved At')}
                        {renderTimestampField('accounts', account.id, 'funding_confirmed_at', account.funding_confirmed_at, 'Funding Confirmed At')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Cards */}
                {userData.cards && userData.cards.length > 0 && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>💳 Cards ({userData.cards.length})</h3>
                    {userData.cards.map((card, idx) => (
                      <div key={card.id} style={styles.recordGroup}>
                        <h4 style={styles.recordTitle}>
                          Card {idx + 1}: {card.card_type} - ****{card.card_number?.slice(-4)}
                        </h4>
                        {renderTimestampField('cards', card.id, 'created_at', card.created_at, 'Created At')}
                        {renderTimestampField('cards', card.id, 'updated_at', card.updated_at, 'Updated At')}
                        {renderTimestampField('cards', card.id, 'activated_at', card.activated_at, 'Activated At')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Loans */}
                {userData.loans && userData.loans.length > 0 && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>💰 Loans ({userData.loans.length})</h3>
                    {userData.loans.map((loan, idx) => (
                      <div key={loan.id} style={styles.recordGroup}>
                        <h4 style={styles.recordTitle}>
                          Loan {idx + 1}: {loan.loan_type} - ${parseFloat(loan.principal).toFixed(2)}
                        </h4>
                        {renderTimestampField('loans', loan.id, 'created_at', loan.created_at, 'Created At')}
                        {renderTimestampField('loans', loan.id, 'updated_at', loan.updated_at, 'Updated At')}
                        {renderTimestampField('loans', loan.id, 'approved_at', loan.approved_at, 'Approved At')}
                        {renderTimestampField('loans', loan.id, 'disbursed_at', loan.disbursed_at, 'Disbursed At')}
                        {renderTimestampField('loans', loan.id, 'deposit_date', loan.deposit_date, 'Deposit Date')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Transactions */}
                {userData.transactions && userData.transactions.length > 0 && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>🔄 Recent Transactions ({userData.transactions.length})</h3>
                    {userData.transactions.slice(0, 10).map((txn, idx) => (
                      <div key={txn.id} style={styles.recordGroup}>
                        <h4 style={styles.recordTitle}>
                          Transaction {idx + 1}: {txn.type} - ${parseFloat(txn.amount).toFixed(2)}
                        </h4>
                        {renderTimestampField('transactions', txn.id, 'created_at', txn.created_at, 'Created At')}
                        {renderTimestampField('transactions', txn.id, 'updated_at', txn.updated_at, 'Updated At')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Login History */}
                {userData.login_history && userData.login_history.length > 0 && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>🔐 Recent Login History ({userData.login_history.length})</h3>
                    {userData.login_history.slice(0, 5).map((login, idx) => (
                      <div key={login.id} style={styles.recordGroup}>
                        <h4 style={styles.recordTitle}>
                          Login {idx + 1}: {login.success ? '✅ Success' : '❌ Failed'} - {login.ip_address}
                        </h4>
                        {renderTimestampField('login_history', login.id, 'login_time', login.login_time, 'Login Time')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Check Deposits */}
                {userData.check_deposits && userData.check_deposits.length > 0 && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>📝 Check Deposits ({userData.check_deposits.length})</h3>
                    {userData.check_deposits.map((deposit, idx) => (
                      <div key={deposit.id} style={styles.recordGroup}>
                        <h4 style={styles.recordTitle}>
                          Deposit {idx + 1}: ${parseFloat(deposit.amount).toFixed(2)} - {deposit.status}
                        </h4>
                        {renderTimestampField('check_deposits', deposit.id, 'created_at', deposit.created_at, 'Created At')}
                        {renderTimestampField('check_deposits', deposit.id, 'updated_at', deposit.updated_at, 'Updated At')}
                        {renderTimestampField('check_deposits', deposit.id, 'processed_at', deposit.processed_at, 'Processed At')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Crypto Deposits */}
                {userData.crypto_deposits && userData.crypto_deposits.length > 0 && (
                  <div style={styles.tableSection}>
                    <h3 style={styles.tableSectionTitle}>₿ Crypto Deposits ({userData.crypto_deposits.length})</h3>
                    {userData.crypto_deposits.map((deposit, idx) => (
                      <div key={deposit.id} style={styles.recordGroup}>
                        <h4 style={styles.recordTitle}>
                          Deposit {idx + 1}: {deposit.amount} - {deposit.status}
                        </h4>
                        {renderTimestampField('crypto_deposits', deposit.id, 'created_at', deposit.created_at, 'Created At')}
                        {renderTimestampField('crypto_deposits', deposit.id, 'updated_at', deposit.updated_at, 'Updated At')}
                        {renderTimestampField('crypto_deposits', deposit.id, 'approved_at', deposit.approved_at, 'Approved At')}
                        {renderTimestampField('crypto_deposits', deposit.id, 'completed_at', deposit.completed_at, 'Completed At')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>Select a user from the list to edit timestamps</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AdminFooter />
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  backButton: {
    background: '#6b7280',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorMessage: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  successMessage: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  contentWrapper: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '20px',
    alignItems: 'start'
  },
  userSelectionPanel: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxHeight: 'calc(100vh - 200px)',
    position: 'sticky',
    top: '20px'
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '15px'
  },
  searchInput: {
    width: '100%',
    padding: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '15px'
  },
  userList: {
    maxHeight: 'calc(100vh - 350px)',
    overflowY: 'auto'
  },
  userItem: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent'
  },
  userItemActive: {
    background: '#ede9fe',
    border: '2px solid #7c3aed'
  },
  userName: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px'
  },
  userEmail: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  timestampEditPanel: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    minHeight: '400px'
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
    fontSize: '16px'
  },
  tableSection: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0'
  },
  tableSectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#3730a3',
    marginBottom: '15px'
  },
  recordGroup: {
    background: '#f8fafc',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  recordTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '12px'
  },
  fieldRow: {
    marginBottom: '15px',
    padding: '10px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px'
  },
  fieldInputGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '5px'
  },
  dateInput: {
    flex: 1,
    padding: '8px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px'
  },
  updateButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  currentValue: {
    fontSize: '11px',
    color: '#64748b',
    fontStyle: 'italic'
  }
};
