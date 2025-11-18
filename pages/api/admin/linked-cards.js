
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetLinkedCards(req, res);
  } else if (req.method === 'POST') {
    return handleCardAction(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetLinkedCards(req, res) {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('linked_debit_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`cardholder_name.ilike.%${search}%,card_number_last4.ilike.%${search}%`);
    }

    const { data: cards, error } = await query;

    if (error) {
      console.error('Error fetching linked cards:', error);
      return res.status(500).json({ error: 'Failed to fetch linked cards' });
    }

    // Fetch user data separately for each card
    if (cards && cards.length > 0) {
      for (let card of cards) {
        if (card.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, phone, email')
            .eq('id', card.user_id)
            .single();
          
          if (profile) {
            card.users = {
              id: card.user_id,
              email: profile.email,
              profiles: {
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone: profile.phone
              }
            };
          }
        }
      }
    }

    // Get statistics
    const { data: stats } = await supabaseAdmin
      .from('linked_debit_cards')
      .select('status', { count: 'exact', head: true });

    const { count: pendingCount } = await supabaseAdmin
      .from('linked_debit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: activeCount } = await supabaseAdmin
      .from('linked_debit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: rejectedCount } = await supabaseAdmin
      .from('linked_debit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    return res.status(200).json({
      success: true,
      cards: cards || [],
      statistics: {
        total: stats || 0,
        pending: pendingCount || 0,
        active: activeCount || 0,
        rejected: rejectedCount || 0
      }
    });
  } catch (error) {
    console.error('Error in handleGetLinkedCards:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCardAction(req, res) {
  try {
    const { card_id, action, rejection_reason } = req.body;

    if (!card_id || !action) {
      return res.status(400).json({ error: 'Card ID and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get card details
    const { data: card, error: cardError } = await supabaseAdmin
      .from('linked_debit_cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Fetch user profile separately
    if (card.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', card.user_id)
        .single();
      
      if (profile) {
        card.users = {
          id: card.user_id,
          email: profile.email,
          profiles: {
            first_name: profile.first_name,
            last_name: profile.last_name
          }
        };
      }
    }

    if (card.status !== 'pending') {
      return res.status(400).json({ error: 'Card has already been processed' });
    }

    // Update card status
    const updateData = {
      status: action === 'approve' ? 'active' : 'rejected',
      updated_at: new Date().toISOString()
    };

    if (action === 'reject') {
      updateData.metadata = {
        ...card.metadata,
        rejection_reason,
        rejected_at: new Date().toISOString()
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from('linked_debit_cards')
      .update(updateData)
      .eq('id', card_id);

    if (updateError) {
      console.error('Error updating card:', updateError);
      return res.status(500).json({ error: 'Failed to update card' });
    }

    // Send email notification
    const userEmail = card.users?.email;
    const userName = `${card.users?.profiles?.first_name || ''} ${card.users?.profiles?.last_name || ''}`.trim() || 'Valued Customer';

    if (userEmail) {
      try {
        if (action === 'approve') {
          await sendApprovalEmail(userEmail, userName, card);
        } else {
          await sendRejectionEmail(userEmail, userName, card, rejection_reason);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: `Card ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      card: {
        id: card_id,
        status: updateData.status
      }
    });
  } catch (error) {
    console.error('Error in handleCardAction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function sendApprovalEmail(email, userName, card) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">✅ Linked Card Approved</h1>
          <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
        </div>
        
        <div style="padding: 40px 32px;">
          <h2 style="color: #059669; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
            Great news, ${userName}!
          </h2>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Your linked debit card has been approved and is now active.
          </p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0;">
            <h3 style="color: #059669; font-size: 18px; margin: 0 0 12px 0;">Card Details</h3>
            <p style="color: #4a5568; margin: 4px 0;"><strong>Card Brand:</strong> ${card.card_brand}</p>
            <p style="color: #4a5568; margin: 4px 0;"><strong>Card Number:</strong> ****${card.card_number_last4}</p>
            <p style="color: #4a5568; margin: 4px 0;"><strong>Cardholder:</strong> ${card.cardholder_name}</p>
          </div>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
            You can now use this card for withdrawals and transactions from your Oakline Bank dashboard.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theoaklinebank.com'}/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
                      color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; 
                      font-weight: 600; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
            Best regards,<br>
            <strong>Oakline Bank Team</strong>
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
    to: email,
    subject: '✅ Your Linked Debit Card Has Been Approved',
    html: emailHtml,
    type: EMAIL_TYPES.NOTIFY
  });
}

async function sendRejectionEmail(email, userName, card, rejectionReason) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Linked Card Status Update</h1>
          <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
        </div>
        
        <div style="padding: 40px 32px;">
          <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
            Dear ${userName},
          </h2>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            We regret to inform you that your linked debit card submission could not be approved at this time.
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0;">
            <h3 style="color: #991b1b; font-size: 18px; margin: 0 0 12px 0;">Card Details</h3>
            <p style="color: #4a5568; margin: 4px 0;"><strong>Card Brand:</strong> ${card.card_brand}</p>
            <p style="color: #4a5568; margin: 4px 0;"><strong>Card Number:</strong> ****${card.card_number_last4}</p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0;">
            <h3 style="color: #92400e; font-size: 18px; margin: 0 0 12px 0;">Reason</h3>
            <p style="color: #78350f; margin: 0;">${rejectionReason}</p>
          </div>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 12px 0;">Please ensure that:</h3>
            <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
              <li>The card photos are clear and readable</li>
              <li>All card information matches the photos</li>
              <li>The card is valid and not expired</li>
            </ul>
          </div>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
            You may submit a new request with corrected information.
          </p>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
            If you have any questions, please contact our support team.
          </p>
          
          <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
            Best regards,<br>
            <strong>Oakline Bank Team</strong>
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
    to: email,
    subject: 'Linked Debit Card Status Update - Oakline Bank',
    html: emailHtml,
    type: EMAIL_TYPES.NOTIFY
  });
}
