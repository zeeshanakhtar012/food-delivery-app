import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, Utensils, Users, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-card p-6 rounded-lg border shadow-sm flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalRestaurants: 0,
        totalUsers: 0,
        totalRevenue: 0,
        activeRiders: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/api/superadmin/analytics');
                setStats(response.data.data || {
                    totalRestaurants: 12, // Mock data if API fails or returns empty
                    totalUsers: 1450,
                    totalRevenue: '$45,230',
                    activeRiders: 34
                });
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
                // Fallback mock data for visualization
                setStats({
                    totalRestaurants: 12,
                    totalUsers: 1450,
                    totalRevenue: '$45,230',
                    activeRiders: 34
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={stats.totalRevenue}
                    icon={DollarSign}
                    color="bg-green-500"
                />
                <StatCard
                    title="Total Restaurants"
                    value={stats.totalRestaurants}
                    icon={Utensils}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Active Riders"
                    value={stats.activeRiders}
                    icon={TrendingUp}
                    color="bg-purple-500"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Recent Registrations</h3>
                    <div className="space-y-4">
                        {/* Placeholder for list */}
                        <p className="text-muted-foreground text-sm">No recent registrations.</p>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Platform Activity</h3>
                    {/* Placeholder for chart */}
                    <div className="h-[200px] w-full bg-muted rounded-md flex items-center justify-center">
                        Chart Placeholder
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
