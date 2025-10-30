import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import Login from '@/components/Login';
import RestaurantDetails from '@/components/RestaurantDetails';
import UpdateRestaurant from '@/components/UpdateRestaurant';
import CategoryManagement from '@/components/CategoryManagement';
import FoodManagement from '@/components/FoodManagement';
import OrderManagement from '@/components/OrderManagement';
import Analytics from '@/components/Analytics';
// import Reports from "@/components/Reports";
import Expenses from '@/components/Expenses';
import { RestaurantImages } from '@/components/ImageUploaders';

function Protected({ children }) {
  const { user } = useContext(AuthContext);
  return user?.role === 'restaurant_admin' ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><RestaurantDetails /></Protected>} />
      <Route path="/restaurant" element={<Protected><RestaurantDetails /></Protected>} />
      <Route path="/restaurant/update" element={<Protected><UpdateRestaurant /></Protected>} />
      <Route path="/categories" element={<Protected><CategoryManagement /></Protected>} />
      <Route path="/foods" element={<Protected><FoodManagement /></Protected>} />
      <Route path="/orders" element={<Protected><OrderManagement /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
      <Route path="/restaurant/images" element={<Protected><RestaurantImages /></Protected>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}