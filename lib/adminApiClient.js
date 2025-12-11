
import { supabase } from './supabaseClient';

export async function adminApiCall(url, options = {}) {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        throw new Error('Session expired. Please log in again.');
      }
    }

    const currentSession = session || (await supabase.auth.getSession()).data.session;
    
    // Make API call with fresh token
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle 401 errors by attempting one retry with refreshed token
    if (response.status === 401) {
      const { data: { session: retrySession }, error: retryError } = await supabase.auth.refreshSession();
      
      if (retryError || !retrySession) {
        throw new Error('Session expired. Please log in again.');
      }

      // Retry with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${retrySession.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      return retryResponse;
    }

    return response;
  } catch (error) {
    console.error('Admin API call failed:', error);
    throw error;
  }
}

// Helper for GET requests
export async function adminGet(url) {
  const response = await adminApiCall(url, { method: 'GET' });
  return response.json();
}

// Helper for POST requests
export async function adminPost(url, data) {
  const response = await adminApiCall(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

// Helper for PUT requests
export async function adminPut(url, data) {
  const response = await adminApiCall(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

// Helper for DELETE requests
export async function adminDelete(url) {
  const response = await adminApiCall(url, { method: 'DELETE' });
  return response.json();
}
