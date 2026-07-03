import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const WEEKDAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

const USER_COLORS = [
  'bg-blue-100 text-blue-800', 'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800',
  'bg-purple-100 text-purple-800', 'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800',
  'bg-cyan-100 text-cyan-800', 'bg-violet-100 text-violet-800',
];

function colorFor(userId) { return USER_COLORS[userId % USER_COLORS.length]; }

function formatDE(d) { const [y,m,dd] = d.split('-').map(Number); return `${dd}.${m}.${y}`; }

function EditModal({ vacation, onClose, onSave }) {
  const [form, setForm] = useState({
    start_date: vacation.start_date,
    end_date: vacation.end_date,
    note: vacation.note || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.start_date > form.end_date) return setError('Startdatum muss vor dem Enddatum liegen.');
    setLoading(true);
    try {
      await adminApi.editVacation(vacation.id, form);
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-1">Urlaub bearbeiten</h3>
        <p className="text-gray-400 text-sm mb-4">{vacation.first_name} {vacation.last_name}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Von</label>
              <input type="date" value={form.start_date} onChange={set('start_date')} required
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bis</label>
              <input type="date" value={form.end_date} min={form.start_date} onChange={set('end_date')} required
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notiz</label>
            <input type="text" value={form.note} onChange={set('note')} placeholder="optional"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 text-sm py-2 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-700 transition-colors">
              Abbrechen
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-xl transition-colors disabled:opacity-60">
              {loading ? '...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [vacations, setVacations] = useState([]);
  const [editModal, setEditModal] = useState(null);

  const fetch = useCallback(async () => {
    try { setVacations(await adminApi.getCalendar(year, month + 1)); } catch {}
  }, [year, month]);

  useEffect(() => { fetch(); }, [fetch]);

  const prev = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const next = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDay = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const todayStr = now.toISOString().slice(0, 10);

  const vacByDay = {};
  vacations.forEach(v => {
    const [sy, sm, sd] = v.start_date.split('-').map(Number);
    const [ey, em, ed] = v.end_date.split('-').map(Number);
    for (let d = new Date(sy, sm-1, sd); d <= new Date(ey, em-1, ed); d.setDate(d.getDate()+1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!vacByDay[day]) vacByDay[day] = [];
        vacByDay[day].push(v);
      }
    }
  });

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={prev} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">‹</button>
        <h3 className="text-white font-bold flex-1 text-center">{MONTHS[month]} {year}</h3>
        <button onClick={next} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">›</button>
        {(year !== now.getFullYear() || month !== now.getMonth()) && (
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-full bg-indigo-900/30">
            Heute
          </button>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
        <div className="grid grid-cols-7 bg-gray-700/50">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`py-2 text-center text-xs font-semibold ${i >= 5 ? 'text-rose-400' : 'text-gray-400'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-700/50">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="min-h-[90px] bg-gray-900/20" />
          ))}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayVacs = vacByDay[day] || [];
            const isToday = ds === todayStr;
            const isWeekend = (firstDay + i) % 7 >= 5;
            return (
              <div key={day} className={`min-h-[90px] p-1.5 ${isWeekend ? 'bg-gray-900/20' : ''}`}>
                <div className="flex justify-end mb-1">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : isWeekend ? 'text-gray-600' : 'text-gray-400'}`}>
                    {day}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayVacs.slice(0, 3).map(v => (
                    <div key={v.id} onClick={() => setEditModal(v)}
                      className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md truncate font-medium cursor-pointer hover:brightness-110 ${colorFor(v.user_id)}`}
                      title={`${v.first_name} ${v.last_name}${v.note ? ' – ' + v.note : ''} (klicken zum Bearbeiten)`}>
                      <span className="hidden sm:inline">{v.first_name} {v.last_name[0]}.</span>
                      <span className="sm:hidden">{v.first_name[0]}{v.last_name[0]}</span>
                    </div>
                  ))}
                  {dayVacs.length > 3 && <p className="text-[10px] text-gray-500 px-1">+{dayVacs.length - 3}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vacation list */}
      {vacations.length > 0 && (
        <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
          <div className="px-5 py-3 border-b border-gray-700 text-sm font-semibold text-gray-300">
            Urlaube im {MONTHS[month]} — {vacations.length} Einträge
          </div>
          <ul className="divide-y divide-gray-700/50">
            {vacations.map(v => (
              <li key={v.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${colorFor(v.user_id)}`}>
                  {v.first_name} {v.last_name}
                </span>
                <span className="text-sm text-gray-400 flex-1">
                  {formatDE(v.start_date)} – {formatDE(v.end_date)}
                  {v.note && <span className="italic text-gray-500 ml-2">„{v.note}"</span>}
                </span>
                <button onClick={() => setEditModal(v)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1 rounded-lg hover:bg-indigo-900/30 transition-colors">
                  Bearbeiten
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {vacations.length === 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 py-10 text-center text-gray-500">
          <div className="text-3xl mb-2">📅</div>
          Keine genehmigten Urlaube in diesem Monat.
        </div>
      )}

      {editModal && (
        <EditModal
          vacation={editModal}
          onClose={() => setEditModal(null)}
          onSave={() => { setEditModal(null); fetch(); }}
        />
      )}
    </div>
  );
}
