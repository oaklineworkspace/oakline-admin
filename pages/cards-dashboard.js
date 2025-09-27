
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function AdminCardsDashboard() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchCardsData();
  }, []);

  const fetchCardsData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all cards with profile and account information
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select(`
          *,
          profiles!inner(
            full_name,
            email
          ),
          accounts!inner(
            account_number,
            account_type,
            balance
          )
        `)
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('Error fetching cards:', cardsError);
        throw new Error(`Failed to fetch cards: ${cardsError.message}`);
      }

      setCards(cardsData || []);

      // Fetch all card applications
      const { data: appsData, error: appsError } = await supabase
        .from('card_applications')
        .select(`
          *,
          profiles!inner(
            full_name,
            email
          ),
          accounts!inner(
            account_number,
            account_type,
            balance
          )
        `)
        .order('created_at', { ascending: false });

      if (appsError) {
        console.error('Error fetching applications:', appsError);
        throw new Error(`Failed to fetch applications: ${appsError.message}`);
      }

      setApplications(appsData || []);

    } catch (error) {
      console.error('Error in fetchCardsData:', error);
      setError(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCardAction = async (cardId, action) => {
    try {
      let updateData = {};
      
      switch (action) {
        case 'activate':
          updateData = { status: 'active' };
          break;
        case 'deactivate':
          updateData = { status: 'inactive' };
          break;
        case 'lock':
          updateData = { is_locked: true };
          break;
        case 'unlock':
          updateData = { is_locked: false };
          break;
        default:
          return;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', cardId);

      if (error) {
        console.error('Error updating card:', error);
        throw new Error(`Failed to update card: ${error.message}`);
      }

      // Create audit log
      const card = cards.find(c => c.id === cardId);
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: user?.id,
          action: `card_${action}`,
          target_type: 'card',
          target_id: cardId,
          details: {
            card_number: card?.card_number,
            cardholder_name: card?.cardholder_name,
            action: action
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        console.warn('Audit log error:', auditError);
      }

      await fetchCardsData(); // Refresh data
      setError('');
    } catch (error) {
      console.error('Error in handleCardAction:', error);
      setError(`Failed to ${action} card: ${error.message}`);
    }
  };

  const handleApplicationAction = async (appId, action) => {
    try {
      if (action === 'approve') {
        const application = applications.find(app => app.id === appId);
        
        // Generate card details
        const cardNumber = generateCardNumber();
        const cvv = generateCVV();
        const expiryDate = generateExpiryDate();

        // Create card
        const { error: cardError } = await supabase
          .from('cards')
          .insert({
            user_id: application.user_id,
            account_id: application.account_id,
            card_number: cardNumber,
            cvv: cvv,
            expiry_date: expiryDate,
            cardholder_name: application.cardholder_name,
            card_type: application.card_type || 'debit',
            status: 'active',
            is_locked: false,
            daily_limit: 1000.00,
            monthly_limit: 10000.00,
            daily_spent: 0.00,
            monthly_spent: 0.00,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (cardError) throw cardError;

        // Update application
        const { error: updateError } = await supabase
          .from('card_applications')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', appId);

        if (updateError) throw updateError;

      } else if (action === 'reject') {
        const { error } = await supabase
          .from('card_applications')
          .update({ 
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', appId);

        if (error) throw error;
      }

      await fetchCardsData(); // Refresh data
      setError('');
    } catch (error) {
      console.error('Error in handleApplicationAction:', error);
      setError(`Failed to ${action} application: ${error.message}`);
    }
  };

  // Helper functions for card generation
  const generateCardNumber = () => {
    const prefix = '4532';
    const remaining = Array.from({length: 12}, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}${remaining}`;
  };

  const generateCVV = () => {
    return Array.from({length: 3}, () => Math.floor(Math.random() * 10)).join('');
  };

  const generateExpiryDate = () => {
    const currentDate = new Date();
    const expiryYear = currentDate.getFullYear() + 4;
    const expiryMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${expiryMonth}/${expiryYear}`;
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.card_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.cardholder_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || card.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.cardholder_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading cards data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>💳 Cards Management Dashboard</h1>
          <p style={styles.subtitle}>Manage debit cards and applications</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')}
          style={styles.backButton}
        >
          ← Back to Admin Dashboard
        </button>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {/* Search and Filter Controls */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by card number or cardholder name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Statistics */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <h3>Total Cards</h3>
          <p style={styles.statNumber}>{cards.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Active Cards</h3>
          <p style={styles.statNumber}>{cards.filter(c => c.status === 'active').length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Pending Applications</h3>
          <p style={styles.statNumber}>{applications.filter(a => a.status === 'pending').length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Locked Cards</h3>
          <p style={styles.statNumber}>{cards.filter(c => c.is_locked).length}</p>
        </div>
      </div>

      {/* Pending Applications */}
      {filteredApplications.filter(app => app.status === 'pending').length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Pending Card Applications</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cardholder Name</th>
                  <th>Card Type</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.filter(app => app.status === 'pending').map((app) => (
                  <tr key={app.id}>
                    <td>{app.id.slice(0, 8)}...</td>
                    <td>{app.cardholder_name}</td>
                    <td>{app.card_type}</td>
                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                    <td>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: '#fbbf24'
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleApplicationAction(app.id, 'approve')}
                          style={styles.approveButton}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleApplicationAction(app.id, 'reject')}
                          style={styles.rejectButton}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>💳 All Cards</h2>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Card Number</th>
                <th>Cardholder</th>
                <th>Account Type</th>
                <th>Status</th>
                <th>Daily Limit</th>
                <th>Monthly Limit</th>
                <th>Locked</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id}>
                  <td>****-****-****-{card.card_number.slice(-4)}</td>
                  <td>{card.cardholder_name}</td>
                  <td>{card.accounts?.account_type}</td>
                  <td>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: card.status === 'active' ? '#10b981' : '#ef4444'
                    }}>
                      {card.status}
                    </span>
                  </td>
                  <td>${parseFloat(card.daily_limit || 0).toFixed(2)}</td>
                  <td>${parseFloat(card.monthly_limit || 0).toFixed(2)}</td>
                  <td>{card.is_locked ? '🔒' : '🔓'}</td>
                  <td>{new Date(card.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={styles.actionButtons}>
                      {card.status === 'active' ? (
                        <button
                          onClick={() => handleCardAction(card.id, 'deactivate')}
                          style={styles.deactivateButton}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCardAction(card.id, 'activate')}
                          style={styles.activateButton}
                        >
                          Activate
                        </button>
                      )}
                      
                      {card.is_locked ? (
                        <button
                          onClick={() => handleCardAction(card.id, 'unlock')}
                          style={styles.unlockButton}
                        >
                          🔓 Unlock
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCardAction(card.id, 'lock')}
                          style={styles.lockButton}
                        >
                          🔒 Lock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CardsDashboardPage() {
  return (
    <AdminRoute>
      <AdminCardsDashboard />
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#555',
    margin: 0
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  errorMessage: {
    color: '#dc3545',
    background: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  controls: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    minWidth: '250px'
  },
  filterSelect: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    minWidth: '150px',
    backgroundColor: 'white'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '10px 0 0 0'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '15px'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  approveButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  rejectButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  activateButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  deactivateButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  lockButton: {
    background: '#ffc107',
    color: 'black',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  unlockButton: {
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  }
};
