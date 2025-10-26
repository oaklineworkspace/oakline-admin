
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch users from API
      const usersResponse = await fetch('/api/admin/get-users');
      const usersResult = await usersResponse.json();

      if (!usersResponse.ok) {
        throw new Error(usersResult.error || 'Failed to fetch users');
      }

      const usersData = usersResult.users || [];

      // Fetch accounts from API
      const accountsResponse = await fetch('/api/admin/get-accounts');
      const accountsResult = await accountsResponse.json();

      if (!accountsResponse.ok) {
        throw new Error(accountsResult.error || 'Failed to fetch accounts');
      }

      const accountsData = accountsResult.accounts || [];

      // Map accounts to users
      const usersWithAccounts = usersData.map(user => ({
        ...user,
        accounts: accountsData.filter(acc => acc.user_id === user.id) || []
      }));

      setUsers(usersWithAccounts);
      setFilteredUsers(usersWithAccounts);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setUsers(users.filter(user => user.id !== userId));
      setFilteredUsers(filteredUsers.filter(user => user.id !== userId));
      setError('');
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user: ' + error.message);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const response = await fetch('/api/admin/update-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      setUsers(users.map(user => (user.id === userId ? { ...user, status: newStatus } : user)));
      setFilteredUsers(filteredUsers.map(user => (user.id === userId ? { ...user, status: newStatus } : user)));
      setError('');
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status: ' + error.message);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>👥 User Management</h1>
        <Link href="/admin/admin-dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      <div style={styles.actionsBar}>
        <Link href="/admin/create-user" style={styles.actionButton}>
          ➕ Create New User
        </Link>
        <Link href="/admin/bulk-transactions" style={styles.actionButton}>
          📦 Bulk Operations
        </Link>
      </div>

      <div style={styles.usersTable}>
        <h2 style={styles.sectionTitle}>All Users</h2>
        {loading ? (
          <div style={styles.loading}>Loading users...</div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Accounts</th>
                  <th>Total Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{user.name || user.full_name || 'N/A'}</td>
                    <td style={styles.tableCell}>{user.email || 'N/A'}</td>
                    <td style={styles.tableCell}>{user.accounts?.length || 0}</td>
                    <td style={styles.tableCell}>
                      ${(user.accounts?.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={user.status === 'Active' || user.status === 'active' ? styles.activeStatus : styles.suspendedStatus}>
                        {user.status || 'Unknown'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actionButtons}>
                        <Link href={`/admin/edit-user/${user.id}`} style={styles.editButton}>Edit</Link>
                        <Link href={`/admin/view-user/${user.id}`} style={styles.viewButton}>View</Link>
                        <button style={styles.deleteButton} onClick={() => handleDeleteUser(user.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </AdminAuth>
  );
}

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
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
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
  actionsBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  actionButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  usersTable: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f8f9fa',
    fontWeight: 'bold',
    color: '#333'
  },
  tableRow: {
    borderBottom: '1px solid #dee2e6'
  },
  tableCell: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '14px'
  },
  activeStatus: {
    background: '#d4edda',
    color: '#155724',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  suspendedStatus: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  editButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'none'
  },
  viewButton: {
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'none'
  },
  deleteButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  errorMessage: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: '20px',
    padding: '10px',
    background: '#f8d7da',
    borderRadius: '4px'
  }
};
