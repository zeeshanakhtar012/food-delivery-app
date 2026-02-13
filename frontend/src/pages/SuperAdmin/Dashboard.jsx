import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, Utensils, Users, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, description }) => (
    <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${colorClass} bg-opacity-20`}>
                <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center">
                <TrendingUp size={12} className="mr-1" /> +12%
            </span>
        </div>
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
            {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
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
                const data = response.data.analytics || {}; // Adjusted to match generic response structure if needed, or check specific key

                // Super Admin API likely returns { analytics: { total_restaurants: ... } } based on controller
                // Actually controller says: res.json({ message:..., analytics: ... })

                setStats({
                    totalRestaurants: data.total_restaurants || 0,
                    totalUsers: data.total_users || 0, // Ensure field matches API
                    totalRevenue: data.total_revenue ? `$${parseFloat(data.total_revenue).toFixed(2)}` : '$0.00',
                    activeRiders: data.active_riders || 0
                });
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
                setStats({
                    totalRestaurants: 0,
                    totalUsers: 0,
                    totalRevenue: '$0.00',
                    activeRiders: 0
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Overview</h1>
                <p className="text-muted-foreground mt-1">Global statistics and system health.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={stats.totalRevenue}
                    icon={DollarSign}
                    colorClass="bg-green-500 text-green-600"
                    description="Total platform earnings"
                />
                <StatCard
                    title="Restaurants"
                    value={stats.totalRestaurants}
                    icon={Utensils}
                    colorClass="bg-orange-500 text-orange-600"
                    description="Active partners"
                />
                <StatCard
                    title="Users"
                    value={stats.totalUsers}
                    icon={Users}
                    colorClass="bg-blue-500 text-blue-600"
                    description="Registered customers"
                />
                <StatCard
                    title="Riders"
                    value={stats.activeRiders}
                    icon={Activity}
                    colorClass="bg-purple-500 text-purple-600"
                    description="Currently online"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Newest Restaurants</h3>
                        <button className="text-sm text-primary hover:underline flex items-center">
                            View All <ArrowUpRight size={14} className="ml-1" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center p-3 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border/50">
                                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold">
                                    <Utensils size={18} />
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="font-medium text-sm">Spicy Corner {i}</p>
                                    <p className="text-xs text-muted-foreground">Joined 2 days ago</p>
                                </div>
                                <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                    Active
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">System Activity</h3>
                    </div>
                    <div className="relative border-l border-muted ml-3 space-y-6 pl-6 pb-2">
                        <div className="relative">
                            <span className="absolute -left-[31px] bg-blue-500 h-2.5 w-2.5 rounded-full ring-4 ring-card"></span>
                            <p className="text-sm text-foreground font-medium">New Rider registered</p>
                            <p className="text-xs text-muted-foreground mt-0.5">John Doe applied for rider position.</p>
                            <span className="text-[10px] text-muted-foreground mt-1 block">2 mins ago</span>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[31px] bg-green-500 h-2.5 w-2.5 rounded-full ring-4 ring-card"></span>
                            <p className="text-sm text-foreground font-medium">Payout Processed</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Weekly payouts for 5 restaurants.</p>
                            <span className="text-[10px] text-muted-foreground mt-1 block">1 hour ago</span>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[31px] bg-orange-500 h-2.5 w-2.5 rounded-full ring-4 ring-card"></span>
                            <p className="text-sm text-foreground font-medium">System Update</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Maintenance window scheduled.</p>
                            <span className="text-[10px] text-muted-foreground mt-1 block">5 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
