
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../../components/AdminAuth';
import AdminFooter from '../../../components/AdminFooter';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminChatThread() {
  const router = useRouter();
  const { threadId } = router.query;
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (threadId) {
      fetchThread();
      fetchMessages();
      getCurrentAdmin();

      // Subscribe to real-time message updates
      const subscription = supabase
        .channel(`chat_messages_${threadId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`
        }, (payload) => {
          fetchMessages();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setAdminUser(user);
  };

  const fetchThread = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select(`
          *,
          user:user_id(id, email),
          admin:admin_id(id, email),
          profiles!chat_threads_user_id_fkey(first_name, last_name, email)
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;
      setThread(data);
    } catch (error) {
      console.error('Error fetching thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:sender_id(id, email)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Insert message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          message: newMessage.trim()
        });

      if (messageError) throw messageError;

      // Update thread
      await supabase
        .from('chat_threads')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString(),
          admin_id: user.id,
          status: 'pending'
        })
        .eq('id', threadId);

      setNewMessage('');
      fetchMessages();
      fetchThread();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', threadId);

      if (error) throw error;
      fetchThread();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.loading}>Loading conversation...</div>
      </AdminAuth>
    );
  }

  if (!thread) {
    return (
      <AdminAuth>
        <div style={styles.error}>Thread not found</div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Link href="/admin/messages" style={styles.backButton}>
              ← Back to Messages
            </Link>
            <div style={styles.threadInfo}>
              <div style={styles.userName}>
                {thread.profiles?.first_name} {thread.profiles?.last_name}
              </div>
              <div style={styles.userEmail}>{thread.user?.email}</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <select
              value={thread.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={styles.statusSelect}
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {thread.subject && (
          <div style={styles.subjectCard}>
            <strong>Subject:</strong> {thread.subject}
          </div>
        )}

        <div style={styles.chatContainer}>
          <div style={styles.messagesWrapper}>
            {messages.map((msg, index) => {
              const isAdmin = msg.sender_id !== thread.user_id;
              return (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageRow,
                    justifyContent: isAdmin ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(isAdmin ? styles.adminBubble : styles.userBubble)
                    }}
                  >
                    <div style={styles.messageSender}>
                      {isAdmin ? 'Admin' : `${thread.profiles?.first_name || 'User'}`}
                    </div>
                    <div style={styles.messageText}>{msg.message}</div>
                    <div style={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleString()}
                      {msg.is_read && isAdmin && ' ✓✓'}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={styles.inputForm}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              style={styles.messageInput}
              rows={3}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              style={{
                ...styles.sendButton,
                ...((!newMessage.trim() || sending) && styles.sendButtonDisabled)
              }}
            >
              {sending ? '⏳ Sending...' : '📤 Send'}
            </button>
          </form>
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
    paddingBottom: '80px',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#6b7280',
  },
  error: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#dc2626',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    gap: '16px',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  },
  threadInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: '14px',
    color: '#6b7280',
  },
  statusSelect: {
    padding: '10px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'white',
    cursor: 'pointer',
  },
  subjectCard: {
    background: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    fontSize: '15px',
    color: '#1e40af',
  },
  chatContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    height: 'calc(100vh - 300px)',
    display: 'flex',
    flexDirection: 'column',
  },
  messagesWrapper: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  messageRow: {
    display: 'flex',
    marginBottom: '8px',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  adminBubble: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  userBubble: {
    background: '#f3f4f6',
    color: '#1f2937',
    borderBottomLeftRadius: '4px',
  },
  messageSender: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '4px',
    opacity: 0.8,
  },
  messageText: {
    fontSize: '15px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  messageTime: {
    fontSize: '11px',
    marginTop: '6px',
    opacity: 0.7,
  },
  inputForm: {
    padding: '20px',
    borderTop: '2px solid #f3f4f6',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageInput: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
};
