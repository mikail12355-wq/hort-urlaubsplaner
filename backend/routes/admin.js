import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hort-urlaubsplaner-secret-2024';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht autorisiert.' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Kein Admin.' });
    next();
  } catch {
    res.status(401).json({ error: 'Token ungültig.' });
  }
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass) {
    return res.status(503).json({ error: 'Admin-Passwort nicht konfiguriert. Bitte ADMIN_PASSWORD in Railway setzen.' });
  }
  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
  }

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

router.get('/users', authenticateAdmin, (req, res) => {
  const users = db
    .prepare('SELECT id, first_name, last_name, vacation_allowance, is_approved, created_at FROM users ORDER BY is_approved ASC, last_name, first_name')
    .all();

  const yearData = db.prepare('SELECT user_id, year, carryover FROM vacation_year_data').all();
  const carryoverMap = {};
  yearData.forEach(({ user_id, year, carryover }) => {
    carryoverMap[`${user_id}_${year}`] = carryover;
  });

  const usersWithCarryover = users.map((u) => {
    const extra = {};
    yearData.filter(r => r.user_id === u.id).forEach(r => {
      extra[`carryover_${r.year}`] = r.carryover;
    });
    return { ...u, ...extra };
  });

  res.json(usersWithCarryover);
});

router.put('/users/approve-all', authenticateAdmin, (req, res) => {
  db.prepare('UPDATE users SET is_approved = 1 WHERE is_approved = 0').run();
  res.json({ message: 'Alle Konten freigegeben.' });
});

router.put('/users/:id/approve', authenticateAdmin, (req, res) => {
  const result = db.prepare('UPDATE users SET is_approved = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  res.json({ message: 'Konto freigegeben.' });
});

router.put('/users/:id/carryover', authenticateAdmin, (req, res) => {
  const carryover = parseInt(req.body.carryover);
  const year = parseInt(req.body.year) || new Date().getFullYear();
  if (isNaN(carryover) || carryover < 0 || carryover > 365) {
    return res.status(400).json({ error: 'Ungültige Anzahl (0–365).' });
  }
  const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(req.params.id);
  if (!userExists) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  db.prepare(`
    INSERT INTO vacation_year_data (user_id, year, carryover)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, year) DO UPDATE SET carryover = excluded.carryover
  `).run(req.params.id, year, carryover);
  res.json({ message: 'Resturlaub aktualisiert.', year, carryover });
});

router.put('/users/:id/allowance', authenticateAdmin, (req, res) => {
  const allowance = parseInt(req.body.allowance);
  if (isNaN(allowance) || allowance < 0 || allowance > 365) {
    return res.status(400).json({ error: 'Ungültige Anzahl (0–365).' });
  }
  const result = db.prepare('UPDATE users SET vacation_allowance = ? WHERE id = ?').run(allowance, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  res.json({ message: 'Urlaubstage aktualisiert.' });
});

router.put('/users/:id/password', authenticateAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  res.json({ message: 'Passwort zurückgesetzt.' });
});

router.delete('/users/:id', authenticateAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  res.json({ message: 'Benutzer gelöscht.' });
});

router.get('/vacations', authenticateAdmin, (req, res) => {
  const vacations = db
    .prepare(
      `SELECT v.*, u.first_name, u.last_name
       FROM vacations v JOIN users u ON v.user_id = u.id
       ORDER BY v.start_date DESC`
    )
    .all();
  res.json(vacations);
});

router.delete('/vacations/:id', authenticateAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM vacations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Urlaub nicht gefunden.' });
  res.json({ message: 'Urlaub gelöscht.' });
});

export default router;
