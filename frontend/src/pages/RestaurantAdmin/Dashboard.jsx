import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import moment from 'moment';
import {
    DollarSign, ShoppingBag, Clock, TrendingUp,
    ArrowUpRight, RefreshCw, Utensils, ShoppingCart,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

/* ─── Status badge colours ─── */
const STATUS_STYLES = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    preparing: 'bg-indigo-100 text-indigo-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
        {status?.replace('_', ' ')}
    </span>
);

/* ─── Stat card ─── */
const StatCard = ({ title, value, icon: Icon, sub, colorClass }) => (
    <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-opacity-20 ${colorClass}`}>
                <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            {sub && (
                <span className="text-xs text-muted-foreground">{sub}</span>
            )}
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
    </div>
);

/* ─── Sales by type mini chart ─── */
const SalesByTypeChart = ({ salesByType }) => {
    const data = [
        { name: 'Dine In', sales: salesByType?.dine_in?.revenue || 0, orders: salesByType?.dine_in?.count || 0 },
        { name: 'Takeaway', sales: salesByType?.takeaway?.revenue || 0, orders: salesByType?.takeaway?.count || 0 },
        { name: 'Delivery', sales: salesByType?.delivery?.revenue || 0, orders: salesByType?.delivery?.count || 0 },
    ];
    return (
        <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
                    formatter={(val, name) => [name === 'sales' ? `$${val.toFixed(2)}` : val, name === 'sales' ? 'Revenue' : 'Orders']}
                />
                <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} name="sales" />
            </BarChart>
        </ResponsiveContainer>
    );
};

/* ─── Dashboard Page ─── */
const Dashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await restaurantAdmin.getAnalytics();
            setAnalytics(res.data.data || res.data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <p className="text-red-500">{error}</p>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    const a = analytics || {};
    const totalRevenue = parseFloat(a.totalRevenue || 0);
    const totalOrders = parseInt(a.totalOrders || 0);
    const pendingOrders = parseInt(a.ordersByStatus?.pending || 0);
    const avgOrderValue = parseFloat(a.avgOrderValue || 0);
    const chartData = a.last7DaysSales || [];
    const recentOrders = a.recentOrdersList || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your restaurant's performance.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={`$${totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    sub={`${a.recentOrders || 0} orders (30d)`}
                    colorClass="bg-green-500 text-green-600"
                />
                <StatCard
                    title="Total Orders"
                    value={totalOrders}
                    icon={ShoppingBag}
                    sub="All time"
                    colorClass="bg-blue-500 text-blue-600"
                />
                <StatCard
                    title="Pending Orders"
                    value={pendingOrders}
                    icon={Clock}
                    sub={`${a.ordersByStatus?.preparing || 0} preparing`}
                    colorClass="bg-orange-500 text-orange-600"
                />
                <StatCard
                    title="Avg. Order Value"
                    value={`$${avgOrderValue.toFixed(2)}`}
                    icon={TrendingUp}
                    sub="Per order"
                    colorClass="bg-purple-500 text-purple-600"
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-7">

                {/* 7-Day Revenue Chart */}
                <div className="col-span-4 bg-card p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Revenue — Last 7 Days</h3>
                        <span className="text-xs text-muted-foreground">
                            {chartData.length > 0
                                ? `${chartData[0]?.name} → ${chartData[chartData.length - 1]?.name}`
                                : 'No data yet'}
                        </span>
                    </div>

                    {chartData.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                            No sales data for the last 7 days
                        </div>
                    ) : (
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(v, name) => [name === 'sales' ? `$${v.toFixed(2)}` : v, name === 'sales' ? 'Revenue' : 'Orders']}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" name="sales" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Right column: Sales by type + Recent orders */}
                <div className="col-span-3 flex flex-col gap-6">

                    {/* Sales by Order Type */}
                    <div className="bg-card p-5 rounded-xl border shadow-sm">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-indigo-500" /> Sales by Type
                        </h3>
                        <SalesByTypeChart salesByType={a.salesByType} />
                    </div>

                    {/* Order Status Breakdown */}
                    <div className="bg-card p-5 rounded-xl border shadow-sm flex-1">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-indigo-500" /> Orders by Status
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(a.ordersByStatus || {}).map(([status, count]) => (
                                <div key={status} className="flex items-center justify-between text-sm">
                                    <StatusBadge status={status} />
                                    <span className="font-bold text-foreground">{count}</span>
                                </div>
                            ))}
                            {Object.keys(a.ordersByStatus || {}).length === 0 && (
                                <p className="text-xs text-muted-foreground">No orders yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-card p-6 rounded-xl border shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold">Recent Orders</h3>
                    <span className="text-xs text-muted-foreground">Latest 5</span>
                </div>

                {recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
                ) : (
                    <div className="space-y-3">
                        {recentOrders.map((order) => {
                            const initials = order.customer_name
                                ? order.customer_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                : order.order_type === 'dine_in'
                                    ? `T${order.table_number || '?'}`
                                    : 'G';

                            return (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/60 transition-colors rounded-xl border border-transparent hover:border-border/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                            {initials}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-foreground">
                                                {order.customer_name || (order.order_type === 'dine_in' ? `Table ${order.table_number || '—'}` : 'Guest')}
                                            </p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <span>#{order.id.slice(0, 8)}</span>
                                                <span>·</span>
                                                <span>{moment(order.created_at).fromNow()}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="text-sm font-bold text-foreground">
                                            ${parseFloat(order.total_amount).toFixed(2)}
                                        </span>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
