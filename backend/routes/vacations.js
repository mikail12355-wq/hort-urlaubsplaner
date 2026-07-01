import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/month/:year/:month', authenticate, (req, res) => {
  const { year, month } = req.params;
  const mm = month.padStart(2, '0');
  const startOfMonth = `${year}-${mm}-01`;
  const endOfMonth = `${year}-${mm}-31`;

  const vacations = db
    .prepare(
      `SELECT v.*, u.first_name, u.last_name
       FROM vacations v
       JOIN users u ON v.user_id = u.id
       WHERE v.start_date <= ? AND v.end_date >= ?
       ORDER BY v.start_date, u.last_name`
    )
    .all(endOfMonth, startOfMonth);

  res.json(vacations);
});

router.post('/', authenticate, (req, res) => {
  const { start_date, end_date, note } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start- und Enddatum sind erforderlich.' });
  }
  if (start_date > end_date) {
    return res.status(400).json({ error: 'Startdatum muss vor dem Enddatum liegen.' });
  }

  const result = db
    .prepare('INSERT INTO vacations (user_id, start_date, end_date, note) VALUES (?, ?, ?, ?)')
    .run(req.user.id, start_date, end_date, note || null);

  const vacation = db
    .prepare(
      `SELECT v.*, u.first_name, u.last_name
       FROM vacations v JOIN users u ON v.user_id = u.id
       WHERE v.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(vacation);
});

router.put('/:id', authenticate, (req, res) => {
  const { start_date, end_date, note } = req.body;
  const vacation = db.prepare('SELECT * FROM vacations WHERE id = ?').get(req.params.id);

  if (!vacation) return res.status(404).json({ error: 'Urlaub nicht gefunden.' });
  if (vacation.user_id !== req.user.id)
    return res.status(403).json({ error: 'Keine Berechtigung.' });
  if (start_date > end_date)
    return res.status(400).json({ error: 'Startdatum muss vor dem Enddatum liegen.' });

  db.prepare('UPDATE vacations SET start_date = ?, end_date = ?, note = ? WHERE id = ?').run(
    start_date,
    end_date,
    note || null,
    req.params.id
  );

  const updated = db
    .prepare(
      `SELECT v.*, u.first_name, u.last_name
       FROM vacations v JOIN users u ON v.user_id = u.id
       WHERE v.id = ?`
    )
    .get(req.params.id);

  res.json(updated);
});

router.delete('/:id', authenticate, (req, res) => {
  const vacation = db.prepare('SELECT * FROM vacations WHERE id = ?').get(req.params.id);

  if (!vacation) return res.status(404).json({ error: 'Urlaub nicht gefunden.' });
  if (vacation.user_id !== req.user.id)
    return res.status(403).json({ error: 'Keine Berechtigung.' });

  db.prepare('DELETE FROM vacations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Urlaub gelöscht.' });
});

export default router;
