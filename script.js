/**
 * Vercel Serverless Function: Submit Survey Responses to Supabase
 * 
 * This function:
 * - Accepts survey data from the frontend
 * - Validates the payload
 * - Submits to Supabase using secure environment variables
 * - Returns success/error responses
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Your Supabase anon key
 * 
 * Deploy:
 * - This file should be in /api/submit-survey.js in your Vercel project
 * - Environment variables are set in Vercel Dashboard › Project › Settings › Environment Variables
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({ 
        message: 'Server configuration error. Please contact the administrator.' 
      });
    }

    // Get survey data from request body
    const payload = req.body;

    // Basic validation
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ message: 'Invalid request payload' });
    }

    // Validate required fields
    const requiredFields = ['age', 'gender', 'program', 'status', 'ai_freq', 'prior_ai'];
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Validate at least one rating was selected
    const hasRatings = Object.keys(payload).some(key => 
      (key.startsWith('CC') || key.startsWith('EC') || key.startsWith('UC')) && 
      typeof payload[key] === 'number'
    );

    if (!hasRatings) {
      return res.status(400).json({ 
        message: 'No ratings found in payload' 
      });
    }

    payload.ip = payload.addr
    delete payload.addr
    // Submit to Supabase
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/survey_responses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      }
    );

    // Handle Supabase response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase error:', response.status, errorText);
      
      return res.status(response.status).json({
        message: 'Failed to save survey response. Please try again.',
        error: errorText,
      });
    }

    console.log('✓ Survey response saved successfully');
    return res.status(200).json({ 
      success: true,
      message: 'Survey submitted successfully' 
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return res.status(500).json({ 
      message: 'An unexpected error occurred. Please try again.',
      error: error.message,
    });
  }
}