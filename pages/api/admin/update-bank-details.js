import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseServerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No authorization token' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseServerClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { bankDetails } = req.body;

    if (!bankDetails) {
      return res.status(400).json({ error: 'Bank details are required' });
    }

    const allFields = Object.keys(bankDetails);
    const emailFieldsToUpdate = allFields.filter(field => field.startsWith('email_'));

    for (const columnName of emailFieldsToUpdate) {
      const columnValue = bankDetails[columnName];
      
      if (!columnValue || columnValue.trim() === '') continue;

      if (!/^email_[a-z_]+$/.test(columnName)) {
        console.warn(`Skipping invalid column name: ${columnName}`);
        continue;
      }

      try {
        const { error: addColumnError } = await supabaseAdmin.rpc(
          'add_bank_details_column_if_not_exists',
          { column_name: columnName }
        );

        if (addColumnError) {
          console.error(`Error adding column ${columnName}:`, addColumnError);
        } else {
          console.log(`✅ Column ${columnName} is ready`);
        }
      } catch (err) {
        console.warn(`Column check/creation warning for ${columnName}:`, err.message);
      }
    }

    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('bank_details')
      .select('id')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let result;
    if (existingRecord) {
      const updateData = {
        ...bankDetails,
        updated_at: new Date().toISOString()
      };

      result = await supabaseAdmin
        .from('bank_details')
        .update(updateData)
        .eq('id', existingRecord.id)
        .select()
        .single();
    } else {
      const insertData = {
        ...bankDetails,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      result = await supabaseAdmin
        .from('bank_details')
        .insert([insertData])
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return res.status(200).json({
      success: true,
      message: 'Bank details updated successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error updating bank details:', error);
    return res.status(500).json({
      error: 'Failed to update bank details',
      details: error.message
    });
  }
}
