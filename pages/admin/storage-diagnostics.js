import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function StorageDiagnostics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBucket, setSelectedBucket] = useState('documents');

  useEffect(() => {
    fetchStorageData();
  }, [selectedBucket]);

  const fetchStorageData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/admin/list-storage-files?bucket=${selectedBucket}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch storage data');
      }

      setData(result);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>🗂️ Storage Diagnostics</h1>
            <p style={styles.subtitle}>View and diagnose Supabase storage bucket files</p>
          </div>
        </header>

        <div style={styles.controls}>
          <label style={styles.label}>
            Bucket:
            <select
              value={selectedBucket}
              onChange={(e) => setSelectedBucket(e.target.value)}
              style={styles.select}
            >
              <option value="documents">documents</option>
              <option value="id-documents">id-documents</option>
            </select>
          </label>
          <button onClick={fetchStorageData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Loading storage data...</div>
        ) : data ? (
          <>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{data.totalFiles}</div>
                <div style={styles.statLabel}>Total Files in Storage</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{data.filesInDatabase}</div>
                <div style={styles.statLabel}>Files Linked in Database</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{data.orphanedFiles}</div>
                <div style={styles.statLabel}>Orphaned Files</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{data.databaseDocuments?.length || 0}</div>
                <div style={styles.statLabel}>Database Records</div>
              </div>
            </div>

            {data.orphanedFiles > 0 && (
              <div style={styles.warningBox}>
                ⚠️ <strong>{data.orphanedFiles} orphaned files detected:</strong> These files exist in storage but are not referenced in the database. 
                Users upload files, but database records must be created to track them properly.
              </div>
            )}

            {data.databaseDocuments?.length === 0 && data.totalFiles > 0 && (
              <div style={styles.infoBox}>
                💡 <strong>No database records found:</strong> Files exist in storage (bucket: {selectedBucket}), but the <code>user_id_documents</code> table is empty. 
                Documents need to be uploaded through the proper API endpoint that creates both storage files AND database records.
              </div>
            )}

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>📁 Files in Storage Bucket: {data.bucket}</h2>
              {data.files.length === 0 ? (
                <p style={styles.emptyText}>No files found in this bucket</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>File Name</th>
                      <th style={styles.th}>Size</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>In Database</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.files.map((file) => (
                      <tr key={file.name} style={styles.tr}>
                        <td style={styles.td}>
                          <code style={styles.code}>{file.name}</code>
                        </td>
                        <td style={styles.td}>
                          {(file.metadata?.size / 1024).toFixed(2)} KB
                        </td>
                        <td style={styles.td}>
                          {file.created_at ? new Date(file.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: file.inDatabase ? '#dcfce7' : '#fef3c7',
                            color: file.inDatabase ? '#166534' : '#92400e'
                          }}>
                            {file.inDatabase ? '✓ Yes' : '✗ No'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <a
                            href={file.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.viewLink}
                          >
                            👁️ View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>💾 Database Records (user_id_documents)</h2>
              {data.databaseDocuments.length === 0 ? (
                <p style={styles.emptyText}>No records in user_id_documents table</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>User ID</th>
                      <th style={styles.th}>Document Type</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Front URL</th>
                      <th style={styles.th}>Back URL</th>
                      <th style={styles.th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.databaseDocuments.map((doc) => (
                      <tr key={doc.id} style={styles.tr}>
                        <td style={styles.td}>
                          <code style={styles.codeSmall}>{doc.user_id?.substring(0, 8)}...</code>
                        </td>
                        <td style={styles.td}>{doc.document_type || 'N/A'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: doc.status === 'verified' ? '#dcfce7' : '#fef3c7',
                            color: doc.status === 'verified' ? '#166534' : '#92400e'
                          }}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {doc.front_url ? (
                            <span style={styles.hasFile}>✓</span>
                          ) : (
                            <span style={styles.noFile}>✗</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {doc.back_url ? (
                            <span style={styles.hasFile}>✓</span>
                          ) : (
                            <span style={styles.noFile}>✗</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {new Date(doc.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={styles.helpSection}>
              <h3 style={styles.helpTitle}>🔧 How to Fix</h3>
              <ul style={styles.helpList}>
                <li>If you see orphaned files: Create database records in <code>user_id_documents</code> table manually or through proper upload API</li>
                <li>If database is empty but files exist: Ensure users upload documents through the app's proper document upload feature</li>
                <li>The <code>user_id_documents</code> table should have: user_id, document_type, front_url, back_url, status fields</li>
                <li>URLs should reference files in the format: <code>bucket-name/file-name</code></li>
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    marginBottom: '30px'
  },
  backButton: {
    display: 'inline-block',
    color: '#6b7280',
    textDecoration: 'none',
    marginBottom: '15px',
    fontSize: '14px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  },
  controls: {
    display: 'flex',
    gap: '15px',
    marginBottom: '25px',
    alignItems: 'center'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#374151'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '25px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#92400e'
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#1e40af'
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#991b1b'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '25px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '15px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: '#374151'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: '12px',
    color: '#1f2937'
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#1f2937'
  },
  codeSmall: {
    backgroundColor: '#f3f4f6',
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '11px',
    fontFamily: 'monospace'
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block'
  },
  viewLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px'
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px',
    fontSize: '14px'
  },
  hasFile: {
    color: '#059669',
    fontSize: '16px'
  },
  noFile: {
    color: '#dc2626',
    fontSize: '16px'
  },
  helpSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e5e7eb'
  },
  helpTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },
  helpList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.8'
  }
};
