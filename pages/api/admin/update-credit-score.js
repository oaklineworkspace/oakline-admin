
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const { userId, score, reason, source } = req.body;

  // Validation
  if (!userId || !score || !reason || !source) {
    return res.status(400).json({ error: 'Missing required fields: userId, score, reason, source' });
  }

  const scoreValue = parseInt(score);
  if (isNaN(scoreValue) || scoreValue < 300 || scoreValue > 850) {
    return res.status(400).json({ error: 'Credit score must be between 300 and 850' });
  }

  const validSources = ['manual', 'internal', 'external'];
  if (!validSources.includes(source)) {
    return res.status(400).json({ error: 'Invalid source. Must be manual, internal, or external' });
  }

  try {
    // Fetch user information
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has a credit score record
    const { data: existingScore } = await supabaseAdmin
      .from('credit_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingScore) {
      // Update existing score
      const { data, error } = await supabaseAdmin
        .from('credit_scores')
        .update({
          score: scoreValue,
          score_source: source,
          score_reason: reason,
          updated_by: authResult.adminId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new score record
      const { data, error } = await supabaseAdmin
        .from('credit_scores')
        .insert({
          user_id: userId,
          score: scoreValue,
          score_source: source,
          score_reason: reason,
          updated_by: authResult.adminId
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Update loans table if user has any active loans
    await supabaseAdmin
      .from('loans')
      .update({ credit_score: scoreValue })
      .eq('user_id', userId)
      .in('status', ['pending', 'approved', 'active']);

    // Send notification email to user
    if (profile.email) {
      try {
        const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Valued Customer';
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">📊 Credit Score Update</h1>
                <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
              </div>
              
              <div style="padding: 40px 32px;">
                <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                  Hello ${userName},
                </h2>
                
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Your credit score has been updated by our team.
                </p>
                
                <div style="background-color: ${scoreValue >= 700 ? '#d1fae5' : scoreValue >= 600 ? '#fef3c7' : '#fee2e2'}; border-left: 4px solid ${scoreValue >= 700 ? '#10b981' : scoreValue >= 600 ? '#f59e0b' : '#ef4444'}; padding: 20px; margin: 24px 0;">
                  <p style="color: ${scoreValue >= 700 ? '#065f46' : scoreValue >= 600 ? '#92400e' : '#991b1b'}; font-size: 16px; margin: 0 0 12px 0;"><strong>New Credit Score:</strong></p>
                  <p style="color: ${scoreValue >= 700 ? '#065f46' : scoreValue >= 600 ? '#92400e' : '#991b1b'}; font-size: 32px; font-weight: 700; margin: 0;">${scoreValue}</p>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>Reason for Update:</strong></p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">${reason}</p>
                </div>

                <div style="background-color: #dbeafe; padding: 16px; border-radius: 8px; margin: 24px 0;">
                  <p style="color: #1e40af; font-size: 14px; margin: 0;">
                    💡 <strong>What does this mean?</strong><br/>
                    Your credit score affects your loan eligibility, interest rates, and credit limits. A higher score generally means better terms.
                  </p>
                </div>

                <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                  If you have any questions about your credit score, please contact our support team.
                </p>
              </div>
              
              <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br/>
                  Member FDIC | Routing: 075915826
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: profile.email,
          subject: '📊 Your Credit Score Has Been Updated - Oakline Bank',
          html: emailHtml,
          type: EMAIL_TYPES.NOTIFY
        });
      } catch (emailError) {
        console.error('Error sending credit score notification email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Credit score updated successfully',
      score: result
    });

  } catch (error) {
    console.error('Error in update-credit-score API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
