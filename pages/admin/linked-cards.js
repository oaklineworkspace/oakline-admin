
import { useState, useEffect } from 'react';
import AdminAuth from '../../components/AdminAuth';
import AdminBackButton from '../../components/AdminBackButton';

export default function LinkedCardsReview() {
  const [cards, setCards] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [photoModal, setPhotoModal] = useState(null);
  const [verificationChecklist, setVerificationChecklist] = useState({
    photosReadable: false,
    nameMatches: false,
    last4Matches: false,
    expiryMatches: false,
    notExpired: false,
    brandCorrect: false,
    billingComplete: false
  });

  useEffect(() => {
    fetchCards();
  }, [filterStatus, searchTerm]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filterStatus,
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
    setVerificationChecklist({
      photosReadable: false,
      nameMatches: false,
      last4Matches: false,
      expiryMatches: false,
      notExpired: false,
      brandCorrect: false,
      billingComplete: false
    });
  };

  const handleAction = async (action) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (action === 'approve') {
      const allChecked = Object.values(verificationChecklist).every(v => v === true);
      if (!allChecked) {
        const confirm = window.confirm('Not all verification items are checked. Are you sure you want to approve?');
        if (!confirm) return;
      }
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/linked-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: selectedCard.id,
          action,
          rejection_reason: action === 'reject' ? rejectionReason : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Card ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowDetailModal(false);
        fetchCards();
      } else {
        alert(data.error || 'Failed to process card');
      }
    } catch (error) {
      console.error('Error processing card:', error);
      alert('Error processing card');
    } finally {
      setProcessing(false);
    }
  };

  const openPhotoModal = (photoUrl, title) => {
    setPhotoModal({ url: photoUrl, title });
  };

  const downloadPhoto = (photoUrl, filename) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = filename;
    link.click();
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <AdminBackButton />
            <h1 style={styles.title}>💳 Linked Card Reviews</h1>
            <p style={styles.subtitle}>Review and approve user-submitted linked debit cards</p>
          </div>
        </div>

        {/* Statistics */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{statistics.total || 0}</div>
            <div style={styles.statLabel}>Total Cards</div>
          </div>
          <div style={{...styles.statCard, borderColor: '#fbbf24'}}>
            <div style={{...styles.statValue, color: '#fbbf24'}}>{statistics.pending || 0}</div>
            <div style={styles.statLabel}>Pending Review</div>
          </div>
          <div style={{...styles.statCard, borderColor: '#10b981'}}>
            <div style={{...styles.statValue, color: '#10b981'}}>{statistics.active || 0}</div>
            <div style={styles.statLabel}>Approved</div>
          </div>
          <div style={{...styles.statCard, borderColor: '#ef4444'}}>
            <div style={{...styles.statValue, color: '#ef4444'}}>{statistics.rejected || 0}</div>
            <div style={styles.statLabel}>Rejected</div>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.controls}>
          <input
            type="text"
            placeholder="Search by cardholder name or last 4 digits..."
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
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Loading cards...</div>
        ) : (
          <div style={styles.cardsGrid}>
            {cards.length === 0 ? (
              <div style={styles.noCards}>
                <h3>No linked cards found</h3>
                <p>Cards will appear here when users submit linked debit cards.</p>
              </div>
            ) : (
              cards.map((card) => (
                <div key={card.id} style={styles.cardItem}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardholderName}>{card.cardholder_name}</h3>
                      <p style={styles.userEmail}>{card.users?.email || 'No email'}</p>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: card.status === 'pending' ? '#fbbf24' : 
                                     card.status === 'active' ? '#10b981' : '#ef4444'
                    }}>
                      {card.status}
                    </span>
                  </div>

                  <div style={styles.cardDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Card Brand:</span>
                      <span>{card.card_brand}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Last 4:</span>
                      <span>****{card.card_number_last4}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Expiry:</span>
                      <span>{card.expiry_month}/{card.expiry_year}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Submitted:</span>
                      <span>{new Date(card.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(card)}
                    style={styles.viewDetailsButton}
                  >
                    👁️ View Details
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedCard && (
          <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Card Review</h2>
                <button onClick={() => setShowDetailModal(false)} style={styles.closeButton}>×</button>
              </div>

              <div style={styles.modalBody}>
                {/* User Info */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>User Information</h3>
                  <div style={styles.infoGrid}>
                    <div><strong>Name:</strong> {selectedCard.users?.profiles?.first_name} {selectedCard.users?.profiles?.last_name}</div>
                    <div><strong>Email:</strong> {selectedCard.users?.email}</div>
                    <div><strong>Phone:</strong> {selectedCard.users?.profiles?.phone || 'N/A'}</div>
                  </div>
                </div>

                {/* Card Info */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Card Information</h3>
                  <div style={styles.infoGrid}>
                    <div><strong>Cardholder Name:</strong> {selectedCard.cardholder_name}</div>
                    <div><strong>Card Brand:</strong> {selectedCard.card_brand}</div>
                    <div><strong>Last 4 Digits:</strong> ****{selectedCard.card_number_last4}</div>
                    <div><strong>Expiry:</strong> {selectedCard.expiry_month}/{selectedCard.expiry_year}</div>
                    <div><strong>Billing Address:</strong> {selectedCard.billing_address}</div>
                    <div><strong>City/State:</strong> {selectedCard.billing_city}, {selectedCard.billing_state}</div>
                    <div><strong>ZIP:</strong> {selectedCard.billing_zip}</div>
                    <div><strong>Country:</strong> {selectedCard.billing_country}</div>
                  </div>
                </div>

                {/* Card Photos */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Card Photos</h3>
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
                            🔍 View
                          </button>
                          <button 
                            onClick={() => downloadPhoto(selectedCard.card_front_photo, 'card_front.jpg')}
                            style={styles.photoButton}
                          >
                            💾 Download
                          </button>
                        </div>
                        <p style={styles.photoLabel}>Front</p>
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
                            🔍 View
                          </button>
                          <button 
                            onClick={() => downloadPhoto(selectedCard.card_back_photo, 'card_back.jpg')}
                            style={styles.photoButton}
                          >
                            💾 Download
                          </button>
                        </div>
                        <p style={styles.photoLabel}>Back</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Checklist */}
                {selectedCard.status === 'pending' && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Verification Checklist</h3>
                    <div style={styles.checklistGrid}>
                      {Object.entries({
                        photosReadable: 'Card photos are clear and readable',
                        nameMatches: 'Cardholder name matches the photo',
                        last4Matches: 'Last 4 digits match the photo',
                        expiryMatches: 'Expiry date matches the photo',
                        notExpired: 'Card is not expired',
                        brandCorrect: 'Card brand is correctly identified',
                        billingComplete: 'Billing information is complete'
                      }).map(([key, label]) => (
                        <label key={key} style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={verificationChecklist[key]}
                            onChange={(e) => setVerificationChecklist({
                              ...verificationChecklist,
                              [key]: e.target.checked
                            })}
                            style={styles.checkbox}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedCard.status === 'pending' && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Rejection Reason (if rejecting)</h3>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide a detailed reason for rejection..."
                      style={styles.textarea}
                      rows={4}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {selectedCard.status === 'pending' && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={processing}
                      style={styles.approveButton}
                    >
                      {processing ? '⏳ Processing...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={processing}
                      style={styles.rejectButton}
                    >
                      {processing ? '⏳ Processing...' : '❌ Reject'}
                    </button>
                  </div>
                )}
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
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '10px 0 0 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    borderLeft: '4px solid #3b82f6',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#3b82f6',
    margin: '0 0 8px 0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666'
  },
  controls: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px'
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px'
  },
  filterSelect: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '150px'
  },
  error: {
    color: '#dc3545',
    background: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    fontSize: '18px',
    color: '#666'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  noCards: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#666'
  },
  cardItem: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '15px'
  },
  cardholderName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  userEmail: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  statusBadge: {
    padding: '5px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  cardDetails: {
    marginBottom: '15px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee'
  },
  label: {
    fontWeight: '500',
    color: '#555'
  },
  viewDetailsButton: {
    width: '100%',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
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
  photoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666'
  },
  checklistGrid: {
    display: 'grid',
    gap: '12px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
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
  approveButton: {
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
  rejectButton: {
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
  }
};
