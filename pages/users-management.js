
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminUsersManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    role: 'admin',
    permissions: []
  });
  const router = useRouter();

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchAdminUsers();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setError('');
      fetchAdminUsers();
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
  };

  const fetchAdminUsers = async () => {
    setLoading(true);
    try {
      // For now, we'll show a hardcoded list. In production, this would come from your admin users table
      setAdminUsers([
        {
          id: 1,
          email: 'admin@theoaklinebank.com',
          role: 'Super Admin',
          status: 'Active',
          lastLogin: '2024-01-15T10:30:00Z',
          permissions: ['full_access', 'user_management', 'transaction_management', 'system_settings']
        },
        {
          id: 2,
          email: 'manager@theoaklinebank.com',
          role: 'Manager',
          status: 'Active',
          lastLogin: '2024-01-14T15:45:00Z',
          permissions: ['user_management', 'transaction_management']
        },
        {
          id: 3,
          email: 'support@theoaklinebank.com',
          role: 'Support',
          status: 'Active',
          lastLogin: '2024-01-13T09:15:00Z',
          permissions: ['user_support', 'view_transactions']
        }
      ]);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      setError('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In production, this would create an admin user in your database
      console.log('Creating admin user:', newAdmin);
      
      // Reset form
      setNewAdmin({
        email: '',
        password: '',
        role: 'admin',
        permissions: []
      });
      setShowCreateForm(false);
      
      // Refresh the list
      await fetchAdminUsers();
      
      alert('Admin user created successfully!');
    } catch (error) {
      console.error('Error creating admin user:', error);
      setError('Failed to create admin user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
      // In production, this would update the admin user status in your database
      console.log(`Toggling user ${userId} status to ${newStatus}`);
      
      setAdminUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
      
      alert(`Admin user status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      setError('Failed to update admin status');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🏦 Admin User Management</h1>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter admin password"
                required
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.loginButton}>
              🔐 Access Admin User Management
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>👨‍💼 Admin User Management</h1>
          <p style={styles.subtitle}>Manage administrative users and permissions</p>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            style={styles.addButton}
          >
            ➕ Add Admin
          </button>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorMessage}>{error}</div>
      )}

      {/* Create Admin Form */}
      {showCreateForm && (
        <div style={styles.createForm}>
          <h3 style={styles.formTitle}>Create New Admin User</h3>
          <form onSubmit={handleCreateAdmin} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Temporary Password</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Role</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                  style={styles.select}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support</option>
                </select>
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton} disabled={loading}>
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)} 
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Users List */}
      <div style={styles.usersSection}>
        <h2 style={styles.sectionTitle}>Current Admin Users ({adminUsers.length})</h2>
        
        {loading ? (
          <div style={styles.loading}>Loading admin users...</div>
        ) : (
          <div style={styles.usersGrid}>
            {adminUsers.map(user => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <div style={styles.userInfo}>
                    <h3 style={styles.userEmail}>{user.email}</h3>
                    <span style={styles.userRole}>{user.role}</span>
                  </div>
                  <div style={styles.userStatus}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: user.status === 'Active' ? '#10b981' : '#ef4444'
                    }}>
                      {user.status}
                    </span>
                  </div>
                </div>
                
                <div style={styles.userDetails}>
                  <p style={styles.userDetail}>
                    <strong>Last Login:</strong> {new Date(user.lastLogin).toLocaleString()}
                  </p>
                  <p style={styles.userDetail}>
                    <strong>Permissions:</strong> {user.permissions.join(', ')}
                  </p>
                </div>
                
                <div style={styles.userActions}>
                  <button 
                    onClick={() => handleToggleStatus(user.id, user.status)}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: user.status === 'Active' ? '#ef4444' : '#10b981'
                    }}
                  >
                    {user.status === 'Active' ? '🚫 Suspend' : '✅ Activate'}
                  </button>
                  <button style={styles.editButton}>
                    ✏️ Edit
                  </button>
                  <button style={styles.deleteButton}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Roles Reference */}
      <div style={styles.rolesSection}>
        <h2 style={styles.sectionTitle}>Admin Roles & Permissions</h2>
        <div style={styles.rolesGrid}>
          <div style={styles.roleCard}>
            <h4 style={styles.roleTitle}>Super Admin</h4>
            <p style={styles.roleDescription}>Full system access, can manage all aspects</p>
            <ul style={styles.permissionsList}>
              <li>✅ Full Access</li>
              <li>✅ User Management</li>
              <li>✅ Transaction Management</li>
              <li>✅ System Settings</li>
              <li>✅ Admin User Management</li>
            </ul>
          </div>
          
          <div style={styles.roleCard}>
            <h4 style={styles.roleTitle}>Manager</h4>
            <p style={styles.roleDescription}>Can manage users and transactions</p>
            <ul style={styles.permissionsList}>
              <li>✅ User Management</li>
              <li>✅ Transaction Management</li>
              <li>✅ View Reports</li>
              <li>❌ System Settings</li>
              <li>❌ Admin User Management</li>
            </ul>
          </div>
          
          <div style={styles.roleCard}>
            <h4 style={styles.roleTitle}>Support</h4>
            <p style={styles.roleDescription}>Can view and assist users</p>
            <ul style={styles.permissionsList}>
              <li>✅ User Support</li>
              <li>✅ View Transactions</li>
              <li>❌ User Management</li>
              <li>❌ System Settings</li>
              <li>❌ Admin User Management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
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
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#555',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  addButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  backButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-block'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorMessage: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    margin: '0 0 20px 0',
    border: '1px solid #fecaca'
  },
  createForm: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  select: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  saveButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  cancelButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  loginButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  error: {
    color: '#dc3545',
    fontSize: '14px',
    textAlign: 'center'
  },
  usersSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
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
  usersGrid: {
    display: 'grid',
    gap: '20px'
  },
  userCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: '#fafafa',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  userEmail: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  userRole: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    alignSelf: 'flex-start'
  },
  userStatus: {
    display: 'flex',
    alignItems: 'center'
  },
  statusBadge: {
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  userDetails: {
    marginBottom: '20px'
  },
  userDetail: {
    margin: '5px 0',
    fontSize: '14px',
    color: '#64748b'
  },
  userActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  actionButton: {
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  editButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  deleteButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  rolesSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  roleCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: '#f8fafc'
  },
  roleTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 10px 0'
  },
  roleDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 15px 0'
  },
  permissionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  }
};
