import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import VacationModal from './VacationModal';

const MONTHS = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Full class strings so Tailwind picks them up via static analysis
const USER_COLORS = [
  { badge: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-400'    },
  { badge: 'bg-rose-100 text-rose-800',     dot: 'bg-rose-400'    },
  { badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-400' },
  { badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-400'   },
  { badge: 'bg-purple-100 text-purple-800', dot: 'bg-purple-400'  },
  { badge: 'bg-teal-100 text-teal-800',     dot: 'bg-teal-400'    },
  { badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400'  },
  { badge: 'bg-pink-100 text-pink-800',     dot: 'bg-pink-400'    },
  { badge: 'bg-cyan-100 text-cyan-800',     dot: 'bg-cyan-400'    },
  { badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-400'  },
  { badge: 'bg-lime-100 text-lime-800',     dot: 'bg-lime-600'    },
  { badge: 'bg-fuchsia-100 text-fuchsia-800', dot: 'bg-fuchsia-400' },
];

function colorFor(userId) {
  return USER_COLORS[userId % USER_COLORS.length];
}

function StatsCard({ stats, year, onAllowanceChange }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(stats.allowance);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setValue(stats.allowance); }, [stats.allowance]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const save = async () => {
    if (value === stats.allowance) return setEditing(false);
    setSaving(true);
    try {
      await api.updateAllowance(value);
      setEditing(false);
      onAllowanceChange();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const total = stats.total_allowance ?? stats.allowance;
  const pct = total > 0 ? Math.min(100, (stats.used_days / total) * 100) : 0;
  const barColor = stats.remaining_days < 0 ? 'bg-red-500' : stats.remaining_days <= 5 ? 'bg-amber-400' : 'bg-indigo-500';
  const textColor = stats.remaining_days < 0 ? 'text-red-500' : stats.remaining_days <= 5 ? 'text-amber-600 font-semibold' : 'text-indigo-600 font-semibold';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">Meine Urlaubstage {year}</h3>
        <span className={`text-sm font-bold ${textColor}`}>
          {stats.remaining_days < 0
            ? `${Math.abs(stats.remaining_days)} Tage überzogen`
            : `${stats.remaining_days} Tage übrig`}
        </span>
      </div>

      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-50 rounded-xl p-2">
          <div className="text-gray-400 mb-0.5">Jahresurlaub</div>
          <div className="flex items-center justify-center gap-1">
            {editing ? (
              <>
                <input ref={inputRef} type="number" value={value} min={0} max={365}
                  onChange={(e) => setValue(Number(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                  className="w-12 border border-indigo-300 rounded-lg px-1 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                <button onClick={save} disabled={saving} className="text-indigo-600 font-bold">✓</button>
                <button onClick={() => setEditing(false)} className="text-gray-400">✕</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="font-bold text-gray-800 text-sm underline decoration-dotted hover:text-indigo-600"
                title="Jahresurlaub anpassen">
                {stats.allowance} Tage
              </button>
            )}
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-2">
          <div className="text-emerald-600 mb-0.5">Resturlaub Vorjahr</div>
          <div className="font-bold text-emerald-700 text-sm">+{stats.carryover ?? 0} Tage</div>
        </div>
        <div className="bg-indigo-50 rounded-xl p-2">
          <div className="text-indigo-500 mb-0.5">Genutzt</div>
          <div className="font-bold text-indigo-700 text-sm">{stats.used_days} von {total}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-right mt-2 italic">Klick auf Jahresurlaub zum Anpassen</p>
    </div>
  );
}

function localDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDE(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

export default function Calendar() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [vacations, setVacations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);

  const fetchVacations = useCallback(async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        api.getVacations(year, month + 1),
        api.getStats(year),
      ]);
      setVacations(data);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchVacations(); }, [fetchVacations]);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  // Build map: day number → list of vacation entries active that day
  const vacByDay = {};
  vacations.forEach((v) => {
    const start = localDate(v.start_date);
    const end = localDate(v.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!vacByDay[day]) vacByDay[day] = [];
        vacByDay[day].push(v);
      }
    }
  });

  const totalDays = daysInMonth(year, month);
  const firstDay = firstWeekdayOfMonth(year, month);
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const handleDayClick = (day) => {
    setModal({ mode: 'add', date: toDateStr(year, month, day) });
  };

  const handleVacationClick = (e, v) => {
    e.stopPropagation();
    if (v.user_id === user.id) {
      setModal({ mode: 'edit', vacation: v });
    }
  };

  const afterSave = () => { setModal(null); fetchVacations(); };

  return (
    <div className="space-y-5">
      {/* Vacation stats card */}
      {stats && (
        <StatsCard stats={stats} year={year} onAllowanceChange={fetchVacations} />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-gray-600 hover:text-indigo-600"
        >
          ‹
        </button>
        <h2 className="text-xl font-bold text-gray-800 flex-1 text-center sm:flex-none sm:text-left">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-gray-600 hover:text-indigo-600"
        >
          ›
        </button>
        {(year !== now.getFullYear() || month !== now.getMonth()) && (
          <button
            onClick={goToday}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            Heute
          </button>
        )}
        <div className="flex-1 sm:flex-none flex justify-end">
          <button
            onClick={() => setModal({ mode: 'add', date: todayStr })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            + Urlaub eintragen
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-indigo-50">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                i >= 5 ? 'text-rose-400' : 'text-indigo-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {/* Leading empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="min-h-[90px] sm:min-h-[110px] bg-gray-50/40" />
          ))}

          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const ds = toDateStr(year, month, day);
            const dayVacs = vacByDay[day] || [];
            const isToday = ds === todayStr;
            const colIdx = (firstDay + i) % 7;
            const isWeekend = colIdx >= 5;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`min-h-[90px] sm:min-h-[110px] p-1.5 cursor-pointer transition-colors group ${
                  isWeekend ? 'bg-slate-50/60' : 'bg-white'
                } hover:bg-indigo-50/40`}
              >
                <div className="flex justify-end mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : isWeekend
                        ? 'text-slate-400'
                        : 'text-gray-600 group-hover:text-indigo-600'
                    }`}
                  >
                    {day}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {dayVacs.slice(0, 3).map((v) => {
                    const color = colorFor(v.user_id);
                    const isOwn = v.user_id === user.id;
                    return (
                      <div
                        key={v.id}
                        onClick={(e) => handleVacationClick(e, v)}
                        title={`${v.first_name} ${v.last_name}${v.note ? ' – ' + v.note : ''}`}
                        className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md truncate font-medium leading-tight
                          ${color.badge}
                          ${isOwn ? 'cursor-pointer hover:brightness-95 outline outline-1 outline-current/30' : 'cursor-default'}`}
                      >
                        <span className="hidden sm:inline">{v.first_name} {v.last_name[0]}.</span>
                        <span className="sm:hidden">{v.first_name[0]}{v.last_name[0]}</span>
                      </div>
                    );
                  })}
                  {dayVacs.length > 3 && (
                    <p className="text-[10px] text-gray-400 px-1">+{dayVacs.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vacation list for the month */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">
            Urlaube im {MONTHS[month]}
            {loading && <span className="ml-2 text-gray-300 font-normal">Laden…</span>}
          </h3>
          {vacations.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {vacations.length} Einträge
            </span>
          )}
        </div>

        {vacations.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            <div className="text-3xl mb-2">🌴</div>
            Keine Urlaube in diesem Monat eingetragen.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {vacations.map((v) => {
              const color = colorFor(v.user_id);
              const isOwn = v.user_id === user.id;
              return (
                <li
                  key={v.id}
                  className={`px-5 py-3 flex items-center gap-3 ${isOwn ? 'hover:bg-indigo-50/30' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                  <span className={`text-sm font-medium px-2 py-0.5 rounded-lg ${color.badge}`}>
                    {v.first_name} {v.last_name}
                    {isOwn && <span className="ml-1 text-[10px] opacity-60">(du)</span>}
                  </span>
                  <span className="text-sm text-gray-500 flex-1">
                    {formatDE(v.start_date)}
                    {v.start_date !== v.end_date && ` – ${formatDE(v.end_date)}`}
                  </span>
                  {v.note && (
                    <span className="text-xs text-gray-400 italic hidden sm:block truncate max-w-[120px]">
                      „{v.note}"
                    </span>
                  )}
                  {isOwn && stats && (
                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                      {(() => {
                        const entry = stats.entries?.find(e => e.id === v.id);
                        return entry ? `${entry.working_days} AT` : '';
                      })()}
                    </span>
                  )}
                  {isOwn && (
                    <button
                      onClick={() => setModal({ mode: 'edit', vacation: v })}
                      className="text-xs text-indigo-400 hover:text-indigo-600 font-medium flex-shrink-0"
                    >
                      Bearbeiten
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Legend */}
      {vacations.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Klick auf einen <span className="font-medium text-indigo-400">eigenen Urlaub</span> im Kalender oder in der Liste zum Bearbeiten.
        </p>
      )}

      {modal && (
        <VacationModal
          modal={modal}
          onClose={() => setModal(null)}
          onSave={afterSave}
          onDelete={afterSave}
          stats={stats}
        />
      )}
    </div>
  );
}
