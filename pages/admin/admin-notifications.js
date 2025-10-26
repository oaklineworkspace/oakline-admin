
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function AdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Application Approved',
      message: 'New user application has been approved successfully.',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'Pending Review',
      message: '5 new applications are waiting for approval.',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      type: 'info',
      title: 'System Update',
      message: 'System maintenance scheduled for tonight at 2 AM.',
      time: '3 hours ago',
      read: true
    }
  ]);

  const markAsRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
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

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔔 Admin Notifications</h1>
            <p style={styles.subtitle}>Stay updated with system alerts and important messages</p>
          </div>
        </div>

        <div style={styles.content}>
          {notifications.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No notifications</p>
            </div>
          ) : (
            <div style={styles.notificationsList}>
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  style={{
                    ...styles.notificationCard,
                    backgroundColor: notification.read ? '#f9fafb' : '#ffffff',
                    borderLeft: `4px solid ${getNotificationColor(notification.type)}`
                  }}
                  onClick={() => markAsRead(notification.id)}
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
                    <p style={styles.notificationTime}>{notification.time}</p>
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
  }
};
