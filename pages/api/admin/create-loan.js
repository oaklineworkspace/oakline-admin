
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      accountId,
      loanType,
      principal,
      interestRate,
      termMonths,
      purpose,
      monthlyPayment
    } = req.body;

    if (!userId || !accountId || !principal || !interestRate || !termMonths) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total amount and remaining balance
    const totalAmount = parseFloat(principal) * (1 + (parseFloat(interestRate) / 100) * (parseInt(termMonths) / 12));
    
    // Calculate next payment date (30 days from now)
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

    const loanData = {
      user_id: userId,
      account_id: accountId,
      loan_type: loanType || 'personal',
      principal: parseFloat(principal),
      interest_rate: parseFloat(interestRate),
      term_months: parseInt(termMonths),
      purpose: purpose || '',
      monthly_payment_amount: parseFloat(monthlyPayment),
      total_amount: totalAmount,
      remaining_balance: parseFloat(principal),
      status: 'pending',
      next_payment_date: nextPaymentDate.toISOString().split('T')[0],
      start_date: new Date().toISOString().split('T')[0]
    };

    const { data: loan, error } = await supabaseAdmin
      .from('loans')
      .insert(loanData)
      .select()
      .single();

    if (error) {
      console.error('Error creating loan:', error);
      return res.status(500).json({ error: 'Failed to create loan', details: error.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Loan created successfully',
      loan
    });

  } catch (error) {
    console.error('Error in create-loan:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
