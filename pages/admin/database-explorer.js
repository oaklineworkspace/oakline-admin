
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminNavDropdown from '../../components/AdminNavDropdown';
import AdminStickyDropdown from '../../components/AdminStickyDropdown';
import Link from 'next/link';

export default function DatabaseExplorer() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [rowsPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    fetchAllTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, currentPage, sortColumn, sortDirection, searchTerm]);

  const fetchAllTables = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/get-database-tables', {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch tables');
      }

      setTables(result.tables || []);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError(err.message || 'Failed to load database tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/get-table-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          tableName: selectedTable,
          page: currentPage,
          limit: rowsPerPage,
          sortColumn,
          sortDirection,
          searchTerm
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch table data');
      }

      setTableData(result.data || []);
      setColumns(result.columns || []);
      setTotalRows(result.totalRows || 0);
      setTotalPages(Math.ceil((result.totalRows || 0) / rowsPerPage));
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err.message || 'Failed to load table data');
      setTableData([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    if (!tableData.length || !columns.length) {
      alert('No data to export');
      return;
    }

    const headers = columns.map(col => col.column_name).join(',');
    const rows = tableData.map(row => 
      columns.map(col => {
        const value = row[col.column_name];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
    return String(value);
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>🗄️ Database Explorer</h1>
            <p style={styles.subtitle}>Browse and analyze database tables</p>
          </div>
          <AdminNavDropdown />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>Database Tables</h3>
              <span style={styles.tableCount}>{tables.length} tables</span>
            </div>
            <div style={styles.tableList}>
              {loading && !selectedTable ? (
                <div style={styles.loadingText}>Loading tables...</div>
              ) : tables.length === 0 ? (
                <div style={styles.emptyText}>No tables found</div>
              ) : (
                tables.map((table) => (
                  <div
                    key={table}
                    onClick={() => {
                      setSelectedTable(table);
                      setCurrentPage(1);
                      setSearchTerm('');
                      setSortColumn('');
                    }}
                    style={{
                      ...styles.tableItem,
                      ...(selectedTable === table ? styles.tableItemActive : {})
                    }}
                  >
                    <span style={styles.tableIcon}>📊</span>
                    <span style={styles.tableName}>{table}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.mainContent}>
            {!selectedTable ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📋</div>
                <h3 style={styles.emptyTitle}>Select a table to view</h3>
                <p style={styles.emptyDescription}>
                  Choose a table from the sidebar to view its data, columns, and export options
                </p>
              </div>
            ) : (
              <>
                <div style={styles.tableHeader}>
                  <div>
                    <h2 style={styles.tableTitle}>{selectedTable}</h2>
                    <p style={styles.tableInfo}>
                      {totalRows} total rows • Showing {rowsPerPage} per page
                    </p>
                  </div>
                  <div style={styles.actions}>
                    <input
                      type="text"
                      placeholder="Search in table..."
                      value={searchTerm}
                      onChange={handleSearch}
                      style={styles.searchInput}
                    />
                    <button onClick={exportToCSV} style={styles.exportButton}>
                      📥 Export CSV
                    </button>
                  </div>
                </div>

                {columns.length > 0 && (
                  <div style={styles.columnsInfo}>
                    <h4 style={styles.columnsTitle}>Columns ({columns.length})</h4>
                    <div style={styles.columnsList}>
                      {columns.map((col) => (
                        <div key={col.column_name} style={styles.columnItem}>
                          <span style={styles.columnName}>{col.column_name}</span>
                          <span style={styles.columnType}>{col.data_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {loading ? (
                  <div style={styles.loadingState}>
                    <div style={styles.spinner}></div>
                    <p>Loading data...</p>
                  </div>
                ) : tableData.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📭</div>
                    <h3 style={styles.emptyTitle}>No data found</h3>
                    <p style={styles.emptyDescription}>
                      {searchTerm ? 'No results match your search' : 'This table is empty'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={styles.tableWrapper}>
                      <table style={styles.dataTable}>
                        <thead>
                          <tr>
                            {columns.map((col) => (
                              <th
                                key={col.column_name}
                                onClick={() => handleSort(col.column_name)}
                                style={styles.tableHeaderCell}
                              >
                                <div style={styles.headerContent}>
                                  {col.column_name}
                                  {sortColumn === col.column_name && (
                                    <span style={styles.sortIcon}>
                                      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, idx) => (
                            <tr key={idx} style={styles.tableRow}>
                              {columns.map((col) => (
                                <td key={col.column_name} style={styles.tableCell}>
                                  {formatValue(row[col.column_name])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div style={styles.pagination}>
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          style={{
                            ...styles.pageButton,
                            ...(currentPage === 1 ? styles.pageButtonDisabled : {})
                          }}
                        >
                          ← Previous
                        </button>
                        <span style={styles.pageInfo}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            ...styles.pageButton,
                            ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div style={styles.bottomNav}>
          <Link href="/admin/approve-applications" style={styles.navButton}>
            <div style={styles.navIcon}>✅</div>
            <div style={styles.navText}>Approve</div>
          </Link>
          <Link href="/admin" style={styles.navButton}>
            <div style={styles.navIcon}>🏠</div>
            <div style={styles.navText}>Hub</div>
          </Link>
          <Link href="/admin/manage-accounts" style={styles.navButton}>
            <div style={styles.navIcon}>🏦</div>
            <div style={styles.navText}>Accounts</div>
          </Link>
          <Link href="/admin/admin-transactions" style={styles.navButton}>
            <div style={styles.navIcon}>💸</div>
            <div style={styles.navText}>Transactions</div>
          </Link>
          <AdminStickyDropdown />
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  header: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem'
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
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    color: '#666',
    fontSize: '14px',
    margin: 0
  },
  errorBox: {
    background: '#fee',
    border: '1px solid #fcc',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#c00'
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '20px',
    marginBottom: '80px'
  },
  sidebar: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  tableCount: {
    fontSize: '12px',
    color: '#666',
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '12px'
  },
  tableList: {
    maxHeight: 'calc(100vh - 300px)',
    overflowY: 'auto'
  },
  tableItem: {
    padding: '12px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'all 0.2s'
  },
  tableItemActive: {
    background: '#667eea',
    color: 'white'
  },
  tableIcon: {
    fontSize: '16px'
  },
  tableName: {
    fontSize: '14px',
    fontWeight: '500'
  },
  mainContent: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '25px',
    minHeight: '600px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#666'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 10px 0'
  },
  emptyDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  tableTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  tableInfo: {
    fontSize: '13px',
    color: '#666',
    margin: 0
  },
  actions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    width: '250px'
  },
  exportButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  columnsInfo: {
    background: '#f8fafc',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  columnsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 10px 0'
  },
  columnsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  columnItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'white',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px'
  },
  columnName: {
    fontWeight: '500',
    color: '#334155'
  },
  columnType: {
    color: '#64748b',
    fontSize: '11px'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666'
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
  tableWrapper: {
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  tableHeaderCell: {
    background: '#f8fafc',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#1e3c72',
    cursor: 'pointer',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  sortIcon: {
    fontSize: '12px'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9'
  },
  tableCell: {
    padding: '12px',
    color: '#334155'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginTop: '20px'
  },
  pageButton: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  pageButtonDisabled: {
    background: '#cbd5e1',
    cursor: 'not-allowed'
  },
  pageInfo: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  loadingText: {
    padding: '20px',
    textAlign: 'center',
    color: '#666'
  },
  emptyText: {
    padding: '20px',
    textAlign: 'center',
    color: '#999'
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTop: '2px solid #e2e8f0',
    padding: '6px 3px',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    gap: '2px'
  },
  navButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: '#1A3E6F',
    padding: '4px 2px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    flex: 1,
    maxWidth: '70px',
    minWidth: '50px'
  },
  navIcon: {
    fontSize: '16px',
    marginBottom: '2px'
  },
  navText: {
    fontSize: '9px',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '1.1'
  }
};
