
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, userId } = req.body;
    
    if (!email && !userId) {
      return res.status(400).json({ error: 'Email or userId is required' });
    }

    let userIdToDelete = userId;
    let userEmail = email;

    // Find user ID if only email provided
    if (!userId && email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (profile) {
        userIdToDelete = profile.id;
      }
    }

    // Find email if only userId provided
    if (!email && userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (profile) {
        userEmail = profile.email;
      }
    }

    if (!userIdToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🗑️ Starting deletion process for user: ${userIdToDelete} (${userEmail})`);

    // Delete all dependencies in the correct order
    const deletionSteps = [
      // 1. Card transactions (depends on cards)
      async () => {
        const { data: userCards } = await supabaseAdmin
          .from('cards')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userCards && userCards.length > 0) {
          const cardIds = userCards.map(c => c.id);
          await supabaseAdmin
            .from('card_transactions')
            .delete()
            .in('card_id', cardIds);
          console.log('✅ Deleted card transactions');
        }
      },

      // 2. Card activity logs
      async () => {
        await supabaseAdmin
          .from('card_activity_log')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted card activity logs');
      },

      // 3. Cards
      async () => {
        await supabaseAdmin
          .from('cards')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted cards');
      },

      // 4. Card applications
      async () => {
        await supabaseAdmin
          .from('card_applications')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted card applications');
      },

      // 5. Zelle transactions
      async () => {
        await supabaseAdmin
          .from('zelle_transactions')
          .delete()
          .or(`sender_id.eq.${userIdToDelete},recipient_user_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted Zelle transactions');
      },

      // 6. Zelle settings
      async () => {
        await supabaseAdmin
          .from('zelle_settings')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted Zelle settings');
      },

      // 7. Zelle contacts
      async () => {
        await supabaseAdmin
          .from('zelle_contacts')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted Zelle contacts');
      },

      // 8. Loan payments (depends on loans)
      async () => {
        const { data: userLoans } = await supabaseAdmin
          .from('loans')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userLoans && userLoans.length > 0) {
          const loanIds = userLoans.map(l => l.id);
          await supabaseAdmin
            .from('loan_payments')
            .delete()
            .in('loan_id', loanIds);
          console.log('✅ Deleted loan payments');
        }
      },

      // 9. Loans
      async () => {
        await supabaseAdmin
          .from('loans')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted loans');
      },

      // 10. Transactions (depends on accounts)
      async () => {
        const { data: userAccounts } = await supabaseAdmin
          .from('accounts')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userAccounts && userAccounts.length > 0) {
          const accountIds = userAccounts.map(a => a.id);
          await supabaseAdmin
            .from('transactions')
            .delete()
            .in('account_id', accountIds);
          console.log('✅ Deleted transactions');
        }
      },

      // 11. Internal transfers
      async () => {
        await supabaseAdmin
          .from('internal_transfers')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted internal transfers');
      },

      // 12. Investments
      async () => {
        await supabaseAdmin
          .from('investments')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted investments');
      },

      // 13. Crypto portfolio
      async () => {
        await supabaseAdmin
          .from('crypto_portfolio')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted crypto portfolio');
      },

      // 14. Accounts
      async () => {
        await supabaseAdmin
          .from('accounts')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted accounts');
      },

      // 15. Enrollments (depends on applications)
      async () => {
        const { data: userApps } = await supabaseAdmin
          .from('applications')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userApps && userApps.length > 0) {
          const appIds = userApps.map(a => a.id);
          await supabaseAdmin
            .from('enrollments')
            .delete()
            .in('application_id', appIds);
          console.log('✅ Deleted enrollments');
        }
      },

      // 16. Applications
      async () => {
        await supabaseAdmin
          .from('applications')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted applications');
      },

      // 17. Notifications
      async () => {
        await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted notifications');
      },

      // 18. Beneficiaries
      async () => {
        await supabaseAdmin
          .from('beneficiaries')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted beneficiaries');
      },

      // 19. User security settings
      async () => {
        await supabaseAdmin
          .from('user_security_settings')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted security settings');
      },

      // 20. Audit logs
      async () => {
        await supabaseAdmin
          .from('audit_logs')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted audit logs');
      },

      // 21. System logs
      async () => {
        await supabaseAdmin
          .from('system_logs')
          .delete()
          .or(`user_id.eq.${userIdToDelete},admin_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted system logs');
      },

      // 22. Staff entries
      async () => {
        await supabaseAdmin
          .from('staff')
          .delete()
          .eq('id', userIdToDelete);
        console.log('✅ Deleted staff entries');
      },

      // 23. Plaid accounts (depends on plaid_items)
      async () => {
        const { data: plaidItems } = await supabaseAdmin
          .from('plaid_items')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (plaidItems && plaidItems.length > 0) {
          const itemIds = plaidItems.map(i => i.id);
          await supabaseAdmin
            .from('plaid_accounts')
            .delete()
            .in('plaid_item_id', itemIds);
          console.log('✅ Deleted Plaid accounts');
        }
      },

      // 24. Plaid items
      async () => {
        await supabaseAdmin
          .from('plaid_items')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted Plaid items');
      },

      // 25. Password reset OTPs
      async () => {
        if (userEmail) {
          await supabaseAdmin
            .from('password_reset_otps')
            .delete()
            .eq('email', userEmail);
          console.log('✅ Deleted password reset OTPs');
        }
      },

      // 26. Email queue
      async () => {
        await supabaseAdmin
          .from('email_queue')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted email queue entries');
      },

      // 27. Profile
      async () => {
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userIdToDelete);
        console.log('✅ Deleted profile');
      },
    ];

    // Execute all deletion steps
    for (const step of deletionSteps) {
      try {
        await step();
      } catch (error) {
        console.warn('⚠️ Error in deletion step:', error.message);
        // Continue with other deletions even if one fails
      }
    }

    // Finally, delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    
    if (authError) {
      console.error('❌ Error deleting from auth:', authError);
      return res.status(500).json({
        error: 'Failed to delete user from authentication',
        details: authError.message,
      });
    }

    console.log(`✅ Successfully deleted user: ${userIdToDelete}`);

    return res.status(200).json({
      success: true,
      message: '✅ User and all related data deleted successfully',
      userId: userIdToDelete,
      email: userEmail || 'N/A',
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
