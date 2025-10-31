import { supabaseAdmin } from './supabaseAdmin';

export async function verifyAdminAuth(req) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        error: 'Missing or invalid authorization header',
        status: 401 
      };
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return { 
        error: 'Invalid or expired token',
        status: 401 
      };
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return { 
        error: 'Access denied. Admin privileges required.',
        status: 403 
      };
    }

    return { 
      user,
      adminProfile,
      error: null 
    };

  } catch (error) {
    console.error('Admin auth verification error:', error);
    return { 
      error: 'Authentication verification failed',
      status: 500 
    };
  }
}
