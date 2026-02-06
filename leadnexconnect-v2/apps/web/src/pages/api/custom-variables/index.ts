import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  // Construct the API URL - handle both http://localhost:4000 and http://localhost:4000/api formats
  const apiUrl = backendUrl.endsWith('/api') 
    ? `${backendUrl}/custom-variables`
    : `${backendUrl}/api/custom-variables`;

  try {
    const { method, query } = req;
    const queryParams = new URLSearchParams();
    
    // Add query parameters
    if (query.search) queryParams.append('search', query.search as string);
    if (query.category) queryParams.append('category', query.category as string);
    if (query.isActive) queryParams.append('isActive', query.isActive as string);

    const queryString = queryParams.toString();
    const url = queryString ? `${apiUrl}?${queryString}` : apiUrl;

    // Prepare request options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST requests
    if (method === 'POST' && req.body) {
      const hasBody = 
        req.body &&
        typeof req.body === 'object' &&
        Object.keys(req.body).length > 0;

      if (hasBody) {
        options.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(url, options);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Custom variables API proxy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
