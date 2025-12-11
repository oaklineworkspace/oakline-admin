import { supabaseAdmin } from './supabaseAdmin';
import jwt from 'jsonwebtoken';

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
        error: 'Auth session missing! Please log in again.',
        status: 401,
        needsReauth: true
      };
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = typeof authToken === 'string' && authToken.startsWith('Bearer ') 
      ? authToken.replace('Bearer ', '') 
      : authToken;

    // Decode JWT without verification first to get the user ID
    let decodedToken;
    try {
      decodedToken = jwt.decode(cleanToken);
      if (!decodedToken || !decodedToken.sub) {
        console.error('Admin auth failed: Invalid token structure');
        return { 
          error: 'Invalid token',
          status: 401 
        };
      }
    } catch (decodeError) {
      console.error('Admin auth failed: Cannot decode token');
      return { 
        error: 'Invalid token',
        status: 401 
      };
    }

    const userId = decodedToken.sub;

    // Get the user from auth table using admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !user) {
      console.error('Admin auth token verification failed:', authError?.message || 'User not found');
      const isExpired = authError?.message?.includes('expired') || authError?.message?.includes('invalid');
      return { 
        error: isExpired ? 'Session expired. Please log in again.' : 'Invalid token',
        status: 401,
        needsReauth: isExpired
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
