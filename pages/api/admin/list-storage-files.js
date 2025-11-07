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
    const { bucket = 'documents' } = req.query;

    // List all files in the storage bucket
    const { data: files, error: listError } = await supabaseAdmin
      .storage
      .from(bucket)
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('Error listing storage files:', listError);
      return res.status(500).json({ 
        error: 'Failed to list storage files', 
        details: listError.message 
      });
    }

    // Get all user_id_documents from database
    const { data: dbDocuments, error: dbError } = await supabaseAdmin
      .from('user_id_documents')
      .select('*');

    if (dbError) {
      console.error('Error fetching database documents:', dbError);
    }

    // Create a map of files referenced in database
    const dbFileMap = new Set();
    if (dbDocuments) {
      dbDocuments.forEach(doc => {
        if (doc.front_url) {
          const fileName = doc.front_url.split('/').pop();
          dbFileMap.add(fileName);
        }
        if (doc.back_url) {
          const fileName = doc.back_url.split('/').pop();
          dbFileMap.add(fileName);
        }
      });
    }

    // Categorize files
    const categorizedFiles = files.map(file => ({
      ...file,
      inDatabase: dbFileMap.has(file.name),
      publicUrl: supabaseAdmin.storage.from(bucket).getPublicUrl(file.name).data.publicUrl
    }));

    return res.status(200).json({
      success: true,
      bucket: bucket,
      totalFiles: files.length,
      filesInDatabase: dbFileMap.size,
      orphanedFiles: categorizedFiles.filter(f => !f.inDatabase).length,
      files: categorizedFiles,
      databaseDocuments: dbDocuments || []
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
