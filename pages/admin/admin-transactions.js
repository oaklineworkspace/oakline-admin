import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

const VALID_STATUSES = ['pending', 'completed', 'failed', 'hold', 'cancelled', 'reversed'];
const VALID_TYPES = ['credit', 'debit', 'deposit', 'withdrawal', 'transfer', 'crypto_deposit', 'loan_disbursement', 'treasury_credit', 'treasury_debit', 'wire_transfer', 'check_deposit', 'atm_withdrawal', 'debit_card', 'transfer_in', 'transfer_out', 'ach_transfer', 'check_payment', 'service_fee', 'refund', 'interest', 'bonus', 'other'];

export default function AdminTransactions() {
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });
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
  }, [transactions, searchTerm, statusFilter, typeFilter, userFilter, dateFilter, dateRange, activeTab]);

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
      setError(''); // Clear any previous errors

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts (
            account_number,
            user_id,
            application_id
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, 9999);

      if (txError) {
        console.error('Supabase error fetching transactions:', txError);
        throw new Error(txError.message || 'Failed to fetch transactions from database');
      }

      console.log('Fetched transactions from transactions table:', txData?.length || 0);
      console.log('Sample transaction:', txData?.[0]);

      // Fetch account opening deposits
      const { data: accountOpeningData, error: accountOpeningError } = await supabase
        .from('account_opening_crypto_deposits')
        .select(`
          *,
          accounts (
            account_number,
            user_id,
            application_id
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, 9999);

      if (accountOpeningError) {
        console.warn('Error fetching account opening deposits:', accountOpeningError);
      }

      console.log('Fetched account opening deposits:', accountOpeningData?.length || 0);
      console.log('Sample account opening deposit:', accountOpeningData?.[0]);

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
          source: 'transaction',
          accounts: tx.accounts ? {
            ...tx.accounts,
            applications: application || {
              first_name: 'Unknown',
              last_name: 'User',
              email: 'N/A'
            }
          } : {
            account_number: 'N/A',
            user_id: tx.user_id || null,
            application_id: null,
            applications: {
              first_name: 'Unknown',
              last_name: 'User',
              email: 'N/A'
            }
          }
        };
      });

      // Enrich account opening deposits
      const enrichedAccountOpeningData = (accountOpeningData || []).map(deposit => {
        const application = applications?.find(a => a.id === deposit.accounts?.application_id);

        return {
          id: deposit.id,
          user_id: deposit.user_id,
          account_id: deposit.account_id,
          type: 'account_opening_deposit',
          amount: deposit.amount,
          description: `Account Opening Deposit - ${deposit.status}`,
          status: deposit.status === 'completed' ? 'completed' : deposit.status === 'rejected' ? 'failed' : 'pending',
          created_at: deposit.created_at,
          updated_at: deposit.updated_at,
          source: 'account_opening_deposit',
          original_data: deposit,
          accounts: deposit.accounts ? {
            ...deposit.accounts,
            applications: application || {
              first_name: 'Unknown',
              last_name: 'User',
              email: 'N/A'
            }
          } : {
            account_number: 'N/A',
            user_id: deposit.user_id || null,
            application_id: null,
            applications: {
              first_name: 'Unknown',
              last_name: 'User',
              email: 'N/A'
            }
          }
        };
      });

      // Merge both data sources and sort by created_at
      const mergedData = [...enrichedData, ...enrichedAccountOpeningData].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      console.log('Total merged transactions:', mergedData.length);
      console.log('Transactions from transactions table:', enrichedData.length);
      console.log('Transactions from account_opening_crypto_deposits:', enrichedAccountOpeningData.length);

      setTransactions(mergedData || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions: ' + error.message);
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

    if (activeTab !== 'all') {
      if (activeTab === 'completed') {
        filtered = filtered.filter(tx => tx.status === 'completed');
      } else if (activeTab === 'pending') {
        filtered = filtered.filter(tx => tx.status === 'pending');
      } else if (activeTab === 'failed') {
        filtered = filtered.filter(tx => tx.status === 'failed' || tx.status === 'cancelled');
      }
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
        setError('You must be logged in');
        return;
      }

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

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(result.error || `Server returned ${response.status}: Failed to update transaction`);
      }

      const result = await response.json();

      const { data: accountAfter } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', selectedTransaction.account_id)
        .single();

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

      setSuccess(successMessage);
      setShowEditModal(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('❌ Failed to update transaction: ' + error.message);
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
        setError('You must be logged in');
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

      setSuccess('Transaction created successfully');
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
      setError('Failed to create transaction: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    let confirmMessage = `Are you sure you want to delete this transaction?\n\n` +
      `User: ${transaction.accounts?.applications?.first_name} ${transaction.accounts?.applications?.last_name}\n` +
      `Amount: ${formatCurrency(transaction.amount)}\n` +
      `Type: ${transaction.type}\n` +
      `Status: ${transaction.status}\n\n`;
    
    if (transaction.status === 'completed') {
      confirmMessage += `⚠️ WARNING: This is a completed transaction. Deleting it will reverse the account balance by ${formatCurrency(transaction.amount)}.\n\n`;
    }
    
    confirmMessage += `This action cannot be undone!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/delete-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          accountId: transaction.account_id,
          transactionType: transaction.type,
          amount: transaction.amount,
          status: transaction.status
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete transaction');
      }

      let successMessage = '✅ Transaction deleted successfully!';
      if (result.balanceReverted) {
        successMessage += `\n\n💰 Account balance reverted by ${formatCurrency(transaction.amount)}`;
      }

      setSuccess(successMessage);
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('❌ Failed to delete transaction: ' + error.message);
    }
  };

  const handleSelectTransaction = (transactionId) => {
    setSelectedTransactions(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(tx => tx.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) {
      setError('Please select at least one transaction to delete');
      return;
    }

    const transactionsToDelete = filteredTransactions.filter(tx => 
      selectedTransactions.includes(tx.id)
    );

    const completedCount = transactionsToDelete.filter(tx => tx.status === 'completed').length;
    const totalAmount = transactionsToDelete.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    let confirmMessage = `⚠️ BULK DELETE CONFIRMATION\n\n`;
    confirmMessage += `You are about to delete ${selectedTransactions.length} transaction(s):\n`;
    confirmMessage += `- Total Amount: ${formatCurrency(totalAmount)}\n`;
    
    if (completedCount > 0) {
      confirmMessage += `- ${completedCount} completed transaction(s) will have their balances reverted\n\n`;
      confirmMessage += `⚠️ WARNING: This will affect account balances!\n\n`;
    }
    
    confirmMessage += `This action cannot be undone!\n\nType "DELETE" to confirm:`;

    const userInput = prompt(confirmMessage);
    if (userInput !== 'DELETE') {
      setError('Bulk delete cancelled');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    // Show loading banner
    setLoadingBanner({
      visible: true,
      current: 0,
      total: transactionsToDelete.length,
      action: 'Deleting Transactions',
      message: 'Please wait while we process your request...'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        setActionLoading(false);
        setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let errors = [];

      for (let i = 0; i < transactionsToDelete.length; i++) {
        const transaction = transactionsToDelete[i];
        
        // Update progress
        setLoadingBanner(prev => ({
          ...prev,
          current: i + 1,
          message: `Deleting transaction ${transaction.id.slice(0, 8)}...`
        }));

        try {
          const response = await fetch('/api/admin/delete-transaction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              transactionId: transaction.id,
              accountId: transaction.account_id,
              transactionType: transaction.type,
              amount: transaction.amount,
              status: transaction.status
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            const result = await response.json();
            failCount++;
            errors.push(`${transaction.id.slice(0, 8)}: ${result.error || 'Unknown error'}`);
          }
        } catch (err) {
          failCount++;
          errors.push(`${transaction.id.slice(0, 8)}: ${err.message}`);
        }
      }

      // Hide loading banner
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });

      let resultMessage = `✅ Bulk Delete Complete!\n\n`;
      resultMessage += `Successfully deleted: ${successCount} transaction(s)\n`;
      
      if (failCount > 0) {
        resultMessage += `Failed: ${failCount} transaction(s)\n\n`;
        resultMessage += `Errors:\n${errors.join('\n')}`;
        setError(resultMessage);
      } else {
        setSuccess(resultMessage);
      }

      setSelectedTransactions([]);
      await fetchTransactions();
    } catch (error) {
      console.error('Error in bulk delete:', error);
      setError('❌ Bulk delete failed: ' + error.message);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
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
      completed: { bg: '#d1fae5', color: '#065f46' },
      pending: { bg: '#fef3c7', color: '#92400e' },
      cancelled: { bg: '#fee2e2', color: '#991b1b' },
      reversed: { bg: '#dbeafe', color: '#1e40af' },
      failed: { bg: '#fee2e2', color: '#991b1b' },
      hold: { bg: '#fed7aa', color: '#92400e' }
    };

    const style = styles[status?.toLowerCase()] || styles.pending;

    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
        fontWeight: '700',
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

  const stats = React.useMemo(() => ({
    total: transactions.length,
    completed: transactions.filter(t => t.status === 'completed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    failed: transactions.filter(t => t.status === 'failed' || t.status === 'cancelled').length,
    totalVolume: transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
    totalCredit: transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
    totalDebit: transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
  }), [transactions]);

  return (
    <AdminAuth>
      <AdminLoadingBanner
        isVisible={loadingBanner.visible}
        current={loadingBanner.current}
        total={loadingBanner.total}
        action={loadingBanner.action}
        message={loadingBanner.message}
      />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💸 Transaction Management</h1>
            <p style={styles.subtitle}>View, edit, and manage all user transactions</p>
            {selectedTransactions.length > 0 && (
              <p style={styles.selectedCount}>
                {selectedTransactions.length} transaction(s) selected
              </p>
            )}
          </div>
          <div style={styles.headerActions}>
            {selectedTransactions.length > 0 && (
              <button 
                onClick={handleBulkDelete} 
                style={styles.bulkDeleteButton}
                disabled={actionLoading}
              >
                {actionLoading ? '⏳ Deleting...' : `🗑️ Delete ${selectedTransactions.length}`}
              </button>
            )}
            <button onClick={fetchTransactions} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <button onClick={() => setShowCreateModal(true)} style={styles.createButton}>
              ➕ Create Transaction
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Transactions</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Completed</h3>
            <p style={styles.statValue}>{stats.completed}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Failed</h3>
            <p style={styles.statValue}>{stats.failed}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #7c3aed'}}>
            <h3 style={styles.statLabel}>Total Volume</h3>
            <p style={styles.statValue}>${stats.totalVolume.toLocaleString()}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
            <h3 style={styles.statLabel}>Total Credit</h3>
            <p style={styles.statValue}>${stats.totalCredit.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'completed', 'pending', 'failed'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <div style={styles.selectAllContainer}>
            <input
              type="checkbox"
              id="selectAll"
              checked={filteredTransactions.length > 0 && selectedTransactions.length === filteredTransactions.length}
              onChange={handleSelectAll}
              style={styles.checkbox}
              disabled={filteredTransactions.length === 0}
            />
            <label htmlFor="selectAll" style={styles.selectAllLabel}>
              Select All ({filteredTransactions.length})
            </label>
          </div>
          <input
            type="text"
            placeholder="🔍 Search by name, email or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.user_id} value={user.user_id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Statuses</option>
            {VALID_STATUSES.map(status => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Types</option>
            {VALID_TYPES.map(type => (
              <option key={type} value={type}>
                {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Date Range */}
        {dateFilter === 'custom' && (
          <div style={styles.dateRangeSection}>
            <div style={styles.dateRangeLabel}>
              <span>📅</span>
              <span>Filter by Date Range:</span>
            </div>
            <div style={styles.dateRangeInputs}>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>From:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>To:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  style={styles.dateInput}
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <button
                  onClick={() => setDateRange({ start: '', end: '' })}
                  style={styles.clearDateButton}
                >
                  ✕ Clear Dates
                </button>
              )}
            </div>
          </div>
        )}

        {/* Transactions Grid */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No transactions found</p>
            </div>
          ) : (
            <div style={styles.transactionsGrid}>
              {filteredTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  style={{
                    ...styles.transactionCard,
                    ...(selectedTransactions.includes(tx.id) ? styles.transactionCardSelected : {})
                  }}
                >
                  <div style={styles.transactionHeader}>
                    <div style={styles.checkboxContainer}>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(tx.id)}
                        onChange={() => handleSelectTransaction(tx.id)}
                        style={styles.cardCheckbox}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div style={styles.transactionInfoContainer}>
                      <h3 style={styles.transactionType}>
                        {tx.type?.toUpperCase() || 'TRANSACTION'}
                      </h3>
                      <p style={styles.transactionEmail}>{tx.accounts?.applications?.first_name} {tx.accounts?.applications?.last_name}</p>
                      <p style={{...styles.transactionEmail, fontSize: 'clamp(0.75rem, 1.8vw, 12px)', marginTop: '2px'}}>
                        {tx.accounts?.applications?.email}
                      </p>
                    </div>
                    {getStatusBadge(tx.status)}
                  </div>

                  <div style={styles.transactionBody}>
                    <div style={styles.transactionInfo}>
                      <span style={styles.infoLabel}>Account:</span>
                      <span style={styles.infoValue}>{maskAccountNumber(tx.accounts?.account_number)}</span>
                    </div>
                    <div style={styles.transactionInfo}>
                      <span style={styles.infoLabel}>Amount:</span>
                      <span style={{...styles.infoValue, color: tx.type === 'credit' || tx.type === 'account_opening_deposit' ? '#059669' : '#dc2626', fontWeight: '700'}}>
                        {tx.type === 'credit' || tx.type === 'account_opening_deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div style={styles.transactionInfo}>
                      <span style={styles.infoLabel}>Description:</span>
                      <span style={styles.infoValue}>{tx.description || 'No description'}</span>
                    </div>
                    {tx.source === 'account_opening_deposit' && tx.original_data?.tx_hash && (
                      <div style={styles.transactionInfo}>
                        <span style={styles.infoLabel}>TX Hash:</span>
                        <span style={styles.infoValue}>{tx.original_data.tx_hash.slice(0, 16)}...</span>
                      </div>
                    )}
                    <div style={styles.transactionInfo}>
                      <span style={styles.infoLabel}>Date:</span>
                      <span style={styles.infoValue}>{formatDateTime(tx.created_at)}</span>
                    </div>
                    {tx.status === 'completed' && (
                      <div style={styles.completedBadge}>
                        ✓ Balance Applied
                      </div>
                    )}
                    {tx.source === 'account_opening_deposit' && (
                      <div style={{...styles.completedBadge, background: '#dbeafe', color: '#1e40af'}}>
                        🏦 Account Opening Deposit
                      </div>
                    )}
                  </div>

                  <div style={styles.transactionFooter}>
                    <button
                      onClick={() => handleEditTransaction(tx)}
                      style={styles.editButton}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(tx)}
                      style={styles.deleteButton}
                    >
                      🗑️ Delete
                    </button>
                    {tx.source === 'account_opening_deposit' && (
                      <button
                        onClick={() => router.push('/admin/manage-account-opening-deposits')}
                        style={{...styles.editButton, flex: '1 1 100%', marginTop: '8px'}}
                      >
                        📋 Manage in Account Opening Deposits
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && selectedTransaction && (
          <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Edit Transaction</h2>
                <button onClick={() => setShowEditModal(false)} style={styles.closeBtn}>×</button>
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
                        {VALID_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </option>
                        ))}
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
                          // Mark as manually edited if the value differs from original
                          const isManualEdit = e.target.value !== originalUpdatedAt;
                          setManuallyEditUpdatedAt(isManualEdit);
                        }}
                        style={styles.formInput}
                      />
                      <small style={styles.helpText}>
                        {manuallyEditUpdatedAt ? '⚠️ Manually set timestamp' : 'Auto-updates to current time when saving'}
                      </small>
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

        {/* Create Modal */}
        {showCreateModal && (
          <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Create New Transaction</h2>
                <button onClick={() => setShowCreateModal(false)} style={styles.closeBtn}>×</button>
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
                        {VALID_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </option>
                        ))}
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
      <AdminFooter />
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
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
  selectedCount: {
    margin: '8px 0 0 0',
    color: '#1e40af',
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    fontWeight: '600'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  bulkDeleteButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  createButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundImage: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
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
    backgroundColor: '#718096',
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
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    whiteSpace: 'pre-line'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  tabs: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  filtersSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  selectAllContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '2px solid #e2e8f0'
  },
  selectAllLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#1A3E6F',
    cursor: 'pointer',
    userSelect: 'none'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#1e40af'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none'
  },
  dateRangeSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  dateRangeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  dateRangeInputs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },
  dateInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateLabel: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '500',
    color: '#4a5568'
  },
  dateInput: {
    padding: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    minWidth: '150px'
  },
  clearDateButton: {
    padding: '10px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
  transactionsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  transactionCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease'
  },
  transactionCardSelected: {
    border: '2px solid #1e40af',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)',
    backgroundColor: '#f0f9ff'
  },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '2px'
  },
  cardCheckbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    accentColor: '#1e40af',
    flexShrink: 0
  },
  transactionInfoContainer: {
    flex: 1,
    minWidth: 0
  },
  transactionType: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  transactionEmail: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },
  transactionBody: {
    marginBottom: '16px'
  },
  transactionInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600'
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right'
  },
  completedBadge: {
    marginTop: '12px',
    padding: '8px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)'
  },
  transactionFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  editButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  deleteButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
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
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },
  formGrid: {
    display: 'grid',
    gap: '16px',
    marginBottom: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  formInput: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  helpText: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#64748b'
  },
  infoBox: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    lineHeight: '1.6',
    color: '#475569'
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  cancelButton: {
    padding: '12px 24px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#475569',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
