
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function DeleteUserLoans() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [userLoansData, setUserLoansData] = useState(null);

  useEffect(() => {
    fetchUsersWithLoans();
  }, []);

  const fetchUsersWithLoans = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'No active session' });
        return;
      }

      const response = await fetch('/api/admin/get-users-with-loans', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to fetch users with loans' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLoanDetails = async (userId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/get-user-loan-details?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch loan details');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching loan details:', error);
      return null;
    }
  };

  const handleDeleteUserLoans = async (user) => {
    setDeleteLoading(user.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'No active session' });
        return;
      }

      const response = await fetch('/api/admin/delete-user-loans', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ All loan data for ${user.first_name} ${user.last_name} deleted successfully! ${data.summary}`
        });
        await fetchUsersWithLoans();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete loan data' });
      }
    } catch (error) {
      console.error('Error deleting loans:', error);
      setMessage({ type: 'error', text: 'Error deleting loan data' });
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
      setUserLoansData(null);
    }
  };

  const handleConfirmClick = async (user) => {
    const details = await fetchUserLoanDetails(user.id);
    setUserLoansData(details);
    setConfirmDelete(user);
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🗑️ Delete User Loan Data</h1>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            borderColor: message.type === 'success' ? '#10b981' : '#ef4444'
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading users with loans...</p>
          </div>
        ) : (
          <div style={styles.tableCard}>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>
                Users with Active Loans ({filteredUsers.length})
              </h3>
            </div>

            {filteredUsers.length === 0 ? (
              <div style={styles.emptyState}>
                {searchTerm ? 'No users found matching your search.' : 'No users with loans found.'}
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableRow}>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Total Loans</th>
                      <th style={styles.th}>Active Loans</th>
                      <th style={styles.th}>Total Principal</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          {user.first_name} {user.last_name}
                        </td>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>{user.total_loans}</td>
                        <td style={styles.td}>{user.active_loans}</td>
                        <td style={styles.td}>
                          ${parseFloat(user.total_principal || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleConfirmClick(user)}
                            disabled={deleteLoading === user.id}
                            style={{
                              ...styles.deleteButton,
                              opacity: deleteLoading === user.id ? 0.6 : 1,
                              cursor: deleteLoading === user.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {deleteLoading === user.id ? 'Deleting...' : '🗑️ Delete Loans'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {confirmDelete && (
          <div style={styles.modalOverlay} onClick={() => {
            setConfirmDelete(null);
            setUserLoansData(null);
          }}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>⚠️ Confirm Loan Data Deletion</h3>
                <button onClick={() => {
                  setConfirmDelete(null);
                  setUserLoansData(null);
                }} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <p style={styles.warningText}>
                  Are you sure you want to permanently delete all loan data for{' '}
                  <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong> ({confirmDelete.email})?
                </p>

                {userLoansData && (
                  <div style={styles.detailsBox}>
                    <h4 style={styles.detailsTitle}>📊 Data to be Deleted:</h4>
                    <ul style={styles.detailsList}>
                      <li><strong>{userLoansData.loans?.length || 0}</strong> loan(s)</li>
                      <li><strong>{userLoansData.payments?.length || 0}</strong> loan payment(s)</li>
                      <li><strong>{userLoansData.deposits?.length || 0}</strong> crypto deposit(s) linked to loans</li>
                    </ul>

                    {userLoansData.loans && userLoansData.loans.length > 0 && (
                      <div style={styles.loansList}>
                        <h5 style={styles.loansListTitle}>Loans:</h5>
                        {userLoansData.loans.map((loan, index) => (
                          <div key={loan.id} style={styles.loanItem}>
                            <div><strong>Loan #{index + 1}</strong></div>
                            <div>Type: {loan.loan_type}</div>
                            <div>Principal: ${parseFloat(loan.principal).toLocaleString()}</div>
                            <div>Status: {loan.status}</div>
                            <div>Remaining: ${parseFloat(loan.remaining_balance || 0).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={styles.dangerBox}>
                  <p style={styles.dangerText}>
                    ⚠️ This will permanently delete:
                  </p>
                  <ul style={styles.dangerList}>
                    <li>All loan records</li>
                    <li>All loan payment history</li>
                    <li>Crypto deposits linked to loan requirements</li>
                  </ul>
                  <p style={styles.dangerWarning}>
                    ⛔ This action CANNOT be undone!
                  </p>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  onClick={() => {
                    setConfirmDelete(null);
                    setUserLoansData(null);
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUserLoans(confirmDelete)}
                  disabled={deleteLoading === confirmDelete.id}
                  style={{
                    ...styles.confirmDeleteButton,
                    opacity: deleteLoading === confirmDelete.id ? 0.6 : 1,
                    cursor: deleteLoading === confirmDelete.id ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deleteLoading === confirmDelete.id ? 'Deleting...' : 'Yes, Delete All Loan Data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: 'clamp(20px, 5vw, 28px)',
    fontWeight: '700',
    color: '#dc2626',
    margin: 0
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#64748b',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  message: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
    border: '2px solid'
  },
  searchContainer: {
    marginBottom: '20px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tableHeader: {
    padding: '20px',
    borderBottom: '2px solid #e2e8f0'
  },
  tableTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
    fontSize: '16px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#f8fafc'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1e293b'
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#dc2626'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#64748b',
    lineHeight: 1
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  warningText: {
    fontSize: '15px',
    color: '#1e293b',
    marginBottom: '20px'
  },
  detailsBox: {
    backgroundColor: '#f1f5f9',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  detailsTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b'
  },
  detailsList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#475569'
  },
  loansList: {
    marginTop: '16px'
  },
  loansListTitle: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#1e293b'
  },
  loanItem: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#475569',
    border: '1px solid #e2e8f0'
  },
  dangerBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    padding: '16px'
  },
  dangerText: {
    color: '#991b1b',
    fontWeight: '600',
    fontSize: '14px',
    margin: '0 0 12px 0'
  },
  dangerList: {
    margin: '0 0 12px 0',
    paddingLeft: '20px',
    color: '#991b1b',
    fontSize: '13px'
  },
  dangerWarning: {
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '700',
    margin: 0
  },
  modalFooter: {
    padding: '20px',
    borderTop: '2px solid #e2e8f0',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmDeleteButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600'
  }
};
