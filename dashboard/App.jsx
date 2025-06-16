const { Routes, Route, Navigate } = ReactRouterDOM;
const { useContext } = React;

import AuthContext, { AuthProvider } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './components/Login.jsx';
import DashboardOverview from './components/DashboardOverview.jsx';
import UserManagement from './components/UserManagement.jsx';
import FoodManagement from './components/FoodManagement.jsx';
import OrderManagement from './components/OrderManagement.jsx';
import DiscountManagement from './components/DiscountManagement.jsx';
import AdvertisementManagement from './components/AdvertisementManagement.jsx';
import NotificationManagement from './components/NotificationManagement.jsx';
import SupportManagement from './components/SupportManagement.jsx';
import AuditLogs from './components/AuditLogs.jsx';
import Settings from './components/Settings.jsx';

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  return user && user.isAdmin ? children : <Navigate to="/login" />;
}

function App() {
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {user && user.isAdmin && (
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {user && user.isAdmin && (
          <Navbar setSidebarOpen={setSidebarOpen} />
        )}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardOverview />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/foods" element={
              <ProtectedRoute>
                <FoodManagement />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <OrderManagement />
              </ProtectedRoute>
            } />
            <Route path="/discounts" element={
              <ProtectedRoute>
                <DiscountManagement />
              </ProtectedRoute>
            } />
            <Route path="/advertisements" element={
              <ProtectedRoute>
                <AdvertisementManagement />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationManagement />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <SupportManagement />
              </ProtectedRoute>
            } />
            <Route path="/audit-logs" element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;