import React, { useState, useEffect } from 'react';
import './ApproveAccounts.css';

const ApproveAccounts = () => {
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchPendingAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch both 'approved' (no deposit required) and 'pending_funding' (deposit required) accounts
      const [approvedResponse, fundingResponse] = await Promise.all([
        fetch('/api/admin/get-accounts?status=approved'),
        fetch('/api/admin/get-accounts?status=pending_funding')
      ]);

      const approvedResult = await approvedResponse.json();
      const fundingResult = await fundingResponse.json();

      if (!approvedResponse.ok || !fundingResponse.ok) {
        throw new Error('Failed to fetch accounts');
      }

      // Combine both lists
      const allAccounts = [
        ...(approvedResult.accounts || []),
        ...(fundingResult.accounts || [])
      ];

      setPendingAccounts(allAccounts);
    } catch (error) {
      console.error('Error fetching pending accounts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAccounts();
  }, []);

  const handleApprove = async (accountId) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/approve-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve account');
      }

      alert('Account approved successfully!');
      fetchPendingAccounts(); // Refresh the list
    } catch (error) {
      console.error('Error approving account:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (accountId) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/reject-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject account');
      }

      alert('Account rejected successfully!');
      fetchPendingAccounts(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting account:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = pendingAccounts.filter(account =>
    account.username.toLowerCase().includes(search.toLowerCase()) ||
    account.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="approve-accounts-container">
      <h1>Approve Accounts</h1>
      <input
        type="text"
        placeholder="Search by username or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      {loading && <p>Loading...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && filteredAccounts.length === 0 && (
        <p>No accounts pending approval.</p>
      )}
      {!loading && !error && filteredAccounts.length > 0 && (
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account) => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>{account.email}</td>
                <td>{account.status}</td>
                <td>
                  {account.status === 'pending_funding' && (
                    <button onClick={() => handleApprove(account.id)} className="approve-button">
                      Approve (Min Deposit Met)
                    </button>
                  )}
                  {account.status === 'approved' && (
                    <button onClick={() => handleApprove(account.id)} className="approve-button">
                      Approve
                    </button>
                  )}
                  <button onClick={() => handleReject(account.id)} className="reject-button">
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ApproveAccounts;