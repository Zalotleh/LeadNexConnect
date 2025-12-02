import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  // Construct the API URL
  const apiUrl = backendUrl.endsWith('/api') 
    ? `${backendUrl}/templates`
    : `${backendUrl}/api/templates`;

  try {
    // req.query.params can be a string or array for catch-all routes
    const params = req.query.params;
    let path = '';
    if (Array.isArray(params)) {
      path = params.map(encodeURIComponent).join('/');
    } else if (typeof params === 'string') {
      path = encodeURIComponent(params);
    }

    const url = path ? `${apiUrl}/${path}` : apiUrl;

    // Forward the request to the backend API
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
