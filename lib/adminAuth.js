import { supabaseAdmin } from './supabaseAdmin';

export async function verifyAdminAuth(token) {
  try {
    // Handle both string token and request object
    let authToken = token;
    if (typeof token === 'object' && token.headers) {
      // If it's a request object, extract the token from headers
      authToken = token.headers.authorization;
    }

    if (!authToken) {
      console.error('Admin auth failed: Missing token');
      return { 
        error: 'Missing authorization token',
        status: 401 
      };
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = typeof authToken === 'string' && authToken.startsWith('Bearer ') 
      ? authToken.replace('Bearer ', '') 
      : authToken;

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(cleanToken);

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
      email: user.email,
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
