import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Users,
    Settings,
    LogOut,
    Menu,
    ChevronLeft,
    ChevronRight,
    ShoppingBag
} from 'lucide-react';
import clsx from 'clsx';

const SidebarItem = ({ icon: Icon, label, to, collapsed }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={clsx(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mx-2 mb-1",
                isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
            )}
        >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
        </Link>
    );
};

const Sidebar = ({ role, collapsed, toggleCollapsed }) => {
    const { logout } = useAuth();

    const superAdminLinks = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/super-admin' },
        { icon: UtensilsCrossed, label: 'Restaurants', to: '/super-admin/restaurants' },
        { icon: Settings, label: 'Settings', to: '/super-admin/settings' },
    ];

    const restaurantAdminLinks = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/restaurant-admin' },
        { icon: ShoppingBag, label: 'Orders', to: '/restaurant-admin/orders' },
        { icon: UtensilsCrossed, label: 'Menu', to: '/restaurant-admin/menu' },
        { icon: Users, label: 'Staff', to: '/restaurant-admin/staff' },
        { icon: Settings, label: 'Settings', to: '/restaurant-admin/settings' },
    ];

    const links = role === 'super_admin' ? superAdminLinks : restaurantAdminLinks;

    return (
        <div className={clsx(
            "flex flex-col h-screen border-r bg-card transition-all duration-300",
            collapsed ? "w-20" : "w-64"
        )}>
            <div className="flex items-center justify-between p-4 h-16 border-b">
                {!collapsed && <span className="font-bold text-xl truncate">NoteNest Admin</span>}
                <button
                    onClick={toggleCollapsed}
                    className="p-1.5 rounded-md hover:bg-muted/50 ml-auto"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <div className="flex-1 py-4 overflow-y-auto">
                {links.map((link) => (
                    <SidebarItem
                        key={link.to}
                        {...link}
                        collapsed={collapsed}
                    />
                ))}
            </div>

            <div className="p-4 border-t">
                <button
                    onClick={logout}
                    className={clsx(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive transition-colors rounded-lg w-full hover:bg-destructive/10",
                        collapsed && "justify-center px-2"
                    )}
                >
                    <LogOut size={20} />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
};

const Header = ({ user }) => {
    return (
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-foreground">
                    Welcome back, {user?.name || admin?.name || 'Admin'}
                </h2>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">{user?.email}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {(user?.name?.[0] || 'A').toUpperCase()}
                </div>
            </div>
        </header>
    );
};

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-muted/20">
            <Sidebar
                role={user?.role}
                collapsed={collapsed}
                toggleCollapsed={() => setCollapsed(!collapsed)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
