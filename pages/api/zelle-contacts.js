
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getContacts(req, res);
      case 'POST':
        return await addContact(req, res);
      case 'DELETE':
        return await deleteContact(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Zelle contacts API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getContacts(req, res) {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const { data: contacts, error } = await supabase
    .from('zelle_contacts')
    .select('*')
    .eq('user_id', user_id)
    .order('name');

  if (error) throw error;

  res.status(200).json({ contacts: contacts || [] });
}

async function addContact(req, res) {
  const { user_id, name, email, phone } = req.body;

  if (!user_id || !name || (!email && !phone)) {
    return res.status(400).json({ 
      error: 'User ID, name, and either email or phone are required' 
    });
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }

  // Validate phone format if provided
  if (phone) {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
  }

  // Check if contact already exists
  const { data: existing } = await supabase
    .from('zelle_contacts')
    .select('id')
    .eq('user_id', user_id)
    .or(`email.eq.${email || ''},phone.eq.${phone || ''}`);

  if (existing && existing.length > 0) {
    return res.status(409).json({ error: 'Contact already exists' });
  }

  const { data: contact, error } = await supabase
    .from('zelle_contacts')
    .insert([{
      user_id,
      name,
      email: email || null,
      phone: phone || null,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;

  res.status(201).json({ 
    success: true,
    contact,
    message: 'Contact added successfully'
  });
}

async function deleteContact(req, res) {
  const { contact_id, user_id } = req.body;

  if (!contact_id || !user_id) {
    return res.status(400).json({ error: 'Contact ID and User ID are required' });
  }

  const { error } = await supabase
    .from('zelle_contacts')
    .delete()
    .eq('id', contact_id)
    .eq('user_id', user_id);

  if (error) throw error;

  res.status(200).json({ 
    success: true,
    message: 'Contact deleted successfully'
  });
}
