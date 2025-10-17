
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fromAccount,
      transferType,
      toAccount,
      recipientName,
      amount,
      description,
      bankName,
      routingNumber,
      swiftCode,
      country,
      user_id
    } = req.body;

    // Validate required fields
    if (!fromAccount || !toAccount || !amount || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      return res.status(400).json({ error: 'Invalid transfer amount' });
    }

    // Get user's account information
    const { data: sourceAccount, error: sourceError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', fromAccount)
      .eq('user_id', user_id)
      .single();

    if (sourceError || !sourceAccount) {
      return res.status(400).json({ error: 'Source account not found' });
    }

    // Check balance
    if (parseFloat(sourceAccount.balance) < transferAmount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    let transferResult;

    switch (transferType) {
      case 'between_accounts':
        // Internal transfer between user's own accounts
        transferResult = await processInternalTransfer({
          sourceAccount,
          toAccount,
          transferAmount,
          description,
          user_id
        });
        break;

      case 'domestic':
      case 'ach':
        // Use Plaid for ACH transfers
        transferResult = await processPlaidTransfer({
          sourceAccount,
          recipientName,
          toAccount,
          bankName,
          routingNumber,
          transferAmount,
          description,
          user_id
        });
        break;

      case 'wire_transfer':
        // Wire transfer (can use Plaid or custom provider)
        transferResult = await processWireTransfer({
          sourceAccount,
          recipientName,
          toAccount,
          bankName,
          routingNumber,
          transferAmount,
          description,
          user_id
        });
        break;

      case 'international':
        // International transfer (requires specialized service)
        transferResult = await processInternationalTransfer({
          sourceAccount,
          recipientName,
          toAccount,
          swiftCode,
          country,
          transferAmount,
          description,
          user_id
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid transfer type' });
    }

    res.status(200).json({
      success: true,
      ...transferResult
    });

  } catch (error) {
    console.error('Transfer processing error:', error);
    res.status(500).json({
      error: 'Internal server error during transfer processing'
    });
  }
}

async function processInternalTransfer({ sourceAccount, toAccount, transferAmount, description, user_id }) {
  // Find destination account
  const { data: destAccount, error: destError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', toAccount)
    .eq('user_id', user_id)
    .single();

  if (destError || !destAccount) {
    throw new Error('Destination account not found');
  }

  // Update balances
  const newSourceBalance = parseFloat(sourceAccount.balance) - transferAmount;
  const newDestBalance = parseFloat(destAccount.balance) + transferAmount;

  // Update source account
  await supabase
    .from('accounts')
    .update({ 
      balance: newSourceBalance.toFixed(2),
      updated_at: new Date().toISOString()
    })
    .eq('id', sourceAccount.id);

  // Update destination account
  await supabase
    .from('accounts')
    .update({ 
      balance: newDestBalance.toFixed(2),
      updated_at: new Date().toISOString()
    })
    .eq('id', destAccount.id);

  // Create transaction records
  await supabase.from('transactions').insert([
    {
      account_id: sourceAccount.id,
      user_id: user_id,
      type: 'transfer_out',
      amount: -transferAmount,
      status: 'completed',
      description: `Transfer to ${destAccount.account_name} - ${description || 'Internal transfer'}`,
      reference: `INT_${Date.now()}`
    },
    {
      account_id: destAccount.id,
      user_id: user_id,
      type: 'transfer_in',
      amount: transferAmount,
      status: 'completed',
      description: `Transfer from ${sourceAccount.account_name} - ${description || 'Internal transfer'}`,
      reference: `INT_${Date.now()}`
    }
  ]);

  return {
    transfer_id: `INT_${Date.now()}`,
    status: 'completed',
    message: 'Internal transfer completed successfully'
  };
}

async function processPlaidTransfer({ sourceAccount, recipientName, toAccount, bankName, routingNumber, transferAmount, description, user_id }) {
  // TODO: Integrate with Plaid API
  // For now, create a pending transaction
  
  // In a real implementation, you would:
  // 1. Use Plaid to initiate ACH transfer
  // 2. Handle webhooks for status updates
  // 3. Update transaction status based on Plaid response

  const fee = 2.00; // ACH fee
  const totalDeduction = transferAmount + fee;

  if (parseFloat(sourceAccount.balance) < totalDeduction) {
    throw new Error('Insufficient funds including fees');
  }

  // Update source account balance
  const newBalance = parseFloat(sourceAccount.balance) - totalDeduction;
  await supabase
    .from('accounts')
    .update({ 
      balance: newBalance.toFixed(2),
      updated_at: new Date().toISOString()
    })
    .eq('id', sourceAccount.id);

  // Create transaction records
  await supabase.from('transactions').insert([
    {
      account_id: sourceAccount.id,
      user_id: user_id,
      type: 'transfer_out',
      amount: -transferAmount,
      status: 'pending', // Will be updated via Plaid webhook
      description: `ACH Transfer to ${recipientName} at ${bankName} - ${description || 'External transfer'}`,
      reference: `ACH_${Date.now()}`,
      metadata: JSON.stringify({
        recipient_name: recipientName,
        recipient_account: toAccount,
        bank_name: bankName,
        routing_number: routingNumber,
        processor: 'plaid'
      })
    },
    {
      account_id: sourceAccount.id,
      user_id: user_id,
      type: 'fee',
      amount: -fee,
      status: 'completed',
      description: 'ACH Transfer Fee',
      reference: `FEE_${Date.now()}`
    }
  ]);

  return {
    transfer_id: `ACH_${Date.now()}`,
    status: 'pending',
    message: 'ACH transfer initiated. Processing may take 1-3 business days.',
    fee: fee
  };
}

async function processWireTransfer({ sourceAccount, recipientName, toAccount, bankName, routingNumber, transferAmount, description, user_id }) {
  // Wire transfer with higher fee
  const fee = 25.00; // Wire transfer fee
  const totalDeduction = transferAmount + fee;

  if (parseFloat(sourceAccount.balance) < totalDeduction) {
    throw new Error('Insufficient funds including fees');
  }

  // Update source account balance
  const newBalance = parseFloat(sourceAccount.balance) - totalDeduction;
  await supabase
    .from('accounts')
    .update({ 
      balance: newBalance.toFixed(2),
      updated_at: new Date().toISOString()
    })
    .eq('id', sourceAccount.id);

  // Create transaction records
  await supabase.from('transactions').insert([
    {
      account_id: sourceAccount.id,
      user_id: user_id,
      type: 'wire_transfer',
      amount: -transferAmount,
      status: 'pending',
      description: `Wire Transfer to ${recipientName} at ${bankName} - ${description || 'Wire transfer'}`,
      reference: `WIRE_${Date.now()}`,
      metadata: JSON.stringify({
        recipient_name: recipientName,
        recipient_account: toAccount,
        bank_name: bankName,
        routing_number: routingNumber,
        processor: 'wire'
      })
    },
    {
      account_id: sourceAccount.id,
      user_id: user_id,
      type: 'fee',
      amount: -fee,
      status: 'completed',
      description: 'Wire Transfer Fee',
      reference: `FEE_${Date.now()}`
    }
  ]);

  return {
    transfer_id: `WIRE_${Date.now()}`,
    status: 'pending',
    message: 'Wire transfer initiated. Processing typically completes within 24 hours.',
    fee: fee
  };
}

async function processInternationalTransfer({ sourceAccount, recipientName, toAccount, swiftCode, country, transferAmount, description, user_id }) {
  // International transfer with highest fee
  const fee = 45.00; // International transfer fee
  const totalDeduction = transferAmount + fee;

  if (parseFloat(sourceAccount.balance) < totalDeduction) {
    throw new Error('Insufficient funds including fees');
  }

  // Update source account balance
  const newBalance = parseFloat(sourceAccount.balance) - totalDeduction;
  await supabase
    .from('accounts')
    .update({ 
      balance: newBalance.toFixed(2),
      updated_at: new Date().toISOString()
    })
    .eq('id', sourceAccount.id);

  // Create transaction records
  await supabase.from('transactions').insert([
    {
      account_id: sourceAccount.id,
      user_id: user_id,
      type: 'international_transfer',
      amount: -transferAmount,
      status: 'pending',
      description: `International Transfer to ${recipientName} in ${country} - ${description || 'International transfer'}`,
      reference: `INTL_${Date.now()}`,
      metadata: JSON.stringify({
        recipient_name: recipientName,
        recipient_account: toAccount,
        swift_code: swiftCode,
        country: country,
        processor: 'international'
      })
    },
    {
      account_id: sourceAccount.id,
      user_id: user_id,
      type: 'fee',
      amount: -fee,
      status: 'completed',
      description: 'International Transfer Fee',
      reference: `FEE_${Date.now()}`
    }
  ]);

  return {
    transfer_id: `INTL_${Date.now()}`,
    status: 'pending',
    message: 'International transfer initiated. Processing may take 3-5 business days.',
    fee: fee
  };
}
