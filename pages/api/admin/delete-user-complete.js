
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log(`Starting complete deletion process for user: ${email}`);

    // Execute the SQL script via RPC or direct query
    const { error: deleteError } = await supabaseAdmin.rpc('delete_user_complete', {
      target_email: email
    });

    if (deleteError) {
      console.error('Error executing deletion script:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete user completely',
        details: deleteError.message 
      });
    }

    console.log(`✅ Successfully deleted user: ${email}`);

    return res.status(200).json({
      message: '✅ User and all related data deleted successfully',
      email: email
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
