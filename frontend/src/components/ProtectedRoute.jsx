import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    console.log('[ProtectedRoute] Checking access:', {
        user: user ? { ...user, _token: 'HIDDEN' } : null,
        allowedRoles,
        currentPath: location.pathname
    });

    if (loading) {
        console.log('[ProtectedRoute] Loading state...');
        return <div>Loading...</div>;
    }

    if (!user) {
        console.warn('[ProtectedRoute] No user found, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`[ProtectedRoute] Access denied. User role: ${user.role}, Allowed: ${allowedRoles}`);
        // Redirect based on role if they try to access unauthorized page
        if (user.role === 'super_admin') {
            return <Navigate to="/super-admin" replace />;
        } else if (user.role === 'restaurant_admin') {
            return <Navigate to="/restaurant-admin" replace />;
        } else {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
