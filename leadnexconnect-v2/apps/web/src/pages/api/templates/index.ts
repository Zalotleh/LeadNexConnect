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
    // Add query parameters if any
    const queryParams = new URLSearchParams();
    if (req.query.category) queryParams.append('category', req.query.category as string);
    if (req.query.search) queryParams.append('search', req.query.search as string);
    
    const url = queryParams.toString() ? `${apiUrl}?${queryParams}` : apiUrl;

    // Forward the request to the backend API
    const fetchOptions: any = { method: req.method };

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
