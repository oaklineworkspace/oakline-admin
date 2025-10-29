
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AdminProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

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

      // Check role requirement
      if (requiredRole && adminProfile.role !== requiredRole) {
        router.push('/admin/dashboard');
        return;
      }

      setAuthorized(true);
    } catch (err) {
      console.error('Auth check failed:', err);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Verifying access...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return children;
}
