import { useState, useEffect, useCallback, useRef } from 'react';
import { restaurantAdmin } from '../../services/api';
import {
    Clock, CheckCircle, Package, Truck, XCircle, Search, Filter,
    Loader2, RefreshCw, Smartphone, Monitor, ChevronRight, X,
    User, Phone, MapPin, Utensils, ShoppingBag, Bell, BellOff,
    ChefHat, Star, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

/* ─── Helpers ─── */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const STATUS_META = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    accepted: { label: 'Accepted', color: 'bg-blue-100   text-blue-800   border-blue-200', icon: CheckCircle },
    preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ChefHat },
    picked_up: { label: 'Picked Up', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100  text-green-800  border-green-200', icon: CheckCircle },
    completed: { label: 'Completed', color: 'bg-green-100  text-green-800  border-green-200', icon: Star },
    cancelled: { label: 'Cancelled', color: 'bg-red-100    text-red-800    border-red-200', icon: XCircle },
};

const NEXT_STATUS = {
    pending: 'accepted',
    accepted: 'preparing',
    preparing: 'picked_up',
    picked_up: 'delivered',
};

const ORDER_TYPE_META = {
    dine_in: { label: 'Dine-In', icon: Utensils, color: 'text-indigo-600 bg-indigo-50' },
    takeaway: { label: 'Takeaway', icon: ShoppingBag, color: 'text-amber-600  bg-amber-50' },
    delivery: { label: 'Delivery', icon: Truck, color: 'text-blue-600   bg-blue-50' },
};

const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

/* ─── Order Source Badge ─── */
const SourceBadge = ({ order }) => {
    const isMobile = !!order.user_id;
    return (
        <span className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            isMobile ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        )}>
            {isMobile ? <Smartphone size={10} /> : <Monitor size={10} />}
            {isMobile ? 'Mobile App' : 'POS'}
        </span>
    );
};

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
    const meta = STATUS_META[status] || STATUS_META.pending;
    const Icon = meta.icon;
    return (
        <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', meta.color)}>
            <Icon size={11} /> {meta.label}
        </span>
    );
};

/* ─── Drawer ─── */
const OrderDrawer = ({ order, riders, onClose, onStatusUpdate, onRiderAssign }) => {
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [assigningRider, setAssigningRider] = useState(false);
    const [selectedRider, setSelectedRider] = useState(order.rider_id || '');

    if (!order) return null;

    const nextStatus = NEXT_STATUS[order.status];
    const isDelivery = order.order_type === 'delivery';
    const isFinal = ['delivered', 'completed', 'cancelled'].includes(order.status);

    const handleStatusStep = async () => {
        if (!nextStatus) return;
        setUpdatingStatus(true);
        await onStatusUpdate(order.id, nextStatus, selectedRider || null);
        setUpdatingStatus(false);
    };

    const handleCancel = async () => {
        setUpdatingStatus(true);
        await onStatusUpdate(order.id, 'cancelled', null);
        setUpdatingStatus(false);
    };

    const handleAssignRider = async () => {
        if (!selectedRider) return;
        setAssigningRider(true);
        await onRiderAssign(order.id, selectedRider);
        setAssigningRider(false);
    };

    const typeMeta = ORDER_TYPE_META[order.order_type] || ORDER_TYPE_META.dine_in;
    const TypeIcon = typeMeta.icon;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-lg text-gray-900">Order #{order.id.slice(0, 8)}</h2>
                            <SourceBadge order={order} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', typeMeta.color)}>
                                <TypeIcon size={11} /> {typeMeta.label}
                            </span>
                            <StatusBadge status={order.status} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Customer */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</h3>
                        <div className="flex items-center gap-2 text-sm">
                            <User size={14} className="text-gray-400" />
                            <span className="font-medium">{order.customer_name || order.user_name || 'Guest'}</span>
                        </div>
                        {(order.customer_phone || order.user_phone) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone size={14} className="text-gray-400" />
                                {order.customer_phone || order.user_phone}
                            </div>
                        )}
                        {order.table_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Utensils size={14} className="text-gray-400" />
                                Table {order.table_number}
                            </div>
                        )}
                        {order.delivery_instructions && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin size={14} className="text-gray-400" />
                                {order.delivery_instructions}
                            </div>
                        )}
                        <div className="text-xs text-gray-400 pt-1">
                            {formatDate(order.created_at)} at {formatTime(order.created_at)}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</h3>
                        <div className="space-y-2">
                            {(order.items || []).map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                    <div>
                                        <span className="text-sm font-medium text-gray-800">
                                            {item.quantity}× {item.food_name || item.name || 'Item'}
                                        </span>
                                        {item.addons?.length > 0 && (
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {item.addons.map(a => a.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">
                                        ${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-3 font-bold text-gray-900 text-base">
                            <span>Total</span>
                            <span>${parseFloat(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Rider Assignment (delivery orders) */}
                    {isDelivery && (
                        <div className="bg-blue-50 rounded-xl p-4">
                            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Rider Assignment</h3>
                            {order.rider_name ? (
                                <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
                                    <Truck size={14} />
                                    <span className="font-medium">{order.rider_name}</span>
                                    <span className="text-blue-500 text-xs">{order.rider_phone}</span>
                                </div>
                            ) : null}
                            <div className="flex gap-2">
                                <select
                                    value={selectedRider}
                                    onChange={e => setSelectedRider(e.target.value)}
                                    className="flex-1 text-sm border border-blue-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="">Select a rider...</option>
                                    {riders.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} {r.vehicle_type ? `(${r.vehicle_type})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAssignRider}
                                    disabled={!selectedRider || assigningRider}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {assigningRider ? <Loader2 size={14} className="animate-spin" /> : 'Assign'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer — Action Buttons */}
                {!isFinal && (
                    <div className="p-5 border-t bg-gray-50 space-y-2">
                        {nextStatus && (
                            <button
                                onClick={handleStatusStep}
                                disabled={updatingStatus}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                            >
                                {updatingStatus
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <ChevronRight size={16} />
                                }
                                {updatingStatus ? 'Updating...' : `Mark as ${STATUS_META[nextStatus]?.label}`}
                            </button>
                        )}
                        <button
                            onClick={handleCancel}
                            disabled={updatingStatus}
                            className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                            Cancel Order
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

/* ─── Main Orders Page ─── */
const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newOrderCount, setNewOrderCount] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef(null);
    const socketRef = useRef(null);

    /* ── Fetch ── */
    const fetchOrders = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [ordRes, riderRes] = await Promise.all([
                restaurantAdmin.getAllOrders(),
                restaurantAdmin.getAllRiders(),
            ]);
            setOrders(Array.isArray(ordRes.data.data) ? ordRes.data.data : []);
            setRiders(Array.isArray(riderRes.data.data) ? riderRes.data.data : []);
        } catch (err) {
            if (!silent) toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    /* ── Socket.IO ── */
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        const socket = io(API_BASE, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on('newOrder', (order) => {
            setOrders(prev => [order, ...prev]);
            setNewOrderCount(c => c + 1);
            toast.custom((t) => (
                <div className={clsx(
                    'flex items-center gap-3 px-4 py-3 bg-white shadow-xl rounded-xl border-l-4 border-indigo-500 max-w-sm',
                    t.visible ? 'animate-slide-in' : 'opacity-0'
                )}>
                    <div className="p-2 bg-indigo-100 rounded-full">
                        <Bell size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">New Order!</p>
                        <p className="text-xs text-gray-500 truncate">
                            {order.user_id ? '📱 Mobile App' : '🖥️ POS'} · #{order.id?.slice(0, 8)} · ${parseFloat(order.total_amount || 0).toFixed(2)}
                        </p>
                    </div>
                    <SourceBadge order={order} />
                </div>
            ), { duration: 6000 });

            // Play notification sound
            if (soundEnabled) {
                try { audioRef.current?.play(); } catch (_) { }
            }
        });

        socket.on('orderStatusUpdated', ({ id, status, rider_id }) => {
            setOrders(prev => prev.map(o =>
                o.id === id ? { ...o, status, rider_id: rider_id ?? o.rider_id } : o
            ));
            if (selectedOrder?.id === id) {
                setSelectedOrder(prev => ({ ...prev, status, rider_id: rider_id ?? prev?.rider_id }));
            }
        });

        return () => { socket.disconnect(); };
    }, [soundEnabled]);

    /* ── Initial load + 30s auto-refresh ── */
    useEffect(() => {
        fetchOrders();
        const iv = setInterval(() => fetchOrders(true), 30000);
        return () => clearInterval(iv);
    }, [fetchOrders]);

    /* ── Status update ── */
    const handleStatusUpdate = async (id, status, riderId = null) => {
        try {
            await restaurantAdmin.updateOrderStatus(id, status, riderId);
            const rider = riderId ? riders.find(r => r.id === riderId) : null;
            setOrders(prev => prev.map(o =>
                o.id === id ? {
                    ...o,
                    status,
                    rider_id: riderId ?? o.rider_id,
                    rider_name: rider?.name ?? o.rider_name,
                    rider_phone: rider?.phone ?? o.rider_phone,
                } : o
            ));
            setSelectedOrder(prev => prev?.id === id ? {
                ...prev,
                status,
                rider_id: riderId ?? prev.rider_id,
                rider_name: rider?.name ?? prev.rider_name,
                rider_phone: rider?.phone ?? prev.rider_phone,
            } : prev);
            toast.success(`Order marked as ${STATUS_META[status]?.label}`);
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleRiderAssign = async (id, riderId) => {
        const rider = riders.find(r => r.id === riderId);
        try {
            // Assign rider without changing status (keep current status)
            const order = orders.find(o => o.id === id);
            await restaurantAdmin.updateOrderStatus(id, order.status, riderId);
            setOrders(prev => prev.map(o =>
                o.id === id ? { ...o, rider_id: riderId, rider_name: rider?.name, rider_phone: rider?.phone } : o
            ));
            setSelectedOrder(prev => prev?.id === id
                ? { ...prev, rider_id: riderId, rider_name: rider?.name, rider_phone: rider?.phone }
                : prev
            );
            toast.success(`Rider "${rider?.name}" assigned`);
        } catch (err) {
            toast.error('Failed to assign rider');
        }
    };

    /* ── Filtering ── */
    const STATUS_FILTERS = ['all', 'pending', 'accepted', 'preparing', 'picked_up', 'delivered', 'completed', 'cancelled'];

    const filteredOrders = orders.filter(o => {
        const matchesFilter = filter === 'all' || o.status === filter;
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            o.id.toLowerCase().includes(q) ||
            (o.customer_name || o.user_name || '').toLowerCase().includes(q) ||
            (o.customer_phone || o.user_phone || '').includes(q);
        return matchesFilter && matchesSearch;
    });

    const countFor = (s) => s === 'all' ? orders.length : orders.filter(o => o.status === s).length;
    const pendingCount = orders.filter(o => o.status === 'pending').length;

    return (
        <div className="space-y-5">
            {/* Silent audio ping */}
            <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA..." preload="auto" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                        {pendingCount > 0 && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                                <AlertCircle size={12} />
                                {pendingCount} pending
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Manage mobile app and POS orders · real-time updates
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSoundEnabled(s => !s)}
                        title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
                        className="p-2 rounded-lg border hover:bg-gray-50 transition-colors text-gray-500"
                    >
                        {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                    </button>
                    <button
                        onClick={() => fetchOrders()}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search by order ID, name or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm transition-all"
                    />
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <Filter size={16} className="text-gray-400 flex-shrink-0 self-center" />
                {STATUS_FILTERS.map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={clsx(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                            filter === s
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white border text-gray-600 hover:bg-gray-50'
                        )}
                    >
                        <span className="capitalize">{s.replace('_', ' ')}</span>
                        <span className={clsx(
                            'px-1.5 py-0.5 rounded-full text-xs',
                            filter === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                        )}>
                            {countFor(s)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Source Legend */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="font-medium">Source:</span>
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    <Smartphone size={10} /> Mobile App
                </span>
                <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    <Monitor size={10} /> POS
                </span>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                {loading && orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-3 text-indigo-500" />
                        <p className="text-sm">Loading orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-gray-400">
                        <Package className="h-12 w-12 mb-3 opacity-20" />
                        <p className="text-base font-medium">No orders found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or search</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    {['Order', 'Source', 'Customer', 'Items', 'Total', 'Type', 'Rider', 'Status', 'Time', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map(order => {
                                    const typeMeta = ORDER_TYPE_META[order.order_type] || ORDER_TYPE_META.dine_in;
                                    const TypeIcon = typeMeta.icon;
                                    const isPending = order.status === 'pending';
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className={clsx(
                                                'hover:bg-indigo-50/40 cursor-pointer transition-colors',
                                                isPending && 'bg-yellow-50/60'
                                            )}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-mono text-xs font-bold text-gray-700">
                                                    #{order.id.slice(0, 8)}
                                                </span>
                                                {isPending && (
                                                    <span className="ml-1.5 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <SourceBadge order={order} />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {order.customer_name || order.user_name || 'Guest'}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {order.customer_phone || order.user_phone || '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                                                {order.items?.map(i => `${i.quantity}× ${i.food_name || 'Item'}`).join(', ') || '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900 text-sm">
                                                ${parseFloat(order.total_amount || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', typeMeta.color)}>
                                                    <TypeIcon size={10} /> {typeMeta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                {order.rider_name
                                                    ? <span className="flex items-center gap-1 text-blue-600"><Truck size={12} />{order.rider_name}</span>
                                                    : order.order_type === 'delivery'
                                                        ? <span className="text-gray-300 text-xs">Unassigned</span>
                                                        : '—'
                                                }
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <StatusBadge status={order.status} />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                                                <div>{formatDate(order.created_at)}</div>
                                                <div>{formatTime(order.created_at)}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <ChevronRight size={16} className="text-gray-300 inline" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Drawer */}
            {selectedOrder && (
                <OrderDrawer
                    order={selectedOrder}
                    riders={riders}
                    onClose={() => setSelectedOrder(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onRiderAssign={handleRiderAssign}
                />
            )}
        </div>
    );
};

export default Orders;
