
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

      // 8. Oakline Pay transactions
      async () => {
        await supabaseAdmin
          .from('oakline_pay_transactions')
          .delete()
          .or(`sender_id.eq.${userIdToDelete},recipient_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted Oakline Pay transactions');
      },

      // 9. Oakline Pay requests
      async () => {
        await supabaseAdmin
          .from('oakline_pay_requests')
          .delete()
          .or(`requester_id.eq.${userIdToDelete},recipient_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted Oakline Pay requests');
      },

      // 10. Oakline Pay contacts
      async () => {
        await supabaseAdmin
          .from('oakline_pay_contacts')
          .delete()
          .or(`user_id.eq.${userIdToDelete},contact_user_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted Oakline Pay contacts');
      },

      // 11. Oakline Pay settings
      async () => {
        await supabaseAdmin
          .from('oakline_pay_settings')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted Oakline Pay settings');
      },

      // 12. Oakline Pay profiles
      async () => {
        await supabaseAdmin
          .from('oakline_pay_profiles')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted Oakline Pay profiles');
      },

      // 13. Bill payments
      async () => {
        await supabaseAdmin
          .from('bill_payments')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted bill payments');
      },

      // 14. Chat messages (depends on chat_threads)
      async () => {
        const { data: userThreads } = await supabaseAdmin
          .from('chat_threads')
          .select('id')
          .or(`user_id.eq.${userIdToDelete},admin_id.eq.${userIdToDelete}`);
        
        if (userThreads && userThreads.length > 0) {
          const threadIds = userThreads.map(t => t.id);
          await supabaseAdmin
            .from('chat_messages')
            .delete()
            .in('thread_id', threadIds);
          console.log('✅ Deleted chat messages');
        }
      },

      // 15. Chat threads
      async () => {
        await supabaseAdmin
          .from('chat_threads')
          .delete()
          .or(`user_id.eq.${userIdToDelete},admin_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted chat threads');
      },

      // 16. Loan collateral audit logs (depends on loan_collaterals)
      async () => {
        const { data: userCollaterals } = await supabaseAdmin
          .from('loan_collaterals')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userCollaterals && userCollaterals.length > 0) {
          const collateralIds = userCollaterals.map(c => c.id);
          await supabaseAdmin
            .from('loan_collaterals_audit_logs')
            .delete()
            .in('collateral_id', collateralIds);
          console.log('✅ Deleted loan collateral audit logs');
        }
      },

      // 17. Loan collaterals
      async () => {
        await supabaseAdmin
          .from('loan_collaterals')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted loan collaterals');
      },

      // 18. Loan payments (depends on loans)
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

      // 19. Crypto deposits linked to loans (before deleting loans)
      async () => {
        const { data: userLoans } = await supabaseAdmin
          .from('loans')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userLoans && userLoans.length > 0) {
          const loanIds = userLoans.map(l => l.id);
          
          // Get crypto deposits linked to these loans
          const { data: loanDeposits } = await supabaseAdmin
            .from('crypto_deposits')
            .select('id')
            .in('loan_id', loanIds)
            .eq('purpose', 'loan_requirement');
          
          if (loanDeposits && loanDeposits.length > 0) {
            const depositIds = loanDeposits.map(d => d.id);
            
            // Delete audit logs first
            await supabaseAdmin
              .from('crypto_deposit_audit_logs')
              .delete()
              .in('deposit_id', depositIds);
            
            // Then delete the deposits
            await supabaseAdmin
              .from('crypto_deposits')
              .delete()
              .in('id', depositIds);
            
            console.log('✅ Deleted loan-linked crypto deposits');
          }
        }
      },

      // 20. Loans
      async () => {
        await supabaseAdmin
          .from('loans')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted loans');
      },

      // 21. Crypto investment transactions (depends on crypto_investments)
      async () => {
        const { data: userInvestments } = await supabaseAdmin
          .from('crypto_investments')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userInvestments && userInvestments.length > 0) {
          const investmentIds = userInvestments.map(i => i.id);
          await supabaseAdmin
            .from('crypto_investment_transactions')
            .delete()
            .in('crypto_investment_id', investmentIds);
          console.log('✅ Deleted crypto investment transactions');
        }
      },

      // 22. Crypto investments
      async () => {
        await supabaseAdmin
          .from('crypto_investments')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted crypto investments');
      },

      // 23. Investment transactions (depends on investments)
      async () => {
        const { data: userInvestments } = await supabaseAdmin
          .from('investments')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userInvestments && userInvestments.length > 0) {
          const investmentIds = userInvestments.map(i => i.id);
          await supabaseAdmin
            .from('investment_transactions')
            .delete()
            .in('investment_id', investmentIds);
          console.log('✅ Deleted investment transactions');
        }
      },

      // 24. Investments
      async () => {
        await supabaseAdmin
          .from('investments')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted investments');
      },

      // 25. Transactions (depends on accounts)
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

      // 26. Check deposits
      async () => {
        await supabaseAdmin
          .from('check_deposits')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted check deposits');
      },

      // 27. Account opening crypto deposits (depends on applications and accounts)
      async () => {
        await supabaseAdmin
          .from('account_opening_crypto_deposits')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted account opening crypto deposits');
      },

      // 28. Crypto portfolio
      async () => {
        await supabaseAdmin
          .from('crypto_portfolio')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted crypto portfolio');
      },

      // 29. Accounts
      async () => {
        await supabaseAdmin
          .from('accounts')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted accounts');
      },

      // 30. Enrollments (depends on applications)
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

      // 31. User ID documents
      async () => {
        await supabaseAdmin
          .from('user_id_documents')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted user ID documents');
      },

      // 32. Applications
      async () => {
        await supabaseAdmin
          .from('applications')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted applications');
      },

      // 33. Notifications
      async () => {
        await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted notifications');
      },

      // 34. Beneficiaries
      async () => {
        await supabaseAdmin
          .from('beneficiaries')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted beneficiaries');
      },

      // 35. User security settings
      async () => {
        await supabaseAdmin
          .from('user_security_settings')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted security settings');
      },

      // 36. Credit scores
      async () => {
        await supabaseAdmin
          .from('credit_scores')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted credit scores');
      },

      // 37. Admin credit overrides
      async () => {
        await supabaseAdmin
          .from('admin_credit_overrides')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted admin credit overrides');
      },

      // 38. Audit logs
      async () => {
        await supabaseAdmin
          .from('audit_logs')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted audit logs');
      },

      // 39. System logs
      async () => {
        await supabaseAdmin
          .from('system_logs')
          .delete()
          .or(`user_id.eq.${userIdToDelete},admin_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted system logs');
      },

      // 40. Staff entries
      async () => {
        await supabaseAdmin
          .from('staff')
          .delete()
          .eq('id', userIdToDelete);
        console.log('✅ Deleted staff entries');
      },

      // 41. Plaid accounts (depends on plaid_items)
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

      // 42. Plaid items
      async () => {
        await supabaseAdmin
          .from('plaid_items')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted Plaid items');
      },

      // 43. Password reset OTPs
      async () => {
        if (userEmail) {
          await supabaseAdmin
            .from('password_reset_otps')
            .delete()
            .eq('email', userEmail);
          console.log('✅ Deleted password reset OTPs');
        }
      },

      // 44. Crypto deposit audit logs (depends on crypto_deposits)
      async () => {
        const { data: userDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('id')
          .eq('user_id', userIdToDelete);
        
        if (userDeposits && userDeposits.length > 0) {
          const depositIds = userDeposits.map(d => d.id);
          await supabaseAdmin
            .from('crypto_deposit_audit_logs')
            .delete()
            .in('deposit_id', depositIds);
          console.log('✅ Deleted crypto deposit audit logs');
        }
      },

      // 45. Crypto deposits
      async () => {
        await supabaseAdmin
          .from('crypto_deposits')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted crypto deposits');
      },

      // 46. User crypto wallets
      async () => {
        await supabaseAdmin
          .from('user_crypto_wallets')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted user crypto wallets');
      },

      // 47. Admin assigned wallets (as admin)
      async () => {
        await supabaseAdmin
          .from('admin_assigned_wallets')
          .delete()
          .eq('admin_id', userIdToDelete);
        console.log('✅ Deleted admin assigned wallets (as admin)');
      },

      // 48. Admin assigned wallets (as user)
      async () => {
        await supabaseAdmin
          .from('admin_assigned_wallets')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted admin assigned wallets (as user)');
      },

      // 49. Email queue
      async () => {
        await supabaseAdmin
          .from('email_queue')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted email queue entries');
      },

      // 50. Admin profiles
      async () => {
        await supabaseAdmin
          .from('admin_profiles')
          .delete()
          .eq('id', userIdToDelete);
        console.log('✅ Deleted admin profiles');
      },

      // 51. Profile
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
