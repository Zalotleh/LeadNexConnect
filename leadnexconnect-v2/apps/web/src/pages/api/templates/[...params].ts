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
      const fetchOptions: any = { method: req.method };

      // Only include a body if it contains meaningful content. Passing an empty
      // string through JSON.stringify can result in '""' being sent which trips
      // the backend JSON parser. Detect and avoid that.
      const hasBody =
        req.method !== 'GET' &&
        req.body !== undefined &&
        req.body !== null &&
        !(typeof req.body === 'string' && req.body.trim() === '') &&
        !(typeof req.body === 'object' && Object.keys(req.body as any).length === 0);

      if (hasBody) {
        fetchOptions.body = JSON.stringify(req.body);
        fetchOptions.headers = { 'Content-Type': 'application/json' };
      } else {
        fetchOptions.headers = {};
      }

      const response = await fetch(url, fetchOptions);

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
