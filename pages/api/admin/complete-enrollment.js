
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, applicationId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to find user' });
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    const completedAt = new Date().toISOString();

    // Update profile to mark enrollment as completed
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        enrollment_completed: true,
        enrollment_completed_at: completedAt,
        password_set: true,
        application_status: 'completed',
        updated_at: completedAt
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ error: 'Failed to update profile enrollment status' });
    }

    // Update application status if applicationId is provided
    if (applicationId) {
      const { error: applicationError } = await supabaseAdmin
        .from('applications')
        .update({
          application_status: 'completed',
          enrollment_completed: true,
          password_set: true,
          processed_at: completedAt
        })
        .eq('id', applicationId);

      if (applicationError) {
        console.error('Error updating application:', applicationError);
        // Don't fail for this
      }
    }

    // Mark enrollment record as used
    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .update({ 
        is_used: true,
        completed_at: completedAt
      })
      .eq('email', email);

    if (enrollmentError) {
      console.error('Error updating enrollment:', enrollmentError);
      // Don't fail for this
    }

    res.status(200).json({
      message: 'Enrollment completed successfully',
      email: email
    });

  } catch (error) {
    console.error('Error completing enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
