
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
    // Fetch loan types with their associated interest rates
    const { data: loanTypes, error: loanTypesError } = await supabaseAdmin
      .from('loan_types')
      .select(`
        *,
        loan_interest_rates (
          id,
          rate,
          apr,
          min_term_months,
          max_term_months
        )
      `)
      .order('name', { ascending: true });

    if (loanTypesError) {
      console.error('Error fetching loan types:', loanTypesError);
      throw loanTypesError;
    }

    // Transform the data to flatten the structure
    const transformedData = loanTypes.map(lt => {
      const interestRate = lt.loan_interest_rates && lt.loan_interest_rates.length > 0 
        ? lt.loan_interest_rates[0] 
        : null;

      return {
        id: lt.id,
        name: lt.name,
        description: lt.description,
        min_amount: lt.min_amount,
        max_amount: lt.max_amount,
        rate: interestRate?.rate,
        apr: interestRate?.apr,
        min_term_months: interestRate?.min_term_months,
        max_term_months: interestRate?.max_term_months,
        rate_id: interestRate?.id,
        created_at: lt.created_at,
        updated_at: lt.updated_at
      };
    });

    return res.status(200).json({
      success: true,
      loanTypes: transformedData
    });

  } catch (error) {
    console.error('Error in get-loan-types-with-rates:', error);
    return res.status(500).json({
      error: 'Failed to fetch loan types',
      details: error.message
    });
  }
}
