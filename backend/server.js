import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import authRoutes from './routes/auth.js';
import vacationRoutes from './routes/vacations.js';
import adminRoutes from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://mikail12355-wq.github.io',
      'https://paul-schneider-hort.de',
      'https://www.paul-schneider-hort.de',
    ];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend in production
const distPath = join(__dirname, '../frontend/dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n🏫 Hort-Urlaubsplaner Backend läuft auf http://localhost:${PORT}\n`);
});
