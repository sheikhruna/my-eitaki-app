// netlify/functions/analyze-ingredient.js
// Purpose: Secure proxy for Gemini API calls
// Developer Note: API key is stored in Netlify Environment Variables (not in code)

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from Netlify environment variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured in Netlify');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API configuration error' })
    };
  }

  try {
    // Parse the request body (ingredients sent from PWA)
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Call Gemini API (server-side, API key hidden)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    const data = await geminiResponse.json();

    // Return Gemini's response to the PWA
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allows PWA to call this function
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to analyze ingredients',
        details: error.message 
      })
    };
  }
};
