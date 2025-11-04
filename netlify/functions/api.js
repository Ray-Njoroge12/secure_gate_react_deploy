const { createProxyMiddleware } = require('http-proxy-middleware');

// Backend ALB URL in af-south-1 for ODPC compliance
const BACKEND_URL = 'http://secure-gate-alb-148297441.af-south-1.elb.amazonaws.com';

exports.handler = async (event, context) => {
  const { path, httpMethod, headers, body, queryStringParameters } = event;
  
  // Extract API path (remove /api prefix for backend)
  const apiPath = path.replace('/.netlify/functions/api', '');
  const targetUrl = `${BACKEND_URL}/api${apiPath}`;
  
  try {
    const fetch = require('node-fetch');
    
    // Prepare request options
    const requestOptions = {
      method: httpMethod,
      headers: {
        ...headers,
        host: undefined, // Remove original host header
      },
    };
    
    // Add body for POST/PUT requests
    if (body && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
      requestOptions.body = body;
    }
    
    // Add query parameters
    let url = targetUrl;
    if (queryStringParameters) {
      const params = new URLSearchParams(queryStringParameters);
      url += `?${params.toString()}`;
    }
    
    console.log(`Proxying ${httpMethod} ${url}`);
    
    const response = await fetch(url, requestOptions);
    const responseBody = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: responseBody,
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Backend connection failed',
        message: error.message,
        backend_url: BACKEND_URL 
      }),
    };
  }
};
