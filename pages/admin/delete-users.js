
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function DeleteUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        setMessage({ type: 'error', text: 'Failed to fetch users' });
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Error loading users' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      setDeleteLoading(user.id);
      const response = await fetch('/api/admin/delete-user-complete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'User deleted successfully' });
        setUsers(users.filter(u => u.id !== user.id));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Error deleting user' });
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>Delete Users</h1>
        <button
          onClick={() => router.push('/admin/admin-dashboard')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}
        >
          {message.text}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading users...</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0, color: '#333' }}>
              Users from Profiles Table ({filteredUsers.length})
            </h3>
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>First Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Last Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace', color: '#666' }}>
                        {user.id.substring(0, 8)}...
                      </td>
                      <td style={{ padding: '12px' }}>
                        {user.first_name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {user.last_name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={deleteLoading === user.id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: deleteLoading === user.id ? 'not-allowed' : 'pointer',
                            opacity: deleteLoading === user.id ? 0.6 : 1,
                            fontSize: '12px'
                          }}
                        >
                          {deleteLoading === user.id ? 'Deleting...' : 'Delete'}
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

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ color: '#dc3545', marginTop: 0 }}>⚠️ Confirm Complete Deletion</h3>
            <p>
              Are you sure you want to permanently delete <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong> ({confirmDelete.email})?
            </p>
            <p style={{ color: '#666', fontSize: '14px' }}>
              This will delete all associated data including:
            </p>
            <ul style={{ color: '#666', fontSize: '14px', marginLeft: '20px' }}>
              <li>Cards and card transactions</li>
              <li>Zelle transactions and contacts</li>
              <li>Loans and loan payments</li>
              <li>Accounts and transactions</li>
              <li>Applications and enrollments</li>
              <li>Notifications and audit logs</li>
              <li>Profile and authentication</li>
            </ul>
            <p style={{ color: '#dc3545', fontSize: '14px', fontWeight: 'bold' }}>
              ⚠️ This action cannot be undone!
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete)}
                disabled={deleteLoading === confirmDelete.id}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: deleteLoading === confirmDelete.id ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading === confirmDelete.id ? 0.6 : 1
                }}
              >
                {deleteLoading === confirmDelete.id ? 'Deleting...' : 'Yes, Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
