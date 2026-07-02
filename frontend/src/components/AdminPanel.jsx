import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';

function formatDE(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}.${m}.${y}`;
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
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Neues Passwort (min. 6 Zeichen)"
              minLength={6}
              required
              autoFocus
            />
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
    try { setUsers(await adminApi.getUsers()); } catch { /* ignore */ }
  }, []);

  const fetchVacations = useCallback(async () => {
    try { setVacations(await adminApi.getVacations()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchVacations()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchVacations]);

  const handleDeleteUser = async (id) => {
    if (confirmDelete !== id) return setConfirmDelete(id);
    try {
      await adminApi.deleteUser(id);
      setConfirmDelete(null);
      fetchUsers();
      fetchVacations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteVacation = async (id) => {
    if (confirmDelete !== `v${id}`) return setConfirmDelete(`v${id}`);
    try {
      await adminApi.deleteVacation(id);
      setConfirmDelete(null);
      fetchVacations();
    } catch (err) {
      alert(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔐</span>
          <div>
            <h1 className="font-bold text-white leading-tight">Admin Panel</h1>
            <p className="text-xs text-gray-400">Hort Urlaubsplaner</p>
          </div>
        </div>
        <button onClick={logout}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-700">
          Abmelden
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-xl w-fit">
          <button onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            Erzieher ({users.length})
          </button>
          <button onClick={() => setTab('vacations')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'vacations' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            Urlaube ({vacations.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Laden…</div>
        ) : tab === 'users' ? (
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Noch keine Erzieher registriert.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Registriert</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 hidden sm:table-cell">
                        {u.created_at ? u.created_at.slice(0, 10).split('-').reverse().join('.') : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setResetModal(u)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 transition-colors font-medium">
                            Passwort&nbsp;zurücksetzen
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              confirmDelete === u.id
                                ? 'bg-red-600 text-white'
                                : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
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
                      <td className="px-5 py-3.5 font-medium">
                        {v.first_name} {v.last_name}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 hidden sm:table-cell whitespace-nowrap">
                        {formatDE(v.start_date)} – {formatDE(v.end_date)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 italic hidden md:table-cell">
                        {v.note || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDeleteVacation(v.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors float-right ${
                            confirmDelete === `v${v.id}`
                              ? 'bg-red-600 text-white'
                              : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
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
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
          onDone={() => { setResetModal(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}
