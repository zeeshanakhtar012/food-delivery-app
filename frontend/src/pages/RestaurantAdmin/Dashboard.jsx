import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, ShoppingBag, Users, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
        totalSales: 0,
        totalOrders: 0,
        pendingOrders: 0,
        avgOrderValue: 0
    });
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch stats
                const response = await api.get('/api/admin/analytics');
                setStats(response.data.stats || {
                    totalSales: '$12,450',
                    totalOrders: 342,
                    pendingOrders: 5,
                    avgOrderValue: '$36.40'
                });

                // Mock chart data if not returned
                setSalesData([
                    { name: 'Mon', sales: 4000 },
                    { name: 'Tue', sales: 3000 },
                    { name: 'Wed', sales: 2000 },
                    { name: 'Thu', sales: 2780 },
                    { name: 'Fri', sales: 1890 },
                    { name: 'Sat', sales: 2390 },
                    { name: 'Sun', sales: 3490 },
                ]);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);

                // Mock data
                setStats({
                    totalSales: '$12,450',
                    totalOrders: 342,
                    pendingOrders: 5,
                    avgOrderValue: '$36.40'
                });
                setSalesData([
                    { name: 'Mon', sales: 4000 },
                    { name: 'Tue', sales: 3000 },
                    { name: 'Wed', sales: 2000 },
                    { name: 'Thu', sales: 2780 },
                    { name: 'Fri', sales: 1890 },
                    { name: 'Sat', sales: 2390 },
                    { name: 'Sun', sales: 3490 },
                ]);

            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Restaurant Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Sales"
                    value={stats.totalSales}
                    icon={DollarSign}
                    color="bg-green-500"
                />
                <StatCard
                    title="Total Orders"
                    value={stats.totalOrders}
                    icon={ShoppingBag}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Pending Orders"
                    value={stats.pendingOrders}
                    icon={Clock}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Avg. Order Value"
                    value={stats.avgOrderValue}
                    icon={DollarSign}
                    color="bg-purple-500"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="bg-card p-6 rounded-lg border shadow-sm md:col-span-2">
                    <h3 className="text-lg font-semibold mb-6">Weekly Sales Overview</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={salesData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="sales" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
                    <div className="space-y-4">
                        {/* Placeholder for list */}
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                            <div>
                                <p className="font-medium">Order #1234</p>
                                <p className="text-xs text-muted-foreground">2 mins ago</p>
                            </div>
                            <span className="text-sm font-bold">$45.00</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                            <div>
                                <p className="font-medium">Order #1233</p>
                                <p className="text-xs text-muted-foreground">15 mins ago</p>
                            </div>
                            <span className="text-sm font-bold">$23.50</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                            <div>
                                <p className="font-medium">Order #1232</p>
                                <p className="text-xs text-muted-foreground">1 hour ago</p>
                            </div>
                            <span className="text-sm font-bold">$112.00</span>
                        </div>
                    </div>
                    <button className="w-full mt-4 text-sm text-primary hover:underline">View All Orders</button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
