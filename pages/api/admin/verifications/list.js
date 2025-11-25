
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
    const { statusFilter, typeFilter, searchEmail, dateRange, userFilter } = req.body;

    console.log('Fetching verifications with filters:', { statusFilter, typeFilter, searchEmail, dateRange, userFilter });

    // First, fetch all verifications - get latest submission per user per type
    let verificationsQuery = supabaseAdmin
      .from('selfie_verifications')
      .select('*')
      .order('user_id')
      .order('verification_type')
      .order('created_at', { ascending: false });

    // Apply filters
    if (userFilter && userFilter !== 'all') {
      verificationsQuery = verificationsQuery.eq('user_id', userFilter);
    }

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

    if (queryError) {
      console.error('Error querying verifications:', queryError);
      throw queryError;
    }

    console.log(`Found ${verifications?.length || 0} verifications before deduplication`);

    // Deduplicate: keep only the latest verification per user per type
    const seen = new Map();
    const deduplicatedVerifications = [];
    
    for (const v of verifications) {
      const key = `${v.user_id}_${v.verification_type}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicatedVerifications.push(v);
      }
    }

    console.log(`After deduplication: ${deduplicatedVerifications.length} verifications`);

    if (!deduplicatedVerifications || deduplicatedVerifications.length === 0) {
      return res.status(200).json({
        success: true,
        verifications: [],
        stats: {
          totalPending: 0,
          totalSubmitted: 0,
          approvedToday: 0,
          rejectedToday: 0
        }
      });
    }

    // Get all unique user IDs
    const userIds = [...new Set(deduplicatedVerifications.map(v => v.user_id).filter(id => id))];

    console.log(`Fetching profiles for ${userIds.length} users`);

    // Fetch profiles for all users with verification details
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, requires_verification, is_verified, verification_reason, verification_required_at, last_verified_at')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user_id to profile
    const profileMap = {};
    (profiles || []).forEach(profile => {
      profileMap[profile.id] = profile;
    });

    // Generate signed URLs for video/image paths
    const formattedVerificationsPromises = deduplicatedVerifications.map(async (v) => {
      let video_url = null;
      let image_url = null;

      // Generate signed URL for video
      if (v.video_path) {
        try {
          const { data } = await supabaseAdmin.storage
            .from('verification-media')
            .createSignedUrl(v.video_path.replace('verification-media/', ''), 3600);
          video_url = data?.signedUrl;
        } catch (err) {
          console.error('Error generating video signed URL:', err);
        }
      }

      // Generate signed URL for image
      if (v.image_path) {
        try {
          const { data } = await supabaseAdmin.storage
            .from('verification-media')
            .createSignedUrl(v.image_path.replace('verification-media/', ''), 3600);
          image_url = data?.signedUrl;
        } catch (err) {
          console.error('Error generating image signed URL:', err);
        }
      }

      return {
        ...v,
        video_path: video_url || v.video_path,
        image_path: image_url || v.image_path,
        email: profileMap[v.user_id]?.email || 'Unknown',
        first_name: profileMap[v.user_id]?.first_name || '',
        last_name: profileMap[v.user_id]?.last_name || '',
        requires_verification: profileMap[v.user_id]?.requires_verification || false,
        is_verified: profileMap[v.user_id]?.is_verified || false,
        verification_reason: profileMap[v.user_id]?.verification_reason || '',
        verification_required_at: profileMap[v.user_id]?.verification_required_at || null,
        last_verified_at: profileMap[v.user_id]?.last_verified_at || null
      };
    });

    let formattedVerifications = await Promise.all(formattedVerificationsPromises);

    // Apply email search filter after joining with profiles
    if (searchEmail) {
      formattedVerifications = formattedVerifications.filter(v =>
        v.email.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    // Sort by most recent first
    formattedVerifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

    console.log('Stats:', stats);

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
