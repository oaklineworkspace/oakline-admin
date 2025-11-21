import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('admin_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (adminError || !adminProfile) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method === 'POST') {
    return handleCreate(req, res, user);
  } else if (req.method === 'PUT') {
    return handleUpdate(req, res, user);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, user);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCreate(req, res, user) {
  try {
    const {
      restriction_reason_id,
      message_text,
      message_type,
      severity_level,
      is_default,
      display_order
    } = req.body;

    if (!restriction_reason_id || !message_text) {
      return res.status(400).json({ 
        error: 'Restriction reason ID and message text are required' 
      });
    }

    const messageData = {
      restriction_reason_id,
      message_text: message_text.trim(),
      message_type: message_type || 'standard',
      severity_level: severity_level || 'medium',
      is_default: is_default || false,
      display_order: display_order || 0
    };

    const { data, error } = await supabaseAdmin
      .from('restriction_display_messages')
      .insert([messageData])
      .select()
      .single();

    if (error) {
      console.error('Error creating display message:', error);
      return res.status(500).json({ 
        error: 'Failed to create display message',
        details: error
      });
    }

    return res.status(200).json({
      message: 'Display message created successfully',
      displayMessage: data
    });
  } catch (err) {
    console.error('Unexpected error in handleCreate:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: err.message 
    });
  }
}

async function handleUpdate(req, res, user) {
  try {
    const {
      id,
      restriction_reason_id,
      message_text,
      message_type,
      severity_level,
      is_default,
      display_order,
      is_active
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Display message ID is required' });
    }

    const updateData = {};
    if (restriction_reason_id !== undefined) updateData.restriction_reason_id = restriction_reason_id;
    if (message_text !== undefined) updateData.message_text = message_text.trim();
    if (message_type !== undefined) updateData.message_type = message_type;
    if (severity_level !== undefined) updateData.severity_level = severity_level;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('restriction_display_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating display message:', error);
      return res.status(500).json({ 
        error: 'Failed to update display message',
        details: error
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Display message not found' });
    }

    return res.status(200).json({
      message: 'Display message updated successfully',
      displayMessage: data
    });
  } catch (err) {
    console.error('Unexpected error in handleUpdate:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: err.message 
    });
  }
}

async function handleDelete(req, res, user) {
  try {
    const { id, soft_delete = true } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Display message ID is required' });
    }

    if (soft_delete) {
      const { data, error } = await supabaseAdmin
        .from('restriction_display_messages')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error deactivating display message:', error);
        return res.status(500).json({ 
          error: 'Failed to deactivate display message',
          details: error
        });
      }

      return res.status(200).json({
        message: 'Display message deactivated successfully',
        displayMessage: data
      });
    } else {
      const { error } = await supabaseAdmin
        .from('restriction_display_messages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting display message:', error);
        return res.status(500).json({ 
          error: 'Failed to delete display message',
          details: error
        });
      }

      return res.status(200).json({
        message: 'Display message permanently deleted'
      });
    }
  } catch (err) {
    console.error('Unexpected error in handleDelete:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: err.message 
    });
  }
}
