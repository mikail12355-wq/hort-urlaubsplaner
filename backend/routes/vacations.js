import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function countWorkingDays(startStr, endStr) {
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  let count = 0;
  for (let d = new Date(sy, sm - 1, sd); d <= new Date(ey, em - 1, ed); d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

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

router.put('/allowance', authenticate, (req, res) => {
  const allowance = parseInt(req.body.allowance);
  if (isNaN(allowance) || allowance < 0 || allowance > 365) {
    return res.status(400).json({ error: 'Ungültige Anzahl (0–365).' });
  }
  db.prepare('UPDATE users SET vacation_allowance = ? WHERE id = ?').run(allowance, req.user.id);
  res.json({ message: 'Urlaubstage aktualisiert.', allowance });
});

router.get('/stats/:year', authenticate, (req, res) => {
  const year = parseInt(req.params.year);
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const user = db.prepare('SELECT vacation_allowance FROM users WHERE id = ?').get(req.user.id);
  const allowance = user?.vacation_allowance ?? 30;

  const vacations = db
    .prepare(
      `SELECT * FROM vacations
       WHERE user_id = ? AND start_date <= ? AND end_date >= ?
       ORDER BY start_date`
    )
    .all(req.user.id, endOfYear, startOfYear);

  let usedDays = 0;
  const entries = vacations.map((v) => {
    const start = v.start_date < startOfYear ? startOfYear : v.start_date;
    const end = v.end_date > endOfYear ? endOfYear : v.end_date;
    const days = countWorkingDays(start, end);
    usedDays += days;
    return { ...v, working_days: days };
  });

  res.json({
    year,
    allowance,
    used_days: usedDays,
    remaining_days: allowance - usedDays,
    entries,
  });
});

export default router;
