const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { analyzeChat } = require('./analyzer');
const { generatePDF } = require('./pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const sessions = {};

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of Object.entries(sessions)) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      delete sessions[id];
    }
  }
}, 5 * 60 * 1000);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.post('/api/analyze', function(req, res) {
  upload.single('chatFile')(req, res, async function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      if (!req.file.originalname.endsWith('.txt')) {
        return res.status(400).json({ error: 'Please upload a .txt file exported from WhatsApp' });
      }
      const chatType = req.body.chatType || 'individual';
      const rawText = req.file.buffer.toString('utf8');
      const sanitized = sanitizeChat(rawText);
      const analysis = await analyzeChat(sanitized, chatType);
      const sessionId = uuidv4();
      sessions[sessionId] = { analysis, chatType, createdAt: Date.now() };
      res.json({ sessionId, analysis });
    } catch (e) {
      console.error('Analysis error:', e.message);
      res.status(500).json({ error: e.message || 'Analysis failed' });
    }
  });
});

app.get('/api/download/:sessionId', async function(req, res) {
  const session = sessions[req.params.sessionId];
  if (!session) {
    return res.status(404).json({ error: 'Session not found or already deleted' });
  }
  try {
    const pdfBuffer = await generatePDF(session.analysis, session.chatType);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="chat-analysis.pdf"');
    res.send(pdfBuffer);
  } catch (e) {
    console.error('PDF error:', e.message);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

app.delete('/api/session/:sessionId', function(req, res) {
  delete sessions[req.params.sessionId];
  res.json({ deleted: true });
});

function sanitizeChat(text) {
  return text
    .replace(/\+?[\d\s\-().]{10,}/g, '[NUMBER]')
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    .replace(/.*(image omitted|video omitted|audio omitted|document omitted|sticker omitted|GIF omitted).*/gi, '')
    .replace(/https?:\/\/[^\s]+/g, '[LINK]')
    .trim();
}

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});
