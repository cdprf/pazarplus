import { useContext } from 'react';
import Link from 'next/link';
import AuthContext from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-xl font-bold">Your E-commerce App</span>
          </Link>
          
          <nav className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span>Welcome, {user?.name || 'User'}</span>
                <Link href="/dashboard">
                  <span className="px-4 py-2 rounded hover:bg-gray-100">Dashboard</span>
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/admin/dashboard">
                    <span className="px-4 py-2 rounded hover:bg-gray-100">Admin</span>
                  </Link>
                )}
                <button 
                  onClick={logout}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span className="px-4 py-2 rounded hover:bg-gray-100">Login</span>
                </Link>
                <Link href="/register">
                  <span className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Register
                  </span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>
      
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <p className="text-center">&copy; {new Date().getFullYear()} Your E-commerce App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
