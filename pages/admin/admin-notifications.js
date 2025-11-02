
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import Link from 'next/link';

export default function AdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    user_id: '',
    type: 'info',
    title: '',
    message: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    const subscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, profiles(first_name, last_name, email)')
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      
      if (!error) {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([newNotification]);

      if (error) throw error;

      setStatusMessage('✅ Notification created successfully!');
      setShowCreateForm(false);
      setNewNotification({
        user_id: '',
        type: 'info',
        title: '',
        message: '',
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error creating notification:', err);
      setStatusMessage('❌ Failed to create notification');
    }
  };

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (!error) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (!error) {
        setStatusMessage('✅ Notification deleted');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setStatusMessage('❌ Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'error': return '❌';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch(type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔔 Admin Notifications</h1>
            <p style={styles.subtitle}>Manage and send notifications to users</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowCreateForm(!showCreateForm)} style={styles.createButton}>
              {showCreateForm ? '✖ Cancel' : '+ Create Notification'}
            </button>
            <Link href="/" style={styles.backButton}>← Back to Hub</Link>
          </div>
        </div>

        {statusMessage && (
          <div style={styles.statusMessage}>{statusMessage}</div>
        )}

        {showCreateForm && (
          <div style={styles.createForm}>
            <h3 style={styles.formTitle}>Create New Notification</h3>
            <form onSubmit={handleCreateNotification}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>User:</label>
                <select
                  value={newNotification.user_id}
                  onChange={(e) => setNewNotification({...newNotification, user_id: e.target.value})}
                  style={styles.formSelect}
                  required
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Type:</label>
                <select
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
                  style={styles.formSelect}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Title:</label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                  style={styles.formInput}
                  placeholder="Notification title"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Message:</label>
                <textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                  style={styles.formTextarea}
                  placeholder="Notification message"
                  required
                  rows="4"
                />
              </div>
              <button type="submit" style={styles.submitButton}>
                ✉️ Send Notification
              </button>
            </form>
          </div>
        )}

        <div style={styles.filterBar}>
          <div style={styles.filterTabs}>
            <button
              onClick={() => setFilter('all')}
              style={{ ...styles.filterTab, ...(filter === 'all' ? styles.activeFilterTab : {}) }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{ ...styles.filterTab, ...(filter === 'unread' ? styles.activeFilterTab : {}) }}
            >
              Unread ({notifications.filter(n => !n.read).length})
            </button>
            <button
              onClick={() => setFilter('read')}
              style={{ ...styles.filterTab, ...(filter === 'read' ? styles.activeFilterTab : {}) }}
            >
              Read ({notifications.filter(n => n.read).length})
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No notifications found</p>
            </div>
          ) : (
            <div style={styles.notificationsList}>
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  style={{
                    ...styles.notificationCard,
                    backgroundColor: notification.read ? '#f9fafb' : '#ffffff',
                    borderLeft: `4px solid ${getNotificationColor(notification.type)}`
                  }}
                >
                  <div style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={styles.notificationContent}>
                    <div style={styles.notificationHeader}>
                      <h3 style={styles.notificationTitle}>{notification.title}</h3>
                      {!notification.read && <span style={styles.unreadBadge}>NEW</span>}
                    </div>
                    <p style={styles.notificationMessage}>{notification.message}</p>
                    <p style={styles.notificationUser}>
                      To: {notification.profiles ? `${notification.profiles.first_name} ${notification.profiles.last_name}` : 'N/A'}
                    </p>
                    <p style={styles.notificationTime}>
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    <div style={styles.notificationActions}>
                      {!notification.read && (
                        <button onClick={() => markAsRead(notification.id)} style={styles.actionButton}>
                          ✓ Mark as Read
                        </button>
                      )}
                      <button onClick={() => deleteNotification(notification.id)} style={styles.deleteButton}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1a202c',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    minHeight: '400px'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  notificationCard: {
    display: 'flex',
    gap: '1rem',
    padding: '1.25rem',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  notificationIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  notificationContent: {
    flex: 1
  },
  notificationHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.5rem'
  },
  notificationTitle: {
    margin: 0,
    fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
    fontWeight: '600',
    color: '#1a202c'
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700'
  },
  notificationMessage: {
    margin: '0 0 0.5rem 0',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    color: '#4b5563',
    lineHeight: '1.5'
  },
  notificationTime: {
    margin: 0,
    fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
    color: '#9ca3af'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 1rem'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  emptyText: {
    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
    color: '#9ca3af'
  },
  backButton: {
    padding: '10px 20px',
    background: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    display: 'inline-block'
  },
  createButton: {
    padding: '10px 20px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  statusMessage: {
    padding: '15px',
    background: '#d4edda',
    color: '#155724',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb'
  },
  createForm: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1a202c'
  },
  formGroup: {
    marginBottom: '15px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500',
    color: '#4b5563'
  },
  formInput: {
    width: '100%',
    padding: '10px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px'
  },
  formSelect: {
    width: '100%',
    padding: '10px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white'
  },
  formTextarea: {
    width: '100%',
    padding: '10px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  submitButton: {
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  filterBar: {
    background: 'white',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  filterTabs: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  filterTab: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  activeFilterTab: {
    background: '#3b82f6',
    color: 'white'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af'
  },
  notificationUser: {
    fontSize: '0.85rem',
    color: '#6b7280',
    margin: '4px 0'
  },
  notificationActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  },
  actionButton: {
    padding: '6px 12px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  deleteButton: {
    padding: '6px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  }
};
