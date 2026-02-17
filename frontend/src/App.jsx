import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import Restaurants from './pages/SuperAdmin/Restaurants';
import SuperAdminSettings from './pages/SuperAdmin/Settings';
import RestaurantAdminDashboard from './pages/RestaurantAdmin/Dashboard';
import Orders from './pages/RestaurantAdmin/Orders';
import Menu from './pages/RestaurantAdmin/Menu';
import Categories from './pages/RestaurantAdmin/Categories';
import Staff from './pages/RestaurantAdmin/Staff';
import Tables from './pages/RestaurantAdmin/Tables';
import Reservations from './pages/RestaurantAdmin/Reservations'; // [NEW]
import Reports from './pages/RestaurantAdmin/Reports';
import Settings from './pages/RestaurantAdmin/Settings';
import POS from './pages/RestaurantAdmin/POS';
import KitchenDisplay from './pages/RestaurantAdmin/KitchenDisplay'; // [NEW] // [NEW]

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
              <Route path="restaurants" element={<Restaurants />} /> {/* Changed to actual component */}
              <Route path="settings" element={<SuperAdminSettings />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* POS Route (Standalone - No Layout) */}
      <Route path="/restaurant-admin/pos" element={
        <ProtectedRoute allowedRoles={['restaurant_admin']}>
          <POS />
        </ProtectedRoute>
      } />

      {/* KDS Route (Standalone - No Layout) */}
      <Route path="/restaurant-admin/kds" element={
        <ProtectedRoute allowedRoles={['restaurant_admin']}>
          <KitchenDisplay />
        </ProtectedRoute>
      } />

      {/* Restaurant Admin Routes */}
      <Route path="/restaurant-admin/*" element={
        <ProtectedRoute allowedRoles={['restaurant_admin']}>
          <Layout>
            <Routes>
              <Route index element={<RestaurantAdminDashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="categories" element={<Categories />} />
              <Route path="menu" element={<Menu />} />
              <Route path="staff" element={<Staff />} />
              <Route path="tables" element={<Tables />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
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
