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
