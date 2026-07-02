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

// Month view: approved vacations from all + own pending/rejected
router.get('/month/:year/:month', authenticate, (req, res) => {
  const { year, month } = req.params;
  const mm = month.padStart(2, '0');
  const startOfMonth = `${year}-${mm}-01`;
  const endOfMonth = `${year}-${mm}-31`;

  const vacations = db.prepare(`
    SELECT v.*, u.first_name, u.last_name
    FROM vacations v
    JOIN users u ON v.user_id = u.id
    WHERE v.start_date <= ? AND v.end_date >= ?
      AND (v.status = 'approved' OR v.user_id = ?)
    ORDER BY v.start_date, u.last_name
  `).all(endOfMonth, startOfMonth, req.user.id);

  res.json(vacations);
});

// Own pending vacation count (for badge)
router.get('/pending-count', authenticate, (req, res) => {
  const count = db.prepare("SELECT COUNT(*) as n FROM vacations WHERE user_id = ? AND status = 'pending'").get(req.user.id);
  const changes = db.prepare('SELECT COUNT(*) as n FROM pending_changes WHERE user_id = ?').get(req.user.id);
  res.json({ count: (count?.n ?? 0) + (changes?.n ?? 0) });
});

// Submit allowance change request
router.put('/allowance', authenticate, (req, res) => {
  const allowance = parseInt(req.body.allowance);
  if (isNaN(allowance) || allowance < 0 || allowance > 365) {
    return res.status(400).json({ error: 'Ungültige Anzahl (0–365).' });
  }
  db.prepare(`
    INSERT INTO pending_changes (user_id, type, new_value)
    VALUES (?, 'allowance', ?)
    ON CONFLICT DO NOTHING
  `).run(req.user.id, allowance);
  // Upsert: delete old same-type pending, insert new
  db.prepare("DELETE FROM pending_changes WHERE user_id = ? AND type = 'allowance'").run(req.user.id);
  db.prepare("INSERT INTO pending_changes (user_id, type, new_value) VALUES (?, 'allowance', ?)").run(req.user.id, allowance);
  res.json({ pending: true, message: 'Änderung eingereicht – wartet auf Admin-Genehmigung.' });
});

// Submit carryover change request
router.put('/carryover', authenticate, (req, res) => {
  const carryover = parseInt(req.body.carryover);
  const year = parseInt(req.body.year) || new Date().getFullYear();
  if (isNaN(carryover) || carryover < 0 || carryover > 365) {
    return res.status(400).json({ error: 'Ungültige Anzahl (0–365).' });
  }
  db.prepare("DELETE FROM pending_changes WHERE user_id = ? AND type = 'carryover' AND year = ?").run(req.user.id, year);
  db.prepare("INSERT INTO pending_changes (user_id, type, new_value, year) VALUES (?, 'carryover', ?, ?)").run(req.user.id, carryover, year);
  res.json({ pending: true, message: 'Änderung eingereicht – wartet auf Admin-Genehmigung.' });
});

// Stats for a year (approved vacations only)
router.get('/stats/:year', authenticate, (req, res) => {
  const year = parseInt(req.params.year);
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const user = db.prepare('SELECT vacation_allowance FROM users WHERE id = ?').get(req.user.id);
  const allowance = user?.vacation_allowance ?? 30;
  const yearData = db.prepare('SELECT carryover FROM vacation_year_data WHERE user_id = ? AND year = ?').get(req.user.id, year);
  const carryover = yearData?.carryover ?? 0;
  const totalAllowance = allowance + carryover;

  const vacations = db.prepare(`
    SELECT * FROM vacations
    WHERE user_id = ? AND start_date <= ? AND end_date >= ? AND status = 'approved'
    ORDER BY start_date
  `).all(req.user.id, endOfYear, startOfYear);

  let usedDays = 0;
  const entries = vacations.map((v) => {
    const start = v.start_date < startOfYear ? startOfYear : v.start_date;
    const end = v.end_date > endOfYear ? endOfYear : v.end_date;
    const days = countWorkingDays(start, end);
    usedDays += days;
    return { ...v, working_days: days };
  });

  // Pending changes for this user
  const pendingAllowance = db.prepare("SELECT new_value FROM pending_changes WHERE user_id = ? AND type = 'allowance'").get(req.user.id);
  const pendingCarryover = db.prepare("SELECT new_value FROM pending_changes WHERE user_id = ? AND type = 'carryover' AND year = ?").get(req.user.id, year);

  res.json({
    year,
    allowance,
    carryover,
    total_allowance: totalAllowance,
    used_days: usedDays,
    remaining_days: totalAllowance - usedDays,
    entries,
    pending_allowance: pendingAllowance?.new_value ?? null,
    pending_carryover: pendingCarryover?.new_value ?? null,
  });
});

// Add vacation (pending approval)
router.post('/', authenticate, (req, res) => {
  const { start_date, end_date, note } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ error: 'Start- und Enddatum sind erforderlich.' });
  if (start_date > end_date) return res.status(400).json({ error: 'Startdatum muss vor dem Enddatum liegen.' });

  const result = db.prepare(
    "INSERT INTO vacations (user_id, start_date, end_date, note, is_approved, status) VALUES (?, ?, ?, ?, 0, 'pending')"
  ).run(req.user.id, start_date, end_date, note || null);

  const vacation = db.prepare(`
    SELECT v.*, u.first_name, u.last_name
    FROM vacations v JOIN users u ON v.user_id = u.id WHERE v.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(vacation);
});

// Edit own PENDING or REJECTED vacation (rejected → back to pending)
router.put('/:id', authenticate, (req, res) => {
  const { start_date, end_date, note } = req.body;
  const vacation = db.prepare('SELECT * FROM vacations WHERE id = ?').get(req.params.id);
  if (!vacation) return res.status(404).json({ error: 'Urlaub nicht gefunden.' });
  if (vacation.user_id !== req.user.id) return res.status(403).json({ error: 'Keine Berechtigung.' });
  if (vacation.status === 'approved') return res.status(403).json({ error: 'Genehmigte Urlaube können nicht direkt bearbeitet werden.' });
  if (start_date > end_date) return res.status(400).json({ error: 'Startdatum muss vor dem Enddatum liegen.' });

  // Rejected → reset to pending on re-submit
  const newStatus = vacation.status === 'rejected' ? 'pending' : 'pending';
  db.prepare("UPDATE vacations SET start_date = ?, end_date = ?, note = ?, status = 'pending' WHERE id = ?").run(start_date, end_date, note || null, req.params.id);
  const updated = db.prepare(`
    SELECT v.*, u.first_name, u.last_name FROM vacations v JOIN users u ON v.user_id = u.id WHERE v.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// Change request for an APPROVED vacation (creates new pending entry that replaces original when approved)
router.post('/change-request/:id', authenticate, (req, res) => {
  const { start_date, end_date, note } = req.body;
  const original = db.prepare('SELECT * FROM vacations WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Urlaub nicht gefunden.' });
  if (original.user_id !== req.user.id) return res.status(403).json({ error: 'Keine Berechtigung.' });
  if (original.status !== 'approved') return res.status(400).json({ error: 'Nur genehmigte Urlaube können so geändert werden.' });
  if (start_date > end_date) return res.status(400).json({ error: 'Startdatum muss vor dem Enddatum liegen.' });

  // Remove any existing pending change request for this vacation
  db.prepare("DELETE FROM vacations WHERE replaces_id = ? AND status = 'pending'").run(original.id);

  const result = db.prepare(
    "INSERT INTO vacations (user_id, start_date, end_date, note, is_approved, status, replaces_id) VALUES (?, ?, ?, ?, 0, 'pending', ?)"
  ).run(req.user.id, start_date, end_date, note || null, original.id);

  const created = db.prepare(`
    SELECT v.*, u.first_name, u.last_name FROM vacations v JOIN users u ON v.user_id = u.id WHERE v.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Delete own PENDING or REJECTED vacation
router.delete('/:id', authenticate, (req, res) => {
  const vacation = db.prepare('SELECT * FROM vacations WHERE id = ?').get(req.params.id);
  if (!vacation) return res.status(404).json({ error: 'Urlaub nicht gefunden.' });
  if (vacation.user_id !== req.user.id) return res.status(403).json({ error: 'Keine Berechtigung.' });
  if (vacation.status === 'approved') return res.status(403).json({ error: 'Genehmigte Urlaube können nur vom Admin gelöscht werden.' });
  db.prepare('DELETE FROM vacations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Urlaub gelöscht.' });
});

export default router;
