
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import AdminProtectedRoute from '../../../components/AdminProtectedRoute';
import AdminBackButton from '../../../components/AdminBackButton';

export default function LoanDetailPage() {
  return (
    <AdminProtectedRoute>
      <LoanDetail />
    </AdminProtectedRoute>
  );
}

function LoanDetail() {
  const router = useRouter();
  const { loanId } = router.query;
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState(null);
  const [idDocuments, setIdDocuments] = useState([]);
  const [collaterals, setCollaterals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const steps = ['Loan Details', 'ID Verification', 'Collateral', 'Review & Approve'];

  useEffect(() => {
    if (loanId) {
      fetchLoanDetails();
    }
  }, [loanId]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`/api/admin/get-loan-detail?loanId=${loanId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setLoan(result.loan);
      setIdDocuments(result.idDocuments);
      setCollaterals(result.collaterals);
      setPayments(result.payments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId, status, rejectionReason = '') => {
    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/verify-id-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documentId, status, rejectionReason }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage(`✅ Document ${status} successfully`);
      await fetchLoanDetails();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCollateral = async (collateralId, data) => {
    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/verify-collateral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ collateralId, ...data }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage('✅ Collateral updated successfully');
      await fetchLoanDetails();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveLoan = async () => {
    if (!confirm('Are you sure you want to approve this loan?')) return;

    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/approve-loan-with-disbursement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ loanId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage('✅ Loan approved successfully');
      await fetchLoanDetails();
      setTimeout(() => router.push('/admin/admin-loans'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectLoan = async () => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/update-loan-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          loanId, 
          status: 'rejected',
          rejectionReason: reason 
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage('✅ Loan rejected');
      setTimeout(() => router.push('/admin/admin-loans'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Loading loan details...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div style={styles.container}>
        <p style={styles.error}>Loan not found</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <AdminBackButton href="/admin/admin-loans" />
      
      <h1 style={styles.title}>Loan Application Review</h1>
      
      {error && <div style={styles.errorBox}>{error}</div>}
      {message && <div style={styles.messageBox}>{message}</div>}

      {/* Step Indicators */}
      <div style={styles.stepIndicators}>
        {steps.map((step, index) => (
          <div
            key={index}
            style={{
              ...styles.stepIndicator,
              ...(currentStep === index ? styles.stepActive : {}),
              ...(currentStep > index ? styles.stepCompleted : {}),
            }}
            onClick={() => setCurrentStep(index)}
          >
            <div style={styles.stepNumber}>{index + 1}</div>
            <div style={styles.stepLabel}>{step}</div>
          </div>
        ))}
      </div>

      {/* Step 0: Loan Details */}
      {currentStep === 0 && (
        <div style={styles.stepContent}>
          <h2 style={styles.stepTitle}>Loan Details</h2>
          <div style={styles.detailsGrid}>
            <DetailItem label="Applicant" value={loan.user_name} />
            <DetailItem label="Email" value={loan.profiles?.email} />
            <DetailItem label="Phone" value={loan.profiles?.phone || 'N/A'} />
            <DetailItem label="Loan Type" value={loan.loan_type?.toUpperCase()} />
            <DetailItem label="Principal" value={`$${parseFloat(loan.principal).toLocaleString()}`} />
            <DetailItem label="Interest Rate" value={`${loan.interest_rate}%`} />
            <DetailItem label="Term" value={`${loan.term_months} months`} />
            <DetailItem label="Monthly Payment" value={`$${parseFloat(loan.monthly_payment_amount).toLocaleString()}`} />
            <DetailItem label="Total Amount" value={`$${parseFloat(loan.total_amount).toLocaleString()}`} />
            <DetailItem label="Purpose" value={loan.purpose || 'N/A'} />
            <DetailItem label="Status" value={<StatusBadge status={loan.status} />} />
            <DetailItem label="Submitted" value={new Date(loan.created_at).toLocaleDateString()} />
          </div>
        </div>
      )}

      {/* Step 1: ID Verification */}
      {currentStep === 1 && (
        <div style={styles.stepContent}>
          <h2 style={styles.stepTitle}>ID Document Verification</h2>
          {idDocuments.length === 0 ? (
            <p style={styles.noData}>No ID documents uploaded</p>
          ) : (
            idDocuments.map((doc) => (
              <div key={doc.id} style={styles.documentCard}>
                <h3 style={styles.documentType}>{doc.document_type}</h3>
                <div style={styles.documentImages}>
                  <div style={styles.imageContainer}>
                    <p style={styles.imageLabel}>Front</p>
                    {doc.front_signed_url ? (
                      <img src={doc.front_signed_url} alt="Front" style={styles.documentImage} />
                    ) : (
                      <p>No preview available</p>
                    )}
                  </div>
                  <div style={styles.imageContainer}>
                    <p style={styles.imageLabel}>Back</p>
                    {doc.back_signed_url ? (
                      <img src={doc.back_signed_url} alt="Back" style={styles.documentImage} />
                    ) : (
                      <p>No preview available</p>
                    )}
                  </div>
                </div>
                <div style={styles.documentStatus}>
                  <p>Status: <StatusBadge status={doc.status} /></p>
                  {doc.verified_at && <p>Verified: {new Date(doc.verified_at).toLocaleString()}</p>}
                  {doc.rejection_reason && <p style={styles.rejectionReason}>Reason: {doc.rejection_reason}</p>}
                </div>
                {doc.status === 'pending' && (
                  <div style={styles.documentActions}>
                    <button
                      onClick={() => handleVerifyDocument(doc.id, 'verified')}
                      disabled={actionLoading}
                      style={styles.approveButton}
                    >
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) handleVerifyDocument(doc.id, 'rejected', reason);
                      }}
                      disabled={actionLoading}
                      style={styles.rejectButton}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Step 2: Collateral */}
      {currentStep === 2 && (
        <div style={styles.stepContent}>
          <h2 style={styles.stepTitle}>Collateral Verification</h2>
          {collaterals.length === 0 ? (
            <p style={styles.noData}>No collateral provided</p>
          ) : (
            collaterals.map((collateral) => (
              <CollateralCard
                key={collateral.id}
                collateral={collateral}
                onVerify={handleVerifyCollateral}
                actionLoading={actionLoading}
              />
            ))
          )}
        </div>
      )}

      {/* Step 3: Review & Approve */}
      {currentStep === 3 && (
        <div style={styles.stepContent}>
          <h2 style={styles.stepTitle}>Review & Final Decision</h2>
          
          <div style={styles.summarySection}>
            <h3>Application Summary</h3>
            <div style={styles.summaryGrid}>
              <SummaryItem label="Applicant" value={loan.user_name} />
              <SummaryItem label="Loan Amount" value={`$${parseFloat(loan.principal).toLocaleString()}`} />
              <SummaryItem label="Term" value={`${loan.term_months} months`} />
              <SummaryItem label="Interest Rate" value={`${loan.interest_rate}%`} />
              <SummaryItem label="ID Verification" value={
                <StatusBadge status={idDocuments.every(d => d.status === 'verified') ? 'verified' : 'pending'} />
              } />
              <SummaryItem label="Collateral Status" value={
                collaterals.length === 0 ? 'N/A' :
                <StatusBadge status={collaterals.every(c => c.verification_status === 'Verified') ? 'verified' : 'pending'} />
              } />
            </div>
          </div>

          {loan.status === 'pending' && (
            <div style={styles.finalActions}>
              <button
                onClick={handleApproveLoan}
                disabled={actionLoading}
                style={styles.approveLoanButton}
              >
                ✓ Approve Loan
              </button>
              <button
                onClick={handleRejectLoan}
                disabled={actionLoading}
                style={styles.rejectLoanButton}
              >
                ✗ Reject Loan
              </button>
            </div>
          )}

          {loan.status !== 'pending' && (
            <div style={styles.statusInfo}>
              <p>This loan has been <strong>{loan.status}</strong></p>
              {loan.approved_at && <p>Approved: {new Date(loan.approved_at).toLocaleString()}</p>}
              {loan.rejection_reason && <p>Rejection Reason: {loan.rejection_reason}</p>}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={styles.navigation}>
        {currentStep > 0 && (
          <button onClick={() => setCurrentStep(currentStep - 1)} style={styles.navButton}>
            ← Previous
          </button>
        )}
        {currentStep < steps.length - 1 && (
          <button onClick={() => setCurrentStep(currentStep + 1)} style={styles.navButton}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={styles.detailItem}>
      <span style={styles.detailLabel}>{label}:</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={styles.summaryItem}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case 'verified':
      case 'approved':
      case 'completed':
      case 'active':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <span style={{ ...styles.statusBadge, backgroundColor: getStatusColor() }}>
      {status}
    </span>
  );
}

function CollateralCard({ collateral, onVerify, actionLoading }) {
  const [appraisedValue, setAppraisedValue] = useState(collateral.appraised_value || '');
  const [notes, setNotes] = useState(collateral.notes || '');

  return (
    <div style={styles.collateralCard}>
      <h3 style={styles.collateralType}>{collateral.collateral_type}</h3>
      <div style={styles.collateralDetails}>
        <p><strong>Ownership:</strong> {collateral.ownership_type}</p>
        <p><strong>Estimated Value:</strong> ${parseFloat(collateral.estimated_value || 0).toLocaleString()}</p>
        <p><strong>Condition:</strong> {collateral.condition}</p>
        <p><strong>Location:</strong> {collateral.location || 'N/A'}</p>
        <p><strong>Description:</strong> {collateral.description || 'N/A'}</p>
      </div>

      {collateral.signed_photos && collateral.signed_photos.length > 0 && (
        <div style={styles.collateralPhotos}>
          <p><strong>Photos:</strong></p>
          <div style={styles.photoGrid}>
            {collateral.signed_photos.map((photo, idx) => (
              <img key={idx} src={photo.signed_url} alt={`Photo ${idx + 1}`} style={styles.collateralPhoto} />
            ))}
          </div>
        </div>
      )}

      <div style={styles.collateralStatus}>
        <p>Verification: <StatusBadge status={collateral.verification_status} /></p>
        <p>Appraisal: <StatusBadge status={collateral.appraisal_status} /></p>
      </div>

      {collateral.verification_status !== 'Verified' && (
        <div style={styles.collateralForm}>
          <input
            type="number"
            placeholder="Appraised Value"
            value={appraisedValue}
            onChange={(e) => setAppraisedValue(e.target.value)}
            style={styles.input}
          />
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.textarea}
          />
          <div style={styles.collateralActions}>
            <button
              onClick={() => onVerify(collateral.id, {
                verificationStatus: 'Verified',
                appraisalStatus: 'Approved',
                appraisedValue,
                notes
              })}
              disabled={actionLoading}
              style={styles.approveButton}
            >
              ✓ Verify & Approve
            </button>
            <button
              onClick={() => onVerify(collateral.id, {
                verificationStatus: 'Rejected',
                appraisalStatus: 'Rejected',
                notes
              })}
              disabled={actionLoading}
              style={styles.rejectButton}
            >
              ✗ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    marginBottom: '20px',
    color: '#1f2937',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#6b7280',
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    padding: '20px',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  messageBox: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  stepIndicators: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  stepIndicator: {
    flex: '1',
    minWidth: '150px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '15px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  stepActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  stepCompleted: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  stepNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  stepLabel: {
    fontSize: '14px',
    textAlign: 'center',
  },
  stepContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  stepTitle: {
    fontSize: '1.5rem',
    marginBottom: '20px',
    color: '#1f2937',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: '16px',
    color: '#1f2937',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  documentCard: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  documentType: {
    fontSize: '1.2rem',
    marginBottom: '15px',
    color: '#1f2937',
  },
  documentImages: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '15px',
  },
  imageContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  imageLabel: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#4b5563',
  },
  documentImage: {
    width: '100%',
    maxWidth: '400px',
    height: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  documentStatus: {
    marginBottom: '15px',
  },
  rejectionReason: {
    color: '#ef4444',
    fontStyle: 'italic',
    marginTop: '5px',
  },
  documentActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  approveButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  rejectButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  collateralCard: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  collateralType: {
    fontSize: '1.2rem',
    marginBottom: '15px',
    color: '#1f2937',
  },
  collateralDetails: {
    marginBottom: '15px',
  },
  collateralPhotos: {
    marginTop: '15px',
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '10px',
    marginTop: '10px',
  },
  collateralPhoto: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  collateralStatus: {
    marginTop: '15px',
    marginBottom: '15px',
  },
  collateralForm: {
    marginTop: '15px',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
  },
  collateralActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  summarySection: {
    marginBottom: '30px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: '16px',
    color: '#1f2937',
    fontWeight: '600',
  },
  finalActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginTop: '30px',
    flexWrap: 'wrap',
  },
  approveLoanButton: {
    padding: '15px 40px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  rejectLoanButton: {
    padding: '15px 40px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  statusInfo: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    marginTop: '20px',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
  },
  navButton: {
    padding: '10px 30px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};
