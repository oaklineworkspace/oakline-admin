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
    setSuccessMessage('');

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
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <AdminBackButton />

          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
            borderRadius: '16px',
            padding: '30px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            {bankDetails?.logo_url && (
              <div style={{
                backgroundColor: '#ffffff',
                padding: '12px',
                borderRadius: '12px'
              }}>
                <img
                  src={bankDetails.logo_url}
                  alt={bankDetails?.name || 'Bank Logo'}
                  style={{ height: '50px', width: 'auto' }}
                />
              </div>
            )}
            <div>
              <h1 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
                {bankDetails?.name || 'Oakline Bank'} Email Center
              </h1>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
                Send professional emails to customers with bank branding
              </p>
            </div>
          </div>

          {bankDetails && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <span style={{ color: '#475569', fontSize: '13px' }}>{bankDetails.address}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📞</span>
                <span style={{ color: '#475569', fontSize: '13px' }}>{bankDetails.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✉️</span>
                <span style={{ color: '#475569', fontSize: '13px' }}>{bankDetails.email_contact}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
                Select Recipients
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="email"
                  placeholder="Add custom email..."
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomEmail()}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={addCustomEmail}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Add
                </button>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                padding: '8px 0',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: '500', color: '#374151' }}>Select All ({filteredUsers.length})</span>
                </label>
                <span style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {selectedUsers.length} selected
                </span>
              </div>

              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No users found
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <label
                      key={user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        gap: '10px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: selectedUsers.includes(user.id) ? '#eff6ff' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px' }}>
                          {user.first_name} {user.last_name}
                          {user.isCustom && (
                            <span style={{
                              marginLeft: '8px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px'
                            }}>
                              Custom
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>{user.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
                Compose Email
              </h3>

              {successMessage && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  ✅ {successMessage}
                </div>
              )}

              {errorMessage && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  ❌ {errorMessage}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || selectedUsers.length === 0}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: sending || selectedUsers.length === 0 ? '#94a3b8' : '#1e40af',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: sending || selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {sending ? (
                  <>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Sending...
                  </>
                ) : (
                  <>
                    📧 Send Email to {selectedUsers.length} recipient{selectedUsers.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>

              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '13px', fontWeight: '600' }}>
                  Email Preview Info
                </h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12px', lineHeight: '1.6' }}>
                  Emails will include the bank logo, subject, your message, and contact information 
                  ({bankDetails?.address || 'Bank Address'}, {bankDetails?.phone || 'Phone'}).
                </p>
              </div>
            </div>
          </div>

          <AdminFooter />
        </div>

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </AdminAuth>
  );
}
