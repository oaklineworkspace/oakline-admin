
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function BroadcastMessages() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at')
        .not('email', 'is', null)
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      setUsers(profiles || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.email));
    }
    setSelectAll(!selectAll);
  };

  const handleUserToggle = (email) => {
    setSelectedUsers(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setSending(true);
    setError('');
    setSuccess(false);

    try {
      // Get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('Your session has expired. Please refresh the page and try again.');
        setSending(false);
        return;
      }

      // Send request to API
      const response = await fetch('/api/admin/send-broadcast-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject,
          message,
          emails: selectedUsers
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send messages');
      }

      setSuccess(true);
      setSubject('');
      setMessage('');
      setSelectedUsers([]);
      setSelectAll(false);

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error sending broadcast:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(search) ||
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search)
    );
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📧 Broadcast Messages</h1>
          <p style={styles.subtitle}>Send emails to selected users</p>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.errorBox}>
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              <strong>✅ Success!</strong> Messages sent to {selectedUsers.length} recipient(s)
            </div>
          )}

          {/* Message Composition */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📝 Compose Message</h2>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
                style={styles.input}
                disabled={sending}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                style={styles.textarea}
                rows={8}
                disabled={sending}
              />
            </div>
          </div>

          {/* Recipient Selection */}
          <div style={styles.section}>
            <div style={styles.recipientHeader}>
              <h2 style={styles.sectionTitle}>👥 Select Recipients</h2>
              <div style={styles.recipientStats}>
                <span style={styles.statBadge}>
                  {selectedUsers.length} selected
                </span>
                <span style={styles.statBadge}>
                  {filteredUsers.length} total
                </span>
              </div>
            </div>

            <div style={styles.searchContainer}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search by name or email..."
                style={styles.searchInput}
                disabled={sending}
              />
            </div>

            <div style={styles.selectAllContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  style={styles.checkbox}
                  disabled={sending}
                />
                <span>Select All ({filteredUsers.length} users)</span>
              </label>
            </div>

            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading users...</p>
              </div>
            ) : (
              <div style={styles.userList}>
                {filteredUsers.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No users found matching "{searchTerm}"</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        ...styles.userCard,
                        ...(selectedUsers.includes(user.email) ? styles.userCardSelected : {})
                      }}
                      onClick={() => !sending && handleUserToggle(user.email)}
                    >
                      <label style={styles.userLabel}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.email)}
                          onChange={() => handleUserToggle(user.email)}
                          style={styles.checkbox}
                          disabled={sending}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div style={styles.userInfo}>
                          <div style={styles.userName}>
                            {user.first_name} {user.last_name}
                          </div>
                          <div style={styles.userEmail}>{user.email}</div>
                          <div style={styles.userMeta}>
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || selectedUsers.length === 0}
            style={{
              ...styles.sendButton,
              ...(sending || selectedUsers.length === 0 ? styles.buttonDisabled : {})
            }}
          >
            {sending 
              ? `📤 Sending to ${selectedUsers.length} recipient(s)...` 
              : `📨 Send to ${selectedUsers.length} recipient(s)`
            }
          </button>
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    paddingBottom: '100px'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '30px',
    borderBottom: '3px solid #1e3a8a',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    color: '#ffffff',
    fontWeight: '700'
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px'
  },
  content: {
    maxWidth: '1000px',
    margin: '2rem auto',
    padding: '0 20px'
  },
  errorBox: {
    background: '#fef2f2',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#991b1b'
  },
  successBox: {
    background: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#047857'
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  recipientHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  recipientStats: {
    display: 'flex',
    gap: '8px'
  },
  statBadge: {
    background: '#eff6ff',
    color: '#1e40af',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600'
  },
  searchContainer: {
    marginBottom: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none'
  },
  selectAllContainer: {
    padding: '12px 16px',
    background: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto 16px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  userList: {
    maxHeight: '400px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px'
  },
  userCard: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      background: '#f9fafb'
    }
  },
  userCardSelected: {
    background: '#eff6ff',
    borderLeft: '4px solid #3b82f6'
  },
  userLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  },
  userEmail: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  userMeta: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  sendButton: {
    width: '100%',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.3s ease'
  },
  buttonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    boxShadow: 'none'
  }
};
