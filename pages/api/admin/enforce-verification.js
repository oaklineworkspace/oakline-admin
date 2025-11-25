
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { userId, verificationTypes, reason, displayMessage } = req.body;

    if (!userId || !verificationTypes || !Array.isArray(verificationTypes) || verificationTypes.length === 0 || !reason) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, verificationTypes (array), and reason' 
      });
    }

    // Validate verification types
    const validTypes = ['selfie', 'video', 'liveness'];
    const invalidTypes = verificationTypes.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({ 
        error: `Invalid verification types: ${invalidTypes.join(', ')}. Valid types are: selfie, video, liveness` 
      });
    }

    // Update the user's profile to require verification
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        requires_verification: true,
        verification_reason: reason,
        verification_required_at: new Date().toISOString(),
        is_verified: false,
        restriction_display_message: displayMessage || reason
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    // Create verification records for each type
    const verificationRecords = verificationTypes.map(type => ({
      user_id: userId,
      verification_type: type,
      status: 'pending',
      created_at: new Date().toISOString(),
      reason: reason
    }));

    const { error: insertError } = await supabaseAdmin
      .from('selfie_verifications')
      .insert(verificationRecords);

    if (insertError) {
      console.error('Error creating verification records:', insertError);
      // Don't throw - profile update was successful
      console.warn('Warning: Profile updated but verification records failed to create');
    }

    return res.status(200).json({
      success: true,
      message: 'Verification requirement enforced successfully',
      verificationTypes: verificationTypes
    });

  } catch (error) {
    console.error('Error enforcing verification:', error);
    return res.status(500).json({
      error: 'Failed to enforce verification',
      details: error.message
    });
  }
}
