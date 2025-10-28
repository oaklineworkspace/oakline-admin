
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createCardForAccount } from '../../../lib/cardGenerator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { applicationId, action } = req.body;

    if (!applicationId || !action) {
      return res.status(400).json({ error: 'Application ID and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    // Get the card application
    const { data: application, error: appError } = await supabaseAdmin
      .from('card_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'Card application not found' });
    }

    if (application.application_status !== 'pending') {
      return res.status(400).json({ error: 'Application has already been processed' });
    }

    if (action === 'reject') {
      // Update application status to rejected
      const { error: updateError } = await supabaseAdmin
        .from('card_applications')
        .update({
          application_status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('Error rejecting application:', updateError);
        return res.status(500).json({ error: 'Failed to reject application' });
      }

      return res.status(200).json({
        success: true,
        message: 'Card application rejected successfully'
      });
    }

    // Approve the application - create a new card using the secure card generator
    if (!application.account_id) {
      return res.status(400).json({ 
        error: 'Card application must be linked to an account' 
      });
    }

    let cardResult = null;
    try {
      // Get admin ID from authorization header or session if available
      const adminId = req.headers['x-admin-id'] || null;
      
      cardResult = await createCardForAccount(application.account_id, adminId);
      console.log('Card creation result:', {
        applicationId,
        accountId: application.account_id,
        cardId: cardResult.cardId,
        lastFour: cardResult.lastFour,
        existing: cardResult.existing
      });
    } catch (cardError) {
      console.error('Error creating card:', cardError);
      return res.status(500).json({ 
        error: 'Failed to create card',
        details: cardError.message 
      });
    }

    // Update application status to approved
    const { error: updateError } = await supabaseAdmin
      .from('card_applications')
      .update({
        application_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error updating application:', updateError);
    }

    res.status(200).json({
      success: true,
      message: cardResult.existing 
        ? 'Card application approved - existing card found for this account'
        : 'Card application approved and new card created successfully',
      card: {
        id: cardResult.cardId,
        card_number: cardResult.maskedNumber,
        last_four: cardResult.lastFour,
        expiry_date: cardResult.expiryDate,
        card_brand: cardResult.brand,
        card_category: cardResult.category,
        existing: cardResult.existing
      }
    });

  } catch (error) {
    console.error('Error in approve-card-application:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
