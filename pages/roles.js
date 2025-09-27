
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AdminRoute from '../components/AdminRoute';

export default function AdminRoles() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [newProfile, setNewProfile] = useState({
    email: '',
    role: 'auditor',
    is_active: true,
    permissions: {
      view_dashboard: true,
      manage_users: false,
      manage_accounts: false,
      manage_transactions: false,
      manage_cards: false,
      view_reports: true,
      manage_settings: false,
      manage_admins: false
    }
  });
  const router = useRouter();

  useEffect(() => {
    fetchAdminProfiles();
  }, []);

  const fetchAdminProfiles = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch admin profiles from admin_profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setAdminProfiles(profilesData || []);

    } catch (error) {
      console.error('Error fetching admin profiles:', error);
      setError('Failed to load admin profiles: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Insert new admin profile
      const { data, error } = await supabase
        .from('admin_profiles')
        .insert([{
          email: newProfile.email,
          role: newProfile.role,
          is_active: newProfile.is_active,
          permissions: newProfile.permissions,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setSuccess('Admin profile created successfully!');
      setShowCreateForm(false);
      setNewProfile({
        email: '',
        role: 'auditor',
        is_active: true,
        permissions: {
          view_dashboard: true,
          manage_users: false,
          manage_accounts: false,
          manage_transactions: false,
          manage_cards: false,
          view_reports: true,
          manage_settings: false,
          manage_admins: false
        }
      });
      fetchAdminProfiles();

    } catch (error) {
      console.error('Error creating admin profile:', error);
      setError('Failed to create admin profile: ' + error.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          role: editingProfile.role,
          is_active: editingProfile.is_active,
          permissions: editingProfile.permissions
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      setSuccess('Admin profile updated successfully!');
      setEditingProfile(null);
      fetchAdminProfiles();

    } catch (error) {
      console.error('Error updating admin profile:', error);
      setError('Failed to update admin profile: ' + error.message);
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('Are you sure you want to delete this admin profile?')) return;

    try {
      const { error } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      setSuccess('Admin profile deleted successfully!');
      fetchAdminProfiles();

    } catch (error) {
      console.error('Error deleting admin profile:', error);
      setError('Failed to delete admin profile: ' + error.message);
    }
  };

  const handlePermissionChange = (permission, value, isEditing = false) => {
    const target = isEditing ? editingProfile : newProfile;
    const setter = isEditing ? setEditingProfile : setNewProfile;

    setter({
      ...target,
      permissions: {
        ...target.permissions,
        [permission]: value
      }
    });
  };

  const getRolePermissions = (role) => {
    switch (role) {
      case 'superadmin':
        return {
          view_dashboard: true,
          manage_users: true,
          manage_accounts: true,
          manage_transactions: true,
          manage_cards: true,
          view_reports: true,
          manage_settings: true,
          manage_admins: true
        };
      case 'admin':
        return {
          view_dashboard: true,
          manage_users: true,
          manage_accounts: true,
          manage_transactions: true,
          manage_cards: true,
          view_reports: true,
          manage_settings: false,
          manage_admins: false
        };
      case 'auditor':
        return {
          view_dashboard: true,
          manage_users: false,
          manage_accounts: false,
          manage_transactions: false,
          manage_cards: false,
          view_reports: true,
          manage_settings: false,
          manage_admins: false
        };
      default:
        return {
          view_dashboard: true,
          manage_users: false,
          manage_accounts: false,
          manage_transactions: false,
          manage_cards: false,
          view_reports: false,
          manage_settings: false,
          manage_admins: false
        };
    }
  };

  const handleRoleChange = (role, isEditing = false) => {
    const permissions = getRolePermissions(role);
    if (isEditing) {
      setEditingProfile({
        ...editingProfile,
        role,
        permissions
      });
    } else {
      setNewProfile({
        ...newProfile,
        role,
        permissions
      });
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading admin roles...</p>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>👥 Admin Roles & Permissions</h1>
            <p style={styles.subtitle}>Manage administrator roles and permissions</p>
          </div>
          <div style={styles.headerActions}>
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={styles.addButton}
            >
              ➕ Add Admin
            </button>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Create New Profile Form */}
        {showCreateForm && (
          <div style={styles.formContainer}>
            <h3>Create New Admin Profile</h3>
            <form onSubmit={handleCreateProfile} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    value={newProfile.email}
                    onChange={(e) => setNewProfile({...newProfile, email: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Role *</label>
                  <select
                    value={newProfile.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    style={styles.select}
                  >
                    <option value="auditor">Auditor</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newProfile.is_active}
                      onChange={(e) => setNewProfile({...newProfile, is_active: e.target.checked})}
                      style={styles.checkbox}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div style={styles.permissionsSection}>
                <h4>Permissions</h4>
                <div style={styles.permissionsGrid}>
                  {Object.entries(newProfile.permissions).map(([permission, value]) => (
                    <label key={permission} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                        style={styles.checkbox}
                      />
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.saveButton}>
                  💾 Create Profile
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

        {/* Edit Profile Form */}
        {editingProfile && (
          <div style={styles.formContainer}>
            <h3>Edit Admin Profile - {editingProfile.email}</h3>
            <form onSubmit={handleUpdateProfile} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Role *</label>
                  <select
                    value={editingProfile.role}
                    onChange={(e) => handleRoleChange(e.target.value, true)}
                    style={styles.select}
                  >
                    <option value="auditor">Auditor</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editingProfile.is_active}
                      onChange={(e) => setEditingProfile({...editingProfile, is_active: e.target.checked})}
                      style={styles.checkbox}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div style={styles.permissionsSection}>
                <h4>Permissions</h4>
                <div style={styles.permissionsGrid}>
                  {Object.entries(editingProfile.permissions || {}).map(([permission, value]) => (
                    <label key={permission} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handlePermissionChange(permission, e.target.checked, true)}
                        style={styles.checkbox}
                      />
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.saveButton}>
                  💾 Update Profile
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingProfile(null)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Admin Profiles List */}
        <div style={styles.profilesSection}>
          <h2>Current Admin Profiles ({adminProfiles.length})</h2>
          <div style={styles.profilesGrid}>
            {adminProfiles.map((profile) => (
              <div key={profile.id} style={styles.profileCard}>
                <div style={styles.profileHeader}>
                  <div>
                    <h3 style={styles.profileEmail}>{profile.email}</h3>
                    <span style={{
                      ...styles.roleBadge,
                      backgroundColor: 
                        profile.role === 'superadmin' ? '#dc2626' :
                        profile.role === 'admin' ? '#059669' : '#0891b2'
                    }}>
                      {profile.role}
                    </span>
                  </div>
                  <div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: profile.is_active ? '#10b981' : '#6b7280'
                    }}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div style={styles.profileDetails}>
                  <p><strong>Created:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
                  <p><strong>Last Updated:</strong> {new Date(profile.updated_at).toLocaleDateString()}</p>
                  
                  <div style={styles.permissionsList}>
                    <strong>Permissions:</strong>
                    <div style={styles.permissions}>
                      {Object.entries(profile.permissions || {})
                        .filter(([_, value]) => value)
                        .map(([permission]) => (
                          <span key={permission} style={styles.permissionTag}>
                            {permission.replace(/_/g, ' ')}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                <div style={styles.profileActions}>
                  <button
                    onClick={() => setEditingProfile(profile)}
                    style={styles.editButton}
                  >
                    ✏️ Edit
                  </button>
                  {profile.id !== user.id && (
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      style={styles.deleteButton}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Descriptions */}
        <div style={styles.roleDescriptions}>
          <h2>Role Descriptions</h2>
          <div style={styles.rolesGrid}>
            <div style={styles.roleCard}>
              <h4 style={styles.roleTitle}>Super Admin</h4>
              <p style={styles.roleDescription}>
                Full system access with ability to manage all aspects including other admins and system settings.
              </p>
              <ul style={styles.rolePermissions}>
                <li>✅ All permissions</li>
                <li>✅ Manage admin users</li>
                <li>✅ System settings</li>
              </ul>
            </div>
            
            <div style={styles.roleCard}>
              <h4 style={styles.roleTitle}>Admin</h4>
              <p style={styles.roleDescription}>
                Operational access to manage users, accounts, transactions, and cards.
              </p>
              <ul style={styles.rolePermissions}>
                <li>✅ Manage users & accounts</li>
                <li>✅ Process transactions</li>
                <li>✅ Issue cards</li>
                <li>❌ System settings</li>
              </ul>
            </div>
            
            <div style={styles.roleCard}>
              <h4 style={styles.roleTitle}>Auditor</h4>
              <p style={styles.roleDescription}>
                Read-only access for monitoring, reporting, and compliance purposes.
              </p>
              <ul style={styles.rolePermissions}>
                <li>✅ View dashboard</li>
                <li>✅ Generate reports</li>
                <li>❌ Modify data</li>
                <li>❌ Administrative actions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    padding: '20px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
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
    color: '#1e3a8a',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
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
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    margin: '0 0 20px 0',
    border: '1px solid #fecaca'
  },
  success: {
    background: '#d1fae5',
    color: '#059669',
    padding: '15px',
    borderRadius: '8px',
    margin: '0 0 20px 0',
    border: '1px solid #a7f3d0'
  },
  formContainer: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
    color: '#374151'
  },
  input: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none'
  },
  select: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px'
  },
  permissionsSection: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px'
  },
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  saveButton: {
    background: '#059669',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  },
  cancelButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  },
  profilesSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  profileCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#f9fafb'
  },
  profileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  profileEmail: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  roleBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  statusBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  profileDetails: {
    marginBottom: '15px',
    fontSize: '14px'
  },
  permissionsList: {
    marginTop: '10px'
  },
  permissions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '5px'
  },
  permissionTag: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px'
  },
  profileActions: {
    display: 'flex',
    gap: '10px'
  },
  editButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  deleteButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  roleDescriptions: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  roleCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
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
  rolePermissions: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '13px'
  }
};
