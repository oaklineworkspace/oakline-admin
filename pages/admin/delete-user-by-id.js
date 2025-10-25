
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function DeleteUserById() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [searchMethod, setSearchMethod] = useState('email'); // 'email' or 'userId'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [userFound, setUserFound] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setUserFound(null);

    try {
      // Fetch user details from profiles table
      const response = await fetch('/api/admin/find-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: searchMethod === 'email' ? email : null,
          userId: searchMethod === 'userId' ? userId : null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setUserFound(data.user);
        setMessage({ type: 'success', text: 'User found!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'User not found' });
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setMessage({ type: 'error', text: 'Error searching for user' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/delete-user-complete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userFound.email,
          userId: userFound.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ User and all dependencies deleted successfully!' });
        setUserFound(null);
        setConfirmDelete(false);
        setUserId('');
        setEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Error deleting user' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🗑️ Delete User by ID/Email</h1>
        <button
          onClick={() => router.push('/admin/admin-dashboard')}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
      </div>

      {message && (
        <div
          style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Search for User</h2>

        <div style={styles.searchMethodToggle}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="email"
              checked={searchMethod === 'email'}
              onChange={(e) => setSearchMethod(e.target.value)}
              style={styles.radio}
            />
            Search by Email
          </label>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="userId"
              checked={searchMethod === 'userId'}
              onChange={(e) => setSearchMethod(e.target.value)}
              style={styles.radio}
            />
            Search by User ID
          </label>
        </div>

        <form onSubmit={handleSearch} style={styles.form}>
          {searchMethod === 'email' ? (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                style={styles.input}
                required
              />
            </div>
          ) : (
            <div style={styles.inputGroup}>
              <label style={styles.label}>User ID (UUID)</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="f6017868-af40-4337-98b9-90d6b57395ca"
                style={styles.input}
                required
              />
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.searchButton}>
            {loading ? 'Searching...' : '🔍 Search User'}
          </button>
        </form>

        {userFound && (
          <div style={styles.userDetails}>
            <h3 style={styles.userDetailsTitle}>User Found</h3>
            <div style={styles.userInfo}>
              <p><strong>ID:</strong> {userFound.id}</p>
              <p><strong>Email:</strong> {userFound.email}</p>
              <p><strong>Name:</strong> {userFound.first_name} {userFound.last_name}</p>
              <p><strong>Created:</strong> {new Date(userFound.created_at).toLocaleString()}</p>
            </div>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={styles.deleteButton}
              >
                🗑️ Delete This User
              </button>
            ) : (
              <div style={styles.confirmSection}>
                <div style={styles.warningBox}>
                  <h4 style={styles.warningTitle}>⚠️ Warning: Permanent Deletion</h4>
                  <p style={styles.warningText}>
                    This will permanently delete:
                  </p>
                  <ul style={styles.warningList}>
                    <li>Card transactions and cards</li>
                    <li>Zelle transactions, settings, and contacts</li>
                    <li>Loan payments and loans</li>
                    <li>Accounts and transactions</li>
                    <li>Applications and enrollments</li>
                    <li>Notifications and audit logs</li>
                    <li>Profile and authentication</li>
                    <li>All other associated data</li>
                  </ul>
                  <p style={styles.warningFooter}>
                    <strong>This action cannot be undone!</strong>
                  </p>
                </div>

                <div style={styles.confirmButtons}>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={loading}
                    style={styles.confirmDeleteButton}
                  >
                    {loading ? 'Deleting...' : '✅ Yes, Delete Permanently'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  message: {
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    margin: '0 auto',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px',
  },
  searchMethodToggle: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  userDetails: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
  },
  userDetailsTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '15px',
  },
  userInfo: {
    marginBottom: '20px',
  },
  deleteButton: {
    padding: '12px 24px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
  },
  confirmSection: {
    marginTop: '20px',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  warningTitle: {
    color: '#856404',
    marginTop: 0,
    marginBottom: '10px',
  },
  warningText: {
    color: '#856404',
    marginBottom: '10px',
  },
  warningList: {
    color: '#856404',
    marginLeft: '20px',
    marginBottom: '10px',
  },
  warningFooter: {
    color: '#dc3545',
    fontWeight: 'bold',
    marginBottom: 0,
  },
  confirmButtons: {
    display: 'flex',
    gap: '10px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  confirmDeleteButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};
