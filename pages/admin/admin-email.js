import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminBackButton from '../../components/AdminBackButton';
import { supabase } from '../../lib/supabaseClient';

export default function AdminEmail() {
  const router = useRouter();
  const [bankDetails, setBankDetails] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchBankDetails();
    fetchUsers();
  }, []);

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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name', { ascending: true });

      if (!error) {
        setAllUsers(data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
    setSelectAll(!selectAll);
  };

  const handleUserSelect = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const addCustomEmail = () => {
    const email = customEmail.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (allUsers.find(u => u.email?.toLowerCase() === email)) {
      setErrorMessage('This email is already in the list');
      return;
    }

    const customUser = {
      id: `custom_${Date.now()}`,
      email: email,
      first_name: email.split('@')[0],
      last_name: '(Custom)',
      isCustom: true
    };

    setAllUsers([...allUsers, customUser]);
    setSelectedUsers([...selectedUsers, customUser.id]);
    setCustomEmail('');
    setErrorMessage('');
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setErrorMessage('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      setErrorMessage('Please enter a message');
      return;
    }
    if (selectedUsers.length === 0) {
      setErrorMessage('Please select at least one recipient');
      return;
    }

    setSending(true);
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Please log in again');
        setSending(false);
        return;
      }

      const emails = allUsers
        .filter(u => selectedUsers.includes(u.id))
        .map(u => u.email);

      const response = await fetch('/api/admin/send-admin-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject,
          message,
          emails
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send emails');
      }

      setSuccessMessage(`Successfully sent ${result.sent} email(s)!`);
      setShowSuccessModal(true);
      setSubject('');
      setMessage('');
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = allUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.content}>
          <AdminBackButton />

          <div style={styles.header}>
            {bankDetails?.logo_url && (
              <div style={styles.logoContainer}>
                <img
                  src={bankDetails.logo_url}
                  alt={bankDetails?.name || 'Bank Logo'}
                  style={styles.logo}
                />
              </div>
            )}
            <div style={styles.headerText}>
              <h1 style={styles.title}>
                {bankDetails?.name || 'Oakline Bank'} Email Center
              </h1>
              <p style={styles.subtitle}>
                Send professional emails to customers
              </p>
            </div>
          </div>

          {bankDetails && (
            <div style={styles.contactBar}>
              <div style={styles.contactItem}>
                <span>📞</span>
                <span>{bankDetails.phone}</span>
              </div>
              <div style={styles.contactItem}>
                <span>✉️</span>
                <span>{bankDetails.email_contact}</span>
              </div>
            </div>
          )}

          <div style={styles.gridContainer}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Select Recipients</h3>

              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
              />

              <div style={styles.addEmailRow}>
                <input
                  type="email"
                  placeholder="Add custom email..."
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomEmail()}
                  style={styles.addEmailInput}
                />
                <button onClick={addCustomEmail} style={styles.addButton}>
                  Add
                </button>
              </div>

              <div style={styles.selectAllRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    style={styles.checkbox}
                  />
                  <span>Select All ({filteredUsers.length})</span>
                </label>
                <span style={styles.selectedBadge}>
                  {selectedUsers.length} selected
                </span>
              </div>

              <div style={styles.userList}>
                {loading ? (
                  <div style={styles.loadingState}>
                    <div style={styles.spinner}></div>
                    <p>Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div style={styles.emptyState}>No users found</div>
                ) : (
                  filteredUsers.map(user => (
                    <label
                      key={user.id}
                      style={{
                        ...styles.userItem,
                        backgroundColor: selectedUsers.includes(user.id) ? '#eff6ff' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        style={styles.checkbox}
                      />
                      <div style={styles.userInfo}>
                        <div style={styles.userName}>
                          {user.first_name} {user.last_name}
                          {user.isCustom && <span style={styles.customBadge}>Custom</span>}
                        </div>
                        <div style={styles.userEmail}>{user.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Compose Email</h3>

              {errorMessage && (
                <div style={styles.errorBanner}>
                  {errorMessage}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={8}
                  style={styles.textarea}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || selectedUsers.length === 0}
                style={{
                  ...styles.sendButton,
                  backgroundColor: sending || selectedUsers.length === 0 ? '#94a3b8' : '#1e40af',
                  cursor: sending || selectedUsers.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {sending ? (
                  <>
                    <span style={styles.buttonSpinner}></span>
                    Sending...
                  </>
                ) : (
                  `Send Email to ${selectedUsers.length} recipient${selectedUsers.length !== 1 ? 's' : ''}`
                )}
              </button>

              <div style={styles.previewInfo}>
                <h4 style={styles.previewTitle}>Email Preview Info</h4>
                <p style={styles.previewText}>
                  Emails will include the bank logo, subject, your message, and contact information (phone, email).
                </p>
              </div>
            </div>
          </div>

          <AdminFooter />
        </div>

        {sending && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingModal}>
              <div style={styles.spinnerLarge}></div>
              <p style={styles.loadingText}>Sending emails...</p>
              <p style={styles.loadingSubtext}>Please wait while we send your message</p>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div style={styles.successOverlay}>
            <div style={styles.successModal}>
              <div style={styles.successHeader}>
                <span style={styles.successLogo}>Notification</span>
                <button onClick={() => setShowSuccessModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.successContent}>
                <p style={styles.successTitle}>Success!</p>
                <p style={styles.successText}>{successMessage}</p>
              </div>
              <div style={styles.successFooter}>
                <span style={styles.successCheckmark}>✓ Email sent successfully</span>
                <button onClick={() => setShowSuccessModal(false)} style={styles.okButton}>OK</button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px'
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  logoContainer: {
    backgroundColor: '#ffffff',
    padding: '10px',
    borderRadius: '10px',
    flexShrink: 0
  },
  logo: {
    height: '40px',
    width: 'auto'
  },
  headerText: {
    flex: 1,
    minWidth: '200px'
  },
  title: {
    color: '#ffffff',
    margin: '0 0 4px 0',
    fontSize: '20px',
    fontWeight: '700'
  },
  subtitle: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '13px'
  },
  contactBar: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px'
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#475569',
    fontSize: '12px'
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    margin: '0 0 12px 0',
    color: '#1e293b',
    fontSize: '16px',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginBottom: '12px'
  },
  addEmailRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  addEmailInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    minWidth: 0
  },
  addButton: {
    padding: '10px 14px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  selectAllRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '8px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    color: '#374151',
    fontSize: '14px'
  },
  checkbox: {
    width: '16px',
    height: '16px'
  },
  selectedBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  userList: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px'
  },
  loadingState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 12px'
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    gap: '10px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9'
  },
  userInfo: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    fontWeight: '500',
    color: '#1e293b',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap'
  },
  userEmail: {
    color: '#64748b',
    fontSize: '11px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  customBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: '600'
  },
  formGroup: {
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#374151',
    fontSize: '13px'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  errorBanner: {
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '13px'
  },
  sendButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  previewInfo: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  previewTitle: {
    margin: '0 0 6px 0',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '600'
  },
  previewText: {
    margin: 0,
    color: '#64748b',
    fontSize: '11px',
    lineHeight: '1.5'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)'
  },
  loadingModal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px 40px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  spinnerLarge: {
    width: '48px',
    height: '48px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  loadingText: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b'
  },
  loadingSubtext: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b'
  },
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.3s ease-out',
    padding: '20px'
  },
  successModal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '400px',
    overflow: 'hidden',
    animation: 'slideIn 0.3s ease-out'
  },
  successHeader: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successLogo: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1px',
    textTransform: 'uppercase'
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: '#ffffff',
    fontSize: '20px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0
  },
  successContent: {
    padding: '24px 20px'
  },
  successTitle: {
    margin: '0 0 12px 0',
    fontSize: '22px',
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center'
  },
  successText: {
    margin: 0,
    fontSize: '15px',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: '1.5'
  },
  successFooter: {
    backgroundColor: '#f0fdf4',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  successCheckmark: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#059669',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  okButton: {
    padding: '8px 20px',
    background: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
