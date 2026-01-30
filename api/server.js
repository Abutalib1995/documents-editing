import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 10000; // Render provides the PORT environment variable

// Your API key MUST be set in the Render environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// For security, you can restrict this to your frontend's URL in production
app.use(cors()); 
app.use(express.json({ limit: '10mb' })); // Middleware to parse JSON bodies

// Health check endpoint
app.get('/api', (req, res) => {
  res.send('Media Toolkit Pro API is running!');
});

// The secure endpoint for background removal
app.post('/api/remove-background', async (req, res) => {
  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: 'Missing base64Image or mimeType in request body' });
    }

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: 'Remove the background from this image, making it transparent. The output must be a single PNG image with a transparent background. Do not add any text, just output the image.',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return res.json({ resultBase64: part.inlineData.data });
      }
    }

    throw new Error("No image was returned from the API.");

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image with AI service.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
