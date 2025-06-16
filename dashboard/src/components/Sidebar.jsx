const { NavLink } = ReactRouterDOM;

function Sidebar({ isOpen, setIsOpen }) {
  const links = [
    { name: 'Dashboard', path: '/', icon: 'home' },
    { name: 'Users', path: '/users', icon: 'users' },
    { name: 'Foods', path: '/foods', icon: 'cake' },
    { name: 'Orders', path: '/orders', icon: 'shopping-cart' },
    { name: 'Discounts', path: '/discounts', icon: 'tag' },
    { name: 'Advertisements', path: '/advertisements', icon: 'megaphone' },
    { name: 'Notifications', path: '/notifications', icon: 'bell' },
    { name: 'Support', path: '/support', icon: 'chat-bubble-left-right' },
    { name: 'Audit Logs', path: '/audit-logs', icon: 'document-text' },
    { name: 'Settings', path: '/settings', icon: 'cog' },
  ];

  return (
    <aside className={`sidebar fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 text-white transform ${isOpen ? 'open' : ''} md:static md:transform-none`}>
      <div className="flex items-center justify-between p-4">
        <h2 className="text-xl font-bold">NoteNest Admin</h2>
        <button className="md:hidden" onClick={() => setIsOpen(false)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="mt-4">
        {links.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => `flex items-center p-4 hover:bg-gray-700 ${isActive ? 'bg-gray-900' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <use href={`https://cdn.jsdelivr.net/npm/@heroicons/react@2.1.5/24/outline/index.min.css#${link.icon}`} />
            </svg>
            {link.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;