import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { Clock, CheckCircle, Package, Truck, XCircle, Search, Filter, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    accepted: 'bg-blue-100 text-blue-800 border-blue-200',
    preparing: 'bg-orange-100 text-orange-800 border-orange-200',
    picked_up: 'bg-purple-100 text-purple-800 border-purple-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons = {
    pending: Clock,
    accepted: CheckCircle,
    preparing: Package,
    picked_up: Truck,
    delivered: CheckCircle,
    cancelled: XCircle,
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await restaurantAdmin.getAllOrders();
            // Ensure we always have an array
            setOrders(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (error) {
            console.error('Failed to fetch orders', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleStatusUpdate = async (id, newStatus) => {
        setUpdating(id);
        try {
            await restaurantAdmin.updateOrderStatus(id, newStatus);
            setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Failed to update order status');
        } finally {
            setUpdating(null);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesFilter = filter === 'all' || order.status === filter;
        const matchesSearch =
            order.id.toLowerCase().includes(search.toLowerCase()) ||
            order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            order.customer_phone?.includes(search);
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                    <p className="text-muted-foreground">Manage and track all restaurant orders.</p>
                </div>
                <button
                    onClick={fetchOrders}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search by Order ID, Name, or Phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Filter className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    {['all', 'pending', 'preparing', 'delivered', 'cancelled'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={clsx(
                                "px-3 py-1.5 text-sm font-medium rounded-full capitalize whitespace-nowrap transition-colors",
                                filter === status
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                {loading && orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                        <p>Loading orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No orders found</p>
                        <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredOrders.map((order) => {
                                    const StatusIcon = statusIcons[order.status] || Clock;
                                    return (
                                        <tr key={order.id} className="hover:bg-muted/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-sm">#{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium">{order.customer_name || 'Guest'}</div>
                                                <div className="text-xs text-muted-foreground">{order.customer_phone || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm max-w-xs truncate">
                                                {order.items?.map(i => `${i.quantity}x ${i.food?.name || 'Item'}`).join(', ') || 'No items'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                                ${parseFloat(order.total_amount).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusColors[order.status] || 'bg-gray-100 text-gray-800')}>
                                                    <StatusIcon size={12} className="mr-1.5" />
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {new Date(order.created_at).toLocaleDateString()}
                                                <br />
                                                <span className="text-xs opacity-70">{new Date(order.created_at).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {updating === order.id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary inline-block" />
                                                ) : (
                                                    <div className="relative group inline-block">
                                                        <select
                                                            value={order.status}
                                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                                            className="block w-full pl-3 pr-8 py-1 text-xs border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-transparent cursor-pointer"
                                                            disabled={order.status === 'delivered' || order.status === 'cancelled'}
                                                        >
                                                            {['pending', 'accepted', 'preparing', 'picked_up', 'delivered', 'cancelled'].map(s => (
                                                                <option key={s} value={s} disabled={s === 'pending' && order.status !== 'pending'}>
                                                                    {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
