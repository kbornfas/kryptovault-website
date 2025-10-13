import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-indigo-900 shadow-md">
      <Link to="/" className="text-2xl font-extrabold text-white tracking-wide">
        KryptoVault
      </Link>
      <div className="flex items-center">
        <ul className="flex gap-6 text-gray-200 mr-8">
         <li><Link to="/" className="hover:text-purple-400">Home</Link></li>
         <li><Link to="/about" className="hover:text-purple-400">About</Link></li>
         <li><Link to="/contact" className="hover:text-purple-400">Contact</Link></li>
        </ul>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
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
