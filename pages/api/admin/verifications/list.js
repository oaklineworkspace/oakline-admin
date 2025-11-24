
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

    // First, fetch all verifications
    let verificationsQuery = supabaseAdmin
      .from('selfie_verifications')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (statusFilter && statusFilter !== 'all') {
      verificationsQuery = verificationsQuery.eq('status', statusFilter);
    }

    if (typeFilter && typeFilter !== 'all') {
      verificationsQuery = verificationsQuery.eq('verification_type', typeFilter);
    }

    if (dateRange?.start) {
      verificationsQuery = verificationsQuery.gte('created_at', dateRange.start);
    }

    if (dateRange?.end) {
      verificationsQuery = verificationsQuery.lte('created_at', dateRange.end);
    }

    const { data: verifications, error: queryError } = await verificationsQuery;

    if (queryError) throw queryError;

    // Get all unique user IDs
    const userIds = [...new Set(verifications.map(v => v.user_id))];

    // Fetch profiles for all users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, requires_verification, is_verified')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user_id to profile
    const profileMap = {};
    (profiles || []).forEach(profile => {
      profileMap[profile.id] = profile;
    });

    // Format verifications with user info
    let formattedVerifications = verifications.map(v => ({
      ...v,
      email: profileMap[v.user_id]?.email || 'Unknown',
      first_name: profileMap[v.user_id]?.first_name || '',
      last_name: profileMap[v.user_id]?.last_name || '',
      requires_verification: profileMap[v.user_id]?.requires_verification || false,
      is_verified: profileMap[v.user_id]?.is_verified || false
    }));

    // Apply email search filter after joining with profiles
    if (searchEmail) {
      formattedVerifications = formattedVerifications.filter(v =>
        v.email.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      totalPending: formattedVerifications.filter(v => v.status === 'pending').length,
      totalSubmitted: formattedVerifications.filter(v => 
        v.status === 'submitted' || v.status === 'under_review'
      ).length,
      approvedToday: formattedVerifications.filter(v => 
        v.status === 'approved' && v.reviewed_at && new Date(v.reviewed_at) >= today
      ).length,
      rejectedToday: formattedVerifications.filter(v => 
        v.status === 'rejected' && v.reviewed_at && new Date(v.reviewed_at) >= today
      ).length
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
