import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminPageDropdown from '../../components/AdminPageDropdown';

export default function FileBrowser() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));

  useEffect(() => {
    checkAuth();
    loadFileStructure();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
        return;
      }

      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!adminProfile) {
        router.push('/admin/login');
        return;
      }

      setCurrentAdmin(adminProfile);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const loadFileStructure = async () => {
    try {
      const response = await fetch('/api/admin/get-file-structure');
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleFileClick = async (filePath) => {
    try {
      const response = await fetch('/api/admin/get-file-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      const data = await response.json();
      if (data.success) {
        setSelectedFile(filePath);
        setFileContent(data.content);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const renderFileTree = (items, parentPath = '') => {
    return items
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((item, index) => {
        const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
        const isExpanded = expandedFolders.has(fullPath);

        if (item.type === 'directory') {
          return (
            <div key={index} style={styles.folderContainer}>
              <div
                style={styles.folderHeader}
                onClick={() => toggleFolder(fullPath)}
              >
                <span style={styles.folderIcon}>{isExpanded ? '📂' : '📁'}</span>
                <span style={styles.folderName}>{item.name}</span>
                <span style={styles.folderCount}>({item.children?.length || 0})</span>
              </div>
              {isExpanded && item.children && (
                <div style={styles.folderChildren}>
                  {renderFileTree(item.children, fullPath)}
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div
              key={index}
              style={{
                ...styles.fileItem,
                ...(selectedFile === fullPath ? styles.fileItemSelected : {})
              }}
              onClick={() => handleFileClick(fullPath)}
            >
              <span style={styles.fileIcon}>📄</span>
              <span style={styles.fileName}>{item.name}</span>
              <span style={styles.fileSize}>{formatFileSize(item.size)}</span>
            </div>
          );
        }
      });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileLanguage = (filePath) => {
    const ext = filePath.split('.').pop();
    const langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      css: 'css',
      html: 'html',
      md: 'markdown',
      sql: 'sql',
      txt: 'text'
    };
    return langMap[ext] || 'text';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header} className="file-browser-header">
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>📁 File Browser</h1>
          <p style={styles.subtitle}>View repository files</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.adminInfo}>
            <div style={styles.adminAvatar}>
              {currentAdmin?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={styles.adminDetails}>
              <p style={styles.adminEmail}>{currentAdmin?.email}</p>
              <div style={styles.roleBadge}>
                👤 {currentAdmin?.role?.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>
          <AdminPageDropdown />
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div style={styles.content} className="file-browser-content">
        <div style={styles.sidebar} className="file-browser-sidebar">
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="🔍 Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.fileTree} className="file-tree">
            {renderFileTree(files)}
          </div>
        </div>

        <div style={styles.viewer} className="file-browser-viewer">
          {selectedFile ? (
            <>
              <div style={styles.viewerHeader}>
                <h3 style={styles.viewerTitle}>📄 {selectedFile}</h3>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setFileContent('');
                  }}
                  style={styles.closeButton}
                >
                  ✕
                </button>
              </div>
              <pre style={styles.codeBlock} className="code-block">
                <code>{fileContent}</code>
              </pre>
            </>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📁</div>
              <h3>No File Selected</h3>
              <p>Click on a file to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(12px, 3vw, 20px)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    backgroundColor: 'white',
    padding: '1.5rem 2rem',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e40af',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
  },
  adminAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#1e40af',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  adminDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  adminEmail: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1f2937',
    margin: 0,
  },
  roleBadge: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    height: 'calc(100vh - 100px)',
    gap: '1px',
    backgroundColor: '#e5e7eb',
    '@media (maxWidth: 768px)': {
      gridTemplateColumns: '1fr',
      height: 'auto',
    }
  },
  sidebar: {
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  searchBox: {
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  searchInput: {
    width: '100%',
    padding: '0.6rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  fileTree: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: 'clamp(12px, 2vw, 16px)',
    maxHeight: 'clamp(300px, 60vh, 500px)',
    overflowY: 'auto'
  },
  folderContainer: {
    marginBottom: '0.25rem',
  },
  folderHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  folderIcon: {
    fontSize: '16px',
  },
  folderName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  folderCount: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  folderChildren: {
    marginLeft: '1.5rem',
    borderLeft: '2px solid #e5e7eb',
    paddingLeft: '0.5rem',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
    marginBottom: '0.25rem',
  },
  fileItemSelected: {
    backgroundColor: '#dbeafe',
  },
  fileIcon: {
    fontSize: '14px',
  },
  fileName: {
    fontSize: '13px',
    color: '#374151',
    flex: 1,
  },
  fileSize: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  viewer: {
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  viewerHeader: {
    padding: '1rem 1.5rem',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
    border: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#6b7280',
  },
  codeBlock: {
    background: '#1e293b',
    color: '#e2e8f0',
    padding: 'clamp(12px, 2vw, 20px)',
    borderRadius: '8px',
    overflowX: 'auto',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    lineHeight: '1.6',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '1rem',
  },
};

// Add CSS for mobile responsiveness
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @media (max-width: 768px) {
      .file-browser-content {
        grid-template-columns: 1fr !important;
        height: auto !important;
      }

      .file-browser-sidebar {
        max-height: 300px;
        border-bottom: 2px solid #e5e7eb;
      }

      .file-browser-viewer {
        min-height: 400px;
      }

      .file-browser-header {
        flex-direction: column !important;
        gap: 1rem !important;
      }

      .file-browser-header > div {
        width: 100% !important;
      }

      .admin-info {
        justify-content: center !important;
      }
    }

    @media (max-width: 480px) {
      .file-browser-content {
        padding: 0 !important;
      }

      .file-browser-sidebar {
        max-height: 250px;
      }

      .file-tree {
        font-size: 12px !important;
      }

      .code-block {
        font-size: 11px !important;
        padding: 1rem !important;
      }
    }
  `;

  if (!document.getElementById('file-browser-styles')) {
    styleSheet.id = 'file-browser-styles';
    document.head.appendChild(styleSheet);
  }
}