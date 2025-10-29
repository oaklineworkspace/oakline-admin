
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminId } = req.body;

  if (!adminId) {
    return res.status(400).json({ error: 'Admin ID is required' });
  }

  try {
    // Verify the requesting user is a super admin
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    
    if (session) {
      const { data: requestingAdmin } = await supabaseAdmin
        .from('admin_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!requestingAdmin || requestingAdmin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only super admins can delete admins' });
      }
    }

    // Delete from admin_profiles first
    const { error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .delete()
      .eq('id', adminId);

    if (profileError) {
      console.error('Profile deletion error:', profileError);
      return res.status(500).json({ error: 'Failed to delete admin profile' });
    }

    // Delete from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(adminId);

    if (authError) {
      console.error('Auth deletion error:', authError);
      return res.status(500).json({ error: 'Failed to delete admin user' });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    console.error('Admin deletion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
