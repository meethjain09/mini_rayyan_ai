import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { executeEvidenceSynthesis, SynthesizeRequestBody } from './src/services/evidenceSynthesizer';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------------------------------
// POST /api/synthesize-conclusion
// Synthesizes clinical evidence from included studies and answers the user's query
// ----------------------------------------------------------------------------
app.post('/api/synthesize-conclusion', async (req, res) => {
  try {
    const { query, pico, bookTitle, includedRecords } = req.body as SynthesizeRequestBody;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Clinical query or research question is required.' });
    }

    if (!includedRecords || includedRecords.length === 0) {
      return res.status(400).json({
        error: 'At least one included research article is required to formulate an evidence-based conclusion.',
      });
    }

    const result = await executeEvidenceSynthesis({
      query,
      pico,
      bookTitle,
      includedRecords,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Evidence synthesis controller error:', error);
    res.status(500).json({
      error: 'An unexpected error occurred during evidence synthesis.',
      details: error.message,
    });
  }
});

// ----------------------------------------------------------------------------
// Health check route
// ----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------------------------------
// Vite dev middleware or static production serve
// ----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    // Pre-warm entry modules so Vite pre-bundles all dependencies before incoming browser requests
    try {
      if (vite.warmupRequest) {
        await vite.warmupRequest('/src/main.tsx');
      }
    } catch (warmupErr) {
      console.warn('[Vite Warmup] Non-critical warmup note:', warmupErr);
    }

    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Studio] Server listening on port ${PORT} (dev/prod full-stack)`);
  });
}

startServer();
