import React, { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { ChefHat, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import moment from 'moment';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

const KitchenDisplay = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const socket = useSocket();

    useEffect(() => {
        fetchActiveOrders();
    }, []);

    const fetchActiveOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await restaurantAdmin.getAllOrders(); // Ideally backend filters active only or we filter here
            // Filter for 'accepted', 'preparing', 'ready'
            // [FIX] Access res.data.data because successResponse wraps it
            const ordersData = res.data.data || [];
            const active = ordersData.filter(o => ['accepted', 'preparing', 'ready'].includes(o.status));
            setOrders(active);
        } catch (error) {
            console.error('Error fetching orders:', error);
            const msg = error.response?.data?.error?.message || error.message || 'Failed to load active orders';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId, status) => {
        try {
            await restaurantAdmin.updateOrderStatus(orderId, status);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

            if (status === 'ready' || status === 'completed' || status === 'delivered') {
                // Remove from KDS if completed/delivered, or keep 'ready' until picked up?
                // Usually KDS shows 'preparing'. 'Ready' moves it to "Ready for Pickup" screen.
                // For simplicity, let's keep 'ready' on screen or move to separate list.
                // If 'delivered' or 'picked_up', remove it.
                if (['delivered', 'picked_up', 'cancelled'].includes(status)) {
                    setOrders(prev => prev.filter(o => o.id !== orderId));
                } else if (status === 'ready') {
                    // Maybe keep it but mark as ready visually
                }
            }
            toast.success(`Order marked as ${status}`);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading KDS...</div>;
    if (error) return (
        <div className="p-8 text-center text-white">
            <h2 className="text-xl text-red-500 mb-4">Error loading KDS</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button onClick={fetchActiveOrders} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Retry</button>
        </div>
    );

    if (orders.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-gray-700">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gray-700 mb-6">
                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 0 002-2M9 5a2 2 0 012-2h2a2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">No Active Orders</h3>
                <p className="text-gray-400">All caught up! New orders will appear here automatically.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ChefHat className="text-orange-500" />
                    KDS - Kitchen Display System
                </h1>
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Online</span>
                    <span>{moment().format('HH:mm:ss')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.length === 0 ? (
                    <div className="col-span-full h-96 flex flex-col items-center justify-center text-gray-500">
                        <ChefHat className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-xl">No active orders</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div
                            key={order.id}
                            className={clsx(
                                "rounded-lg overflow-hidden border shadow-lg flex flex-col transition-all",
                                order.status === 'ready' ? "bg-green-900/20 border-green-500" : "bg-gray-800 border-gray-700"
                            )}
                        >
                            {/* Header */}
                            <div className={clsx(
                                "p-3 flex justify-between items-start",
                                order.status === 'ready' ? "bg-green-800" : "bg-gray-700"
                            )}>
                                <div>
                                    <h3 className="font-bold text-lg">#{order.id.slice(0, 4)}</h3>
                                    <p className="text-xs opacity-80">{order.order_type === 'dine_in' ? `Table ${order.table_id ? '?' : ''}` : 'Takeaway'}</p>
                                    {/* Ideally fetch table number */}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono">{moment(order.created_at).format('HH:mm')}</p>
                                    <p className="text-xs opacity-80">{moment(order.created_at).fromNow(true)}</p>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
                                {order.items.map((item, idx) => (
                                    <div key={`${order.id}-${idx}`} className="mb-3 border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-lg text-orange-400">{item.quantity}x</span>
                                            {item.food_image && (
                                                <img
                                                    src={item.food_image}
                                                    alt={item.food_name}
                                                    className="w-12 h-12 rounded-md object-cover ml-2 border border-gray-600"
                                                />
                                            )}
                                            <span className="flex-1 ml-2 font-medium">{item.food_name || item.name}</span>
                                        </div>
                                        {item.addons && item.addons.length > 0 && (
                                            <div className="ml-8 text-sm text-gray-400 mt-1">
                                                {item.addons.map((addon, ai) => (
                                                    <div key={ai}>+ {addon.name}</div>
                                                ))}
                                            </div>
                                        )}
                                        {item.note && (
                                            <p className="ml-8 text-xs text-yellow-500 italic mt-1">Note: {item.note}</p>
                                        )}
                                    </div>
                                ))}

                                {order.delivery_instructions && (
                                    <div className="mt-4 p-2 bg-red-900/30 border border-red-900 rounded text-sm text-red-200">
                                        <AlertTriangle className="w-4 h-4 inline mr-1" /> {order.delivery_instructions}
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-3 bg-gray-900 border-t border-gray-700 grid grid-cols-2 gap-2">
                                {order.status === 'accepted' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                        className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                                    >
                                        Start Preparing
                                    </button>
                                )}
                                {order.status === 'preparing' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                                        className="col-span-2 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors"
                                    >
                                        Mark Ready
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                                        className="col-span-2 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors text-gray-300"
                                    >
                                        Clear (Picked Up)
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default KitchenDisplay;
