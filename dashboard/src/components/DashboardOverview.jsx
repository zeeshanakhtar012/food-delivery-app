import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DashboardOverview() {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    activeSupportTickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const [analyticsRes, supportRes] = await Promise.all([
          axios.get('http://localhost:5001/api/admin/analytics', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5001/api/support/messages', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setAnalytics({
          ...analyticsRes.data,
          activeSupportTickets: supportRes.data.messages.filter(msg => !msg.isRead).length
        });
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Users</h3>
          <p className="text-3xl">{analytics.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Active Users</h3>
          <p className="text-3xl">{analytics.activeUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Orders</h3>
          <p className="text-3xl">{analytics.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Revenue</h3>
          <p className="text-3xl">${analytics.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Pending Orders</h3>
          <p className="text-3xl">{analytics.pendingOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Active Support Tickets</h3>
          <p className="text-3xl">{analytics.activeSupportTickets}</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;