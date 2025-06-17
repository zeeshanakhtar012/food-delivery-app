import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from './AuthContext';
import Login from './components/Login';

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  return user && user.isAdmin ? children : <Navigate to="/login" />;
}

function DashboardOverview() {
  return <div className="p-6">Welcome to NoteNest Admin Dashboard!</div>;
}

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardOverview />
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