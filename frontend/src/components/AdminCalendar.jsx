import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const WDAY = ['So','Mo','Di','Mi','Do','Fr','Sa'];

const CELL_COLORS = [
  'bg-blue-500','bg-rose-500','bg-emerald-500','bg-amber-500',
  'bg-purple-500','bg-teal-500','bg-orange-500','bg-pink-500',
  'bg-cyan-500','bg-violet-500',
];
const BADGE_COLORS = [
  'bg-blue-100 text-blue-800','bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800','bg-amber-100 text-amber-800',
  'bg-purple-100 text-purple-800','bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800','bg-pink-100 text-pink-800',
  'bg-cyan-100 text-cyan-800','bg-violet-100 text-violet-800',
];

function formatDE(d) { const [y,m,dd] = d.split('-').map(Number); return `${dd}.${m}.${y}`; }

function EditModal({ vacation, onClose, onSave }) {
  const [form, setForm] = useState({ start_date: vacation.start_date, end_date: vacation.end_date, note: vacation.note || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.start_date > form.end_date) return setError('Startdatum muss vor dem Enddatum liegen.');
    setLoading(true);
    try { await adminApi.editVacation(vacation.id, form); onSave(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
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

export default function AdminCalendar({ users = [] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [vacations, setVacations] = useState([]);
  const [view, setView] = useState('gantt');
  const [editModal, setEditModal] = useState(null);

  const load = useCallback(async () => {
    try { setVacations(await adminApi.getCalendar(year, month + 1)); } catch {}
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0, 10);
  const approvedUsers = users.filter(u => u.is_approved);

  // Build per-user vacation map: userId -> { day -> vacation }
  const dayVacOf = {};
  approvedUsers.forEach(u => { dayVacOf[u.id] = {}; });
  vacations.forEach(v => {
    const start = new Date(v.start_date + 'T00:00:00');
    const end = new Date(v.end_date + 'T00:00:00');
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!dayVacOf[v.user_id]) dayVacOf[v.user_id] = {};
        dayVacOf[v.user_id][d.getDate()] = v;
      }
    }
  });

  // How many educators are absent per day
  const overlapByDay = {};
  for (let day = 1; day <= totalDays; day++) {
    overlapByDay[day] = approvedUsers.filter(u => dayVacOf[u.id]?.[day]).length;
  }

  const days = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const wday = new Date(year, month, day).getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, wday, dateStr, isWeekend: wday === 0 || wday === 6, isToday: dateStr === todayStr };
  });

  // Whether a vacation bar starts/ends at this day in the current month view
  const isVacStart = (v, day) => {
    const s = new Date(v.start_date + 'T00:00:00');
    return (s.getFullYear() === year && s.getMonth() === month && s.getDate() === day) ||
           (day === 1 && s < new Date(year, month, 1));
  };
  const isVacEnd = (v, day) => {
    const e = new Date(v.end_date + 'T00:00:00');
    return (e.getFullYear() === year && e.getMonth() === month && e.getDate() === day) ||
           (day === totalDays && e > new Date(year, month, totalDays));
  };

  // Classic calendar grid helpers
  const firstDay = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const vacByDay = {};
  vacations.forEach(v => {
    const start = new Date(v.start_date + 'T00:00:00');
    const end = new Date(v.end_date + 'T00:00:00');
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
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
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={prev} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">‹</button>
        <h3 className="text-white font-bold flex-1 text-center">{MONTHS[month]} {year}</h3>
        <button onClick={next} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">›</button>
        {(year !== now.getFullYear() || month !== now.getMonth()) && (
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-full bg-indigo-900/30">
            Heute
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 bg-gray-700 p-1 rounded-lg">
          <button onClick={() => setView('gantt')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === 'gantt' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Timeline
          </button>
          <button onClick={() => setView('calendar')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === 'calendar' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Kalender
          </button>
        </div>
      </div>

      {view === 'gantt' ? (
        /* ── Timeline / Gantt View ── */
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: `${totalDays * 34 + 180}px` }}>
              <thead>
                {/* Day / weekday header */}
                <tr className="border-b border-gray-700">
                  <th className="sticky left-0 z-10 bg-gray-800 text-left px-4 py-2 text-gray-400 font-medium"
                    style={{ width: 180, minWidth: 180 }}>
                    Erzieher
                  </th>
                  {days.map(({ day, wday, isWeekend, isToday }) => (
                    <th key={day}
                      className={`text-center py-2 font-medium select-none
                        ${isToday ? 'bg-indigo-900/50' : isWeekend ? 'bg-gray-900/30' : ''}
                        ${isWeekend ? 'text-gray-500' : 'text-gray-400'}`}
                      style={{ width: 34, minWidth: 34 }}>
                      <div className="text-[9px] uppercase">{WDAY[wday]}</div>
                      <div className={`w-5 h-5 mx-auto mt-0.5 flex items-center justify-center rounded-full text-[10px]
                        ${isToday ? 'bg-indigo-600 text-white' : ''}`}>
                        {day}
                      </div>
                    </th>
                  ))}
                </tr>
                {/* Overlap indicator row */}
                <tr className="border-b border-gray-600/40">
                  <th className="sticky left-0 z-10 bg-gray-750 bg-gray-800 text-left px-4 py-1.5 text-gray-500 font-normal"
                    style={{ minWidth: 180 }}>
                    <span className="text-[10px]">Gleichzeitig abwesend</span>
                  </th>
                  {days.map(({ day, isWeekend }) => {
                    const c = overlapByDay[day] || 0;
                    return (
                      <td key={day}
                        className={`text-center py-1.5 text-[10px] font-bold
                          ${c >= 3 ? 'bg-red-900/50 text-red-400' :
                            c === 2 ? 'bg-amber-900/40 text-amber-400' :
                            isWeekend ? 'bg-gray-900/20 text-transparent' : 'text-transparent'}`}>
                        {c > 0 ? c : '·'}
                      </td>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {approvedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={totalDays + 1} className="text-center text-gray-500 py-10">
                      Keine freigegebenen Erzieher vorhanden.
                    </td>
                  </tr>
                ) : approvedUsers.map((u, idx) => (
                  <tr key={u.id} className="border-b border-gray-700/20 hover:bg-gray-700/10">
                    <td className="sticky left-0 z-10 bg-gray-800 px-4 font-medium text-white whitespace-nowrap"
                      style={{ minWidth: 180, height: 40 }}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CELL_COLORS[idx % CELL_COLORS.length]}`} />
                        <span className="text-sm">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    {days.map(({ day, isWeekend, isToday }) => {
                      const v = dayVacOf[u.id]?.[day];
                      const start = v ? isVacStart(v, day) : false;
                      const end = v ? isVacEnd(v, day) : false;
                      return (
                        <td key={day}
                          className={`p-0 relative
                            ${isToday ? 'bg-indigo-900/20' : isWeekend ? 'bg-gray-900/10' : ''}`}
                          style={{ height: 40 }}>
                          {v && (
                            <div
                              onClick={() => setEditModal(v)}
                              title={`${v.first_name} ${v.last_name}: ${formatDE(v.start_date)} – ${formatDE(v.end_date)}${v.note ? ' · ' + v.note : ''}`}
                              className={`absolute cursor-pointer top-2.5 bottom-2.5 opacity-85 hover:opacity-100 transition-opacity
                                ${CELL_COLORS[idx % CELL_COLORS.length]}
                                ${start ? 'left-1.5 rounded-l-full' : 'left-0'}
                                ${end ? 'right-1.5 rounded-r-full' : 'right-0'}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="px-4 py-3 border-t border-gray-700/50 flex flex-wrap gap-2 min-h-[44px] items-center">
            {vacations.length === 0 ? (
              <p className="text-gray-500 text-xs">Keine genehmigten Urlaube in diesem Monat.</p>
            ) : approvedUsers.map((u, idx) => {
              const count = Object.keys(dayVacOf[u.id] || {}).length;
              if (count === 0) return null;
              return (
                <span key={u.id} className={`text-xs px-2 py-0.5 rounded-lg font-medium ${BADGE_COLORS[idx % BADGE_COLORS.length]}`}>
                  {u.first_name} {u.last_name[0]}. — {count} Tag{count !== 1 ? 'e' : ''}
                </span>
              );
            })}
          </div>

          {/* Overlap legend */}
          {Object.values(overlapByDay).some(c => c >= 2) && (
            <div className="px-4 py-2 border-t border-gray-700/30 flex items-center gap-4 text-[10px]">
              <span className="text-gray-500">Legende:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-900/60 border border-amber-700/50" />
                <span className="text-amber-400">2 gleichzeitig</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-900/60 border border-red-700/50" />
                <span className="text-red-400">3+ gleichzeitig</span>
              </span>
            </div>
          )}
        </div>
      ) : (
        /* ── Classic Calendar Grid View ── */
        <>
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
            <div className="grid grid-cols-7 bg-gray-700/50">
              {['Mo','Di','Mi','Do','Fr','Sa','So'].map((d, i) => (
                <div key={d} className={`py-2 text-center text-xs font-semibold ${i >= 5 ? 'text-rose-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-700/50">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e${i}`} className="min-h-[90px] bg-gray-900/20" />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayVacs = vacByDay[day] || [];
                const isToday = ds === todayStr;
                const isWeekend = (firstDay + i) % 7 >= 5;
                return (
                  <div key={day} className={`min-h-[90px] p-1.5 ${isWeekend ? 'bg-gray-900/20' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-indigo-600 text-white' : isWeekend ? 'text-gray-600' : 'text-gray-400'}`}>
                        {day}
                      </span>
                      {dayVacs.length >= 2 && (
                        <span className={`text-[9px] font-bold px-1 rounded
                          ${dayVacs.length >= 3 ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/40 text-amber-400'}`}>
                          {dayVacs.length}×
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayVacs.slice(0, 3).map(v => {
                        const idx = approvedUsers.findIndex(u => u.id === v.user_id);
                        return (
                          <div key={v.id} onClick={() => setEditModal(v)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium cursor-pointer hover:brightness-110 ${BADGE_COLORS[idx >= 0 ? idx % BADGE_COLORS.length : v.user_id % BADGE_COLORS.length]}`}
                            title={`${v.first_name} ${v.last_name}${v.note ? ' – ' + v.note : ''}`}>
                            <span className="hidden sm:inline">{v.first_name} {v.last_name[0]}.</span>
                            <span className="sm:hidden">{v.first_name[0]}{v.last_name[0]}</span>
                          </div>
                        );
                      })}
                      {dayVacs.length > 3 && <p className="text-[10px] text-gray-500 px-1">+{dayVacs.length - 3}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {vacations.length > 0 && (
            <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
              <div className="px-5 py-3 border-b border-gray-700 text-sm font-semibold text-gray-300">
                Urlaube im {MONTHS[month]} — {vacations.length} Einträge
              </div>
              <ul className="divide-y divide-gray-700/50">
                {vacations.map(v => {
                  const idx = approvedUsers.findIndex(u => u.id === v.user_id);
                  return (
                    <li key={v.id} className="px-5 py-3 flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${BADGE_COLORS[idx >= 0 ? idx % BADGE_COLORS.length : v.user_id % BADGE_COLORS.length]}`}>
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
                  );
                })}
              </ul>
            </div>
          )}

          {vacations.length === 0 && (
            <div className="bg-gray-800 rounded-2xl border border-gray-700 py-10 text-center text-gray-500">
              <div className="text-3xl mb-2">📅</div>
              Keine genehmigten Urlaube in diesem Monat.
            </div>
          )}
        </>
      )}

      {editModal && (
        <EditModal
          vacation={editModal}
          onClose={() => setEditModal(null)}
          onSave={() => { setEditModal(null); load(); }}
        />
      )}
    </div>
  );
}
