const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { analyzeChat } = require('./analyzer');
const { generatePDF } = require('./pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory session store: { sessionId: { analysis, chatType, createdAt } }
const sessions = {};

// Auto-delete sessions older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of Object.entries(sessions)) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      delete sessions[id];
      console.log(`Auto-deleted session ${id}`);
    }
  }
}, 5 * 60 * 1000);

// Multer: memory storage only — no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files exported from WhatsApp are accepted'));
    }
  }
});

// POST /api/analyze
app.post('/api/analyze', upload.single('chatFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const chatType = req.body.chatType || 'individual'; // 'individual' or 'group'
    const rawText = req.file.buffer.toString('utf8');

    // Sanitize: remove phone numbers, emails, media references
    const sanitized = sanitizeChat(rawText);

    // Analyze with Gemini
    const analysis = await analyzeChat(sanitized, chatType);

    // Store in memory
    const sessionId = uuidv4();
    sessions[sessionId] = {
      analysis,
      chatType,
      createdAt: Date.now()
    };

    res.json({ sessionId, analysis });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// GET /api/download/:sessionId
app.get('/api/download/:sessionId', async (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) {
    return res.status(404).json({ error: 'Session not found or already deleted' });
  }

  try {
    const pdfBuffer = await generatePDF(session.analysis, session.chatType);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="chat-analysis.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

// DELETE /api/session/:sessionId
app.delete('/api/session/:sessionId', (req, res) => {
  if (sessions[req.params.sessionId]) {
    delete sessions[req.params.sessionId];
    res.json({ deleted: true });
  } else {
    res.json({ deleted: false, message: 'Already deleted' });
  }
});

function sanitizeChat(text) {
  return text
    // Remove phone numbers
    .replace(/\+?[\d\s\-().]{10,}/g, '[NUMBER]')
    // Remove email addresses
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    // Remove media omitted lines
    .replace(/.*(image omitted|video omitted|audio omitted|document omitted|sticker omitted|GIF omitted).*/gi, '')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, '[LINK]')
    // Remove lines that are purely numbers (account numbers etc)
    .replace(/^\d+$/gm, '')
    .trim();
}

app.listen(PORT, () => {
  console.log(`✅ WhatsApp Analyzer running on http://localhost:${PORT}`);
});
