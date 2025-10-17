
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Try to fetch from applications table (real bank customers)
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (appError) {
      console.error('Error fetching users from applications:', appError);
      return res.status(200).json({
        success: true,
        users: []
      });
    }

    // Format applications as users
    const formattedUsers = applications?.map(app => ({
      id: app.id,
      email: app.email,
      name: `${app.first_name || ''} ${app.middle_name ? app.middle_name + ' ' : ''}${app.last_name || ''}`.trim(),
      created_at: app.created_at,
      phone: app.phone,
      status: app.status || 'pending'
    })) || [];

    return res.status(200).json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json({
      success: true,
      users: []
    });
  }
}
