import { supabaseAdmin } from './supabaseAdmin';

export async function verifyAdminAuth(req) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Admin auth failed: Missing or invalid authorization header');
      return { 
        error: 'Missing or invalid authorization header',
        status: 401 
      };
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError) {
      console.error('Admin auth token verification failed:', authError.message);
      return { 
        error: 'Invalid or expired token',
        status: 401 
      };
    }

    if (!user) {
      console.error('Admin auth failed: No user found for token');
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
      adminId: user.id,
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
