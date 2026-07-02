import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hort-urlaubsplaner-secret-2024';

router.post('/register', async (req, res) => {
  const { first_name, last_name, password } = req.body;

  if (!first_name?.trim() || !last_name?.trim() || !password) {
    return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (first_name, last_name, password_hash, is_approved) VALUES (?, ?, ?, 0)')
      .run(first_name.trim(), last_name.trim(), hash);

    res.status(201).json({ pending: true });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: `"${first_name.trim()} ${last_name.trim()}" ist bereits registriert.`,
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

router.post('/login', async (req, res) => {
  const { first_name, last_name, password } = req.body;

  if (!first_name?.trim() || !last_name?.trim() || !password) {
    return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE first_name = ? AND last_name = ?')
    .get(first_name.trim(), last_name.trim());

  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });

  if (!user.is_approved) {
    return res.status(403).json({ error: 'Dein Konto wurde noch nicht freigegeben. Bitte wende dich an den Admin.' });
  }

  const token = jwt.sign(
    { id: user.id, first_name: user.first_name, last_name: user.last_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, first_name: user.first_name, last_name: user.last_name },
  });
});

export default router;
