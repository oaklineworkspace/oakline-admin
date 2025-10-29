
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    pendingApplications: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return;
      }

      const { data: adminProfile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !adminProfile) {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      setCurrentAdmin(adminProfile);
      await Promise.all([fetchAdmins(), fetchStats()]);
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAdmins(data);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, accountsRes, appsRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('accounts').select('id', { count: 'exact', head: true }),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('application_status', 'pending'),
        supabase.from('transactions').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalAccounts: accountsRes.count || 0,
        pendingApplications: appsRes.count || 0,
        totalTransactions: transactionsRes.count || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleDeleteAdmin = async (adminId, email) => {
    if (!confirm(`Are you sure you want to delete admin: ${email}?`)) return;

    setDeletingId(adminId);
    try {
      const response = await fetch('/api/admin/delete-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId })
      });

      if (response.ok) {
        await fetchAdmins();
        alert('Admin deleted successfully');
      } else {
        const result = await response.json();
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      alert(`Error deleting admin: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin': return '👑';
      case 'manager': return '📊';
      default: return '👤';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, <span className="font-semibold">{currentAdmin?.email}</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(currentAdmin?.role)}`}>
                  {getRoleIcon(currentAdmin?.role)} {currentAdmin?.role?.replace('_', ' ').toUpperCase()}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              {currentAdmin?.role === 'super_admin' && (
                <Link
                  href="/admin/register"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  ➕ Create Admin
                </Link>
              )}
              <Link
                href="/admin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                📋 Main Menu
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-3xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Accounts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAccounts}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <span className="text-3xl">🏦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending Apps</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingApplications}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <span className="text-3xl">📝</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Transactions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTransactions}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <span className="text-3xl">💳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Admin Team</h2>
            <p className="text-sm text-gray-600 mt-1">Manage administrator accounts and permissions</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                  {currentAdmin?.role === 'super_admin' && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {admin.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{admin.email}</p>
                          {admin.id === currentAdmin?.id && (
                            <span className="text-xs text-green-600 font-medium">You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(admin.role)}`}>
                        {getRoleIcon(admin.role)} {admin.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    {currentAdmin?.role === 'super_admin' && (
                      <td className="px-6 py-4 text-right">
                        {admin.id !== currentAdmin?.id && (
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            disabled={deletingId === admin.id}
                            className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                          >
                            {deletingId === admin.id ? 'Deleting...' : '🗑️ Delete'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {admins.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No admins found</p>
            </div>
          )}
        </div>

        {/* Role Permissions Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Role Permissions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">👑 Super Admin</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Create/delete admins</li>
                <li>✅ All manager permissions</li>
                <li>✅ Full system access</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Manager</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ View and approve users</li>
                <li>✅ Manage applications</li>
                <li>✅ All admin permissions</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">👤 Admin</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ View transactions</li>
                <li>✅ View user info</li>
                <li>✅ Basic operations</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
