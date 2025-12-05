import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

app.post('/ai/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');

    // Simple classification (in production, use a proper ML model)
    const isReceipt = text.toLowerCase().includes('receipt') || text.toLowerCase().includes('total');
    const suggestedType = isReceipt ? 'expense' : 'income';
    
    // Extract amount (simple regex)
    const amountMatch = text.match(/(\d+[.,]\d{2})/);
    const suggestedAmount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

    res.json({
      extractedText: text,
      suggestedType,
      suggestedAmount,
      aiConfidence: 0.7, // Placeholder
      isBusinessProbability: 0.8, // Placeholder
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI/OCR service running on port ${PORT}`);
});

