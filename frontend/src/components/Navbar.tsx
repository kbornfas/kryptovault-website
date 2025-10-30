import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './notifications/NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const showLinks = pathname !== '/about';
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-indigo-900 shadow-md">
      <Link to="/" className="text-2xl font-extrabold text-white tracking-wide">
        KryptoVault
      </Link>
      <div className="flex items-center">
        {showLinks && (
          <ul className="flex gap-6 text-gray-200 mr-8">
            <li><Link to="/" className="hover:text-purple-400">Home</Link></li>
            <li><Link to="/about" className="hover:text-purple-400">About</Link></li>
            <li><Link to="/contact" className="hover:text-purple-400">Contact</Link></li>
            <li><Link to="/auto-trading" className="hover:text-purple-400">Auto Trading</Link></li>
            <li><Link to="/trade-history" className="hover:text-purple-400">Trade History</Link></li>
            {isAdmin && (
              <li><Link to="/admin" className="hover:text-purple-400">Admin</Link></li>
            )}
          </ul>
        )}
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <NotificationBell />
              <span className="text-gray-200">Welcome, {user.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-gray-200 hover:text-purple-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-gray-200 hover:text-purple-400">
                Login
              </Link>
              <Link to="/signup" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
