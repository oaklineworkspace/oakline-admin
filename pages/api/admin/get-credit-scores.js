
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    // Fetch all credit scores with user information
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from('credit_scores')
      .select(`
        *,
        profiles!credit_scores_user_id_fkey(first_name, last_name, email)
      `)
      .order('updated_at', { ascending: false });

    if (scoresError) {
      console.error('Error fetching credit scores:', scoresError);
      return res.status(500).json({ error: 'Failed to fetch credit scores' });
    }

    // Fetch admin info for updated_by field
    const updatedByIds = scores
      .filter(s => s.updated_by)
      .map(s => s.updated_by);

    let adminProfiles = [];
    if (updatedByIds.length > 0) {
      const { data: admins } = await supabaseAdmin
        .from('admin_profiles')
        .select('id, email')
        .in('id', updatedByIds);
      
      adminProfiles = admins || [];
    }

    // Enrich scores with user and admin information
    const enrichedScores = scores.map(score => {
      const profile = score.profiles;
      const admin = adminProfiles.find(a => a.id === score.updated_by);
      
      return {
        id: score.id,
        user_id: score.user_id,
        user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null,
        user_email: profile?.email || 'N/A',
        score: score.score,
        score_source: score.score_source,
        score_reason: score.score_reason,
        updated_by: score.updated_by,
        updated_by_email: admin?.email || null,
        created_at: score.created_at,
        updated_at: score.updated_at
      };
    });

    return res.status(200).json({
      success: true,
      scores: enrichedScores
    });

  } catch (error) {
    console.error('Error in get-credit-scores API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
