
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
    // Query to get all tables in the public schema
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }

    const tables = data.map(row => row.table_name).filter(name => 
      !name.startsWith('pg_') && !name.startsWith('sql_')
    );

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
