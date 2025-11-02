
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function AdminMessages() {
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchThreads();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('chat_threads_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_threads'
      }, () => {
        fetchThreads();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterThreads();
  }, [threads, searchTerm, statusFilter]);

  const fetchThreads = async () => {
    try {
      // Fetch threads first
      const { data: threadsData, error: threadsError } = await supabase
        .from('chat_threads')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (threadsError) throw threadsError;

      if (!threadsData || threadsData.length === 0) {
        setThreads([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(threadsData.map(t => t.user_id).filter(Boolean))];
      const adminIds = [...new Set(threadsData.map(t => t.admin_id).filter(Boolean))];

      // Fetch profiles for users
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      // Fetch admin profiles
      const { data: adminProfiles } = await supabase
        .from('admin_profiles')
        .select('id, email')
        .in('id', adminIds);

      // Create lookup maps
      const userMap = (userProfiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const adminMap = (adminProfiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      // Combine the data
      const combinedData = threadsData.map(thread => ({
        ...thread,
        profiles: userMap[thread.user_id] || null,
        user: userMap[thread.user_id] ? { id: thread.user_id, email: userMap[thread.user_id].email } : null,
        admin: adminMap[thread.admin_id] ? { id: thread.admin_id, email: adminMap[thread.admin_id].email } : null
      }));

      setThreads(combinedData);
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterThreads = () => {
    let filtered = threads;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(t => {
        const userName = `${t.profiles?.first_name || ''} ${t.profiles?.last_name || ''}`.toLowerCase();
        const email = t.user?.email?.toLowerCase() || '';
        const subject = t.subject?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        
        return userName.includes(search) || email.includes(search) || subject.includes(search);
      });
    }

    setFilteredThreads(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return '💬';
      case 'pending': return '⏳';
      case 'resolved': return '✅';
      case 'closed': return '🔒';
      default: return '📝';
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💬 User Messages</h1>
          <Link href="/admin" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        <div style={styles.controls}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by user, email, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.statusFilter}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{threads.filter(t => t.status === 'open').length}</div>
            <div style={styles.statLabel}>Open</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{threads.filter(t => t.status === 'pending').length}</div>
            <div style={styles.statLabel}>Pending</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{threads.filter(t => t.status === 'resolved').length}</div>
            <div style={styles.statLabel}>Resolved</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{threads.length}</div>
            <div style={styles.statLabel}>Total</div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading messages...</div>
        ) : filteredThreads.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <div style={styles.emptyText}>No messages found</div>
          </div>
        ) : (
          <div style={styles.threadList}>
            {filteredThreads.map(thread => (
              <div
                key={thread.id}
                style={styles.threadCard}
                onClick={() => router.push(`/admin/messages/${thread.id}`)}
              >
                <div style={styles.threadHeader}>
                  <div style={styles.threadUser}>
                    <span style={styles.userAvatar}>
                      {(thread.profiles?.first_name?.[0] || thread.user?.email?.[0] || '?').toUpperCase()}
                    </span>
                    <div>
                      <div style={styles.userName}>
                        {thread.profiles?.first_name} {thread.profiles?.last_name}
                      </div>
                      <div style={styles.userEmail}>{thread.user?.email}</div>
                    </div>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(thread.status) + '20',
                    color: getStatusColor(thread.status)
                  }}>
                    {getStatusIcon(thread.status)} {thread.status}
                  </div>
                </div>

                <div style={styles.threadSubject}>{thread.subject || 'No subject'}</div>
                
                {thread.last_message && (
                  <div style={styles.lastMessage}>{thread.last_message}</div>
                )}

                <div style={styles.threadFooter}>
                  <span style={styles.timestamp}>
                    🕒 {new Date(thread.last_message_at).toLocaleString()}
                  </span>
                  {thread.admin?.email && (
                    <span style={styles.assignedTo}>
                      👤 {thread.admin.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0,
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
  controls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: '250px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 20px 12px 48px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
  },
  statusFilter: {
    padding: '12px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    background: 'white',
    minWidth: '150px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#6b7280',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#9ca3af',
  },
  threadList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  threadCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
  },
  threadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  threadUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: '13px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  threadSubject: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px',
  },
  lastMessage: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  threadFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
    fontSize: '13px',
    color: '#6b7280',
    gap: '12px',
    flexWrap: 'wrap',
  },
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  assignedTo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: '500',
  },
};
