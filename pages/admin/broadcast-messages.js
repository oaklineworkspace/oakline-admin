import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function BroadcastMessages() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }
    if (!recipients.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    setSending(true);
    setError('');
    setSuccess(false);

    try {
      // Parse email addresses
      const emailList = recipients
        .split(/[,;\n]/)
        .map(email => email.trim())
        .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

      if (emailList.length === 0) {
        setError('No valid email addresses found');
        setSending(false);
        return;
      }

      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please refresh and try again.');
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
          emails: emailList
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send messages');
      }

      setSuccess(true);
      setSubject('');
      setMessage('');
      setRecipients('');

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error sending broadcast:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📧 Broadcast Messages</h1>
          <p style={styles.subtitle}>Send emails to any Gmail addresses</p>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.errorBox}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              <strong>Success!</strong> Messages sent successfully
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              style={styles.textarea}
              rows={10}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Recipients (one email per line, or separated by commas)
            </label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="example1@gmail.com&#10;example2@gmail.com&#10;example3@gmail.com"
              style={styles.textarea}
              rows={8}
            />
            <p style={styles.helperText}>
              Enter Gmail addresses separated by new lines or commas
            </p>
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              ...styles.sendButton,
              ...(sending ? styles.buttonDisabled : {})
            }}
          >
            {sending ? '📤 Sending...' : '📨 Send Messages'}
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
    background: 'white',
    padding: '30px',
    borderBottom: '3px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    color: '#1f2937',
    fontWeight: '700'
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#6b7280',
    fontSize: '14px'
  },
  content: {
    maxWidth: '800px',
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
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  helperText: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px'
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
  }
};