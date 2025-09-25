
export const apiRequest = async (method, url, data = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};
