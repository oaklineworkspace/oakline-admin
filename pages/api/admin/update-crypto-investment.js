import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      investmentId,
      status,
      currentPricePerUnit,
      currentValueUsd,
      profitLossUsd,
      profitLossPercent,
      earnedRewards
    } = req.body;

    if (!investmentId) {
      return res.status(400).json({ error: 'Investment ID is required' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }
    }

    if (currentPricePerUnit !== undefined) {
      updateData.current_price_per_unit = currentPricePerUnit;
    }

    if (currentValueUsd !== undefined) {
      updateData.current_value_usd = currentValueUsd;
    }

    if (profitLossUsd !== undefined) {
      updateData.profit_loss_usd = profitLossUsd;
    }

    if (profitLossPercent !== undefined) {
      updateData.profit_loss_percent = profitLossPercent;
    }

    if (earnedRewards !== undefined) {
      updateData.earned_rewards = earnedRewards;
    }

    const { data: investment, error } = await supabaseAdmin
      .from('crypto_investments')
      .update(updateData)
      .eq('id', investmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating crypto investment:', error);
      return res.status(500).json({ error: 'Failed to update investment' });
    }

    return res.status(200).json({
      success: true,
      investment,
      message: 'Investment updated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
