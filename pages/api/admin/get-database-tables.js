import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    // Call the PostgreSQL function to get table names
    const { data, error } = await supabaseAdmin.rpc('get_public_tables');

    if (error) {
      console.error('Error fetching tables:', error);
      return res.status(500).json({
        error: 'Failed to fetch database tables',
        details: error.message,
        hint: 'Please run the create_get_tables_function.sql in your Supabase SQL editor'
      });
    }

    // Extract table names and filter system tables
    const tables = (data || [])
      .map(row => row.table_name)
      .filter(name => !name.startsWith('pg_') && !name.startsWith('sql_'));

    return res.status(200).json({
      success: true,
      tables
    });

  } catch (error) {
    console.error('Error in get-database-tables:', error);
    return res.status(500).json({
      error: 'Failed to fetch database tables',
      details: error.message
    });
  }
}