
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminBackButton from '../../components/AdminBackButton';
import { supabase } from '../../lib/supabaseClient';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <p>Loading editor...</p>
});

export default function BroadcastMessages() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('compose');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [sentMessages, setSentMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchBankDetails();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchSentMessages();
    }
  }, [activeTab]);

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name', { ascending: true });

      if (error) throw error;

      setAllUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSentMessages = async () => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch broadcast messages - these are messages where type = 'broadcast'
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'broadcast')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by subject and created_at to get unique messages
      const uniqueMessages = [];
      const seen = new Set();
      
      (data || []).forEach(msg => {
        const key = `${msg.title}_${new Date(msg.created_at).toISOString().split('T')[0]}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMessages.push({
            id: msg.id,
            subject: msg.title,
            message: msg.message,
            sent_at: msg.created_at,
            recipient_count: data.filter(m => m.title === msg.title && 
              new Date(m.created_at).toISOString().split('T')[0] === new Date(msg.created_at).toISOString().split('T')[0]).length
          });
        }
      });

      setSentMessages(uniqueMessages);
    } catch (err) {
      console.error('Error fetching sent messages:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(allUsers.map(u => u.id));
    }
    setSelectAll(!selectAll);
  };

  const handleUserToggle = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
    setSelectAll(false);
  };

  const handleSendMessage = async () => {
    if (!subject.trim()) {
      alert('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }
    if (selectedUsers.length === 0) {
      alert('Please select at least one recipient');
      return;
    }

    setSending(true);

    try {
      console.log('Starting to send broadcast message...');
      const recipients = allUsers.filter(u => selectedUsers.includes(u.id));
      console.log('Recipients:', recipients.length);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('You must be logged in to send messages');
        setSending(false);
        return;
      }
      
      console.log('Sending request to API...');
      const response = await fetch('/api/admin/send-broadcast-message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject,
          message,
          recipients,
          bank_details: bankDetails
        })
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send messages');
      }

      setSentCount(selectedUsers.length);
      setShowSuccess(true);
      
      // Reset form
      setSubject('');
      setMessage('');
      setSelectedUsers([]);
      setSelectAll(false);

    } catch (err) {
      console.error('Error sending messages:', err);
      alert('Failed to send messages: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = allUsers.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            {bankDetails?.logo_url && (
              <img src={bankDetails.logo_url} alt="Bank Logo" style={styles.logo} />
            )}
            <div>
              <h1 style={styles.title}>🔔 Send Notifications</h1>
              <p style={styles.subtitle}>Broadcast messages to your customers</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('compose')}
            style={{
              ...styles.tab,
              ...(activeTab === 'compose' ? styles.activeTab : {})
            }}
          >
            ✉️ Compose Message
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              ...styles.tab,
              ...(activeTab === 'history' ? styles.activeTab : {})
            }}
          >
            📋 Sent Messages
          </button>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div style={styles.content}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Message Body</label>
              <div style={styles.quillWrapper}>
                <ReactQuill
                  value={message}
                  onChange={setMessage}
                  modules={quillModules}
                  placeholder="Type your message here..."
                  style={{ height: '300px' }}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Custom Email Recipients (Optional)</label>
              <div style={styles.customEmailSection}>
                <input
                  type="text"
                  placeholder="Enter email addresses separated by commas (e.g., john@example.com, jane@example.com)"
                  style={styles.customEmailInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const emails = e.target.value.split(',').map(email => email.trim()).filter(email => email);
                      const validEmails = emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
                      if (validEmails.length > 0) {
                        const customRecipients = validEmails.map(email => ({
                          id: `custom_${Date.now()}_${Math.random()}`,
                          email: email,
                          first_name: email.split('@')[0],
                          last_name: '(Guest)',
                          isCustom: true
                        }));
                        setAllUsers([...allUsers, ...customRecipients]);
                        setSelectedUsers([...selectedUsers, ...customRecipients.map(r => r.id)]);
                        e.target.value = '';
                      } else {
                        alert('Please enter valid email addresses');
                      }
                    }
                  }}
                />
                <p style={styles.helperText}>Press Enter to add custom email addresses (for non-registered recipients)</p>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Registered Users ({selectedUsers.length} selected)</label>
              <div style={styles.recipientControls}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Search users..."
                  style={styles.searchInput}
                />
                <button onClick={handleSelectAll} style={styles.selectAllButton}>
                  {selectAll ? '✓ Deselect All' : 'Select All Users'}
                </button>
              </div>

              <div style={styles.userList}>
                {loading ? (
                  <p style={styles.loadingText}>Loading users...</p>
                ) : (
                  filteredUsers.map(user => (
                    <div key={user.id} style={styles.userItem}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        style={styles.checkbox}
                      />
                      <div style={styles.userInfo}>
                        <span style={styles.userName}>
                          {user.first_name} {user.last_name}
                        </span>
                        <span style={styles.userEmail}>{user.email}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={sending || selectedUsers.length === 0}
              style={{
                ...styles.sendButton,
                ...(sending || selectedUsers.length === 0 ? styles.buttonDisabled : {})
              }}
            >
              {sending ? '📤 Sending...' : `📨 Send to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={styles.content}>
            <h2 style={styles.historyTitle}>Previously Sent Messages</h2>
            
            {loadingHistory ? (
              <p style={styles.loadingText}>Loading message history...</p>
            ) : sentMessages.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>📭</p>
                <p style={styles.emptyText}>No messages sent yet</p>
              </div>
            ) : (
              <div style={styles.messageList}>
                {sentMessages.map(msg => (
                  <div key={msg.id} style={styles.messageCard}>
                    <div style={styles.messageHeader}>
                      <h3 style={styles.messageSubject}>{msg.subject}</h3>
                      <span style={styles.messageDate}>
                        {new Date(msg.sent_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div style={styles.messageStats}>
                      <span style={styles.recipientCount}>
                        📧 Sent to {msg.recipient_count} recipient{msg.recipient_count !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => setSelectedMessage(msg)}
                        style={styles.viewButton}
                      >
                        👁️ View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div style={styles.modalOverlay} onClick={() => setShowSuccess(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalIcon}>✅</div>
              <h2 style={styles.modalTitle}>Message Sent Successfully!</h2>
              <p style={styles.modalText}>
                Your message has been sent to <strong>{sentCount}</strong> user{sentCount !== 1 ? 's' : ''}.
              </p>
              <button onClick={() => setShowSuccess(false)} style={styles.modalButton}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div style={styles.modalOverlay} onClick={() => setSelectedMessage(null)}>
            <div style={styles.messageModal} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedMessage(null)} style={styles.closeButton}>×</button>
              <h2 style={styles.messageModalTitle}>{selectedMessage.subject}</h2>
              <div style={styles.messageModalMeta}>
                <span>📅 {new Date(selectedMessage.sent_at).toLocaleString()}</span>
                <span>📧 {selectedMessage.recipient_count} recipients</span>
              </div>
              <div
                style={styles.messageModalBody}
                dangerouslySetInnerHTML={{ __html: selectedMessage.message }}
              />
            </div>
          </div>
        )}

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
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 30px)',
    borderBottom: '3px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  logo: {
    height: '60px',
    width: 'auto',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    padding: '8px'
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1f2937',
    fontWeight: '700'
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#6b7280',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderBottom: '2px solid #e5e7eb',
    padding: '0 clamp(1rem, 3vw, 20px)',
    gap: '1rem',
    marginBottom: '2rem'
  },
  tab: {
    padding: '1rem 2rem',
    background: 'transparent',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s ease'
  },
  activeTab: {
    color: '#1f2937',
    borderBottomColor: '#3b82f6'
  },
  content: {
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 clamp(1rem, 3vw, 20px)'
  },
  formGroup: {
    marginBottom: '2rem'
  },
  label: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.75rem'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s ease'
  },
  quillWrapper: {
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '60px'
  },
  customEmailSection: {
    marginBottom: '1rem'
  },
  customEmailInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    marginBottom: '0.5rem'
  },
  helperText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0.5rem 0 0 0'
  },
  recipientControls: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px'
  },
  selectAllButton: {
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease'
  },
  userList: {
    maxHeight: '400px',
    overflowY: 'auto',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    background: 'white',
    padding: '1rem'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    marginRight: '12px'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937'
  },
  userEmail: {
    fontSize: '13px',
    color: '#6b7280'
  },
  sendButton: {
    width: '100%',
    padding: '16px 32px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.3s ease'
  },
  buttonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  historyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1.5rem'
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  messageCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  messageSubject: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  messageDate: {
    fontSize: '14px',
    color: '#6b7280'
  },
  messageStats: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recipientCount: {
    fontSize: '14px',
    color: '#4b5563',
    fontWeight: '500'
  },
  viewButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease'
  },
  loadingText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '2rem'
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
    fontSize: '1.25rem',
    color: '#9ca3af'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    background: 'white',
    padding: '2.5rem',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    border: '3px solid #d4af37'
  },
  modalIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1rem'
  },
  modalText: {
    fontSize: '16px',
    color: '#4b5563',
    marginBottom: '2rem',
    lineHeight: '1.6'
  },
  modalButton: {
    padding: '12px 32px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease'
  },
  messageModal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  closeButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'transparent',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#6b7280',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  messageModalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1rem',
    paddingRight: '40px'
  },
  messageModalMeta: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e5e7eb',
    flexWrap: 'wrap'
  },
  messageModalBody: {
    fontSize: '16px',
    lineHeight: '1.8',
    color: '#374151'
  }
};
