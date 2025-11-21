import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'POST') {
      const { 
        action_type, 
        category, 
        reason_text, 
        contact_email, 
        severity_level, 
        requires_immediate_action, 
        display_order 
      } = req.body;

      if (!action_type || !category || !reason_text || !contact_email) {
        return res.status(400).json({ 
          error: 'Missing required fields: action_type, category, reason_text, contact_email' 
        });
      }

      const { data: newReason, error: insertError } = await supabaseAdmin
        .from('account_restoration_reasons')
        .insert({
          action_type,
          category,
          reason_text,
          contact_email,
          severity_level: severity_level || 'medium',
          requires_immediate_action: requires_immediate_action || false,
          display_order: display_order || 0,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating restoration reason:', insertError);
        return res.status(500).json({ 
          error: 'Failed to create restoration reason',
          details: insertError 
        });
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Restoration reason created successfully',
        reason: newReason 
      });
    }

    if (req.method === 'PUT') {
      const { 
        id,
        action_type, 
        category, 
        reason_text, 
        contact_email, 
        severity_level, 
        requires_immediate_action, 
        display_order,
        is_active
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing reason ID' });
      }

      const updateData = {};
      if (action_type !== undefined) updateData.action_type = action_type;
      if (category !== undefined) updateData.category = category;
      if (reason_text !== undefined) updateData.reason_text = reason_text;
      if (contact_email !== undefined) updateData.contact_email = contact_email;
      if (severity_level !== undefined) updateData.severity_level = severity_level;
      if (requires_immediate_action !== undefined) updateData.requires_immediate_action = requires_immediate_action;
      if (display_order !== undefined) updateData.display_order = display_order;
      if (is_active !== undefined) updateData.is_active = is_active;
      updateData.updated_at = new Date().toISOString();

      const { data: updatedReason, error: updateError } = await supabaseAdmin
        .from('account_restoration_reasons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating restoration reason:', updateError);
        return res.status(500).json({ 
          error: 'Failed to update restoration reason',
          details: updateError 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Restoration reason updated successfully',
        reason: updatedReason 
      });
    }

    if (req.method === 'DELETE') {
      const { id, soft_delete } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing reason ID' });
      }

      if (soft_delete) {
        const { data: deactivatedReason, error: deactivateError } = await supabaseAdmin
          .from('account_restoration_reasons')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (deactivateError) {
          console.error('Error deactivating restoration reason:', deactivateError);
          return res.status(500).json({ 
            error: 'Failed to deactivate restoration reason',
            details: deactivateError 
          });
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Restoration reason deactivated successfully',
          reason: deactivatedReason 
        });
      } else {
        const { error: deleteError } = await supabaseAdmin
          .from('account_restoration_reasons')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Error deleting restoration reason:', deleteError);
          return res.status(500).json({ 
            error: 'Failed to delete restoration reason',
            details: deleteError 
          });
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Restoration reason deleted permanently' 
        });
      }
    }
  } catch (error) {
    console.error('Server error in manage-restoration-reason:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
