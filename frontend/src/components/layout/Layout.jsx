import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    LayoutGrid,
    UtensilsCrossed,
    Users,
    Settings,
    LogOut,
    Menu as MenuIcon,
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    Bell,
    Search,
    ChefHat,
    BarChart3
} from 'lucide-react';
import clsx from 'clsx';

const SidebarItem = ({ icon: Icon, label, to, collapsed }) => {
    const location = useLocation();
    const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

    return (
        <Link
            to={to}
            title={collapsed ? label : ''}
            className={clsx(
                "flex items-center gap-3 px-3 py-2.5 mx-3 mb-1 text-sm font-medium transition-all duration-200 rounded-lg group relative",
                isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2 mx-2"
            )}
        >
            <Icon size={20} className={clsx("flex-shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
            {!collapsed && <span className="truncate">{label}</span>}

            {/* Tooltip for collapsed state */}
            {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border">
                    {label}
                </div>
            )}
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
        { icon: LayoutGrid, label: 'Tables', to: '/restaurant-admin/tables' },
        { icon: UtensilsCrossed, label: 'Menu Items', to: '/restaurant-admin/menu' },
        { icon: BarChart3, label: 'Reports', to: '/restaurant-admin/reports' },
        { icon: Users, label: 'Staff & Riders', to: '/restaurant-admin/staff' },
        { icon: Settings, label: 'Settings', to: '/restaurant-admin/settings' },
    ];

    const links = role === 'super_admin' ? superAdminLinks : restaurantAdminLinks;

    return (
        <aside
            className={clsx(
                "flex flex-col h-screen border-r bg-card transition-all duration-300 ease-in-out relative z-20",
                collapsed ? "w-[80px]" : "w-[260px]"
            )}
        >
            {/* Brand Header */}
            <div className="flex items-center h-16 px-4 border-b">
                <div className={clsx("flex items-center gap-3 overflow-hidden transition-all duration-300", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <ChefHat className="text-primary h-6 w-6" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">NoteNest</span>
                </div>

                {collapsed && (
                    <div className="w-full flex justify-center">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <ChefHat className="text-primary h-6 w-6" />
                        </div>
                    </div>
                )}
            </div>

            {/* Toggle Button (Absolute) */}
            <button
                onClick={toggleCollapsed}
                className="absolute -right-3 top-20 bg-card border shadow-sm rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-50"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Navigation Links */}
            <div className="flex-1 py-6 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted">
                <div className={clsx("px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider", collapsed && "hidden")}>
                    Menu
                </div>
                <nav>
                    {links.map((link) => (
                        <SidebarItem
                            key={link.to}
                            {...link}
                            collapsed={collapsed}
                        />
                    ))}
                </nav>
            </div>

            {/* Footer / User Profile Summary can go here if needed, or Logout */}
            <div className="p-4 border-t bg-muted/10">
                <button
                    onClick={logout}
                    className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive/90 hover:text-destructive transition-colors rounded-lg w-full hover:bg-destructive/10",
                        collapsed && "justify-center px-2"
                    )}
                    title="Logout"
                >
                    <LogOut size={20} />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

const Header = ({ user }) => {
    return (
        <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10 transition-all">
            <div className="flex items-center gap-4 flex-1">
                {/* Search Bar Placeholder */}
                <div className="relative w-full max-w-sm hidden md:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-muted/40 border-transparent focus:bg-background focus:border-input rounded-md transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-card"></span>
                </button>

                <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-3 pl-1">
                    <div className="flex flex-col items-end hidden sm:block leading-tight">
                        <span className="text-sm font-semibold text-foreground">{user?.email?.split('@')[0]}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold shadow-sm ring-2 ring-background">
                        {(user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
};

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    // If not authenticated, redirect happens in ProtectedRoute, but good to have fallback
    if (!user) return null;

    return (
        <div className="flex h-screen bg-muted/10 font-sans">
            <Sidebar
                role={user?.role}
                collapsed={collapsed}
                toggleCollapsed={() => setCollapsed(!collapsed)}
            />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header user={user} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
