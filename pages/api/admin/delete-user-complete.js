
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

    // Helper function to safely delete with error handling
    const safeDelete = async (tableName, deleteOperation) => {
      try {
        await deleteOperation();
        console.log(`✅ Deleted from ${tableName}`);
      } catch (error) {
        console.warn(`⚠️ Skipping ${tableName}:`, error.message);
      }
    };

    // Delete all database dependencies in the correct order
    const deletionSteps = [
      // 1. Delete transactions referencing the user
      async () => {
        await safeDelete('transactions (user references)', async () => {
          await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 2. Card transactions (depends on cards)
      async () => {
        await safeDelete('card_transactions', async () => {
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
          }
        });
      },

      // 3. Card activity logs
      async () => {
        await safeDelete('card_activity_log', async () => {
          await supabaseAdmin
            .from('card_activity_log')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 4. Cards
      async () => {
        await safeDelete('cards', async () => {
          await supabaseAdmin
            .from('cards')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 5. Card applications
      async () => {
        await safeDelete('card_applications', async () => {
          await supabaseAdmin
            .from('card_applications')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 6. Zelle transactions
      async () => {
        await safeDelete('zelle_transactions', async () => {
          await supabaseAdmin
            .from('zelle_transactions')
            .delete()
            .or(`sender_id.eq.${userIdToDelete},recipient_user_id.eq.${userIdToDelete}`);
        });
      },

      // 7. Zelle settings
      async () => {
        await safeDelete('zelle_settings', async () => {
          await supabaseAdmin
            .from('zelle_settings')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 8. Zelle contacts
      async () => {
        await safeDelete('zelle_contacts', async () => {
          await supabaseAdmin
            .from('zelle_contacts')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 9. Oakline Pay transactions
      async () => {
        await safeDelete('oakline_pay_transactions', async () => {
          await supabaseAdmin
            .from('oakline_pay_transactions')
            .delete()
            .or(`sender_id.eq.${userIdToDelete},recipient_id.eq.${userIdToDelete}`);
        });
      },

      // 10. Oakline Pay requests
      async () => {
        await safeDelete('oakline_pay_requests', async () => {
          await supabaseAdmin
            .from('oakline_pay_requests')
            .delete()
            .or(`requester_id.eq.${userIdToDelete},recipient_id.eq.${userIdToDelete}`);
        });
      },

      // 11. Oakline Pay contacts
      async () => {
        await safeDelete('oakline_pay_contacts', async () => {
          await supabaseAdmin
            .from('oakline_pay_contacts')
            .delete()
            .or(`user_id.eq.${userIdToDelete},contact_user_id.eq.${userIdToDelete}`);
        });
      },

      // 12. Oakline Pay settings
      async () => {
        await safeDelete('oakline_pay_settings', async () => {
          await supabaseAdmin
            .from('oakline_pay_settings')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 13. Oakline Pay profiles
      async () => {
        await safeDelete('oakline_pay_profiles', async () => {
          await supabaseAdmin
            .from('oakline_pay_profiles')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 14. Bill payments
      async () => {
        await safeDelete('bill_payments', async () => {
          await supabaseAdmin
            .from('bill_payments')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 15. Chat messages (depends on chat_threads)
      async () => {
        await safeDelete('chat_messages', async () => {
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
          }
        });
      },

      // 16. Chat threads
      async () => {
        await safeDelete('chat_threads', async () => {
          await supabaseAdmin
            .from('chat_threads')
            .delete()
            .or(`user_id.eq.${userIdToDelete},admin_id.eq.${userIdToDelete}`);
        });
      },

      // 17. Loan collateral audit logs (depends on loan_collaterals)
      async () => {
        await safeDelete('loan_collaterals_audit_logs', async () => {
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
          }
        });
      },

      // 18. Loan collaterals
      async () => {
        await safeDelete('loan_collaterals', async () => {
          await supabaseAdmin
            .from('loan_collaterals')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 19. Account opening crypto deposit audit logs
      async () => {
        await safeDelete('crypto_deposit_audit_logs', async () => {
          const { data: deposits } = await supabaseAdmin
            .from('account_opening_crypto_deposits')
            .select('id')
            .eq('user_id', userIdToDelete);

          if (deposits && deposits.length > 0) {
            const depositIds = deposits.map(d => d.id);
            await supabaseAdmin
              .from('crypto_deposit_audit_logs')
              .delete()
              .in('deposit_id', depositIds);
          }
        });
      },

      // 20. Crypto deposit audit logs for regular deposits
      async () => {
        await safeDelete('crypto_deposit_audit_logs (regular)', async () => {
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
          }
        });
      },

      // 21. Account opening crypto deposits
      async () => {
        await safeDelete('account_opening_crypto_deposits', async () => {
          await supabaseAdmin
            .from('account_opening_crypto_deposits')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 22. Crypto deposits
      async () => {
        await safeDelete('crypto_deposits', async () => {
          await supabaseAdmin
            .from('crypto_deposits')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 23. Loan crypto wallets
      async () => {
        await safeDelete('loan_crypto_wallets', async () => {
          await supabaseAdmin
            .from('loan_crypto_wallets')
            .delete()
            .eq('admin_id', userIdToDelete);
        });
      },

      // 24. Loan payments (depends on loans)
      async () => {
        await safeDelete('loan_payments', async () => {
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
          }
        });
      },

      // 25. Loans
      async () => {
        await safeDelete('loans', async () => {
          await supabaseAdmin
            .from('loans')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 26. Crypto investment transactions (depends on crypto_investments)
      async () => {
        await safeDelete('crypto_investment_transactions', async () => {
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
          }
        });
      },

      // 27. Crypto investments
      async () => {
        await safeDelete('crypto_investments', async () => {
          await supabaseAdmin
            .from('crypto_investments')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 28. Investment transactions (depends on investments)
      async () => {
        await safeDelete('investment_transactions', async () => {
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
          }
        });
      },

      // 29. Investments
      async () => {
        await safeDelete('investments', async () => {
          await supabaseAdmin
            .from('investments')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 30. Transactions (depends on accounts)
      async () => {
        await safeDelete('transactions (account references)', async () => {
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
          }
        });
      },

      // 31. Check deposits
      async () => {
        await safeDelete('check_deposits', async () => {
          await supabaseAdmin
            .from('check_deposits')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 32. Crypto portfolio
      async () => {
        await safeDelete('crypto_portfolio', async () => {
          await supabaseAdmin
            .from('crypto_portfolio')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 33. Account requests
      async () => {
        await safeDelete('account_requests', async () => {
          await supabaseAdmin
            .from('account_requests')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 34. Accounts
      async () => {
        await safeDelete('accounts', async () => {
          await supabaseAdmin
            .from('accounts')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 35. Enrollments (depends on applications)
      async () => {
        await safeDelete('enrollments', async () => {
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
          }
        });
      },

      // 36. User ID documents
      async () => {
        await safeDelete('user_id_documents', async () => {
          await supabaseAdmin
            .from('user_id_documents')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 37. Applications
      async () => {
        await safeDelete('applications', async () => {
          await supabaseAdmin
            .from('applications')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 38. Notifications
      async () => {
        await safeDelete('notifications', async () => {
          await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 39. Beneficiaries
      async () => {
        await safeDelete('beneficiaries', async () => {
          await supabaseAdmin
            .from('beneficiaries')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 40. User security settings
      async () => {
        await safeDelete('user_security_settings', async () => {
          await supabaseAdmin
            .from('user_security_settings')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 41. Credit scores
      async () => {
        await safeDelete('credit_scores', async () => {
          await supabaseAdmin
            .from('credit_scores')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 42. Admin credit overrides
      async () => {
        await safeDelete('admin_credit_overrides', async () => {
          await supabaseAdmin
            .from('admin_credit_overrides')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 43. Audit logs
      async () => {
        await safeDelete('audit_logs', async () => {
          await supabaseAdmin
            .from('audit_logs')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 44. System logs
      async () => {
        await safeDelete('system_logs', async () => {
          await supabaseAdmin
            .from('system_logs')
            .delete()
            .or(`user_id.eq.${userIdToDelete},admin_id.eq.${userIdToDelete}`);
        });
      },

      // 45. Staff entries
      async () => {
        await safeDelete('staff', async () => {
          await supabaseAdmin
            .from('staff')
            .delete()
            .eq('id', userIdToDelete);
        });
      },

      // 46. Plaid accounts (depends on plaid_items)
      async () => {
        await safeDelete('plaid_accounts', async () => {
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
          }
        });
      },

      // 47. Plaid items
      async () => {
        await safeDelete('plaid_items', async () => {
          await supabaseAdmin
            .from('plaid_items')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 48. User crypto wallets
      async () => {
        await safeDelete('user_crypto_wallets', async () => {
          await supabaseAdmin
            .from('user_crypto_wallets')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 49. Admin assigned wallets (as admin)
      async () => {
        await safeDelete('admin_assigned_wallets (admin)', async () => {
          await supabaseAdmin
            .from('admin_assigned_wallets')
            .delete()
            .eq('admin_id', userIdToDelete);
        });
      },

      // 50. Admin assigned wallets (as user)
      async () => {
        await safeDelete('admin_assigned_wallets (user)', async () => {
          await supabaseAdmin
            .from('admin_assigned_wallets')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 51. Email queue
      async () => {
        await safeDelete('email_queue', async () => {
          await supabaseAdmin
            .from('email_queue')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 52. Email logs
      async () => {
        await safeDelete('email_logs', async () => {
          await supabaseAdmin
            .from('email_logs')
            .delete()
            .eq('recipient_user_id', userIdToDelete);
        });
      },

      // 53. Password reset OTPs
      async () => {
        await safeDelete('password_reset_otps', async () => {
          if (userEmail) {
            await supabaseAdmin
              .from('password_reset_otps')
              .delete()
              .eq('email', userEmail);
          }
        });
      },

      // 54. Chat messages sent by user (not in threads)
      async () => {
        await safeDelete('chat_messages (sender)', async () => {
          await supabaseAdmin
            .from('chat_messages')
            .delete()
            .eq('sender_id', userIdToDelete);
        });
      },

      // 55. User sessions
      async () => {
        await safeDelete('user_sessions', async () => {
          await supabaseAdmin
            .from('user_sessions')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 56. User preferences
      async () => {
        await safeDelete('user_preferences', async () => {
          await supabaseAdmin
            .from('user_preferences')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 57. User verification tokens
      async () => {
        await safeDelete('user_verification_tokens', async () => {
          await supabaseAdmin
            .from('user_verification_tokens')
            .delete()
            .eq('user_id', userIdToDelete);
        });
      },

      // 58. Email verifications
      async () => {
        await safeDelete('email_verifications', async () => {
          if (userEmail) {
            await supabaseAdmin
              .from('email_verifications')
              .delete()
              .eq('email', userEmail);
          }
        });
      },

      // 59. Admin profiles
      async () => {
        await safeDelete('admin_profiles', async () => {
          await supabaseAdmin
            .from('admin_profiles')
            .delete()
            .eq('id', userIdToDelete);
        });
      },

      // 60. Profile
      async () => {
        await safeDelete('profiles', async () => {
          await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userIdToDelete);
        });
      },
    ];

    // Execute all deletion steps
    for (const step of deletionSteps) {
      await step();
    }

    console.log(`✅ Database cleanup completed for user: ${userIdToDelete}`);

    // FINAL STEP: Delete from Supabase Auth LAST (after all database records are removed)
    console.log('🔐 Deleting user from Supabase authentication...');
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (authError) {
      console.error('❌ Error deleting from auth:', authError);
      return res.status(207).json({
        success: false,
        partialSuccess: true,
        error: 'Database records deleted but authentication deletion failed',
        details: authError.message,
        message: `All database records for ${userEmail || userIdToDelete} have been removed, but the authentication account could not be deleted. Please contact support.`,
        userId: userIdToDelete,
        email: userEmail || 'N/A',
      });
    }

    console.log('✅ Successfully deleted user from Supabase authentication');

    return res.status(200).json({
      success: true,
      message: `User ${userEmail || userIdToDelete} has been permanently deleted from all systems including authentication.`,
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
