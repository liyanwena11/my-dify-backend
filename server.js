// Import required modules
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

// --- Server Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing (CORS) for all routes
app.use(cors()); 
// Use multer for handling multipart/form-data (file uploads)
// We'll store the file in memory temporarily.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Dify API Configuration ---
// Get Dify credentials and URL from environment variables
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_FILE_UPLOAD_URL = `${process.env.DIFY_API_URL}/files/upload`;

// --- API Route ---
/**
 * @route   POST /api/analyzeFace
 * @desc    Receives an image from the client, forwards it to Dify for analysis,
 *          and returns the analysis result.
 * @access  Public
 */
app.post('/api/analyzeFace', upload.single('file'), async (req, res) => {
  // 1. Check if the API key is configured
  if (!DIFY_API_KEY) {
    console.error('Dify API key is not configured.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  // 2. Check if a file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    // 3. Prepare the data to be sent to Dify
    const formData = new FormData();
    // The 'file' field must match the name Dify's API expects.
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    // Add any other required form fields, like the user ID.
    formData.append('user', 'wechat-miniprogram-user'); // Example user ID

    // 4. Make the request to Dify's file upload API
    console.log('Forwarding file to Dify...');
    const difyResponse = await axios.post(DIFY_FILE_UPLOAD_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${DIFY_API_KEY}`,
      },
    });

    // 5. Log Dify's response and send it back to the client
    console.log('Received response from Dify:', difyResponse.data);
    
    // NOTE: This example assumes you want to run a workflow after uploading.
    // You would take the `id` from `difyResponse.data` and make another
    // request to the workflow execution endpoint here.
    // For simplicity, we'll return the file upload confirmation directly.
    
    res.status(200).json(difyResponse.data);

  } catch (error) {
    console.error('Error forwarding request to Dify:', error.response ? error.response.data : error.message);
    res.status(error.response ? error.response.status : 500).json({
      error: 'Failed to analyze the image.',
      details: error.response ? error.response.data : 'An unknown error occurred.',
    });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Ready to receive requests at /api/analyzeFace');
}); 