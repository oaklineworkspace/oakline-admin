
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
    const validTableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validTableNameRegex.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Get column information
    const { data: columnsData, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      throw columnsError;
    }

    if (!columnsData || columnsData.length === 0) {
      return res.status(404).json({ error: 'Table not found or has no columns' });
    }

    // Build query
    let query = supabaseAdmin.from(tableName).select('*', { count: 'exact' });

    // Apply search if provided
    if (searchTerm && searchTerm.trim()) {
      const searchColumns = columnsData.filter(col => 
        ['text', 'character varying', 'character', 'uuid'].includes(col.data_type)
      );
      
      if (searchColumns.length > 0) {
        // Use OR filter for text search across multiple columns
        const orFilters = searchColumns.map(col => 
          `${col.column_name}.ilike.%${searchTerm.trim()}%`
        ).join(',');
        query = query.or(orFilters);
      }
    }

    // Apply sorting
    if (sortColumn && validTableNameRegex.test(sortColumn)) {
      const columnExists = columnsData.find(col => col.column_name === sortColumn);
      if (columnExists) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      }
    } else {
      // Default sort by first column
      query = query.order(columnsData[0].column_name);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching table data:', error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      columns: columnsData,
      totalRows: count || 0,
      currentPage: page,
      limit
    });

  } catch (error) {
    console.error('Error in get-table-data:', error);
    return res.status(500).json({
      error: 'Failed to fetch table data',
      details: error.message
    });
  }
}
