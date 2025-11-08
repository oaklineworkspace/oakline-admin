
import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentType, frontImage, backImage, email, applicationId } = req.body;

    if (!documentType || !frontImage) {
      return res.status(400).json({ error: 'Document type and front image are required' });
    }

    // Try to get authenticated user (may not exist during application)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // Require either authenticated user OR email+applicationId
    if (!userId && (!email || !applicationId)) {
      return res.status(400).json({ 
        error: 'Either authenticated session or email and applicationId are required' 
      });
    }

    // Generate unique filenames
    const timestamp = Date.now();
    const frontFileName = `${userId}_${documentType}_front_${timestamp}.jpg`;
    const backFileName = backImage ? `${userId}_${documentType}_back_${timestamp}.jpg` : null;

    // Upload front image to storage
    const frontBuffer = Buffer.from(frontImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { error: frontUploadError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(frontFileName, frontBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (frontUploadError) {
      console.error('Front upload error:', frontUploadError);
      return res.status(500).json({ error: 'Failed to upload front image', details: frontUploadError.message });
    }

    const frontUrl = `documents/${frontFileName}`;
    let backUrl = null;

    // Upload back image if provided
    if (backImage) {
      const backBuffer = Buffer.from(backImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const { error: backUploadError } = await supabaseAdmin
        .storage
        .from('documents')
        .upload(backFileName, backBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (backUploadError) {
        console.error('Back upload error:', backUploadError);
        // Clean up front image
        await supabaseAdmin.storage.from('documents').remove([frontFileName]);
        return res.status(500).json({ error: 'Failed to upload back image', details: backUploadError.message });
      }

      backUrl = `documents/${backFileName}`;
    }

    // Create database record with all available identifiers
    const documentRecord = {
      user_id: userId,
      email: email || session?.user?.email,
      application_id: applicationId || null,
      document_type: documentType,
      front_url: frontUrl,
      back_url: backUrl,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('Creating document record:', documentRecord);

    const { data: docRecord, error: dbError } = await supabaseAdmin
      .from('user_id_documents')
      .insert(documentRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded files
      await supabaseAdmin.storage.from('documents').remove([frontFileName]);
      if (backFileName) {
        await supabaseAdmin.storage.from('documents').remove([backFileName]);
      }
      return res.status(500).json({ error: 'Failed to create document record', details: dbError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      document: docRecord
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
