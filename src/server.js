import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { auditWebsite } from './audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/api/audit', async (req, res) => {
  try {
    if (!req.body?.url) return res.status(400).json({ error: 'URL is required.' });
    const result = await auditWebsite(req.body.url);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Audit failed.' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, service: 'website-doctor' }));

app.listen(port, () => {
  console.log(`Website Doctor running on http://localhost:${port}`);
});
