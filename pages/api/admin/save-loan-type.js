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
      name,
      code,
      description,
      default_interest_rate,
      min_interest_rate,
      max_interest_rate,
      min_term_months,
      max_term_months,
      min_amount,
      max_amount,
      min_credit_score,
      required_documents,
      is_active
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    if (!default_interest_rate || !min_interest_rate || !max_interest_rate) {
      return res.status(400).json({ error: 'Interest rates are required' });
    }

    if (!min_term_months || !max_term_months) {
      return res.status(400).json({ error: 'Term months are required' });
    }

    if (!min_amount) {
      return res.status(400).json({ error: 'Minimum amount is required' });
    }

    if (min_interest_rate > default_interest_rate || default_interest_rate > max_interest_rate) {
      return res.status(400).json({ error: 'Interest rates must be: min ≤ default ≤ max' });
    }

    if (min_term_months > max_term_months) {
      return res.status(400).json({ error: 'Minimum term cannot exceed maximum term' });
    }

    if (max_amount && min_amount > max_amount) {
      return res.status(400).json({ error: 'Minimum amount cannot exceed maximum amount' });
    }

    const loanTypeData = {
      name,
      code: code.toLowerCase().replace(/\s+/g, '_'),
      description,
      default_interest_rate: parseFloat(default_interest_rate),
      min_interest_rate: parseFloat(min_interest_rate),
      max_interest_rate: parseFloat(max_interest_rate),
      min_term_months: parseInt(min_term_months),
      max_term_months: parseInt(max_term_months),
      min_amount: parseFloat(min_amount),
      max_amount: max_amount ? parseFloat(max_amount) : null,
      min_credit_score: min_credit_score ? parseInt(min_credit_score) : null,
      required_documents: required_documents || [],
      is_active: is_active !== false,
      updated_at: new Date().toISOString()
    };

    let result;

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('loan_types')
        .update(loanTypeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('loan_types')
        .insert([loanTypeData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ 
            error: 'A loan type with this name or code already exists' 
          });
        }
        throw error;
      }
      result = data;
    }

    return res.status(200).json({
      success: true,
      loanType: result,
      message: id ? 'Loan type updated successfully' : 'Loan type created successfully'
    });

  } catch (error) {
    console.error('Error in save-loan-type:', error);
    return res.status(500).json({
      error: 'Failed to save loan type',
      details: error.message
    });
  }
}
