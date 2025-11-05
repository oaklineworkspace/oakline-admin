
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    collateralId, 
    verificationStatus, 
    appraisalStatus,
    appraisedValue,
    notes 
  } = req.body;

  if (!collateralId) {
    return res.status(400).json({ error: 'Collateral ID is required' });
  }

  try {
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (verificationStatus) {
      updateData.verification_status = verificationStatus;
      updateData.verified_by = authResult.user.id;
    }

    if (appraisalStatus) {
      updateData.appraisal_status = appraisalStatus;
      updateData.appraised_by = authResult.user.id;
      updateData.appraisal_date = new Date().toISOString();
    }

    if (appraisedValue !== undefined && appraisedValue !== null) {
      updateData.appraised_value = parseFloat(appraisedValue);
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { data, error } = await supabaseAdmin
      .from('loan_collaterals')
      .update(updateData)
      .eq('id', collateralId)
      .select()
      .single();

    if (error) {
      console.error('Error updating collateral:', error);
      return res.status(500).json({ error: error.message });
    }

    // Log the action in audit
    await supabaseAdmin.from('loan_collaterals_audit_logs').insert({
      collateral_id: collateralId,
      action: 'UPDATE',
      changed_by: authResult.user.id,
      new_data: data,
      note: notes || `Collateral ${verificationStatus || appraisalStatus}`,
    });

    return res.status(200).json({ success: true, collateral: data });
  } catch (error) {
    console.error('Error in verify-collateral:', error);
    return res.status(500).json({ error: error.message });
  }
}
