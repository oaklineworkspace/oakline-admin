
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AdminRoute from '../components/AdminRoute';

export default function AdminNotifications() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('history');
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    recipients: 'all',
    specificUsers: [],
    sendEmail: true,
    sendSMS: false,
    priority: 'normal'
  });
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch notification history from notifications table
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (notificationsError) throw notificationsError;

      setNotifications(notificationsData || []);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch users from applications table for recipient selection
      const { data: usersData, error: usersError } = await supabase
        .from('applications')
        .select('id, first_name, last_name, email, phone')
        .order('first_name');

      if (usersError) throw usersError;

      setUsers(usersData || []);

    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');

    try {
      // Determine recipient list
      let recipientList = [];
      
      if (newNotification.recipients === 'all') {
        recipientList = users.map(user => ({
          user_id: user.id,
          email: user.email,
          phone: user.phone
        }));
      } else if (newNotification.recipients === 'specific') {
        recipientList = users
          .filter(user => newNotification.specificUsers.includes(user.id))
          .map(user => ({
            user_id: user.id,
            email: user.email,
            phone: user.phone
          }));
      }

      if (recipientList.length === 0) {
        setError('No recipients selected');
        setSending(false);
        return;
      }

      // Create notification record in database
      const { data: notificationRecord, error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          priority: newNotification.priority,
          sent_by: user.id,
          recipient_count: recipientList.length,
          channels: {
            email: newNotification.sendEmail,
            sms: newNotification.sendSMS
          }
        }])
        .select()
        .single();

      if (notificationError) throw notificationError;

      // Send notifications via API
      const response = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: notificationRecord.id,
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          priority: newNotification.priority,
          recipients: recipientList,
          sendEmail: newNotification.sendEmail,
          sendSMS: newNotification.sendSMS
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Notification sent successfully to ${recipientList.length} recipients!`);
        
        // Reset form
        setNewNotification({
          title: '',
          message: '',
          type: 'info',
          recipients: 'all',
          specificUsers: [],
          sendEmail: true,
          sendSMS: false,
          priority: 'normal'
        });
        
        // Refresh notifications list
        fetchNotifications();
        
        // Switch to history tab to see the sent notification
        setActiveTab('history');
      } else {
        setError(result.error || 'Failed to send notification');
      }

    } catch (error) {
      console.error('Error sending notification:', error);
      setError('Failed to send notification: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleUserSelection = (userId) => {
    setNewNotification(prev => ({
      ...prev,
      specificUsers: prev.specificUsers.includes(userId)
        ? prev.specificUsers.filter(id => id !== userId)
        : [...prev.specificUsers, userId]
    }));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
      default:
        return '#3b82f6';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'normal':
        return '#059669';
      case 'low':
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading notifications...</p>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>🔔 Notification Management</h1>
            <p style={styles.subtitle}>Send and manage system notifications</p>
          </div>
          <div style={styles.headerActions}>
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

        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'send' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('send')}
          >
            📤 Send Notification
          </button>
          <button
            style={activeTab === 'history' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('history')}
          >
            📋 Notification History
          </button>
          <button
            style={activeTab === 'templates' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('templates')}
          >
            📝 Templates
          </button>
        </div>

        {/* Send Notification Tab */}
        {activeTab === 'send' && (
          <div style={styles.content}>
            <h2>Send New Notification</h2>
            <form onSubmit={handleSendNotification} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Title *</label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                    style={styles.input}
                    placeholder="Notification title..."
                    required
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Type</label>
                  <select
                    value={newNotification.type}
                    onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
                    style={styles.select}
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Priority</label>
                  <select
                    value={newNotification.priority}
                    onChange={(e) => setNewNotification({...newNotification, priority: e.target.value})}
                    style={styles.select}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Message *</label>
                <textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                  style={styles.textarea}
                  placeholder="Enter notification message..."
                  rows={5}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Recipients</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      value="all"
                      checked={newNotification.recipients === 'all'}
                      onChange={(e) => setNewNotification({...newNotification, recipients: e.target.value})}
                      style={styles.radio}
                    />
                    All Users ({users.length})
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      value="specific"
                      checked={newNotification.recipients === 'specific'}
                      onChange={(e) => setNewNotification({...newNotification, recipients: e.target.value})}
                      style={styles.radio}
                    />
                    Specific Users
                  </label>
                </div>
              </div>

              {newNotification.recipients === 'specific' && (
                <div style={styles.userSelectionContainer}>
                  <label style={styles.label}>Select Users:</label>
                  <div style={styles.usersList}>
                    {users.map(user => (
                      <label key={user.id} style={styles.userCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={newNotification.specificUsers.includes(user.id)}
                          onChange={() => handleUserSelection(user.id)}
                          style={styles.checkbox}
                        />
                        {user.first_name} {user.last_name} ({user.email})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.channelOptions}>
                <h4>Delivery Channels</h4>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newNotification.sendEmail}
                      onChange={(e) => setNewNotification({...newNotification, sendEmail: e.target.checked})}
                      style={styles.checkbox}
                    />
                    📧 Send Email
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newNotification.sendSMS}
                      onChange={(e) => setNewNotification({...newNotification, sendSMS: e.target.checked})}
                      style={styles.checkbox}
                    />
                    📱 Send SMS
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending || (!newNotification.sendEmail && !newNotification.sendSMS)}
                style={{
                  ...styles.sendButton,
                  opacity: (sending || (!newNotification.sendEmail && !newNotification.sendSMS)) ? 0.6 : 1,
                  cursor: (sending || (!newNotification.sendEmail && !newNotification.sendSMS)) ? 'not-allowed' : 'pointer'
                }}
              >
                {sending ? '📤 Sending...' : '📤 Send Notification'}
              </button>
            </form>
          </div>
        )}

        {/* Notification History Tab */}
        {activeTab === 'history' && (
          <div style={styles.content}>
            <div style={styles.historyHeader}>
              <h2>Notification History ({notifications.length})</h2>
              <button onClick={fetchNotifications} style={styles.refreshButton}>
                🔄 Refresh
              </button>
            </div>
            
            <div style={styles.notificationsList}>
              {notifications.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No notifications sent yet.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} style={styles.notificationCard}>
                    <div style={styles.notificationHeader}>
                      <div style={styles.notificationTitle}>
                        <span style={styles.notificationIcon}>
                          {getNotificationIcon(notification.type)}
                        </span>
                        {notification.title}
                      </div>
                      <div style={styles.notificationMeta}>
                        <span style={{
                          ...styles.priorityBadge,
                          backgroundColor: getPriorityColor(notification.priority)
                        }}>
                          {notification.priority}
                        </span>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: getNotificationColor(notification.type)
                        }}>
                          {notification.type}
                        </span>
                      </div>
                    </div>
                    
                    <div style={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    
                    <div style={styles.notificationFooter}>
                      <div style={styles.notificationDetails}>
                        <span>📧 {notification.channels?.email ? 'Email' : ''}</span>
                        <span>📱 {notification.channels?.sms ? 'SMS' : ''}</span>
                        <span>👥 {notification.recipient_count} recipients</span>
                      </div>
                      <div style={styles.notificationDate}>
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div style={styles.content}>
            <h2>Notification Templates</h2>
            <div style={styles.templatesGrid}>
              <div style={styles.templateCard}>
                <h4>🔐 Security Alert</h4>
                <p>Notify users about security-related events</p>
                <button 
                  onClick={() => {
                    setNewNotification({
                      ...newNotification,
                      title: 'Security Alert',
                      message: 'We have detected unusual activity on your account. Please review your recent transactions and contact us if you notice anything suspicious.',
                      type: 'warning',
                      priority: 'high'
                    });
                    setActiveTab('send');
                  }}
                  style={styles.useTemplateButton}
                >
                  Use Template
                </button>
              </div>
              
              <div style={styles.templateCard}>
                <h4>💳 Card Status Update</h4>
                <p>Inform users about card-related changes</p>
                <button 
                  onClick={() => {
                    setNewNotification({
                      ...newNotification,
                      title: 'Card Status Update',
                      message: 'Your debit card has been successfully activated and is now ready to use.',
                      type: 'success',
                      priority: 'normal'
                    });
                    setActiveTab('send');
                  }}
                  style={styles.useTemplateButton}
                >
                  Use Template
                </button>
              </div>
              
              <div style={styles.templateCard}>
                <h4>🏦 System Maintenance</h4>
                <p>Notify about scheduled maintenance</p>
                <button 
                  onClick={() => {
                    setNewNotification({
                      ...newNotification,
                      title: 'Scheduled Maintenance',
                      message: 'Our banking system will undergo scheduled maintenance on [DATE] from [TIME] to [TIME]. During this time, some services may be temporarily unavailable.',
                      type: 'info',
                      priority: 'normal'
                    });
                    setActiveTab('send');
                  }}
                  style={styles.useTemplateButton}
                >
                  Use Template
                </button>
              </div>
              
              <div style={styles.templateCard}>
                <h4>💰 Account Update</h4>
                <p>General account-related notifications</p>
                <button 
                  onClick={() => {
                    setNewNotification({
                      ...newNotification,
                      title: 'Account Update',
                      message: 'Your account information has been successfully updated. If you did not make this change, please contact us immediately.',
                      type: 'info',
                      priority: 'normal'
                    });
                    setActiveTab('send');
                  }}
                  style={styles.useTemplateButton}
                >
                  Use Template
                </button>
              </div>
            </div>
          </div>
        )}
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
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: '#1e3a8a',
    color: 'white'
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
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
  textarea: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  radioGroup: {
    display: 'flex',
    gap: '20px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  radio: {
    width: '16px',
    height: '16px'
  },
  userSelectionContainer: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px'
  },
  usersList: {
    maxHeight: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px'
  },
  userCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '5px'
  },
  checkbox: {
    width: '16px',
    height: '16px'
  },
  channelOptions: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px'
  },
  checkboxGroup: {
    display: 'flex',
    gap: '20px',
    marginTop: '10px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  sendButton: {
    background: '#059669',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    alignSelf: 'flex-start'
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  refreshButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  notificationCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#f9fafb'
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  notificationTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  notificationIcon: {
    fontSize: '18px'
  },
  notificationMeta: {
    display: 'flex',
    gap: '8px'
  },
  priorityBadge: {
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  typeBadge: {
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  notificationMessage: {
    color: '#64748b',
    marginBottom: '15px',
    lineHeight: '1.5'
  },
  notificationFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#6b7280'
  },
  notificationDetails: {
    display: 'flex',
    gap: '15px'
  },
  notificationDate: {
    fontStyle: 'italic'
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  templateCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#f8fafc'
  },
  useTemplateButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '10px'
  }
};
