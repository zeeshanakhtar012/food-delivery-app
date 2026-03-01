import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { Search, Loader2, Users as UsersIcon, CheckCircle, Ban, Lock, Unlock, ShoppingBag, X, Eye } from 'lucide-react';
import clsx from 'clsx';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userOrders, setUserOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [showOrdersModal, setShowOrdersModal] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await restaurantAdmin.getUsers();
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleFreeze = async (id, currentStatus) => {
        const action = !currentStatus ? 'freeze' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await restaurantAdmin.toggleUserFreeze(id);
            setUsers(users.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
        } catch (error) {
            alert('Failed to update user status');
        }
    };

    const fetchUserOrders = async (user) => {
        try {
            setSelectedUser(user);
            setLoadingOrders(true);
            setShowOrdersModal(true);
            const response = await restaurantAdmin.getUserOrders(user.id);
            setUserOrders(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch user orders', error);
            alert('Failed to fetch order history');
        } finally {
            setLoadingOrders(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Registered Users</h1>
                    <p className="text-muted-foreground">Manage customers who have registered at your restaurant.</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search by Name, Email or Phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-w-md shadow-sm"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium">No users found</h3>
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                                                    {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-foreground">{user.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">{user.email || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{user.phone || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", user.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200')}>
                                                {user.is_active ? <CheckCircle size={12} className="mr-1.5" /> : <Ban size={12} className="mr-1.5" />}
                                                {user.is_active ? 'Active' : 'Blocked'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => fetchUserOrders(user)}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                    title="View Orders"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleFreeze(user.id, user.is_active)}
                                                    className={clsx("p-1.5 rounded-md transition-colors", user.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50")}
                                                    title={user.is_active ? "Block User" : "Unblock User"}
                                                >
                                                    {user.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Orders Modal */}
            {showOrdersModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <div>
                                <h2 className="text-xl font-bold">{selectedUser?.name}'s Order History</h2>
                                <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
                            </div>
                            <button
                                onClick={() => setShowOrdersModal(false)}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingOrders ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <p className="text-muted-foreground">Loading orders...</p>
                                </div>
                            ) : userOrders.length === 0 ? (
                                <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed">
                                    <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground opacity-30 mb-3" />
                                    <h3 className="text-lg font-medium text-muted-foreground">No orders found for this user</h3>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {userOrders.map((order) => (
                                        <div key={order.id} className="border rounded-lg p-4 bg-muted/5 hover:border-primary/30 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-sm font-semibold">Order #{order.id.slice(-8).toUpperCase()}</div>
                                                    <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-primary">${parseFloat(order.total_amount).toFixed(2)}</div>
                                                    <span className={clsx(
                                                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                        order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                'bg-blue-100 text-blue-700 border-blue-200'
                                                    )}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-t pt-3 mt-3">
                                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Items</div>
                                                {order.items?.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">{item.quantity}x</span>
                                                            <span>{item.food_name}</span>
                                                        </div>
                                                        <span className="text-muted-foreground">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-muted/30 flex justify-end">
                            <button
                                onClick={() => setShowOrdersModal(false)}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
