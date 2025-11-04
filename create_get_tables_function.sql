-- SQL function to get all public tables for the database explorer
-- This function is required for the /admin/database-explorer page to work

CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE (table_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT tablename::text
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_public_tables() TO authenticated;

-- Comment explaining the function
COMMENT ON FUNCTION get_public_tables() IS 'Returns a list of all tables in the public schema for the admin database explorer';
