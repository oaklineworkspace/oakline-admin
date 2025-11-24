
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { statusFilter, typeFilter, searchEmail, dateRange } = req.body;

    // Build query
    let query = supabaseAdmin
      .from('selfie_verifications')
      .select(`
        *,
        profiles!inner(email, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('verification_type', typeFilter);
    }

    if (searchEmail) {
      query = query.ilike('profiles.email', `%${searchEmail}%`);
    }

    if (dateRange?.start) {
      query = query.gte('created_at', dateRange.start);
    }

    if (dateRange?.end) {
      query = query.lte('created_at', dateRange.end);
    }

    const { data: verifications, error: queryError } = await query;

    if (queryError) throw queryError;

    // Format verifications with user info
    const formattedVerifications = verifications.map(v => ({
      ...v,
      email: v.profiles?.email,
      first_name: v.profiles?.first_name,
      last_name: v.profiles?.last_name
    }));

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      totalPending: verifications.filter(v => v.status === 'pending').length,
      totalSubmitted: verifications.filter(v => v.status === 'submitted' || v.status === 'under_review').length,
      approvedToday: verifications.filter(v => v.status === 'approved' && new Date(v.reviewed_at) >= today).length,
      rejectedToday: verifications.filter(v => v.status === 'rejected' && new Date(v.reviewed_at) >= today).length
    };

    return res.status(200).json({
      success: true,
      verifications: formattedVerifications,
      stats
    });

  } catch (error) {
    console.error('Error fetching verifications:', error);
    return res.status(500).json({
      error: 'Failed to fetch verifications',
      details: error.message
    });
  }
}
