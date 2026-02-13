import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
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
