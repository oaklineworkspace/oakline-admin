import { useState, useEffect } from 'react';
import AdminAuth from '../../components/AdminAuth';
import AdminBackButton from '../../components/AdminBackButton';
import Link from 'next/link';

export default function LinkedCardsReview() {
  const [cards, setCards] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(false); // This state will be used to track overall processing, but we'll use selectedCard.id for specific button processing
  const [rejectionReason, setRejectionReason] = useState('');
  const [photoModal, setPhotoModal] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCards();
  }, [activeTab, searchTerm]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        search: searchTerm
      });

      const response = await fetch(`/api/admin/linked-cards?${params}`);
      const data = await response.json();

      if (data.success) {
        setCards(data.cards);
        setStatistics(data.statistics);
      } else {
        setError('Failed to fetch cards');
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
      setError('Error loading cards');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (card) => {
    setSelectedCard(card);
    setShowDetailModal(true);
    setRejectionReason('');
  };

  const handleAction = async (action, cardId = null) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    // Set processing state for the specific card being acted upon
    setProcessing(cardId || (selectedCard && selectedCard.id));

    try {
      const response = await fetch('/api/admin/linked-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: cardId || (selectedCard ? selectedCard.id : null),
          action,
          rejection_reason: action === 'reject' ? rejectionReason : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        const actionText = action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : action === 'delete' ? 'deleted' : action === 'suspend' ? 'suspended' : action === 'reactivate' ? 'reactivated' : 'processed';
        setSuccessMessage(`Card ${actionText} successfully`);
        setTimeout(() => setSuccessMessage(''), 5000);
        setShowDetailModal(false);
        setShowDeleteConfirm(null);
        fetchCards();
      } else {
        alert(data.error || `Failed to ${action} card`);
      }
    } catch (error) {
      console.error(`Error processing card (${action}):`, error);
      alert(`Error processing card. Please try again.`);
    } finally {
      setProcessing(false); // Reset processing state
    }
  };

  const openPhotoModal = (photoUrl, title) => {
    setPhotoModal({ url: photoUrl, title });
  };

  const toggleExpanded = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const filteredCards = cards.filter(card => {
    const matchesTab = activeTab === 'all' || card.status === activeTab;
    const matchesSearch = card.cardholder_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.card_number_last4?.includes(searchTerm) ||
                         card.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: statistics.total || 0,
    pending: statistics.pending || 0,
    active: statistics.active || 0,
    rejected: statistics.rejected || 0
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e' },
      active: { backgroundColor: '#d1fae5', color: '#065f46' },
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
      suspended: { backgroundColor: '#fef3c7', color: '#92400e' }
    };
    return statusStyles[status] || statusStyles.pending;
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <AdminBackButton />
            <h1 style={styles.title}>💳 Linked Card Review System</h1>
            <p style={styles.subtitle}>Review and approve user-submitted linked debit cards with comprehensive verification</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchCards} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Cards</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending Review</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
            <h3 style={styles.statLabel}>Approved</h3>
            <p style={styles.statValue}>{stats.active}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Rejected</h3>
            <p style={styles.statValue}>{stats.rejected}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'pending', 'active', 'rejected', 'suspended'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by cardholder name, email, or last 4 digits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Cards Grid */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading cards...</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No linked cards found</p>
            </div>
          ) : (
            <div style={styles.cardsGrid}>
              {filteredCards.map((card) => (
                <div key={card.id} style={styles.cardItem}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardholderName}>{card.cardholder_name}</h3>
                      <p style={styles.userEmail}>{card.users?.email || 'No email'}</p>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor:
                        card.status === 'pending' ? '#fef3c7' :
                        card.status === 'active' ? '#d1fae5' :
                        card.status === 'suspended' ? '#fef3c7' :
                        card.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                      color:
                        card.status === 'pending' ? '#92400e' :
                        card.status === 'active' ? '#065f46' :
                        card.status === 'suspended' ? '#92400e' :
                        card.status === 'rejected' ? '#991b1b' : '#4b5563'
                    }}>
                      {card.status === 'pending' && '⏳'}
                      {card.status === 'active' && '✅'}
                      {card.status === 'suspended' && '⏸️'}
                      {card.status === 'rejected' && '❌'}
                      {' '}{card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                    </span>
                  </div>

                  {/* Realistic Debit Card Display */}
                  <div style={{
                    ...styles.debitCard,
                    background: card.card_brand === 'visa' ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' :
                               card.card_brand === 'mastercard' ? 'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)' :
                               card.card_brand === 'amex' ? 'linear-gradient(135deg, #047857 0%, #10b981 100%)' :
                               'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)'
                  }}>
                    <div style={styles.cardChip}></div>
                    <div style={styles.cardBankName}>{card.bank_name || 'Bank Name Not Provided'}</div>
                    <div style={styles.cardNumber}>•••• •••• •••• {card.card_number_last4}</div>
                    <div style={styles.cardDetails}>
                      <div>
                        <div style={styles.cardLabel}>CARDHOLDER</div>
                        <div style={styles.cardValue}>{card.cardholder_name}</div>
                      </div>
                      <div>
                        <div style={styles.cardLabel}>EXPIRES</div>
                        <div style={styles.cardValue}>{card.expiry_month}/{card.expiry_year}</div>
                      </div>
                    </div>
                    <div style={styles.cardBrandLogo}>
                      {card.card_brand?.toUpperCase() || 'DEBIT'}
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Bank Name:</span>
                      <span style={styles.infoValue}>{card.bank_name || 'Not provided'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Card Brand:</span>
                      <span style={styles.infoValue}>{card.card_brand}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Submitted:</span>
                      <span style={styles.infoValue}>{new Date(card.created_at).toLocaleDateString()}</span>
                    </div>

                    {expandedCard === card.id && (
                      <div style={styles.expandedDetails}>
                        <div style={styles.detailsGrid}>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>User Name:</span>
                            <span style={styles.detailValue}>
                              {card.users?.profiles?.first_name} {card.users?.profiles?.last_name}
                            </span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Phone:</span>
                            <span style={styles.detailValue}>{card.users?.profiles?.phone || 'N/A'}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Billing Address:</span>
                            <span style={styles.detailValue}>
                              {card.billing_address}, {card.billing_city}, {card.billing_state} {card.billing_zip}
                            </span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Country:</span>
                            <span style={styles.detailValue}>{card.billing_country || 'United States'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => toggleExpanded(card.id)}
                      style={styles.detailsButton}
                    >
                      {expandedCard === card.id ? '⬆️ Hide' : '⬇️ Show'} Details
                    </button>
                    <button
                      onClick={() => handleViewDetails(card)}
                      style={styles.viewFullButton}
                    >
                      👁️ Full Review
                    </button>
                    {card.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            // Here, we set processing to card.id to indicate this specific card is being processed
                            setProcessing(card.id);
                            handleAction('approve');
                          }}
                          disabled={processing === card.id}
                          style={{
                            ...styles.approveButton,
                            opacity: processing === card.id ? 0.7 : 1,
                            cursor: processing === card.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {processing === card.id ? '⏳ Processing...' : '✅ Verify'}
                        </button>
                      </>
                    )}
                    {card.status === 'active' && (
                      <>
                        <button
                          onClick={() => {
                            setProcessing(card.id);
                            handleAction('suspend', card.id);
                          }}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: '#f59e0b',
                            marginLeft: '8px',
                            opacity: processing === card.id ? 0.7 : 1,
                            cursor: processing === card.id ? 'not-allowed' : 'pointer'
                          }}
                          disabled={processing === card.id}
                        >
                          {processing === card.id ? '⏳ Suspending...' : '⏸️ Suspend'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
                              setProcessing(card.id);
                              handleAction('delete', card.id);
                            }
                          }}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: '#dc2626',
                            marginLeft: '8px',
                            opacity: processing === card.id ? 0.7 : 1,
                            cursor: processing === card.id ? 'not-allowed' : 'pointer'
                          }}
                          disabled={processing === card.id}
                        >
                          {processing === card.id ? '⏳ Deleting...' : '🗑️ Delete'}
                        </button>
                      </>
                    )}

                    {card.status === 'suspended' && (
                      <button
                        onClick={() => {
                          setProcessing(card.id);
                          handleAction('reactivate', card.id);
                        }}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#10b981',
                          marginLeft: '8px',
                          opacity: processing === card.id ? 0.7 : 1,
                          cursor: processing === card.id ? 'not-allowed' : 'pointer'
                        }}
                        disabled={processing === card.id}
                      >
                        {processing === card.id ? '⏳ Reactivating...' : '✅ Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedCard && (
          <div style={styles.modalOverlay} onClick={() => { if (!processing) setShowDetailModal(false); }}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>💳 Card Review - Full Details</h2>
                <button onClick={() => { if (!processing) setShowDetailModal(false); }} style={styles.closeButton} disabled={processing === selectedCard.id}>×</button>
              </div>

              <div style={styles.modalBody}>
                {/* User Info */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>👤 User Information</h3>
                  <div style={styles.infoGrid}>
                    <div><strong>Name:</strong> {selectedCard.users?.profiles?.first_name} {selectedCard.users?.profiles?.last_name}</div>
                    <div><strong>Email:</strong> {selectedCard.users?.email}</div>
                    <div><strong>Phone:</strong> {selectedCard.users?.profiles?.phone || 'N/A'}</div>
                  </div>
                </div>

                {/* Full Card Information */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>💳 Complete Card Information</h3>
                  <div style={styles.infoGrid}>
                    <div><strong>Bank Name (Issuer):</strong> {selectedCard.bank_name || 'Not provided'}</div>
                    <div><strong>Cardholder Name:</strong> {selectedCard.cardholder_name}</div>
                    <div><strong>Card Brand:</strong> {selectedCard.card_brand}</div>
                    <div><strong>Last 4 Digits:</strong> ****{selectedCard.card_number_last4}</div>
                    <div><strong>Full Card Number:</strong> {selectedCard.full_card_number_WARNING || 'Not stored'}</div>
                    <div><strong>CVV/CVC:</strong> {selectedCard.cvv_WARNING || 'Not stored'}</div>
                    <div><strong>Expiration:</strong> {selectedCard.expiry_month}/{selectedCard.expiry_year}</div>
                  </div>
                  <div style={styles.warningBox}>
                    <p style={styles.warningText}>⚠️ WARNING: Storing and displaying full card numbers and CVV codes violates PCI-DSS compliance and creates severe security risks. This should NEVER be done in production.</p>
                  </div>
                </div>

                {/* Billing Address */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>📍 Billing Address</h3>
                  <div style={styles.infoGrid}>
                    <div><strong>Street Address:</strong> {selectedCard.billing_address}</div>
                    <div><strong>City:</strong> {selectedCard.billing_city}</div>
                    <div><strong>State:</strong> {selectedCard.billing_state}</div>
                    <div><strong>ZIP:</strong> {selectedCard.billing_zip}</div>
                    <div><strong>Country:</strong> {selectedCard.billing_country || 'United States'}</div>
                  </div>
                </div>

                {/* Card Photos */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>📸 Card Photos</h3>
                  <div style={styles.photosGrid}>
                    {selectedCard.card_front_photo && (
                      <div style={styles.photoContainer}>
                        <img
                          src={selectedCard.card_front_photo}
                          alt="Card Front"
                          style={styles.photoThumbnail}
                          onClick={() => openPhotoModal(selectedCard.card_front_photo, 'Card Front')}
                        />
                        <div style={styles.photoActions}>
                          <button
                            onClick={() => openPhotoModal(selectedCard.card_front_photo, 'Card Front')}
                            style={styles.photoButton}
                          >
                            🔍 View Full Size
                          </button>
                        </div>
                        <p style={styles.photoLabel}>Front of Card</p>
                      </div>
                    )}
                    {selectedCard.card_back_photo && (
                      <div style={styles.photoContainer}>
                        <img
                          src={selectedCard.card_back_photo}
                          alt="Card Back"
                          style={styles.photoThumbnail}
                          onClick={() => openPhotoModal(selectedCard.card_back_photo, 'Card Back')}
                        />
                        <div style={styles.photoActions}>
                          <button
                            onClick={() => openPhotoModal(selectedCard.card_back_photo, 'Card Back')}
                            style={styles.photoButton}
                          >
                            🔍 View Full Size
                          </button>
                        </div>
                        <p style={styles.photoLabel}>Back of Card</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedCard.status === 'pending' && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>❌ Rejection Reason (if rejecting)</h3>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      style={styles.selectInput}
                      disabled={processing === selectedCard.id}
                    >
                      <option value="">Select a reason...</option>
                      <option value="Card photos are unclear or unreadable">Card photos are unclear or unreadable</option>
                      <option value="Card information does not match the photos">Card information does not match the photos</option>
                      <option value="Card is expired">Card is expired</option>
                      <option value="Card does not belong to the account holder">Card does not belong to the account holder</option>
                      <option value="Billing address verification failed">Billing address verification failed</option>
                      <option value="Suspected fraudulent activity">Suspected fraudulent activity</option>
                      <option value="Card brand not supported">Card brand not supported</option>
                      <option value="Other - Custom reason">Other - Custom reason</option>
                    </select>
                    {rejectionReason === 'Other - Custom reason' && (
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide a detailed custom reason for rejection..."
                        style={{...styles.textarea, marginTop: '12px'}}
                        rows={4}
                        disabled={processing === selectedCard.id}
                      />
                    )}
                  </div>
                )}

                {/* Action Buttons for pending status */}
                {selectedCard.status === 'pending' && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => {
                        setProcessing(selectedCard.id);
                        handleAction('approve');
                      }}
                      style={{
                        ...styles.approveModalButton,
                        opacity: processing === selectedCard.id ? 0.7 : 1,
                        cursor: processing === selectedCard.id ? 'not-allowed' : 'pointer'
                      }}
                      disabled={processing === selectedCard.id}
                    >
                      {processing === selectedCard.id ? '⏳ Processing...' : '✅ Verify Card'}
                    </button>
                    <button
                      onClick={() => {
                        if (!processing) setShowDetailModal(false);
                      }}
                      style={styles.cancelButton}
                      disabled={processing === selectedCard.id}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Action Buttons for active status */}
                {selectedCard.status === 'active' && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => {
                        setProcessing(selectedCard.id);
                        handleAction('suspend', selectedCard.id);
                      }}
                      style={{
                        ...styles.approveModalButton, // Reusing approve button style for consistency
                        opacity: processing === selectedCard.id ? 0.7 : 1,
                        cursor: processing === selectedCard.id ? 'not-allowed' : 'pointer'
                      }}
                      disabled={processing === selectedCard.id}
                    >
                      {processing === selectedCard.id ? '⏳ Suspending...' : '⏸️ Suspend Card'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
                          setProcessing(selectedCard.id);
                          handleAction('delete', selectedCard.id);
                        }
                      }}
                      style={{
                        ...styles.rejectModalButton, // Reusing reject button style for delete
                        opacity: processing === selectedCard.id ? 0.7 : 1,
                        cursor: processing === selectedCard.id ? 'not-allowed' : 'pointer'
                      }}
                      disabled={processing === selectedCard.id}
                    >
                      {processing === selectedCard.id ? '⏳ Deleting...' : '🗑️ Delete Card'}
                    </button>
                  </div>
                )}

                {/* Action Buttons for suspended status */}
                {selectedCard.status === 'suspended' && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => {
                        setProcessing(selectedCard.id);
                        handleAction('reactivate', selectedCard.id);
                      }}
                      style={{
                        ...styles.approveModalButton, // Reusing approve button style for reactivate
                        opacity: processing === selectedCard.id ? 0.7 : 1,
                        cursor: processing === selectedCard.id ? 'not-allowed' : 'pointer'
                      }}
                      disabled={processing === selectedCard.id}
                    >
                      {processing === selectedCard.id ? '⏳ Reactivating...' : '✅ Reactivate Card'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
                          setProcessing(selectedCard.id);
                          handleAction('delete', selectedCard.id);
                        }
                      }}
                      style={{
                        ...styles.rejectModalButton, // Reusing reject button style for delete
                        opacity: processing === selectedCard.id ? 0.7 : 1,
                        cursor: processing === selectedCard.id ? 'not-allowed' : 'pointer'
                      }}
                      disabled={processing === selectedCard.id}
                    >
                      {processing === selectedCard.id ? '⏳ Deleting...' : '🗑️ Delete Card'}
                    </button>
                  </div>
                )}

                {/* Delete Button - Available for all statuses */}
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedCard.id)}
                    style={{
                      ...styles.deleteModalButton,
                      opacity: processing === selectedCard.id ? 0.7 : 1,
                      cursor: processing === selectedCard.id ? 'not-allowed' : 'pointer'
                    }}
                    disabled={processing === selectedCard.id}
                  >
                    🗑️ Delete Card
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Lightbox Modal */}
        {photoModal && (
          <div style={styles.lightboxOverlay} onClick={() => setPhotoModal(null)}>
            <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setPhotoModal(null)} style={styles.lightboxClose}>×</button>
              <h3 style={styles.lightboxTitle}>{photoModal.title}</h3>
              <img src={photoModal.url} alt={photoModal.title} style={styles.lightboxImage} />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(null)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.confirmTitle}>⚠️ Confirm Deletion</h3>
              <p style={styles.confirmText}>
                Are you sure you want to delete this linked card? This action cannot be undone.
              </p>
              <div style={styles.confirmButtons}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  style={styles.cancelButton}
                  disabled={processing === showDeleteConfirm}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setProcessing(showDeleteConfirm);
                    handleAction('delete', showDeleteConfirm);
                  }}
                  style={{
                    ...styles.confirmDeleteButton,
                    opacity: processing === showDeleteConfirm ? 0.7 : 1,
                    cursor: processing === showDeleteConfirm ? 'not-allowed' : 'pointer'
                  }}
                  disabled={processing === showDeleteConfirm}
                >
                  {processing === showDeleteConfirm ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
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
    background: '#f5f7fa',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
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
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1a202c',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.3s ease'
  },
  errorBanner: {
    background: '#fed7d7',
    color: '#c53030',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    background: '#c6f6d5',
    color: '#2f855a',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
    padding: 'clamp(1rem, 3vw, 20px)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: 'clamp(0.75rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '600',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: 'clamp(1.5rem, 4vw, 32px)',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    background: 'white',
    padding: '12px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '100px',
    padding: '10px 16px',
    background: '#f7fafc',
    border: '2px solid transparent',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#4a5568',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderColor: '#1e40af'
  },
  filtersSection: {
    background: 'white',
    padding: 'clamp(1rem, 3vw, 20px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096'
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
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#718096',
    fontWeight: '600'
  },
  cardsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  cardItem: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: 'clamp(1rem, 3vw, 20px)',
    background: 'white',
    transition: 'all 0.3s ease'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  cardholderName: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1a202c',
    fontWeight: '600'
  },
  userEmail: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  cardBody: {
    marginBottom: '16px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600'
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right'
  },
  expandedDetails: {
    marginTop: '16px',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px'
  },
  detailsGrid: {
    display: 'grid',
    gap: '12px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#2d3748'
  },
  cardFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  detailsButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  viewFullButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  approveButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  rejectButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  buttonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  actionButton: { // Added for new buttons
    flex: 1,
    padding: '10px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    overflowY: 'auto',
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
    position: 'sticky',
    top: 0,
    background: 'white',
    zIndex: 1
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#666',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '15px',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '8px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px'
  },
  warningBox: {
    marginTop: '15px',
    padding: '15px',
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px'
  },
  warningText: {
    margin: 0,
    color: '#92400e',
    fontSize: '14px',
    fontWeight: '500'
  },
  photosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  photoContainer: {
    textAlign: 'center'
  },
  photoThumbnail: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid #ddd',
    transition: 'transform 0.2s',
    marginBottom: '10px'
  },
  photoActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '10px'
  },
  photoButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    background: '#3b82f6',
    color: 'white',
    fontWeight: '500'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px'
  },
  approveModalButton: {
    flex: 1,
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  rejectModalButton: {
    flex: 1,
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  lightboxContent: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '90%'
  },
  lightboxClose: {
    position: 'absolute',
    top: '-40px',
    right: '0',
    background: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#333'
  },
  lightboxTitle: {
    color: 'white',
    textAlign: 'center',
    marginBottom: '15px'
  },
  lightboxImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    borderRadius: '8px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
  },
  deleteButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  deleteModalButton: {
    flex: 1,
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  selectInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none'
  },
  confirmModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  confirmTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: '16px',
    textAlign: 'center'
  },
  confirmText: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '24px',
    textAlign: 'center',
    lineHeight: '1.6'
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  cancelButton: {
    padding: '12px 24px',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  confirmDeleteButton: {
    padding: '12px 24px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  debitCard: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    height: '240px',
    margin: '0 auto 20px',
    borderRadius: '16px',
    padding: '24px',
    color: 'white',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    fontFamily: 'Courier New, monospace',
    overflow: 'hidden'
  },
  cardChip: {
    width: '50px',
    height: '40px',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    borderRadius: '8px',
    marginBottom: '20px',
    position: 'relative',
    '::before': {
      content: '""',
      position: 'absolute',
      top: '8px',
      left: '8px',
      right: '8px',
      bottom: '8px',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px'
    }
  },
  cardBankName: {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '1px',
    marginBottom: '32px',
    opacity: 0.9,
    textTransform: 'uppercase'
  },
  cardNumber: {
    fontSize: '22px',
    fontWeight: '600',
    letterSpacing: '3px',
    marginBottom: '24px',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  cardDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px'
  },
  cardLabel: {
    fontSize: '9px',
    fontWeight: '600',
    letterSpacing: '1px',
    opacity: 0.8,
    marginBottom: '4px'
  },
  cardValue: {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '1px'
  },
  cardBrandLogo: {
    position: 'absolute',
    bottom: '20px',
    right: '24px',
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '2px',
    opacity: 0.9
  }
};