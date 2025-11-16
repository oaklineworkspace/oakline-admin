
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

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
  
  // Bulk update states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDateTime, setBulkDateTime] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);

  // Filter states
  const [filterType, setFilterType] = useState('all'); // 'all', 'date', 'month', 'time', 'range'
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filteredFields, setFilteredFields] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (userData) {
      buildAvailableFields();
    }
  }, [userData]);

  useEffect(() => {
    applyFilters();
  }, [availableFields, filterType, filterDate, filterMonth, filterTime, filterStartDate, filterEndDate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/get-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch(`/api/admin/get-user-timestamps?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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

  const buildAvailableFields = () => {
    const fields = [];

    if (userData.application) {
      fields.push({ table: 'applications', id: userData.application.id, field: 'submitted_at', label: '📝 Application - Submitted At', current: userData.application.submitted_at });
      fields.push({ table: 'applications', id: userData.application.id, field: 'processed_at', label: '📝 Application - Processed At', current: userData.application.processed_at });
      fields.push({ table: 'applications', id: userData.application.id, field: 'updated_at', label: '📝 Application - Updated At', current: userData.application.updated_at });
    }

    if (userData.profile) {
      fields.push({ table: 'profiles', id: userData.profile.id, field: 'created_at', label: '👤 Profile - Created At', current: userData.profile.created_at });
      fields.push({ table: 'profiles', id: userData.profile.id, field: 'updated_at', label: '👤 Profile - Updated At', current: userData.profile.updated_at });
      fields.push({ table: 'profiles', id: userData.profile.id, field: 'enrollment_completed_at', label: '👤 Profile - Enrollment Completed At', current: userData.profile.enrollment_completed_at });
    }

    if (userData.accounts) {
      userData.accounts.forEach((account, idx) => {
        fields.push({ table: 'accounts', id: account.id, field: 'created_at', label: `💳 Account ${idx + 1} - Created At`, current: account.created_at });
        fields.push({ table: 'accounts', id: account.id, field: 'updated_at', label: `💳 Account ${idx + 1} - Updated At`, current: account.updated_at });
        fields.push({ table: 'accounts', id: account.id, field: 'approved_at', label: `💳 Account ${idx + 1} - Approved At`, current: account.approved_at });
        fields.push({ table: 'accounts', id: account.id, field: 'funding_confirmed_at', label: `💳 Account ${idx + 1} - Funding Confirmed At`, current: account.funding_confirmed_at });
      });
    }

    if (userData.cards) {
      userData.cards.forEach((card, idx) => {
        fields.push({ table: 'cards', id: card.id, field: 'created_at', label: `💳 Card ${idx + 1} - Created At`, current: card.created_at });
        fields.push({ table: 'cards', id: card.id, field: 'updated_at', label: `💳 Card ${idx + 1} - Updated At`, current: card.updated_at });
        fields.push({ table: 'cards', id: card.id, field: 'activated_at', label: `💳 Card ${idx + 1} - Activated At`, current: card.activated_at });
      });
    }

    if (userData.loans) {
      userData.loans.forEach((loan, idx) => {
        fields.push({ table: 'loans', id: loan.id, field: 'created_at', label: `💰 Loan ${idx + 1} - Created At`, current: loan.created_at });
        fields.push({ table: 'loans', id: loan.id, field: 'updated_at', label: `💰 Loan ${idx + 1} - Updated At`, current: loan.updated_at });
        fields.push({ table: 'loans', id: loan.id, field: 'approved_at', label: `💰 Loan ${idx + 1} - Approved At`, current: loan.approved_at });
        fields.push({ table: 'loans', id: loan.id, field: 'disbursed_at', label: `💰 Loan ${idx + 1} - Disbursed At`, current: loan.disbursed_at });
        fields.push({ table: 'loans', id: loan.id, field: 'deposit_date', label: `💰 Loan ${idx + 1} - Deposit Date`, current: loan.deposit_date });
      });
    }

    if (userData.transactions) {
      userData.transactions.slice(0, 10).forEach((txn, idx) => {
        fields.push({ table: 'transactions', id: txn.id, field: 'created_at', label: `🔄 Transaction ${idx + 1} - Created At`, current: txn.created_at });
        fields.push({ table: 'transactions', id: txn.id, field: 'updated_at', label: `🔄 Transaction ${idx + 1} - Updated At`, current: txn.updated_at });
      });
    }

    if (userData.check_deposits) {
      userData.check_deposits.forEach((deposit, idx) => {
        fields.push({ table: 'check_deposits', id: deposit.id, field: 'created_at', label: `📝 Check Deposit ${idx + 1} - Created At`, current: deposit.created_at });
        fields.push({ table: 'check_deposits', id: deposit.id, field: 'updated_at', label: `📝 Check Deposit ${idx + 1} - Updated At`, current: deposit.updated_at });
        fields.push({ table: 'check_deposits', id: deposit.id, field: 'processed_at', label: `📝 Check Deposit ${idx + 1} - Processed At`, current: deposit.processed_at });
      });
    }

    if (userData.crypto_deposits) {
      userData.crypto_deposits.forEach((deposit, idx) => {
        fields.push({ table: 'crypto_deposits', id: deposit.id, field: 'created_at', label: `₿ Crypto Deposit ${idx + 1} - Created At`, current: deposit.created_at });
        fields.push({ table: 'crypto_deposits', id: deposit.id, field: 'updated_at', label: `₿ Crypto Deposit ${idx + 1} - Updated At`, current: deposit.updated_at });
        fields.push({ table: 'crypto_deposits', id: deposit.id, field: 'approved_at', label: `₿ Crypto Deposit ${idx + 1} - Approved At`, current: deposit.approved_at });
        fields.push({ table: 'crypto_deposits', id: deposit.id, field: 'completed_at', label: `₿ Crypto Deposit ${idx + 1} - Completed At`, current: deposit.completed_at });
      });
    }

    setAvailableFields(fields);
  };

  const applyFilters = () => {
    if (filterType === 'all') {
      setFilteredFields(availableFields);
      return;
    }

    let filtered = availableFields.filter(field => {
      if (!field.current) return false;
      const fieldDate = new Date(field.current);

      if (filterType === 'date' && filterDate) {
        const targetDate = new Date(filterDate);
        return fieldDate.toDateString() === targetDate.toDateString();
      }

      if (filterType === 'month' && filterMonth) {
        const [year, month] = filterMonth.split('-');
        return fieldDate.getFullYear() === parseInt(year) && 
               fieldDate.getMonth() === parseInt(month) - 1;
      }

      if (filterType === 'time' && filterTime) {
        const [hours, minutes] = filterTime.split(':');
        return fieldDate.getHours() === parseInt(hours) && 
               fieldDate.getMinutes() === parseInt(minutes);
      }

      if (filterType === 'range' && filterStartDate && filterEndDate) {
        const startDate = new Date(filterStartDate);
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        return fieldDate >= startDate && fieldDate <= endDate;
      }

      return true;
    });

    setFilteredFields(filtered);
  };

  const handleUpdateTimestamp = async (table, recordId, field, value) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/update-user-timestamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
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

  const handleBulkUpdate = async () => {
    if (selectedFields.length === 0) {
      setError('Please select at least one field to update');
      return;
    }

    if (!bulkDateTime) {
      setError('Please select a date and time');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError('Authentication failed. Please refresh the page and try again.');
        setSaving(false);
        return;
      }

      const isoDateTime = new Date(bulkDateTime).toISOString();
      let successCount = 0;
      let failCount = 0;

      for (const fieldKey of selectedFields) {
        const field = availableFields.find(f => `${f.table}-${f.id}-${f.field}` === fieldKey);
        if (!field) continue;

        const response = await fetch('/api/admin/update-user-timestamp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            table: field.table,
            recordId: field.id,
            field: field.field,
            value: isoDateTime
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`✅ Successfully updated ${successCount} field(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
        await fetchUserTimestamps(selectedUser);
        setShowBulkModal(false);
        setSelectedFields([]);
        setBulkDateTime('');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError('Failed to update any fields');
      }
    } catch (err) {
      setError('Error in bulk update: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFieldSelection = (fieldKey) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectAllFields = () => {
    const fieldsToSelect = filterType === 'all' ? availableFields : filteredFields;
    setSelectedFields(fieldsToSelect.map(f => `${f.table}-${f.id}-${f.field}`));
  };

  const clearAllFields = () => {
    setSelectedFields([]);
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
            {saving ? '⏳' : '✅'}
          </button>
        </div>
        <span style={styles.currentValue}>
          {currentValue ? new Date(currentValue).toLocaleString() : 'Not set'}
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

  const displayFields = filterType === 'all' ? availableFields : filteredFields;

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>⏰ Edit User Timestamps</h1>
            <p style={styles.subtitle}>Manually update dates and timestamps across all user tables</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchUsers} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        <div style={styles.contentWrapper}>
          <div style={styles.userSelectionPanel}>
            <h2 style={styles.panelTitle}>Select User</h2>
            <input
              type="text"
              placeholder="🔍 Search by email or name..."
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
              <div style={styles.loadingState}>
                <div style={styles.spinner}></div>
                <p>Loading timestamps...</p>
              </div>
            ) : userData ? (
              <div>
                <div style={styles.actionBar}>
                  <h2 style={styles.panelTitle}>Timestamps for {userData.user?.email}</h2>
                  <button 
                    onClick={() => setShowBulkModal(true)} 
                    style={styles.bulkUpdateButton}
                    disabled={!availableFields.length}
                  >
                    ⚡ Bulk Update
                  </button>
                </div>

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
                <p style={styles.emptyIcon}>📋</p>
                <p style={styles.emptyText}>Select a user from the list to edit timestamps</p>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Update Modal */}
        {showBulkModal && (
          <div style={styles.modalOverlay} onClick={() => setShowBulkModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>⚡ Bulk Update Timestamps</h2>
                <button style={styles.modalCloseButton} onClick={() => setShowBulkModal(false)}>✕</button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Select Date & Time to Apply</label>
                  <input
                    type="datetime-local"
                    value={bulkDateTime}
                    onChange={(e) => setBulkDateTime(e.target.value)}
                    style={styles.bulkDateInput}
                  />
                </div>

                {/* Filter Section */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Filter Timestamps</label>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="all">All Timestamps</option>
                    <option value="date">By Date</option>
                    <option value="month">By Month</option>
                    <option value="time">By Time</option>
                    <option value="range">By Date Range</option>
                  </select>

                  {filterType === 'date' && (
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      style={styles.filterInput}
                      placeholder="Select date"
                    />
                  )}

                  {filterType === 'month' && (
                    <input
                      type="month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      style={styles.filterInput}
                      placeholder="Select month"
                    />
                  )}

                  {filterType === 'time' && (
                    <input
                      type="time"
                      value={filterTime}
                      onChange={(e) => setFilterTime(e.target.value)}
                      style={styles.filterInput}
                      placeholder="Select time"
                    />
                  )}

                  {filterType === 'range' && (
                    <div style={styles.dateRangeContainer}>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        style={styles.filterInput}
                        placeholder="Start date"
                      />
                      <span style={styles.dateRangeTo}>to</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        style={styles.filterInput}
                        placeholder="End date"
                      />
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <div style={styles.fieldSelectionHeader}>
                    <label style={styles.formLabel}>
                      Select Fields to Update 
                      {filterType !== 'all' && ` (${displayFields.length} matching)`}
                    </label>
                    <div style={styles.selectionButtons}>
                      <button onClick={selectAllFields} style={styles.selectButton}>
                        Select {filterType !== 'all' ? 'Filtered' : 'All'}
                      </button>
                      <button onClick={clearAllFields} style={styles.selectButton}>Clear All</button>
                    </div>
                  </div>
                  
                  <div style={styles.fieldsList}>
                    {displayFields.length === 0 ? (
                      <div style={styles.noFieldsMessage}>
                        No timestamps match your filter criteria
                      </div>
                    ) : (
                      displayFields.map(field => {
                        const fieldKey = `${field.table}-${field.id}-${field.field}`;
                        const isSelected = selectedFields.includes(fieldKey);
                        
                        return (
                          <div 
                            key={fieldKey} 
                            style={{
                              ...styles.fieldOption,
                              ...(isSelected ? styles.fieldOptionSelected : {})
                            }}
                            onClick={() => toggleFieldSelection(fieldKey)}
                          >
                            <div style={styles.fieldCheckbox}>
                              {isSelected && '✓'}
                            </div>
                            <div style={styles.fieldInfo}>
                              <div style={styles.fieldOptionLabel}>{field.label}</div>
                              <div style={styles.fieldCurrent}>
                                Current: {field.current ? new Date(field.current).toLocaleString() : 'Not set'}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={styles.selectedCount}>
                  {selectedFields.length} field(s) selected
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button 
                  onClick={() => setShowBulkModal(false)} 
                  style={styles.cancelButton}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkUpdate} 
                  style={styles.confirmButton}
                  disabled={saving || selectedFields.length === 0 || !bulkDateTime}
                >
                  {saving ? '⏳ Updating...' : `✅ Update ${selectedFields.length} Field(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <AdminFooter />
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(12px, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  contentWrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px'
  },
  userSelectionPanel: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1rem, 3vw, 20px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  panelTitle: {
    fontSize: 'clamp(1.1rem, 3vw, 18px)',
    fontWeight: 'bold',
    color: '#1A3E6F',
    marginBottom: '15px',
    margin: 0
  },
  searchInput: {
    width: '100%',
    padding: 'clamp(0.6rem, 2vw, 12px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    marginBottom: '15px',
    marginTop: '15px',
    boxSizing: 'border-box'
  },
  userList: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  userItem: {
    padding: 'clamp(0.75rem, 2.5vw, 12px)',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
    background: '#f7fafc'
  },
  userItemActive: {
    background: '#ede9fe',
    border: '2px solid #7c3aed'
  },
  userName: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: 'clamp(0.85rem, 2.2vw, 14px)'
  },
  userEmail: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#64748b',
    marginTop: '4px'
  },
  timestampEditPanel: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 25px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    minHeight: '400px'
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  bulkUpdateButton: {
    padding: 'clamp(0.6rem, 2vw, 12px) clamp(1.2rem, 3vw, 24px)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontSize: 'clamp(0.9rem, 2.5vw, 16px)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#718096',
    fontWeight: '600'
  },
  tableSection: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0'
  },
  tableSectionTitle: {
    fontSize: 'clamp(1rem, 2.5vw, 16px)',
    fontWeight: 'bold',
    color: '#3730a3',
    marginBottom: '15px'
  },
  recordGroup: {
    background: '#f8fafc',
    padding: 'clamp(0.9rem, 2.5vw, 15px)',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  recordTitle: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '12px'
  },
  fieldRow: {
    marginBottom: '15px',
    padding: 'clamp(0.6rem, 2vw, 10px)',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  },
  fieldLabel: {
    display: 'block',
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px'
  },
  fieldInputGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '5px',
    flexWrap: 'wrap'
  },
  dateInput: {
    flex: 1,
    minWidth: '150px',
    padding: 'clamp(0.5rem, 1.8vw, 8px)',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)'
  },
  updateButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.5rem, 1.8vw, 8px) clamp(1rem, 2.5vw, 16px)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  currentValue: {
    fontSize: 'clamp(0.7rem, 1.6vw, 11px)',
    color: '#64748b',
    fontStyle: 'italic',
    display: 'block',
    marginTop: '4px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '650px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    margin: 'auto',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: 'clamp(1rem, 3vw, 20px)',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(1.1rem, 3vw, 18px)',
    fontWeight: '700',
    color: '#1A3E6F'
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: 'clamp(1.3rem, 3vw, 20px)',
    cursor: 'pointer',
    color: '#64748b',
    padding: '0',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    transition: 'all 0.2s'
  },
  modalBody: {
    padding: 'clamp(1rem, 3vw, 20px)',
    overflowY: 'auto',
    flex: 1,
    maxHeight: 'calc(90vh - 160px)',
    WebkitOverflowScrolling: 'touch'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px'
  },
  bulkDateInput: {
    width: '100%',
    padding: 'clamp(0.6rem, 2vw, 10px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    boxSizing: 'border-box'
  },
  filterSelect: {
    width: '100%',
    padding: 'clamp(0.6rem, 2vw, 10px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    boxSizing: 'border-box',
    marginBottom: '10px',
    background: 'white'
  },
  filterInput: {
    width: '100%',
    padding: 'clamp(0.6rem, 2vw, 10px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    boxSizing: 'border-box',
    marginTop: '8px'
  },
  dateRangeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap'
  },
  dateRangeTo: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#64748b',
    fontWeight: '500',
    padding: '0 4px'
  },
  fieldSelectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  selectionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  selectButton: {
    padding: 'clamp(0.4rem, 1.5vw, 6px) clamp(0.75rem, 2vw, 12px)',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    cursor: 'pointer',
    fontWeight: '500',
    color: '#475569',
    transition: 'all 0.2s'
  },
  fieldsList: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'thin',
    scrollbarColor: '#cbd5e1 #f1f5f9'
  },
  noFieldsMessage: {
    padding: '30px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontStyle: 'italic'
  },
  fieldOption: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: 'clamp(0.6rem, 2vw, 10px)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
    marginBottom: '6px',
    background: '#f8fafc'
  },
  fieldOptionSelected: {
    background: '#ede9fe',
    border: '2px solid #7c3aed'
  },
  fieldCheckbox: {
    width: '20px',
    height: '20px',
    border: '2px solid #cbd5e1',
    borderRadius: '4px',
    marginRight: '12px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#7c3aed'
  },
  fieldInfo: {
    flex: 1,
    minWidth: 0
  },
  fieldOptionLabel: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '600',
    color: '#334155',
    wordBreak: 'break-word'
  },
  fieldCurrent: {
    fontSize: 'clamp(0.7rem, 1.6vw, 11px)',
    color: '#64748b',
    marginTop: '4px',
    wordBreak: 'break-word'
  },
  selectedCount: {
    textAlign: 'center',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#7c3aed',
    padding: '12px',
    background: '#f5f3ff',
    borderRadius: '8px'
  },
  modalFooter: {
    padding: 'clamp(1rem, 3vw, 20px)',
    borderTop: '2px solid #e2e8f0',
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    flexShrink: 0,
    flexWrap: 'wrap'
  },
  cancelButton: {
    padding: 'clamp(0.6rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  confirmButton: {
    padding: 'clamp(0.6rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
  }
};
