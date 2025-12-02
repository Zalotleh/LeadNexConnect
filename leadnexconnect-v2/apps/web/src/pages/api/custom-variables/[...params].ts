import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const { params } = req.query;

  try {
    // Construct path from params array
    const path = Array.isArray(params) ? params.join('/') : params;
    const url = `${API_URL}/api/custom-variables/${path}`;

    // Prepare request options
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add body for PUT/POST requests
    if ((req.method === 'PUT' || req.method === 'POST') && req.body) {
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
