
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
    const {
      id,
      rate_id,
      name,
      description,
      min_amount,
      max_amount,
      rate,
      apr,
      min_term_months,
      max_term_months
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const isValueMissing = (val) => val === undefined || val === null || val === '';

    if (isValueMissing(min_amount)) {
      return res.status(400).json({ error: 'Minimum amount is required' });
    }

    if (isValueMissing(rate) || isValueMissing(apr)) {
      return res.status(400).json({ error: 'Interest rate and APR are required' });
    }

    if (isValueMissing(min_term_months) || isValueMissing(max_term_months)) {
      return res.status(400).json({ error: 'Term months are required' });
    }

    const parsedMinAmount = parseFloat(min_amount);
    const parsedMaxAmount = !isValueMissing(max_amount) ? parseFloat(max_amount) : null;
    const parsedRate = parseFloat(rate);
    const parsedApr = parseFloat(apr);
    const parsedMinTerm = parseInt(min_term_months);
    const parsedMaxTerm = parseInt(max_term_months);

    if (parsedMaxAmount !== null && parsedMinAmount > parsedMaxAmount) {
      return res.status(400).json({ error: 'Minimum amount cannot exceed maximum amount' });
    }

    if (parsedMinTerm > parsedMaxTerm) {
      return res.status(400).json({ error: 'Minimum term cannot exceed maximum term' });
    }

    const loanTypeData = {
      name,
      description,
      min_amount: parsedMinAmount,
      max_amount: parsedMaxAmount,
      updated_at: new Date().toISOString()
    };

    const interestRateData = {
      rate: parsedRate,
      apr: parsedApr,
      min_term_months: parsedMinTerm,
      max_term_months: parsedMaxTerm,
      updated_at: new Date().toISOString()
    };

    let loanTypeId = id;
    let result;

    if (id) {
      // Update existing loan type
      const { data: updatedLoanType, error: updateError } = await supabaseAdmin
        .from('loan_types')
        .update(loanTypeData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update or insert interest rate
      if (rate_id) {
        const { error: rateUpdateError } = await supabaseAdmin
          .from('loan_interest_rates')
          .update(interestRateData)
          .eq('id', rate_id);

        if (rateUpdateError) throw rateUpdateError;
      } else {
        // Create new interest rate for existing loan type
        const { error: rateInsertError } = await supabaseAdmin
          .from('loan_interest_rates')
          .insert([{ ...interestRateData, loan_type_id: id }]);

        if (rateInsertError) throw rateInsertError;
      }

      result = updatedLoanType;
    } else {
      // Create new loan type
      const { data: newLoanType, error: insertError } = await supabaseAdmin
        .from('loan_types')
        .insert([loanTypeData])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(400).json({ 
            error: 'A loan type with this name already exists' 
          });
        }
        throw insertError;
      }

      loanTypeId = newLoanType.id;

      // Create interest rate for new loan type
      const { error: rateInsertError } = await supabaseAdmin
        .from('loan_interest_rates')
        .insert([{ ...interestRateData, loan_type_id: loanTypeId }]);

      if (rateInsertError) throw rateInsertError;

      result = newLoanType;
    }

    return res.status(200).json({
      success: true,
      loanType: result,
      message: id ? 'Loan type updated successfully' : 'Loan type created successfully'
    });

  } catch (error) {
    console.error('Error in save-loan-type-with-rate:', error);
    return res.status(500).json({
      error: 'Failed to save loan type',
      details: error.message
    });
  }
}
