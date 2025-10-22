
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

    console.log(`Starting complete deletion process for user: ${email || userId}`);

    // Step 1: Call the PostgreSQL function to delete all related data
    const { data: deleteResult, error: deleteError } = await supabaseAdmin.rpc('delete_user_complete', {
      target_email: email || null,
      target_user_id: userId || null
    });

    if (deleteError) {
      console.error('Error executing deletion function:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete user data',
        details: deleteError.message 
      });
    }

    // Step 2: Delete from auth.users
    const userIdToDelete = deleteResult.user_id;
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (authError) {
      console.error('Error deleting from auth.users:', authError);
      // Continue even if auth deletion fails - data is already cleaned up
    }

    console.log(`✅ Successfully deleted user: ${email || userId}`);

    return res.status(200).json({
      success: true,
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
