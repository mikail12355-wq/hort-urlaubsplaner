import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏫</span>
            <div>
              <h1 className="text-base font-bold text-indigo-800 leading-tight">Hort Urlaubsplaner</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Urlaubsplanung für Erzieher</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-400">Angemeldet</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
              title="Abmelden"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
