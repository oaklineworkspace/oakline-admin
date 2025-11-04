import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { tableName, page = 1, limit = 50, sortColumn, sortDirection = 'asc', searchTerm } = req.body;

    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Build query
    let query = supabaseAdmin.from(tableName).select('*', { count: 'exact' });

    // Apply sorting
    if (sortColumn && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortColumn)) {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching table data:', error);
      throw error;
    }

    // Get column information from actual data if available
    let columns = [];
    if (data && data.length > 0) {
      columns = Object.keys(data[0]).map(key => ({
        column_name: key,
        data_type: typeof data[0][key]
      }));
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      columns: columns || [],
      totalRows: count || 0
    });

  } catch (error) {
    console.error('Error in get-table-data:', error);
    return res.status(500).json({
      error: 'Failed to fetch table data',
      details: error.message
    });
  }
}