const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unbekannter Fehler.');
  return data;
}

export const api = {
  register: (body) => req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => req('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getVacations: (year, month) => req(`/vacations/month/${year}/${month}`),
  addVacation: (body) => req('/vacations', { method: 'POST', body: JSON.stringify(body) }),
  updateVacation: (id, body) => req(`/vacations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVacation: (id) => req(`/vacations/${id}`, { method: 'DELETE' }),
};
