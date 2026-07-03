import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../api';
import AdminCalendar from './AdminCalendar';

function formatDE(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

function NumberEditor({ value: initial, onSave, label, color = 'indigo' }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setValue(initial); }, [initial]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const colors = {
    indigo: { btn: 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40', save: 'bg-indigo-600 hover:bg-indigo-700', ring: 'focus:ring-indigo-500' },
    emerald: { btn: 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40', save: 'bg-emerald-600 hover:bg-emerald-700', ring: 'focus:ring-emerald-500' },
  };
  const c = colors[color];

  const save = async () => {
    setSaving(true);
    try { await onSave(value); setEditing(false); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (!editing) return (
    <button onClick={() => setEditing(true)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${c.btn}`}>
      {label}: {initial}
    </button>
  );

  return (
    <div className="flex items-center gap-1">
      <input ref={inputRef} type="number" value={value} min={0} max={365}
        onChange={(e) => setValue(Number(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        className={`w-16 bg-gray-700 border border-gray-500 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 ${c.ring}`}
      />
      <span className="text-xs text-gray-400">Tage</span>
      <button onClick={save} disabled={saving} className={`text-xs px-2 py-1 rounded-lg text-white disabled:opacity-60 ${c.save}`}>✓</button>
      <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600">✕</button>
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.resetPassword(user.id, password);
      setSuccess(true);
      setTimeout(onDone, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-1">Passwort zurücksetzen</h3>
        <p className="text-gray-400 text-sm mb-4">{user.first_name} {user.last_name}</p>
        {success ? (
          <div className="bg-green-900/40 border border-green-700 text-green-300 text-sm rounded-xl px-4 py-3 text-center">
            ✓ Passwort zurückgesetzt
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Neues Passwort (min. 6 Zeichen)" minLength={6} required autoFocus />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
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
        )}
      </div>
    </div>
  );
}

const THIS_YEAR = new Date().getFullYear();

export default function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState('pending');
  const [users, setUsers] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [pending, setPending] = useState({ vacations: [], changes: [] });
  const [loading, setLoading] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [carryoverYear, setCarryoverYear] = useState(THIS_YEAR);

  const fetchUsers = useCallback(async () => {
    try { setUsers(await adminApi.getUsers()); } catch {}
  }, []);

  const fetchVacations = useCallback(async () => {
    try { setVacations(await adminApi.getVacations()); } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    try { setPending(await adminApi.getPending()); } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchVacations(), fetchPending()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchVacations, fetchPending]);

  const pendingUsers = users.filter((u) => !u.is_approved);
  const approved = users.filter((u) => u.is_approved);
  const totalPending = (pending.vacations?.length ?? 0) + (pending.changes?.length ?? 0) + pendingUsers.length;

  const handleApprove = async (id) => {
    try { await adminApi.approveUser(id); fetchUsers(); fetchPending(); }
    catch (err) { alert(err.message); }
  };

  const handleApproveVacation = async (id) => {
    try { await adminApi.approveVacation(id); fetchPending(); fetchVacations(); }
    catch (err) { alert(err.message); }
  };

  const handleRejectVacation = async (id) => {
    try { await adminApi.rejectVacation(id); fetchPending(); fetchVacations(); }
    catch (err) { alert(err.message); }
  };

  const handleApproveChange = async (id) => {
    try { await adminApi.approveChange(id); fetchPending(); fetchUsers(); }
    catch (err) { alert(err.message); }
  };

  const handleRejectChange = async (id) => {
    try { await adminApi.rejectChange(id); fetchPending(); }
    catch (err) { alert(err.message); }
  };

  const handleDeleteUser = async (id) => {
    if (confirmDelete !== id) return setConfirmDelete(id);
    try { await adminApi.deleteUser(id); setConfirmDelete(null); fetchUsers(); fetchVacations(); }
    catch (err) { alert(err.message); }
  };

  const handleDeleteVacation = async (id) => {
    if (confirmDelete !== `v${id}`) return setConfirmDelete(`v${id}`);
    try { await adminApi.deleteVacation(id); setConfirmDelete(null); fetchVacations(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔐</span>
          <div>
            <h1 className="font-bold text-white leading-tight">Admin Panel</h1>
            <p className="text-xs text-gray-400">Hort Urlaubsplaner</p>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem('admin_token'); onLogout(); }}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-700">
          Abmelden
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Pending approvals - always show as first tab content */}
        {pendingUsers.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-700/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-semibold text-amber-300 text-sm">
                  {pendingUsers.length} Konto{pendingUsers.length > 1 ? 's' : ''} wartet auf Freigabe
                </h3>
              </div>
              {pendingUsers.length > 1 && (
                <button onClick={async () => { await adminApi.approveAll(); fetchUsers(); fetchPending(); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/30 text-amber-300 hover:bg-amber-500/50 transition-colors font-medium">
                  Alle freigeben
                </button>
              )}
            </div>
            <ul className="divide-y divide-amber-700/20">
              {pendingUsers.map((u) => (
                <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-gray-500">{u.created_at?.slice(0,10).split('-').reverse().join('.') ?? ''}</p>
                  </div>
                  <button onClick={() => handleApprove(u.id)}
                    className="text-sm px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-medium transition-colors">
                    ✓ Freigeben
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${confirmDelete === u.id ? 'bg-red-600 text-white' : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'}`}>
                    {confirmDelete === u.id ? 'Wirklich?' : 'Ablehnen'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
          <button onClick={() => setTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === 'pending' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-white'}`}>
            Genehmigungen
            {totalPending > 0 && <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{totalPending}</span>}
          </button>
          <button onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Erzieher ({users.length})
          </button>
          <button onClick={() => setTab('planning')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'planning' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Planung
          </button>
          <button onClick={() => setTab('vacations')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'vacations' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Alle Urlaube ({vacations.filter(v => v.is_approved).length})
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Laden…</div>
        ) : tab === 'pending' ? (
          <div className="space-y-4">
            {(pending.vacations?.length === 0 && pending.changes?.length === 0) ? (
              <div className="bg-gray-800 rounded-2xl border border-gray-700 py-12 text-center text-gray-500">
                <div className="text-3xl mb-2">✅</div>
                Keine ausstehenden Genehmigungen.
              </div>
            ) : (
              <>
                {pending.vacations?.length > 0 && (
                  <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                    <div className="px-5 py-3 border-b border-gray-700 text-sm font-semibold text-amber-300">
                      🏖️ Urlaubsanträge ({pending.vacations.length})
                    </div>
                    <ul className="divide-y divide-gray-700/50">
                      {pending.vacations.map((v) => {
                        const isDeleteReq = v.status === 'approved' && v.delete_requested;
                        return (
                        <li key={v.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm">{v.first_name} {v.last_name}</p>
                            <p className="text-xs text-gray-400">
                              {formatDE(v.start_date)} – {formatDE(v.end_date)}
                              {v.note && <span className="italic ml-2 text-gray-500">„{v.note}"</span>}
                            </p>
                            <p className="text-xs mt-0.5">
                              {isDeleteReq && <span className="text-orange-400 font-medium">🗑️ Löschantrag</span>}
                              {v.replaces_id && <span className="text-amber-400 font-medium">✏️ Änderungsantrag</span>}
                              {!isDeleteReq && !v.replaces_id && <span className="text-emerald-400">Neuer Antrag</span>}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {isDeleteReq ? (
                              <>
                                <button onClick={async () => { await adminApi.approveVacationDelete(v.id); fetchPending(); fetchVacations(); }}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors">
                                  🗑️ Löschen
                                </button>
                                <button onClick={() => handleRejectVacation(v.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium transition-colors">
                                  Behalten
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleApproveVacation(v.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors">
                                  ✓ Genehmigen
                                </button>
                                <button onClick={() => handleRejectVacation(v.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 font-medium transition-colors">
                                  ✕ Ablehnen
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {pending.changes?.length > 0 && (
                  <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                    <div className="px-5 py-3 border-b border-gray-700 text-sm font-semibold text-indigo-300">
                      ✏️ Kontingent-Änderungen ({pending.changes.length})
                    </div>
                    <ul className="divide-y divide-gray-700/50">
                      {pending.changes.map((c) => (
                        <li key={c.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-gray-400">
                              {c.type === 'allowance'
                                ? `Jahresurlaub → ${c.new_value} Tage`
                                : `Übertrag ${c.year} → ${c.new_value} Tage`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleApproveChange(c.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors">
                              ✓ Genehmigen
                            </button>
                            <button onClick={() => handleRejectChange(c.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 font-medium transition-colors">
                              ✕ Ablehnen
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        ) : tab === 'users' ? (
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Noch keine Erzieher registriert.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Standard / Jahr</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <span>Übertrag</span>
                        <div className="flex items-center gap-0.5 bg-gray-700 rounded-lg px-1.5 py-0.5 ml-1">
                          <button onClick={() => setCarryoverYear(y => y - 1)} className="text-gray-400 hover:text-white text-xs">‹</button>
                          <span className="text-xs text-white font-medium px-1">{carryoverYear}</span>
                          <button onClick={() => setCarryoverYear(y => y + 1)} className="text-gray-400 hover:text-white text-xs">›</button>
                        </div>
                      </div>
                    </th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-gray-700/30 transition-colors ${!u.is_approved ? 'opacity-75' : ''}`}>
                      <td className="px-5 py-3.5 font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{u.first_name} {u.last_name}</span>
                          {!u.is_approved && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">Ausstehend</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {u.is_approved ? (
                          <NumberEditor
                            value={u.vacation_allowance ?? 30}
                            label="🌴"
                            color="indigo"
                            onSave={async (v) => { await adminApi.updateAllowance(u.id, v); fetchUsers(); }}
                          />
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {u.is_approved ? (
                          <NumberEditor
                            value={u[`carryover_${carryoverYear}`] ?? 0}
                            label={`➕`}
                            color="emerald"
                            onSave={async (v) => { await adminApi.updateCarryover(u.id, v, carryoverYear); fetchUsers(); }}
                          />
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2 justify-end flex-wrap">
                          {!u.is_approved && (
                            <button onClick={() => handleApprove(u.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-medium transition-colors">
                              ✓ Freigeben
                            </button>
                          )}
                          {u.is_approved && (
                            <button onClick={() => setResetModal(u)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 transition-colors font-medium">
                              Passwort
                            </button>
                          )}
                          <button onClick={() => handleDeleteUser(u.id)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              confirmDelete === u.id ? 'bg-red-600 text-white' : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
                            }`}>
                            {confirmDelete === u.id ? 'Wirklich?' : 'Löschen'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : tab === 'planning' ? (
          <AdminCalendar users={users} />
        ) : (
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
            {vacations.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Keine Urlaube eingetragen.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Erzieher</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Zeitraum</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Notiz</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {vacations.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium">{v.first_name} {v.last_name}</td>
                      <td className="px-5 py-3.5 text-gray-400 hidden sm:table-cell whitespace-nowrap">
                        {formatDE(v.start_date)} – {formatDE(v.end_date)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 italic hidden md:table-cell">{v.note || '—'}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => handleDeleteVacation(v.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors float-right ${
                            confirmDelete === `v${v.id}` ? 'bg-red-600 text-white' : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
                          }`}>
                          {confirmDelete === `v${v.id}` ? 'Wirklich?' : 'Löschen'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {resetModal && (
        <ResetPasswordModal user={resetModal} onClose={() => setResetModal(null)}
          onDone={() => { setResetModal(null); fetchUsers(); }} />
      )}
    </div>
  );
}
