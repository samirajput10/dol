import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createReconstructionProvider,
  normalizeUploadedPayloads,
} from './server/adapters/reconstructionAdapter.ts';
import type { PhotoAngleSlot } from './src/types/studio.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '25mb' }));

  const reconstructionProvider = createReconstructionProvider();

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      provider: reconstructionProvider.id,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  app.post('/api/characters/validate-photos', async (req, res) => {
    try {
      const { photos, consentConfirmed } = req.body as {
        photos?: Record<PhotoAngleSlot, string>;
        consentConfirmed?: boolean;
      };

      if (!consentConfirmed) {
        res.status(400).json({
          error: 'Explicit user permission is required before processing photographs.',
        });
        return;
      }

      if (!photos) {
        res.status(400).json({ error: 'Four reference photographs are required.' });
        return;
      }

      const payloads = normalizeUploadedPayloads(photos);
      const report = await reconstructionProvider.validatePhotos(payloads);
      res.json(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Photo validation failed.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/characters/reconstruct', async (req, res) => {
    try {
      const { photos, consentConfirmed } = req.body as {
        photos?: Record<PhotoAngleSlot, string>;
        consentConfirmed?: boolean;
      };

      if (!consentConfirmed) {
        res.status(400).json({
          error: 'Explicit user permission is required before generating a character.',
        });
        return;
      }

      if (!photos) {
        res.status(400).json({ error: 'Four reference photographs are required.' });
        return;
      }

      const payloads = normalizeUploadedPayloads(photos);
      const result = await reconstructionProvider.reconstructIdentity(payloads);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Character reconstruction failed.';
      res.status(500).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Atelier Lumiere server running on http://0.0.0.0:${port}`);
  });
}

startServer();
