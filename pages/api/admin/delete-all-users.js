
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { confirmation } = req.body;

    // Safety check - require explicit confirmation
    if (confirmation !== 'DELETE_ALL_USERS') {
      return res.status(400).json({ 
        error: 'Confirmation required. Send { "confirmation": "DELETE_ALL_USERS" } to proceed.' 
      });
    }

    console.log('Starting bulk user deletion process...');

    // Fetch all users from Supabase Auth
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to list users' });
    }

    if (!users || users.users.length === 0) {
      return res.status(200).json({ 
        message: 'No users found to delete',
        results: []
      });
    }

    console.log(`Found ${users.users.length} users to delete`);

    const results = [];

    // Delete each user and their related data
    for (const user of users.users) {
      // Try multiple sources for email
      const userEmail = user.email || 
                       user.user_metadata?.email || 
                       user.raw_user_meta_data?.email ||
                       user.identities?.[0]?.identity_data?.email;
      const userId = user.id;
      
      try {
        console.log(`Deleting user: ${userEmail} (${userId})`);
        console.log('User object:', JSON.stringify(user, null, 2));

        // Delete related data in order (to avoid foreign key constraints)
        
        // 1. Delete enrollments first (try both email and user_id)
        let enrollmentsError = null;
        if (userEmail) {
          const { error: enrollError1 } = await supabaseAdmin
            .from('enrollments')
            .delete()
            .eq('email', userEmail);
          enrollmentsError = enrollError1;
        }
        
        // Also try by user_id if exists
        const { error: enrollError2 } = await supabaseAdmin
          .from('enrollments')
          .delete()
          .eq('user_id', userId);
        
        if (!enrollmentsError) enrollmentsError = enrollError2;

        // 2. Delete applications (try both email and user_id)
        let applicationsError = null;
        if (userEmail) {
          const { error: appError1 } = await supabaseAdmin
            .from('applications')
            .delete()
            .eq('email', userEmail);
          applicationsError = appError1;
        }
        
        // Also try by user_id
        const { error: appError2 } = await supabaseAdmin
          .from('applications')
          .delete()
          .eq('user_id', userId);
        
        if (!applicationsError) applicationsError = appError2;

        // 3. Try to delete accounts (handle column name issues)
        let accountsError = null;
        try {
          const { error: accError } = await supabaseAdmin
            .from('accounts')
            .delete()
            .eq('email', userEmail);
          accountsError = accError;
        } catch (accErr) {
          // Try with user_email if email column doesn't exist
          try {
            const { error: accError2 } = await supabaseAdmin
              .from('accounts')
              .delete()
              .eq('user_email', userEmail);
            accountsError = accError2;
          } catch (accErr2) {
            accountsError = accErr2;
          }
        }

        // 4. Try to delete from users table if it exists
        let usersError = null;
        try {
          const { error: uError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('email', userEmail);
          usersError = uError;
        } catch (uErr) {
          // Try with different column name
          try {
            const { error: uError2 } = await supabaseAdmin
              .from('users')
              .delete()
              .eq('user_email', userEmail);
            usersError = uError2;
          } catch (uErr2) {
            usersError = uErr2;
          }
        }

        // 5. Force delete the user from Supabase Auth with multiple strategies
        let deleteError = null;
        let authDeleted = false;
        
        // Strategy 1: Normal delete
        try {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (!error) {
            console.log(`✅ Auth user deleted normally: ${userEmail}`);
            authDeleted = true;
          } else {
            console.log(`❌ Normal deletion failed: ${error.message}`);
            deleteError = error;
          }
        } catch (err) {
          console.log(`❌ Normal deletion threw error: ${err.message}`);
          deleteError = err;
        }
        
        // Strategy 2: Force delete with shouldSoftDelete
        if (!authDeleted) {
          try {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, false); // shouldSoftDelete = false for hard delete
            if (!error) {
              console.log(`✅ Auth user force deleted: ${userEmail}`);
              authDeleted = true;
            } else {
              console.log(`❌ Force deletion failed: ${error.message}`);
              deleteError = error;
            }
          } catch (err) {
            console.log(`❌ Force deletion threw error: ${err.message}`);
            deleteError = err;
          }
        }
        
        // Strategy 3: Try to mark as deleted if deletion fails
        if (!authDeleted) {
          try {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
              email_confirm: false,
              banned_until: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            });
            
            if (!error) {
              console.log(`⚠️ Auth user disabled instead of deleted: ${userEmail}`);
              authDeleted = false; // Still mark as failed since not actually deleted
            }
          } catch (err) {
            console.log(`❌ Could not disable user: ${err.message}`);
          }
        }

        if (!authDeleted) {
          console.error(`Failed to delete auth user ${userEmail} after 3 attempts:`, deleteError);
          results.push({
            userId,
            email: userEmail,
            success: false,
            error: deleteError?.message || 'Auth deletion failed after retries',
            deletedEnrollments: !enrollmentsError,
            deletedAccounts: !accountsError,
            deletedApplications: !applicationsError,
            deletedUsers: !usersError,
            deletedAuth: false,
            attempts: 3
          });
        } else {
          console.log(`✅ Successfully deleted user: ${userEmail}`);
          results.push({
            userId,
            email: userEmail,
            success: true,
            deletedEnrollments: !enrollmentsError,
            deletedAccounts: !accountsError,
            deletedApplications: !applicationsError,
            deletedUsers: !usersError,
            deletedAuth: true
          });
        }

      } catch (userError) {
        console.error(`Error processing user ${userEmail}:`, userError);
        results.push({
          userId,
          email: userEmail,
          success: false,
          error: userError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Bulk deletion completed: ${successCount} successful, ${failureCount} failed`);

    res.status(200).json({
      message: `Bulk user deletion completed`,
      summary: {
        totalUsers: users.users.length,
        successful: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
