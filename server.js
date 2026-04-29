const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Replaces manual CORS headers and OPTIONS preflight handling
app.use(express.json()); // Essential for parsing req.body

// The Route
app.post('/api/survey', async (req, res) => {
  try {
    // 1. Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({ 
        message: 'Server configuration error. Please contact the administrator.' 
      });
    }

    // 2. Get survey data from request body
    const payload = req.body;

    // 3. Basic validation
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ message: 'Invalid request payload' });
    }

    // 4. Validate required fields
    const requiredFields = ['age', 'gender', 'program', 'status', 'ai_freq', 'prior_ai'];
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // 5. Validate at least one rating was selected
    const hasRatings = Object.keys(payload).some(key => 
      (key.startsWith('CC') || key.startsWith('EC') || key.startsWith('UC')) && 
      typeof payload[key] === 'number'
    );

    if (!hasRatings) {
      return res.status(400).json({ 
        message: 'No ratings found in payload' 
      });
    }

    // 6. Data manipulation
    payload.ip = payload.addr;
    delete payload.addr;

    // 7. Submit to Supabase
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

    // 8. Handle Supabase response
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
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});