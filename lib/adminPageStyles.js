/**
 * Reusable Admin Page Styles
 * Consistent design system for all admin pages
 * Used by: admin-transactions, admin-users, manage-restriction-reasons, security-dashboard, etc.
 */

export const adminPageStyles = {
  // Main Container
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },

  // Header Section
  header: {
    backgroundColor: 'white',
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
    color: '#1A3E6F',
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
    flexWrap: 'wrap',
    alignItems: 'center'
  },

  // Buttons
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  addButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // Banners
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  // Stats Grid
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
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },

  // Tabs
  tabs: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap',
    overflowX: 'auto'
  },
  tab: {
    flex: '1 1 auto',
    minWidth: '120px',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  },
  activeTab: {
    backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },

  // Filters Section
  filtersSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '150px'
  },

  // Date Range
  dateRangeSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  dateRangeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  dateRangeInputs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },
  dateInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateLabel: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '500',
    color: '#4a5568'
  },
  dateInput: {
    padding: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    minWidth: '150px'
  },
  clearDateButton: {
    padding: '10px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  // Content Container
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },

  // Loading & Empty States
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

  // Grid/Card Layout
  grid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  card: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease'
  },
  cardSelected: {
    border: '2px solid #1e40af',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)',
    backgroundColor: '#f0f9ff'
  },

  // Card Header
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  cardSubtitle: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },

  // Card Body
  cardBody: {
    marginBottom: '16px'
  },
  cardInfo: {
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

  // Badges
  badge: {
    padding: '8px',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    marginTop: '12px'
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e'
  },
  failedBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b'
  },

  // Card Footer
  cardFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },

  // Modals
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },

  // Forms
  formGrid: {
    display: 'grid',
    gap: '16px',
    marginBottom: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  formInput: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  textarea: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  helpText: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#64748b'
  },
  infoBox: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    lineHeight: '1.6',
    color: '#475569'
  },

  // Modal Footer
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  cancelButton: {
    padding: '12px 24px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#475569',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  deleteButton: {
    padding: '10px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  editButton: {
    padding: '10px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default adminPageStyles;
