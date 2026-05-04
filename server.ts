import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Script Proxy
  const GS_URL = process.env.GS_URL;
  if (!GS_URL) {
    console.error('❌ ERROR: GS_URL environment variable is not set. Copy .env.example to .env and fill in your Google Apps Script URL.');
  }

  app.all('/api/gs', async (req, res) => {
    if (!GS_URL) {
      res.status(503).json({ error: 'GS_URL לא הוגדר בשרת', details: 'הגדר את GS_URL בקובץ .env' });
      return;
    }
    try {
      const { action } = req.query;
      const targetUrl = action ? `${GS_URL}?action=${action}` : GS_URL;
      
      const options: RequestInit = {
        method: req.method,
        redirect: 'follow'
      };

      if (req.method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, options);
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (e) {
        console.error('GS Response is not JSON. Status:', response.status);
        console.error('First 500 chars of response:', text.substring(0, 500));
        
        if (text.includes('Google Accounts') || text.includes('Sign in')) {
          res.status(401).json({ 
            error: 'חובה להגדיר את ה-Web App כציבורי (Anyone)',
            details: 'הסקריפט מחזיר דף התחברות של גוגל. וודא שבהפצה (Deployment) הגדרת "Who has access" ל-"Anyone".'
          });
        } else {
          res.status(500).json({ 
            error: 'הסקריפט החזיר תשובה לא תקינה', 
            details: text.substring(0, 200) 
          });
        }
      }
    } catch (error: any) {
      console.error('Proxy Error:', error);
      res.status(500).json({ error: error.toString() });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
