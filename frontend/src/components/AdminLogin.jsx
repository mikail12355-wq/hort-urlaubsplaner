import { useState } from 'react';
import { adminApi } from '../api';

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await adminApi.login(form);
      localStorage.setItem('admin_token', token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Hort Urlaubsplaner</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-7 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Benutzername
              </label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="admin"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Passwort
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
