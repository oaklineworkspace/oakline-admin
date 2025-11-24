
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function VerificationsPage() {
  const router = useRouter();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Stats
  const [stats, setStats] = useState({
    totalPending: 0,
    totalSubmitted: 0,
    approvedToday: 0,
    rejectedToday: 0
  });

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter, typeFilter, searchEmail, dateRange]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/admin/verifications/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          statusFilter,
          typeFilter,
          searchEmail,
          dateRange
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verifications');
      }

      const result = await response.json();
      setVerifications(result.verifications || []);
      setStats(result.stats || stats);
    } catch (err) {
      console.error('Error fetching verifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVerification = (verificationId) => {
    router.push(`/admin/verifications/${verificationId}`);
  };

  const filteredVerifications = verifications;
  const totalPages = Math.ceil(filteredVerifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVerifications = filteredVerifications.slice(startIndex, startIndex + itemsPerPage);

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🛡️ Identity Verifications</h1>
            <p style={styles.subtitle}>Manage selfie and video verification requests</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchVerifications} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/verifications/analytics" style={styles.analyticsButton}>
              📊 Analytics
            </Link>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={() => setError('')} style={styles.closeButton}>✕</button>
          </div>
        )}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending Review</h3>
            <p style={styles.statValue}>{stats.totalPending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
            <h3 style={styles.statLabel}>Submitted</h3>
            <p style={styles.statValue}>{stats.totalSubmitted}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Approved Today</h3>
            <p style={styles.statValue}>{stats.approvedToday}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
            <h3 style={styles.statLabel}>Rejected Today</h3>
            <p style={styles.statValue}>{stats.rejectedToday}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={styles.searchInput}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Types</option>
            <option value="selfie">Selfie</option>
            <option value="video">Video</option>
            <option value="liveness">Liveness</option>
          </select>
        </div>

        {/* Verifications Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading verifications...</p>
            </div>
          ) : paginatedVerifications.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>🔍</p>
              <p style={styles.emptyText}>No verifications found</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.th}>Expires</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVerifications.map((verification) => (
                  <tr key={verification.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div>
                        <div style={styles.userEmail}>{verification.email}</div>
                        <div style={styles.userId}>ID: {verification.user_id?.substring(0, 8)}...</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={getTypeBadge(verification.verification_type)}>
                        {verification.verification_type}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={getStatusBadge(verification.status)}>
                        {verification.status}
                      </span>
                    </td>
                    <td style={styles.td}>{verification.reason}</td>
                    <td style={styles.td}>{formatDate(verification.submitted_at)}</td>
                    <td style={styles.td}>{formatDate(verification.expires_at)}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleViewVerification(verification.id)}
                        style={styles.viewButton}
                      >
                        👁️ Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              ← Previous
            </button>
            <span style={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={styles.paginationButton}
            >
              Next →
            </button>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const getStatusBadge = (status) => {
  const styles = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    submitted: { bg: '#dbeafe', color: '#1e40af' },
    under_review: { bg: '#e0f2fe', color: '#075985' },
    approved: { bg: '#d1fae5', color: '#065f46' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
    expired: { bg: '#f3f4f6', color: '#6b7280' }
  };
  const style = styles[status] || styles.pending;
  return {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: style.bg,
    color: style.color,
    textTransform: 'uppercase'
  };
};

const getTypeBadge = (type) => {
  return {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    textTransform: 'capitalize'
  };
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: '14px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  analyticsButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: '28px',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  filtersSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '150px'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  tr: {
    borderBottom: '1px solid #f7fafc'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#2d3748'
  },
  userEmail: {
    fontWeight: '600',
    color: '#1A3E6F'
  },
  userId: {
    fontSize: '12px',
    color: '#718096'
  },
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '18px',
    color: '#718096',
    fontWeight: '600'
  },
  pagination: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#2d3748'
  }
};
