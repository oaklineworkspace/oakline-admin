
import { supabase } from '../../../lib/supabaseClient';
import bcrypt from 'bcryptjs';

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
    const { data: application, error: appError } = await supabase
      .from('card_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'Card application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Application has already been processed' });
    }

    if (action === 'reject') {
      // Update application status to rejected
      const { error: updateError } = await supabase
        .from('card_applications')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString()
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

    // Approve the application - create a new card
    const generateCardNumber = () => {
      return '4' + Math.random().toString().slice(2, 15).padEnd(15, '0');
    };

    const generateCVV = () => {
      return Math.floor(100 + Math.random() * 900).toString();
    };

    const generateExpiryDate = () => {
      const now = new Date();
      const expiryYear = now.getFullYear() + 3;
      const expiryMonth = (now.getMonth() + 1).toString().padStart(2, '0');
      return `${expiryMonth}/${expiryYear.toString().slice(-2)}`;
    };

    const generatePIN = () => {
      return Math.floor(1000 + Math.random() * 9000).toString();
    };

    const pin = generatePIN();
    const pinHash = await bcrypt.hash(pin, 10);

    const cardData = {
      user_id: application.user_id,
      account_id: application.account_id,
      application_id: applicationId,
      card_number: generateCardNumber(),
      cardholder_name: application.cardholder_name,
      expiry_date: generateExpiryDate(),
      cvv: generateCVV(),
      card_type: application.card_type || 'debit',
      status: 'active',
      daily_limit: 2000.00,
      monthly_limit: 10000.00,
      is_locked: false,
      pin_hash: pinHash
    };

    // Create the card
    const { data: newCard, error: cardError } = await supabase
      .from('cards')
      .insert([cardData])
      .select()
      .single();

    if (cardError) {
      console.error('Error creating card:', cardError);
      return res.status(500).json({ error: 'Failed to create card' });
    }

    // Update application status
    const { error: updateError } = await supabase
      .from('card_applications')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error updating application:', updateError);
      // Note: Card was created but application status update failed
    }

    res.status(200).json({
      success: true,
      message: 'Card application approved and card created successfully',
      card: {
        id: newCard.id,
        card_number: `****-****-****-${newCard.card_number.slice(-4)}`,
        pin: pin // In production, send this securely via email/SMS
      }
    });

  } catch (error) {
    console.error('Error in approve-card-application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
