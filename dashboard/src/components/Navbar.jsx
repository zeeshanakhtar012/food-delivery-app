import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext.jsx';

function Navbar({ setSidebarOpen }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <div className="flex items-center">
        <button className="md:hidden mr-4" onClick={() => setSidebarOpen(true)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      </div>
      <div className="flex items-center">
        <span className="mr-4">{user?.name}</span>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;