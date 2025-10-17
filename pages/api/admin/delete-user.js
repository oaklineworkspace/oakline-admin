
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.body;
    
    let userIdToDelete = userId;
    
    // If email provided, find the user ID
    if (!userId && email) {
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users:', listError);
        return res.status(500).json({ error: 'Failed to find user by email' });
      }
      
      const user = existingUsers?.users?.find(u => u.email === email);
      if (!user) {
        return res.status(404).json({ error: 'User not found with provided email' });
      }
      
      userIdToDelete = user.id;
      console.log(`Found user ID ${userIdToDelete} for email ${email}`);
    }
    
    if (!userIdToDelete) {
      return res.status(400).json({ error: 'userId or email is required' });
    }

    console.log(`Starting deletion process for user: ${userIdToDelete}`);

    // Delete enrollments by email if provided, otherwise try by user_id
    if (email) {
      const { error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .delete()
        .eq('email', email);
      if (enrollError) console.warn(`⚠️ Failed to delete enrollments:`, enrollError.message);
    }

    // --- Delete dependent records in proper order ---
    // Order matters: delete child records before parent records
    const deleteQueries = [
      // Delete transactions and transfers first (most dependent)
      { table: 'zelle_transactions', column: 'sender_id' },
      { table: 'zelle_transactions', column: 'recipient_user_id' },
      { table: 'internal_transfers', column: 'user_id' },
      { table: 'card_transactions', column: 'card_id', needsSubquery: true },
      { table: 'transactions', column: 'user_id' },
      
      // Delete loan-related records
      { table: 'loan_payments', column: 'user_id' },
      { table: 'loans', column: 'user_id' },
      
      // Delete investment and crypto records
      { table: 'investments', column: 'user_id' },
      { table: 'crypto_portfolio', column: 'user_id' },
      
      // Delete cards and card applications
      { table: 'cards', column: 'user_id' },
      { table: 'card_applications', column: 'user_id' },
      
      // Delete Zelle settings and contacts
      { table: 'zelle_settings', column: 'user_id' },
      { table: 'zelle_contacts', column: 'user_id' },
      
      // Delete beneficiaries and notifications
      { table: 'beneficiaries', column: 'user_id' },
      { table: 'notifications', column: 'user_id' },
      
      // Delete security settings
      { table: 'user_security_settings', column: 'user_id' },
      
      // Delete accounts and applications
      { table: 'accounts', column: 'user_id' },
      { table: 'applications', column: 'user_id' },
      
      // Delete profile last (before auth)
      { table: 'profiles', column: 'id' },
      
      // Note: audit_log is intentionally kept for historical records
    ];

    for (const { table, column, needsSubquery } of deleteQueries) {
      try {
        if (needsSubquery && table === 'card_transactions') {
          // Delete card transactions for cards owned by this user
          const { data: userCards } = await supabaseAdmin
            .from('cards')
            .select('id')
            .eq('user_id', userIdToDelete);
          
          if (userCards && userCards.length > 0) {
            const cardIds = userCards.map(c => c.id);
            const { error } = await supabaseAdmin
              .from('card_transactions')
              .delete()
              .in('card_id', cardIds);
            if (error) console.warn(`⚠️ Failed to delete from ${table}:`, error.message);
            else console.log(`✅ Deleted card_transactions for user ${userIdToDelete}`);
          }
        } else {
          const { error, count } = await supabaseAdmin
            .from(table)
            .delete()
            .eq(column, userIdToDelete);
          
          if (error) {
            // Table might not exist, log warning but continue
            console.warn(`⚠️ Failed to delete from ${table}:`, error.message);
          } else {
            console.log(`✅ Deleted from ${table} (column: ${column})`);
          }
        }
      } catch (tableError) {
        // Continue even if a table doesn't exist
        console.warn(`⚠️ Error deleting from ${table}:`, tableError.message);
      }
    }

    // Finally delete user from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    if (authError) {
      console.error('❌ Error deleting user from authentication:', authError.message);
      return res.status(500).json({ 
        error: 'Failed to delete user from authentication',
        details: authError.message 
      });
    }

    console.log(`✅ Successfully deleted user: ${userIdToDelete}`);

    return res.status(200).json({
      message: '✅ User and all related data deleted successfully',
      userId: userIdToDelete,
      email: email || 'N/A'
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
