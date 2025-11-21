import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Helper function to verify admin authentication
async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('Auth error:', authError);
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminError || !adminProfile) {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, adminProfile };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    // Fetch all restoration reasons
    const { data: reasons, error: fetchError } = await supabaseAdmin
      .from('account_restoration_reasons')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching restoration reasons:', fetchError);
      return res.status(500).json({
        error: 'Failed to fetch restoration reasons',
        details: fetchError.message
      });
    }

    // Calculate stats
    const stats = {
      total: reasons.length,
      active: reasons.filter(r => r.is_active).length,
      inactive: reasons.filter(r => !r.is_active).length
    };

    return res.status(200).json({
      success: true,
      reasons: reasons || [],
      stats
    });
  } catch (error) {
    console.error('Server error in get-all-restoration-reasons:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
