import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminButton from '../../components/AdminButton';
import AdminBackButton from '../../components/AdminBackButton';

export default function ManageCards() {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Issue card form
  const [issueForm, setIssueForm] = useState({
    userId: '',
    accountId: '',
    cardholderName: '',
    cardBrand: 'visa',
    cardCategory: 'debit',
    dailyLimit: '1000.00',
    monthlyLimit: '10000.00'
  });

  // Edit card form
  const [editForm, setEditForm] = useState({
    dailyLimit: '',
    monthlyLimit: '',
    status: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cardsRes, usersRes] = await Promise.all([
        fetch('/api/admin/get-user-cards'),
        fetch('/api/admin/get-users')
      ]);

      const cardsData = await cardsRes.json();
      const usersData = await usersRes.json();

      if (cardsData.success) setCards(cardsData.cards || []);
      if (usersData.success) setUsers(usersData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('❌ Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccounts = async (userId) => {
    try {
      const response = await fetch(`/api/admin/get-accounts?userId=${userId}`);
      const data = await response.json();
      if (data.accounts) {
        setAccounts(data.accounts.filter(acc => acc.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleUserChange = (userId) => {
    setIssueForm(prev => ({ ...prev, userId, accountId: '' }));
    setAccounts([]);
    if (userId) {
      fetchUserAccounts(userId);
      const user = users.find(u => u.id === userId);
      if (user && user.profiles) {
        setIssueForm(prev => ({
          ...prev,
          cardholderName: `${user.profiles.first_name || ''} ${user.profiles.last_name || ''}`.trim()
        }));
      }
    }
  };

  const generateCardNumber = (brand) => {
    const prefixes = {
      visa: '4',
      mastercard: '5',
      amex: '3'
    };
    const prefix = prefixes[brand] || '4';
    let cardNumber = prefix;
    for (let i = 1; i < 16; i++) {
      cardNumber += Math.floor(Math.random() * 10);
    }
    return cardNumber.match(/.{1,4}/g).join('-');
  };

  const generateCVC = () => {
    return Math.floor(100 + Math.random() * 900).toString();
  };

  const generateExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 3);
    return date.toISOString().split('T')[0];
  };

  const handleIssueCard = async (e) => {
    e.preventDefault();
    if (!issueForm.userId || !issueForm.accountId) {
      setMessage('❌ Please select user and account');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/issue-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: issueForm.userId,
          accountId: issueForm.accountId,
          cardholderName: issueForm.cardholderName,
          cardNumber: generateCardNumber(issueForm.cardBrand),
          cardBrand: issueForm.cardBrand,
          cardCategory: issueForm.cardCategory,
          cardType: issueForm.cardCategory,
          cvc: generateCVC(),
          expiryDate: generateExpiryDate(),
          dailyLimit: parseFloat(issueForm.dailyLimit),
          monthlyLimit: parseFloat(issueForm.monthlyLimit)
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message || 'Card issued successfully'}`);
        setShowIssueModal(false);
        setIssueForm({
          userId: '',
          accountId: '',
          cardholderName: '',
          cardBrand: 'visa',
          cardCategory: 'debit',
          dailyLimit: '1000.00',
          monthlyLimit: '10000.00'
        });
        await fetchData();
      } else {
        setMessage(`❌ ${result.error || 'Failed to issue card'}`);
      }
    } catch (error) {
      console.error('Error issuing card:', error);
      setMessage('❌ Failed to issue card');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardAction = async (cardId, action) => {
    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/update-card-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, action })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Card ${action} successfully`);
        await fetchData();
      } else {
        setMessage(`❌ ${result.error || `Failed to ${action} card`}`);
      }
    } catch (error) {
      console.error(`Error ${action} card:`, error);
      setMessage(`❌ Failed to ${action} card`);
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (card) => {
    setSelectedCard(card);
    setEditForm({
      dailyLimit: card.daily_limit,
      monthlyLimit: card.monthly_limit,
      status: card.status
    });
    setShowEditModal(true);
  };

  const handleUpdateCard = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/update-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: selectedCard.id,
          dailyLimit: parseFloat(editForm.dailyLimit),
          monthlyLimit: parseFloat(editForm.monthlyLimit),
          status: editForm.status
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('✅ Card updated successfully');
        setShowEditModal(false);
        await fetchData();
      } else {
        setMessage(`❌ ${result.error || 'Failed to update card'}`);
      }
    } catch (error) {
      console.error('Error updating card:', error);
      setMessage('❌ Failed to update card');
    } finally {
      setProcessing(false);
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesStatus = filterStatus === 'all' || card.status === filterStatus;
    const matchesSearch = card.card_number?.includes(searchTerm) || 
                         card.cardholder_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading cards...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AdminBackButton />
            <div>
              <h1 style={styles.title}>💳 Card Management</h1>
              <p style={styles.subtitle}>Issue, edit, and manage all debit cards</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => setShowIssueModal(true)} style={styles.issueButton}>
              ➕ Issue New Card
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            ...styles.alert,
            backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
            color: message.includes('✅') ? '#059669' : '#dc2626'
          }}>
            {message}
          </div>
        )}

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
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
            <option value="inactive">Closed</option>
          </select>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <h3>Total Cards</h3>
            <p style={styles.statNumber}>{cards.length}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Active</h3>
            <p style={styles.statNumber}>{cards.filter(c => c.status === 'active').length}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Blocked</h3>
            <p style={styles.statNumber}>{cards.filter(c => c.status === 'blocked').length}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Suspended</h3>
            <p style={styles.statNumber}>{cards.filter(c => c.status === 'suspended').length}</p>
          </div>
        </div>

        <div style={styles.cardsGrid}>
          {filteredCards.map(card => (
            <div key={card.id} style={styles.cardItem}>
              <div style={styles.cardHeader}>
                <div style={styles.cardNumber}>
                  {card.card_number || '****-****-****-****'}
                </div>
                <div style={{
                  ...styles.statusBadge,
                  backgroundColor: 
                    card.status === 'active' ? '#10b981' :
                    card.status === 'blocked' ? '#ef4444' :
                    card.status === 'suspended' ? '#f59e0b' :
                    '#6b7280'
                }}>
                  {card.status?.toUpperCase()}
                </div>
              </div>

              <div style={styles.cardDetails}>
                <p><strong>Cardholder:</strong> {card.cardholder_name || 'N/A'}</p>
                <p><strong>Type:</strong> {card.card_brand?.toUpperCase()} {card.card_category?.toUpperCase()}</p>
                <p><strong>Daily Limit:</strong> ${parseFloat(card.daily_limit || 0).toFixed(2)}</p>
                <p><strong>Monthly Limit:</strong> ${parseFloat(card.monthly_limit || 0).toFixed(2)}</p>
                <p><strong>Expires:</strong> {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Locked:</strong> {card.is_locked ? '🔒 Yes' : '🔓 No'}</p>
              </div>

              <div style={styles.cardActions}>
                <button
                  onClick={() => openEditModal(card)}
                  style={styles.editButton}
                  disabled={processing}
                >
                  ✏️ Edit
                </button>

                {card.status === 'active' && (
                  <>
                    <button
                      onClick={() => handleCardAction(card.id, 'block')}
                      style={styles.blockButton}
                      disabled={processing}
                    >
                      🚫 Block
                    </button>
                    <button
                      onClick={() => handleCardAction(card.id, 'suspend')}
                      style={styles.suspendButton}
                      disabled={processing}
                    >
                      ⏸️ Suspend
                    </button>
                  </>
                )}

                {card.status === 'blocked' && (
                  <button
                    onClick={() => handleCardAction(card.id, 'unblock')}
                    style={styles.unblockButton}
                    disabled={processing}
                  >
                    ✅ Unblock
                  </button>
                )}

                {card.status === 'suspended' && (
                  <button
                    onClick={() => handleCardAction(card.id, 'activate')}
                    style={styles.activateButton}
                    disabled={processing}
                  >
                    ▶️ Activate
                  </button>
                )}

                {card.status !== 'inactive' && (
                  <button
                    onClick={() => handleCardAction(card.id, 'close')}
                    style={styles.closeButton}
                    disabled={processing}
                  >
                    ❌ Close
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredCards.length === 0 && (
            <div style={styles.emptyState}>No cards found</div>
          )}
        </div>

        {/* Issue Card Modal */}
        {showIssueModal && (
          <div style={styles.modalOverlay} onClick={() => setShowIssueModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Issue New Card</h2>
              <form onSubmit={handleIssueCard} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>Select User *</label>
                  <select
                    value={issueForm.userId}
                    onChange={(e) => handleUserChange(e.target.value)}
                    required
                    style={styles.select}
                  >
                    <option value="">Choose a user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.profiles?.first_name} {user.profiles?.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {accounts.length > 0 && (
                  <div style={styles.field}>
                    <label style={styles.label}>Select Account *</label>
                    <select
                      value={issueForm.accountId}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, accountId: e.target.value }))}
                      required
                      style={styles.select}
                    >
                      <option value="">Choose an account...</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_number} - {account.account_type.toUpperCase()} - ${parseFloat(account.balance).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.field}>
                  <label style={styles.label}>Cardholder Name *</label>
                  <input
                    type="text"
                    value={issueForm.cardholderName}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, cardholderName: e.target.value }))}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.row}>
                  <div style={styles.field}>
                    <label style={styles.label}>Card Brand *</label>
                    <select
                      value={issueForm.cardBrand}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, cardBrand: e.target.value }))}
                      style={styles.select}
                    >
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">American Express</option>
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Card Category *</label>
                    <select
                      value={issueForm.cardCategory}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, cardCategory: e.target.value }))}
                      style={styles.select}
                    >
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={styles.field}>
                    <label style={styles.label}>Daily Limit ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={issueForm.dailyLimit}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, dailyLimit: e.target.value }))}
                      required
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Monthly Limit ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={issueForm.monthlyLimit}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                      required
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <AdminButton 
                    type="submit" 
                    disabled={processing || !issueForm.userId || !issueForm.accountId}
                    loading={processing}
                    variant="primary"
                    fullWidth={false}
                  >
                    {processing ? 'Issuing Card...' : '💳 Issue Card'}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    variant="secondary"
                    fullWidth={false}
                  >
                    Cancel
                  </AdminButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Card Modal */}
        {showEditModal && selectedCard && (
          <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Edit Card</h2>
              <form onSubmit={handleUpdateCard} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>Daily Limit ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.dailyLimit}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dailyLimit: e.target.value }))}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Monthly Limit ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.monthlyLimit}
                    onChange={(e) => setEditForm(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    required
                    style={styles.select}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                    <option value="inactive">Closed</option>
                  </select>
                </div>

                <div style={styles.modalActions}>
                  <AdminButton 
                    type="submit" 
                    disabled={processing}
                    loading={processing}
                    variant="primary"
                    fullWidth={false}
                  >
                    {processing ? 'Updating Card...' : '✅ Update Card'}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    variant="secondary"
                    fullWidth={false}
                  >
                    Cancel
                  </AdminButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: 'clamp(1rem, 3vw, 1.5rem)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTop: '5px solid #0f766e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    backgroundColor: '#0f766e',
    padding: 'clamp(1.5rem, 4vw, 2rem)',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
    margin: '0.5rem 0 0 0'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  issueButton: {
    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
    backgroundColor: 'white',
    color: '#0f766e',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  alert: {
    padding: 'clamp(0.75rem, 2vw, 1rem)',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '500',
    textAlign: 'center'
  },
  controls: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: 'clamp(0.65rem, 2vw, 0.75rem)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
  },
  filterSelect: {
    padding: 'clamp(0.65rem, 2vw, 0.75rem)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
    minWidth: '150px'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#0f766e',
    margin: '0.5rem 0 0 0'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))',
    gap: '1.5rem'
  },
  cardItem: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #f1f5f9'
  },
  cardNumber: {
    fontSize: '1.1rem',
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1e293b'
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'white'
  },
  cardDetails: {
    marginBottom: '1rem',
    fontSize: '0.9rem',
    color: '#475569'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    paddingTop: '1rem',
    borderTop: '2px solid #f1f5f9'
  },
  editButton: {
    flex: 1,
    minWidth: '80px',
    padding: '0.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  blockButton: {
    flex: 1,
    minWidth: '80px',
    padding: '0.5rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  suspendButton: {
    flex: 1,
    minWidth: '80px',
    padding: '0.5rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  unblockButton: {
    flex: 1,
    minWidth: '80px',
    padding: '0.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  activateButton: {
    flex: 1,
    minWidth: '80px',
    padding: '0.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  closeButton: {
    flex: 1,
    minWidth: '80px',
    padding: '0.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
    fontSize: '1.1rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '1rem',
    overflowY: 'auto'
  },
  modal: {
    backgroundColor: '#f8fafc',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    margin: 'auto',
    position: 'relative',
    border: '2px solid #0f766e'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  field: {
    display: 'flex',
    flexDirection: 'column'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '0.5rem'
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '1rem',
    backgroundColor: 'white',
    color: '#1e293b'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '1rem',
    backgroundColor: 'white',
    color: '#1e293b',
    maxHeight: '200px',
    overflowY: 'auto',
    cursor: 'pointer'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  },
  submitButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
    transition: 'all 0.2s'
  },
  cancelButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};