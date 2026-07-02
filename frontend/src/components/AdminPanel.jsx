import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../api';

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

export default function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(async () => {
    try { setUsers(await adminApi.getUsers()); } catch {}
  }, []);

  const fetchVacations = useCallback(async () => {
    try { setVacations(await adminApi.getVacations()); } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchVacations()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchVacations]);

  const pending = users.filter((u) => !u.is_approved);
  const approved = users.filter((u) => u.is_approved);

  const handleApprove = async (id) => {
    try { await adminApi.approveUser(id); fetchUsers(); }
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

        {/* Pending approvals */}
        {pending.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-700/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="font-semibold text-amber-300 text-sm">
                {pending.length} Konto{pending.length > 1 ? 's' : ''} wartet auf Freigabe
              </h3>
            </div>
            <ul className="divide-y divide-amber-700/20">
              {pending.map((u) => (
                <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-gray-500">
                      {u.created_at ? u.created_at.slice(0, 10).split('-').reverse().join('.') : ''}
                    </p>
                  </div>
                  <button onClick={() => handleApprove(u.id)}
                    className="text-sm px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-medium transition-colors">
                    ✓ Freigeben
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      confirmDelete === u.id ? 'bg-red-600 text-white' : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
                    }`}>
                    {confirmDelete === u.id ? 'Wirklich?' : 'Ablehnen'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit">
          <button onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Erzieher ({approved.length})
          </button>
          <button onClick={() => setTab('vacations')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'vacations' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Urlaube ({vacations.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Laden…</div>
        ) : tab === 'users' ? (
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
            {approved.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Noch keine freigegebenen Erzieher.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Urlaubs&shy;tage</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Resturlaub</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {approved.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium">{u.first_name} {u.last_name}</td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <NumberEditor
                          value={u.vacation_allowance ?? 30}
                          label="🌴"
                          color="indigo"
                          onSave={async (v) => { await adminApi.updateAllowance(u.id, v); fetchUsers(); }}
                        />
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <NumberEditor
                          value={u.vacation_carryover ?? 0}
                          label="➕"
                          color="emerald"
                          onSave={async (v) => { await adminApi.updateCarryover(u.id, v); fetchUsers(); }}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <button onClick={() => setResetModal(u)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 transition-colors font-medium">
                            Passwort
                          </button>
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
