
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminProtectedRoute from '../../components/AdminProtectedRoute';
import AdminNavDropdown from '../../components/AdminNavDropdown';
import Link from 'next/link';

export default function LoanPayments() {
  return (
    <AdminProtectedRoute>
      <LoanPaymentsContent />
    </AdminProtectedRoute>
  );
}

function LoanPaymentsContent() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/get-loan-payments', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/approve-loan-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ paymentId })
      });

      if (!response.ok) throw new Error('Failed to approve payment');
      setSuccess('Payment approved successfully');
      fetchPayments();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesSearch = !searchTerm || 
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={styles.container}>
      <AdminNavDropdown />
      
      <div style={styles.header}>
        <h1 style={styles.title}>💰 Loan Payments Management</h1>
        <Link href="/admin/admin-loans" style={styles.backButton}>
          ← Back to Loans
        </Link>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search by email or reference..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading payments...</div>
      ) : (
        <div style={styles.paymentsGrid}>
          {filteredPayments.length === 0 ? (
            <div style={styles.noData}>No payments found</div>
          ) : (
            filteredPayments.map(payment => (
              <div key={payment.id} style={styles.paymentCard}>
                <div style={styles.paymentHeader}>
                  <span style={styles.paymentAmount}>
                    ${parseFloat(payment.payment_amount || 0).toFixed(2)}
                  </span>
                  <span style={{
                    ...styles.statusBadge,
                    background: payment.status === 'completed' ? '#d1fae5' :
                               payment.status === 'pending' ? '#fef3c7' : '#fee2e2',
                    color: payment.status === 'completed' ? '#065f46' :
                           payment.status === 'pending' ? '#92400e' : '#991b1b'
                  }}>
                    {payment.status}
                  </span>
                </div>
                <div style={styles.paymentInfo}>
                  <p><strong>User:</strong> {payment.user_email || 'N/A'}</p>
                  <p><strong>Loan:</strong> {payment.loan_type || 'N/A'}</p>
                  <p><strong>Method:</strong> {payment.payment_method || 'N/A'}</p>
                  <p><strong>Reference:</strong> {payment.reference_number || 'N/A'}</p>
                  <p><strong>Date:</strong> {new Date(payment.created_at).toLocaleDateString()}</p>
                </div>
                {payment.status === 'pending' && (
                  <button
                    onClick={() => handleApprove(payment.id)}
                    style={styles.approveButton}
                  >
                    Approve Payment
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937'
  },
  backButton: {
    padding: '10px 20px',
    background: '#6366f1',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  filters: {
    display: 'flex',
    gap: '15px',
    marginBottom: '25px'
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px'
  },
  select: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '180px'
  },
  error: {
    padding: '15px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  success: {
    padding: '15px',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '16px'
  },
  paymentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '16px'
  },
  paymentCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  paymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #e5e7eb'
  },
  paymentAmount: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#059669'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  paymentInfo: {
    marginBottom: '15px'
  },
  approveButton: {
    width: '100%',
    padding: '12px',
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
