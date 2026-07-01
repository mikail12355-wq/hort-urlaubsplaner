import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import vacationRoutes from './routes/vacations.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vacations', vacationRoutes);

app.listen(PORT, () => {
  console.log(`\n🏫 Hort-Urlaubsplaner Backend läuft auf http://localhost:${PORT}\n`);
});
