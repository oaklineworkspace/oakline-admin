
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
    const { userId, verificationTypes, reasonId, customReason, displayMessage } = req.body;

    if (!userId || !verificationTypes || !Array.isArray(verificationTypes) || verificationTypes.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and verificationTypes (array)' 
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

    // Fetch reason details if reasonId provided
    let reasonText = customReason || 'Verification required for security';
    let finalDisplayMessage = displayMessage;
    let contactEmail = 'verify@theoaklinebank.com';
    let deadlineHours = 168; // Default 7 days

    if (reasonId) {
      const { data: reasonData, error: reasonError } = await supabaseAdmin
        .from('verification_reasons')
        .select('*')
        .eq('id', reasonId)
        .single();

      if (!reasonError && reasonData) {
        reasonText = reasonData.reason_text;
        finalDisplayMessage = finalDisplayMessage || reasonData.default_display_message;
        contactEmail = reasonData.contact_email;
        deadlineHours = reasonData.verification_deadline_hours || 168;
      }
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + deadlineHours);

    // Update the user's profile to require verification
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        requires_verification: true,
        verification_reason: reasonText,
        verification_required_at: new Date().toISOString(),
        is_verified: false,
        restriction_display_message: finalDisplayMessage || reasonText
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
      reason: reasonText,
      expires_at: expiresAt.toISOString(),
      metadata: {
        contact_email: contactEmail,
        reason_id: reasonId,
        deadline_hours: deadlineHours
      }
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
      verificationTypes: verificationTypes,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error enforcing verification:', error);
    return res.status(500).json({
      error: 'Failed to enforce verification',
      details: error.message
    });
  }
}
