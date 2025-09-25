// lib/api.js
import { ENDPOINTS } from './constants';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

// Helper to handle fetch and errors
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include', // include cookies if your backend uses them
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }

  return res.json();
}

// Users
export const fetchUsers = () => request(ENDPOINTS.USERS);
export const fetchUserById = (id) => request(`${ENDPOINTS.USERS}/${id}`);
export const createUser = (data) =>
  request(ENDPOINTS.USERS_MANAGEMENT, { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id, data) =>
  request(`${ENDPOINTS.USERS_MANAGEMENT}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id) =>
  request(`${ENDPOINTS.USERS_MANAGEMENT}/${id}`, { method: 'DELETE' });

// Loans
export const fetchLoans = () => request(ENDPOINTS.LOANS);
export const approveLoan = (loanId) =>
  request(`${ENDPOINTS.LOANS}/approve/${loanId}`, { method: 'POST' });
export const rejectLoan = (loanId) =>
  request(`${ENDPOINTS.LOANS}/reject/${loanId}`, { method: 'POST' });

// Transactions
export const fetchTransactions = () => request(ENDPOINTS.TRANSACTIONS);
export const createTransaction = (data) =>
  request(ENDPOINTS.TRANSACTIONS, { method: 'POST', body: JSON.stringify(data) });
export const bulkTransactions = (data) =>
  request(`${ENDPOINTS.TRANSACTIONS}/bulk`, { method: 'POST', body: JSON.stringify(data) });

// Cards
export const fetchCards = () => request(ENDPOINTS.CARDS);
export const assignCard = (userId, cardId) =>
  request(`${ENDPOINTS.CARDS}/assign`, { method: 'POST', body: JSON.stringify({ userId, cardId }) });

// Crypto
export const fetchCryptoAccounts = () => request(ENDPOINTS.CRYPTO);

// Reports
export const fetchReports = () => request(ENDPOINTS.REPORTS);

// Notifications
export const fetchNotifications = () => request(ENDPOINTS.NOTIFICATIONS);
export const markNotificationRead = (id) =>
  request(`${ENDPOINTS.NOTIFICATIONS}/${id}/read`, { method: 'POST' });

// Settings
export const fetchSettings = () => request(ENDPOINTS.SETTINGS);
export const updateSettings = (data) =>
  request(ENDPOINTS.SETTINGS, { method: 'PUT', body: JSON.stringify(data) });
