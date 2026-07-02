import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Calendar from './components/Calendar';
import Header from './components/Header';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';

const isAdminRoute = window.location.hash === '#/admin';

function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token'));
  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  return <AdminPanel onLogout={() => setLoggedIn(false)} />;
}

function AppContent() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🏫</div>
            <h1 className="text-3xl font-bold text-indigo-800">Hort Urlaubsplaner</h1>
            <p className="text-indigo-400 mt-2 text-sm">Übersichtliche Urlaubsplanung für das Team</p>
          </div>
          {showRegister ? (
            <RegisterForm onSwitch={() => setShowRegister(false)} />
          ) : (
            <LoginForm onSwitch={() => setShowRegister(true)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Calendar />
      </main>
    </div>
  );
}

export default function App() {
  if (isAdminRoute) return <AdminApp />;
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
