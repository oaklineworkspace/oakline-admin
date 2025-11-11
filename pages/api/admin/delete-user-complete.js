
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

    // STEP 0: Delete from Supabase Auth FIRST (track success for later)
    console.log('🔐 Deleting user from Supabase authentication...');
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    
    let authDeletedSuccessfully = false;
    let authErrorDetails = null;
    
    if (authError) {
      // If user not found in auth, treat as success (already deleted)
      if (authError.message && authError.message.toLowerCase().includes('user not found')) {
        console.log('ℹ️ User not found in authentication (may have been already deleted) - continuing with database cleanup');
        authDeletedSuccessfully = true;
      } else {
        // For other auth errors, log and continue but track the failure
        console.warn('⚠️ Error deleting from auth (continuing with database cleanup):', authError.message);
        authErrorDetails = authError.message;
        authDeletedSuccessfully = false;
      }
    } else {
      console.log('✅ Deleted user from Supabase authentication');
      authDeletedSuccessfully = true;
    }

    // Delete all database dependencies in the correct order
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

      // 18. Crypto deposit audit logs (for ALL user's crypto deposits - before deleting deposits)
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

      // 19. Crypto deposits (ALL deposits by user - before deleting loan wallets)
      async () => {
        await supabaseAdmin
          .from('crypto_deposits')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted crypto deposits (owned by user)');
      },

      // 20. Loan crypto wallets (assigned by this admin - nullify references to preserve borrower data)
      async () => {
        // First, get all loan_crypto_wallets managed by this admin
        const { data: adminWallets } = await supabaseAdmin
          .from('loan_crypto_wallets')
          .select('id')
          .eq('admin_id', userIdToDelete);
        
        if (adminWallets && adminWallets.length > 0) {
          const walletIds = adminWallets.map(w => w.id);
          
          // Nullify loan_wallet_id in crypto_deposits that reference these wallets
          // This preserves borrower deposit records while removing the FK reference
          await supabaseAdmin
            .from('crypto_deposits')
            .update({ loan_wallet_id: null })
            .in('loan_wallet_id', walletIds);
          
          console.log('✅ Nullified loan_wallet_id references to preserve borrower data');
          
          // Now safe to delete the loan crypto wallets
          await supabaseAdmin
            .from('loan_crypto_wallets')
            .delete()
            .in('id', walletIds);
          
          console.log('✅ Deleted loan crypto wallets');
        }
      },

      // 21. Loan payments (depends on loans)
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

      // 22. Loans
      async () => {
        await supabaseAdmin
          .from('loans')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted loans');
      },

      // 23. Crypto investment transactions (depends on crypto_investments)
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

      // 24. Crypto investments
      async () => {
        await supabaseAdmin
          .from('crypto_investments')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted crypto investments');
      },

      // 25. Investment transactions (depends on investments)
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

      // 26. Investments
      async () => {
        await supabaseAdmin
          .from('investments')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted investments');
      },

      // 27. Transactions (depends on accounts)
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

      // 28. Check deposits
      async () => {
        await supabaseAdmin
          .from('check_deposits')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted check deposits');
      },

      // 29. Account opening crypto deposits (depends on applications and accounts)
      async () => {
        await supabaseAdmin
          .from('account_opening_crypto_deposits')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted account opening crypto deposits');
      },

      // 30. Crypto portfolio
      async () => {
        await supabaseAdmin
          .from('crypto_portfolio')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted crypto portfolio');
      },

      // 31. Account requests (user's own requests - before accounts)
      async () => {
        await supabaseAdmin
          .from('account_requests')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted account requests (user owned)');
      },

      // 32. Accounts
      async () => {
        await supabaseAdmin
          .from('accounts')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted accounts');
      },

      // 33. Enrollments (depends on applications)
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

      // 34. User ID documents
      async () => {
        await supabaseAdmin
          .from('user_id_documents')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted user ID documents');
      },

      // 35. Applications
      async () => {
        await supabaseAdmin
          .from('applications')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted applications');
      },

      // 36. Notifications
      async () => {
        await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted notifications');
      },

      // 37. Beneficiaries
      async () => {
        await supabaseAdmin
          .from('beneficiaries')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted beneficiaries');
      },

      // 38. User security settings
      async () => {
        await supabaseAdmin
          .from('user_security_settings')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted security settings');
      },

      // 39. Credit scores
      async () => {
        await supabaseAdmin
          .from('credit_scores')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted credit scores');
      },

      // 40. Admin credit overrides
      async () => {
        await supabaseAdmin
          .from('admin_credit_overrides')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted admin credit overrides');
      },

      // 41. Audit logs
      async () => {
        await supabaseAdmin
          .from('audit_logs')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted audit logs');
      },

      // 42. System logs
      async () => {
        await supabaseAdmin
          .from('system_logs')
          .delete()
          .or(`user_id.eq.${userIdToDelete},admin_id.eq.${userIdToDelete}`);
        console.log('✅ Deleted system logs');
      },

      // 43. Staff entries
      async () => {
        await supabaseAdmin
          .from('staff')
          .delete()
          .eq('id', userIdToDelete);
        console.log('✅ Deleted staff entries');
      },

      // 44. Plaid accounts (depends on plaid_items)
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

      // 45. Plaid items
      async () => {
        await supabaseAdmin
          .from('plaid_items')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted Plaid items');
      },

      // 47. User crypto wallets
      async () => {
        await supabaseAdmin
          .from('user_crypto_wallets')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted user crypto wallets');
      },

      // 48. Admin assigned wallets (as admin)
      async () => {
        await supabaseAdmin
          .from('admin_assigned_wallets')
          .delete()
          .eq('admin_id', userIdToDelete);
        console.log('✅ Deleted admin assigned wallets (as admin)');
      },

      // 49. Admin assigned wallets (as user)
      async () => {
        await supabaseAdmin
          .from('admin_assigned_wallets')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted admin assigned wallets (as user)');
      },

      // 50. Email queue
      async () => {
        await supabaseAdmin
          .from('email_queue')
          .delete()
          .eq('user_id', userIdToDelete);
        console.log('✅ Deleted email queue entries');
      },

      // 51. Email logs
      async () => {
        await supabaseAdmin
          .from('email_logs')
          .delete()
          .eq('recipient_user_id', userIdToDelete);
        console.log('✅ Deleted email logs');
      },

      // 52. Password reset OTPs
      async () => {
        if (userEmail) {
          await supabaseAdmin
            .from('password_reset_otps')
            .delete()
            .eq('email', userEmail);
          console.log('✅ Deleted password reset OTPs');
        }
      },

      // 53. Chat messages sent by user (not in threads)
      async () => {
        await supabaseAdmin
          .from('chat_messages')
          .delete()
          .eq('sender_id', userIdToDelete);
        console.log('✅ Deleted chat messages (sender)');
      },

      // 54. Nullify references where user was an approver/processor/reviewer
      async () => {
        await supabaseAdmin
          .from('account_opening_crypto_deposits')
          .update({ approved_by: null })
          .eq('approved_by', userIdToDelete);
        
        await supabaseAdmin
          .from('account_opening_crypto_deposits')
          .update({ rejected_by: null })
          .eq('rejected_by', userIdToDelete);
        
        await supabaseAdmin
          .from('check_deposits')
          .update({ processed_by: null })
          .eq('processed_by', userIdToDelete);
        
        await supabaseAdmin
          .from('credit_scores')
          .update({ updated_by: null })
          .eq('updated_by', userIdToDelete);
        
        await supabaseAdmin
          .from('loan_collaterals')
          .update({ verified_by: null })
          .eq('verified_by', userIdToDelete);
        
        await supabaseAdmin
          .from('loan_collaterals')
          .update({ appraised_by: null })
          .eq('appraised_by', userIdToDelete);
        
        await supabaseAdmin
          .from('loan_payments')
          .update({ processed_by: null })
          .eq('processed_by', userIdToDelete);
        
        await supabaseAdmin
          .from('accounts')
          .update({ approved_by: null })
          .eq('approved_by', userIdToDelete);
        
        await supabaseAdmin
          .from('accounts')
          .update({ funding_confirmed_by: null })
          .eq('funding_confirmed_by', userIdToDelete);
        
        await supabaseAdmin
          .from('account_requests')
          .update({ reviewed_by: null })
          .eq('reviewed_by', userIdToDelete);
        
        console.log('✅ Nullified admin/approver/reviewer references');
      },

      // 55. Admin profiles
      async () => {
        await supabaseAdmin
          .from('admin_profiles')
          .delete()
          .eq('id', userIdToDelete);
        console.log('✅ Deleted admin profiles');
      },

      // 56. Profile
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

    console.log(`✅ Database cleanup completed for user: ${userIdToDelete}`);

    // Return appropriate status based on auth deletion success
    if (!authDeletedSuccessfully) {
      return res.status(207).json({
        success: false,
        partialSuccess: true,
        error: 'Partial deletion: Database records removed but authentication account may still exist',
        details: authErrorDetails,
        message: `Database records for ${userEmail || userIdToDelete} have been deleted, but the authentication account could not be removed. Please retry the deletion or contact system administrator.`,
        userId: userIdToDelete,
        email: userEmail || 'N/A',
      });
    }

    return res.status(200).json({
      success: true,
      message: `User account for ${userEmail || userIdToDelete} has been permanently deleted along with all associated data.`,
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
