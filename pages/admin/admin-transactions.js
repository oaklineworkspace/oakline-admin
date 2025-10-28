import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminBackButton from '../../components/AdminBackButton';

const VALID_STATUSES = ['pending', 'completed', 'failed', 'hold', 'cancelled', 'reversed'];
const VALID_TYPES = ['credit', 'debit'];

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    type: '',
    amount: '',
    description: '',
    status: '',
    created_at: '',
    updated_at: ''
  });
  const [manuallyEditUpdatedAt, setManuallyEditUpdatedAt] = useState(false);
  const [originalUpdatedAt, setOriginalUpdatedAt] = useState('');
  const [createForm, setCreateForm] = useState({
    account_id: '',
    type: 'debit',
    amount: '',
    description: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchTransactions();
    fetchUsers();

    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' }, 
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, statusFilter, typeFilter, userFilter, dateFilter, dateRange]);

  const fetchUsers = async () => {
    try {
      const { data: appsData } = await supabase
        .from('applications')
        .select('id, first_name, last_name, email, user_id')
        .order('first_name');
      
      if (appsData) {
        setUsers(appsData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts!inner (
            account_number,
            user_id,
            application_id
          )
        `)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      const appIds = [...new Set(txData.map(tx => tx.accounts?.application_id).filter(Boolean))];
      let applications = [];

      if (appIds.length > 0) {
        const { data: appsData } = await supabase
          .from('applications')
          .select('id, first_name, last_name, email')
          .in('id', appIds);
        applications = appsData || [];
      }

      const enrichedData = txData.map(tx => {
        const application = applications?.find(a => a.id === tx.accounts?.application_id);

        return {
          ...tx,
          accounts: {
            ...tx.accounts,
            applications: application || {
              first_name: 'Unknown',
              last_name: 'User',
              email: 'N/A'
            }
          }
        };
      });

      setTransactions(enrichedData || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      alert('Failed to fetch transactions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => {
        const firstName = tx.accounts?.applications?.first_name?.toLowerCase() || '';
        const lastName = tx.accounts?.applications?.last_name?.toLowerCase() || '';
        const email = tx.accounts?.applications?.email?.toLowerCase() || '';
        const accountNumber = tx.accounts?.account_number?.toLowerCase() || '';
        const description = tx.description?.toLowerCase() || '';

        return firstName.includes(search) || 
               lastName.includes(search) || 
               email.includes(search) || 
               accountNumber.includes(search) ||
               description.includes(search);
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter(tx => tx.user_id === userFilter);
    }

    if (dateFilter === 'custom' && (dateRange.start || dateRange.end)) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;
        
        if (start && end) return txDate >= start && txDate <= end;
        if (start) return txDate >= start;
        if (end) return txDate <= end;
        return true;
      });
    } else if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();

      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(tx => new Date(tx.created_at) >= startDate);
    }

    setFilteredTransactions(filtered);
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    const updatedAtValue = new Date(transaction.updated_at).toISOString().slice(0, 16);
    setEditForm({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || '',
      status: transaction.status,
      created_at: new Date(transaction.created_at).toISOString().slice(0, 16),
      updated_at: updatedAtValue
    });
    setOriginalUpdatedAt(updatedAtValue);
    setManuallyEditUpdatedAt(false);
    setShowEditModal(true);
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in');
        return;
      }

      // Get account balance before update
      const { data: accountBefore } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', selectedTransaction.account_id)
        .single();

      const response = await fetch('/api/admin/update-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
          type: editForm.type,
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          status: editForm.status,
          created_at: new Date(editForm.created_at).toISOString(),
          updated_at: new Date(editForm.updated_at).toISOString(),
          manuallyEditUpdatedAt: manuallyEditUpdatedAt
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update transaction');
      }

      // Get account balance after update
      const { data: accountAfter } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', selectedTransaction.account_id)
        .single();

      // Check if status changed to/from completed
      const statusChanged = selectedTransaction.status !== editForm.status;
      const balanceChanged = accountBefore?.balance !== accountAfter?.balance;

      let successMessage = '✅ Transaction updated successfully!';
      
      if (statusChanged && balanceChanged) {
        const oldBalance = parseFloat(accountBefore?.balance || 0);
        const newBalance = parseFloat(accountAfter?.balance || 0);
        const balanceDiff = newBalance - oldBalance;
        
        successMessage += `\n\n💰 Account Balance Updated:`;
        successMessage += `\nPrevious: $${oldBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        successMessage += `\nNew: $${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        successMessage += `\nChange: ${balanceDiff >= 0 ? '+' : ''}$${Math.abs(balanceDiff).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      alert(successMessage);
      setShowEditModal(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('❌ Failed to update transaction: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          account_id: createForm.account_id,
          type: createForm.type,
          amount: parseFloat(createForm.amount),
          description: createForm.description,
          status: createForm.status
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create transaction');
      }

      alert('Transaction created successfully');
      setShowCreateModal(false);
      setCreateForm({
        account_id: '',
        type: 'debit',
        amount: '',
        description: '',
        status: 'pending'
      });
      fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return 'N/A';
    const str = String(accountNumber);
    return `****${str.slice(-4)}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: { bg: '#2ECC71', color: 'white' },
      pending: { bg: '#F1C40F', color: '#333' },
      cancelled: { bg: '#7F8C8D', color: 'white' },
      reversed: { bg: '#3498DB', color: 'white' },
      failed: { bg: '#E74C3C', color: 'white' },
      hold: { bg: '#E67E22', color: 'white' }
    };

    const style = styles[status?.toLowerCase()] || styles.pending;

    return (
      <span style={{
        padding: '0.4rem 0.8rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}>
        {status || 'Unknown'}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminAuth>
      <AdminBackButton />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💸 Transactions Management</h1>
            <p style={styles.subtitle}>View and manage all user transactions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={styles.createButton}
          >
            ➕ Create Transaction
          </button>
        </div>

        <div style={styles.filtersCard}>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>🔍 Search</label>
              <input
                type="text"
                placeholder="Search by name, email, or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>👤 User</label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Users</option>
                {users.map(user => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>📊 Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Statuses</option>
                {VALID_STATUSES.map(status => (
                  <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>💳 Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>📅 Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </>
            )}
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Total Transactions:</span>
              <span style={styles.statValue}>{filteredTransactions.length}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Total Amount:</span>
              <span style={styles.statValue}>
                {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0))}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.tableCard}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No transactions found</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead style={styles.tableHead}>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Account</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Date/Time</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <div style={styles.userIcon}>
                            {(tx.accounts?.applications?.first_name?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <div style={styles.userName}>
                              {tx.accounts?.applications?.first_name} {tx.accounts?.applications?.last_name}
                            </div>
                            <div style={styles.userEmail}>
                              {tx.accounts?.applications?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.accountNumber}>
                          {maskAccountNumber(tx.accounts?.account_number)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: tx.type === 'credit' ? '#d1fae5' : '#fee2e2',
                          color: tx.type === 'credit' ? '#065f46' : '#991b1b'
                        }}>
                          {tx.type === 'credit' ? '↑ Credit' : '↓ Debit'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          fontWeight: '700',
                          color: tx.type === 'credit' ? '#059669' : '#dc2626'
                        }}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.description}>
                          {tx.description || 'No description'}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateTime}>
                          {formatDateTime(tx.created_at)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {getStatusBadge(tx.status)}
                          {tx.status === 'completed' && (
                            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '500' }}>
                              ✓ Balance Applied
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleEditTransaction(tx)}
                            style={{ ...styles.actionBtn, ...styles.editBtn }}
                            title="Edit Transaction"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showEditModal && selectedTransaction && (
          <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Edit Transaction</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={styles.closeBtn}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpdateTransaction}>
                <div style={styles.modalBody}>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Type *</label>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        style={styles.formInput}
                        required
                      >
                        <option value="credit">Credit</option>
                        <option value="debit">Debit</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        style={styles.formInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Status *</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        style={styles.formInput}
                        required
                      >
                        {VALID_STATUSES.map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        style={{ ...styles.formInput, minHeight: '80px', resize: 'vertical' }}
                        rows={3}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Created At</label>
                      <input
                        type="datetime-local"
                        value={editForm.created_at}
                        onChange={(e) => setEditForm({ ...editForm, created_at: e.target.value })}
                        style={styles.formInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Updated At</label>
                      <input
                        type="datetime-local"
                        value={editForm.updated_at}
                        onChange={(e) => {
                          setEditForm({ ...editForm, updated_at: e.target.value });
                          setManuallyEditUpdatedAt(e.target.value !== originalUpdatedAt);
                        }}
                        style={styles.formInput}
                      />
                      <small style={styles.helpText}>Leave unchanged to auto-update to current time</small>
                    </div>
                  </div>

                  <div style={styles.infoBox}>
                    <strong>Transaction ID:</strong> {selectedTransaction.id}<br />
                    <strong>User:</strong> {selectedTransaction.accounts?.applications?.first_name} {selectedTransaction.accounts?.applications?.last_name}<br />
                    <strong>Account:</strong> {selectedTransaction.accounts?.account_number}
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    style={styles.cancelButton}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.saveButton}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Create New Transaction</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={styles.closeBtn}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateTransaction}>
                <div style={styles.modalBody}>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Account ID *</label>
                      <input
                        type="text"
                        value={createForm.account_id}
                        onChange={(e) => setCreateForm({ ...createForm, account_id: e.target.value })}
                        style={styles.formInput}
                        placeholder="Enter account UUID"
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Type *</label>
                      <select
                        value={createForm.type}
                        onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                        style={styles.formInput}
                        required
                      >
                        <option value="credit">Credit</option>
                        <option value="debit">Debit</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={createForm.amount}
                        onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                        style={styles.formInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Status</label>
                      <select
                        value={createForm.status}
                        onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                        style={styles.formInput}
                      >
                        {VALID_STATUSES.map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Description</label>
                      <textarea
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        style={{ ...styles.formInput, minHeight: '80px', resize: 'vertical' }}
                        rows={3}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={styles.cancelButton}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.saveButton}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Creating...' : 'Create Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '2rem'
  },
  header: {
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b'
  },
  createButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  filtersCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#475569'
  },
  input: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  },
  select: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  statsRow: {
    display: 'flex',
    gap: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b'
  },
  statValue: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center'
  },
  emptyText: {
    fontSize: '1rem',
    color: '#94a3b8'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHead: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '1rem 0.75rem',
    fontSize: '0.875rem'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  userIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.875rem'
  },
  userName: {
    fontWeight: '600',
    color: '#1e293b'
  },
  userEmail: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  accountNumber: {
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    color: '#475569'
  },
  typeBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  description: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dateTime: {
    fontSize: '0.8125rem',
    color: '#64748b'
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionBtn: {
    padding: '0.5rem 0.75rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '500'
  },
  editBtn: {
    backgroundColor: '#3b82f6',
    color: 'white'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  modalHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    cursor: 'pointer',
    fontSize: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  modalBody: {
    padding: '1.5rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.25rem',
    marginBottom: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  formLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#475569'
  },
  formInput: {
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.9375rem',
    transition: 'all 0.2s'
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '-0.25rem'
  },
  infoBox: {
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '0.875rem',
    lineHeight: '1.6',
    color: '#475569'
  },
  modalFooter: {
    padding: '1.5rem',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    position: 'sticky',
    bottom: 0,
    backgroundColor: 'white'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#475569',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
