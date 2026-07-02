import { useState } from 'react';
import { api } from '../api';

export default function RegisterForm({ onSwitch }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwörter stimmen nicht überein.');
    setLoading(true);
    try {
      await api.register({
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
      });
      setPending(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Registrierung erfolgreich!</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5 text-left">
          <p className="text-amber-800 text-sm font-semibold mb-1">⏳ Warte auf Admin-Freigabe</p>
          <p className="text-amber-700 text-sm leading-relaxed">
            Dein Konto wurde erstellt, muss aber erst vom Admin freigeschaltet werden.
            Erst danach kannst du dich einloggen.
          </p>
        </div>
        <p className="text-gray-400 text-xs mb-5">
          Bitte wende dich direkt an den Admin und teile ihm mit,<br />
          dass du einen Account unter <span className="font-medium text-gray-600">{form.first_name} {form.last_name}</span> erstellt hast.
        </p>
        <button
          onClick={onSwitch}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          Zur Anmeldung
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Konto erstellen</h2>
      <p className="text-sm text-gray-400 mb-6">Nur Vor- und Nachname – keine E-Mail nötig.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Vorname</label>
            <input type="text" value={form.first_name} onChange={set('first_name')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              placeholder="Max" required autoComplete="given-name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Nachname</label>
            <input type="text" value={form.last_name} onChange={set('last_name')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              placeholder="Mustermann" required autoComplete="family-name" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Passwort</label>
          <input type="password" value={form.password} onChange={set('password')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            placeholder="Mindestens 6 Zeichen" required minLength={6} autoComplete="new-password" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Passwort bestätigen</label>
          <input type="password" value={form.confirm} onChange={set('confirm')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            placeholder="••••••" required autoComplete="new-password" />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}
        <button type="submit" disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60 text-sm">
          {loading ? 'Registrieren...' : 'Konto erstellen'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        Bereits registriert?{' '}
        <button onClick={onSwitch} className="text-indigo-600 hover:text-indigo-700 font-medium">Anmelden</button>
      </p>
    </div>
  );
}
