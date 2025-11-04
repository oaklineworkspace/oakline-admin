
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
    // Query to get all tables in the public schema using raw SQL
    const { data, error } = await supabaseAdmin.rpc('get_public_tables', {});

    if (error) {
      // Fallback: Try direct SQL query if RPC function doesn't exist
      const { data: tablesData, error: sqlError } = await supabaseAdmin
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .order('tablename');

      if (sqlError) {
        console.error('Error fetching tables:', sqlError);
        throw new Error('Unable to fetch database tables');
      }

      const tables = (tablesData || [])
        .map(row => row.tablename)
        .filter(name => !name.startsWith('pg_') && !name.startsWith('sql_'));

      return res.status(200).json({
        success: true,
        tables
      });
    }

    const tables = (data || []).filter(name => 
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
