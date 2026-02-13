import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import RestaurantAdminDashboard from './pages/RestaurantAdmin/Dashboard';

// Placeholder components
const PlaceholderPage = ({ title }) => (
  <div className="p-4">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-2 text-muted-foreground">This page is under construction.</p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Super Admin Routes */}
      <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <Layout>
            <Routes>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="restaurants" element={<PlaceholderPage title="Manage Restaurants" />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Restaurant Admin Routes */}
      <Route path="/restaurant-admin/*" element={
        <ProtectedRoute allowedRoles={['restaurant_admin']}>
          <Layout>
            <Routes>
              <Route index element={<RestaurantAdminDashboard />} />
              <Route path="orders" element={<PlaceholderPage title="Orders Management" />} />
              <Route path="menu" element={<PlaceholderPage title="Menu Management" />} />
              <Route path="staff" element={<PlaceholderPage title="Staff Management" />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
