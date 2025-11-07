
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function ViewUserDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [filterStatus]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/admin/get-user-documents?status=${filterStatus}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load documents');
      }

      setDocuments(result.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    setSelectedDoc(doc);
    setError('');

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/get-document-urls', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: doc.user_id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load document URLs');
      }

      setSelectedDoc({ ...doc, signedUrls: result.documents });
    } catch (err) {
      console.error('Error loading document URLs:', err);
      setError('Failed to load document images: ' + err.message);
    }
  };

  const handleVerifyDocument = async (docId, status, reason = '') => {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/verify-id-document', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ docId, status, reason })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update document');
      }

      alert(`Document ${status} successfully!`);
      setSelectedDoc(null);
      fetchDocuments();
    } catch (err) {
      console.error('Error updating document:', err);
      setError('Failed to update document: ' + err.message);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchEmail) return true;
    const email = doc.profiles?.email?.toLowerCase() || '';
    return email.includes(searchEmail.toLowerCase());
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>📄 User ID Documents</h1>
            <p style={styles.subtitle}>View and verify user-submitted identification documents</p>
          </div>
        </div>

        <div style={styles.controls}>
          <input
            type="text"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={fetchDocuments} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📭</p>
            <p style={styles.emptyText}>No documents found</p>
          </div>
        ) : (
          <div style={styles.documentsGrid}>
            {filteredDocuments.map((doc) => (
              <div key={doc.id} style={styles.documentCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.userName}>
                      {doc.profiles?.first_name} {doc.profiles?.last_name}
                    </h3>
                    <p style={styles.userEmail}>{doc.profiles?.email}</p>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor:
                        doc.status === 'verified' ? '#10b981' :
                        doc.status === 'rejected' ? '#ef4444' : '#f59e0b'
                    }}
                  >
                    {doc.status.toUpperCase()}
                  </span>
                </div>

                <div style={styles.cardBody}>
                  <p><strong>Document Type:</strong> {doc.document_type}</p>
                  <p><strong>Submitted:</strong> {new Date(doc.created_at).toLocaleString()}</p>
                  {doc.verified_at && (
                    <p><strong>Verified:</strong> {new Date(doc.verified_at).toLocaleString()}</p>
                  )}
                  {doc.rejection_reason && (
                    <p style={styles.rejectionReason}>
                      <strong>Rejection Reason:</strong> {doc.rejection_reason}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleViewDocument(doc)}
                  style={styles.viewButton}
                >
                  👁️ View Documents
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedDoc && (
          <div style={styles.modalOverlay} onClick={() => setSelectedDoc(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {selectedDoc.profiles?.first_name} {selectedDoc.profiles?.last_name} - ID Documents
                </h2>
                <button onClick={() => setSelectedDoc(null)} style={styles.closeButton}>✕</button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.documentInfo}>
                  <p><strong>Document Type:</strong> {selectedDoc.document_type}</p>
                  <p><strong>Status:</strong> {selectedDoc.status}</p>
                  <p><strong>Email:</strong> {selectedDoc.profiles?.email}</p>
                </div>

                {selectedDoc.signedUrls ? (
                  <div style={styles.imagesGrid}>
                    {selectedDoc.signedUrls.front && (
                      <div style={styles.imageContainer}>
                        <h4 style={styles.imageLabel}>Front Side</h4>
                        <img
                          src={selectedDoc.signedUrls.front}
                          alt="ID Front"
                          style={styles.documentImage}
                          onClick={() => setViewingDocument(selectedDoc.signedUrls.front)}
                        />
                      </div>
                    )}
                    {selectedDoc.signedUrls.back && (
                      <div style={styles.imageContainer}>
                        <h4 style={styles.imageLabel}>Back Side</h4>
                        <img
                          src={selectedDoc.signedUrls.back}
                          alt="ID Back"
                          style={styles.documentImage}
                          onClick={() => setViewingDocument(selectedDoc.signedUrls.back)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={styles.loadingImages}>
                    <div style={styles.spinner}></div>
                    <p>Loading document images...</p>
                  </div>
                )}

                {selectedDoc.status === 'pending' && selectedDoc.signedUrls && (
                  <div style={styles.actions}>
                    <button
                      onClick={() => handleVerifyDocument(selectedDoc.id, 'verified')}
                      style={styles.verifyButton}
                    >
                      ✅ Verify Document
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) handleVerifyDocument(selectedDoc.id, 'rejected', reason);
                      }}
                      style={styles.rejectButton}
                    >
                      ❌ Reject Document
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewingDocument && (
          <div style={styles.imageModalOverlay} onClick={() => setViewingDocument(null)}>
            <div style={styles.imageModal} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setViewingDocument(null)} style={styles.closeImageButton}>✕</button>
              <img src={viewingDocument} alt="Document" style={styles.fullImage} />
            </div>
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
    background: '#f5f7fa',
    padding: '20px',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  backButton: {
    display: 'inline-block',
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '10px',
    fontWeight: '500'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    color: '#1a202c',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: '14px',
  },
  controls: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px'
  },
  select: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '150px'
  },
  refreshButton: {
    padding: '12px 24px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#dc2626'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '18px',
    color: '#718096'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  documentCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '2px solid #e2e8f0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    color: '#1a202c',
    fontWeight: '600'
  },
  userEmail: {
    margin: 0,
    fontSize: '14px',
    color: '#718096'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white'
  },
  cardBody: {
    marginBottom: '16px',
    fontSize: '14px',
    lineHeight: '1.8'
  },
  rejectionReason: {
    color: '#dc2626',
    fontStyle: 'italic'
  },
  viewButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
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
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '24px',
    borderRadius: '12px 12px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700'
  },
  closeButton: {
    background: 'white',
    color: '#1a202c',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '24px'
  },
  documentInfo: {
    background: '#f7fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    fontSize: '14px',
    lineHeight: '1.8'
  },
  imagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  imageContainer: {
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center'
  },
  imageLabel: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#1a202c'
  },
  documentImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid #e2e8f0'
  },
  loadingImages: {
    textAlign: 'center',
    padding: '40px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  verifyButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  rejectButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  imageModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  imageModal: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh'
  },
  closeImageButton: {
    position: 'absolute',
    top: '-50px',
    right: '0',
    background: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#1a202c'
  },
  fullImage: {
    maxWidth: '100%',
    maxHeight: '90vh',
    objectFit: 'contain',
    borderRadius: '8px'
  }
};
