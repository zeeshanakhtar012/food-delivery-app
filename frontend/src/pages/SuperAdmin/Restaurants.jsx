import { useState, useEffect } from 'react';
import { superAdmin } from '../../services/api';
import {
    Search, Loader2, Utensils, CheckCircle, Ban, Lock, Unlock, Trash2,
    MapPin, Phone, Mail, X, Users, Shield
} from 'lucide-react';
import clsx from 'clsx';

const Restaurants = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', address: '',
        adminName: '', adminEmail: '', adminPassword: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Details Modal State
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [details, setDetails] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchRestaurants = async () => {
        try {
            setLoading(true);
            const response = await superAdmin.getAllRestaurants();
            setRestaurants(response.data.restaurants || []);
        } catch (error) {
            console.error('Failed to fetch restaurants', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRestaurants();
    }, []);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                restaurant: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address
                },
                admin: {
                    name: formData.adminName,
                    email: formData.adminEmail,
                    password: formData.adminPassword
                }
            };
            await superAdmin.createRestaurant(payload);
            setIsModalOpen(false);
            fetchRestaurants();
            setFormData({
                name: '', email: '', phone: '', address: '',
                adminName: '', adminEmail: '', adminPassword: ''
            });
            alert('Restaurant created successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to create restaurant. ' + (error.response?.data?.message || ''));
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleToggleFreeze = async (id, currentStatus) => {
        const action = currentStatus ? 'freeze' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this restaurant?`)) return;

        try {
            await superAdmin.toggleRestaurantFreeze(id);
            setRestaurants(restaurants.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
        } catch (error) {
            alert('Failed to update restaurant status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this restaurant? This action cannot be undone.')) return;
        try {
            await superAdmin.deleteRestaurant(id);
            setRestaurants(restaurants.filter(r => r.id !== id));
        } catch (error) {
            alert('Failed to delete restaurant');
        }
    };

    const handleViewDetails = async (restaurant) => {
        setSelectedRestaurant(restaurant);
        setDetailsModalOpen(true);
        setDetailsLoading(true);
        setDetails(null);
        try {
            const response = await superAdmin.getRestaurantDetails(restaurant.id);
            setDetails(response.data.restaurant);
        } catch (error) {
            console.error("Failed to fetch details", error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const filteredRestaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Restaurants</h1>
                    <p className="text-muted-foreground">Manage platform partners.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Utensils size={18} />
                    Add Restaurant
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search by Name or Email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-w-md shadow-sm"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredRestaurants.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <Utensils className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium">No restaurants found</h3>
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restaurant</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRestaurants.map((restaurant) => (
                                    <tr key={restaurant.id} className="hover:bg-muted/5 transition-colors cursor-pointer" onClick={() => handleViewDetails(restaurant)}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold overflow-hidden">
                                                    {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover" /> : <Utensils size={18} />}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-foreground">{restaurant.name}</div>
                                                    <div className="text-xs text-muted-foreground max-w-[150px] truncate">{restaurant.address || 'No address'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm">{restaurant.email}</div>
                                            <div className="text-xs text-muted-foreground">{restaurant.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", restaurant.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200')}>
                                                {restaurant.is_active ? <CheckCircle size={12} className="mr-1.5" /> : <Ban size={12} className="mr-1.5" />}
                                                {restaurant.is_active ? 'Active' : 'Frozen'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {new Date(restaurant.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleToggleFreeze(restaurant.id, restaurant.is_active)}
                                                    className={clsx("p-1.5 rounded-md transition-colors", restaurant.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50")}
                                                    title={restaurant.is_active ? "Freeze Restaurant" : "Activate Restaurant"}
                                                >
                                                    {restaurant.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(restaurant.id)}
                                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                    title="Delete Restaurant"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    {/* Reusing the same structure as before, just ensuring it's included */}
                    <div className="bg-white text-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold">Add New Restaurant</h2>
                            <p className="text-sm text-slate-500">Create a restaurant and its initial admin account.</p>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="create-restaurant-form" onSubmit={handleCreateSubmit} className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Restaurant Details</h3>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Name</label>
                                            <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-background" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone</label>
                                            <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-background" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Email (Restaurant)</label>
                                            <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-background" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Address</label>
                                            <textarea required name="address" rows="2" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-background" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Admin Account</h3>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Admin Name</label>
                                            <input required name="adminName" value={formData.adminName} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-background" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Admin Email</label>
                                            <input required type="email" name="adminEmail" value={formData.adminEmail} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-background" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Password</label>
                                            <input required type="password" name="adminPassword" value={formData.adminPassword} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-background" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t bg-muted/20 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-sm">Cancel</button>
                            <button type="submit" form="create-restaurant-form" disabled={submitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 text-sm font-medium">
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Create Restaurant
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {detailsModalOpen && selectedRestaurant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto border border-slate-200">
                        <button onClick={() => setDetailsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-4 mb-6 border-b pb-4">
                            <div className="h-16 w-16 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold text-2xl">
                                {selectedRestaurant.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{selectedRestaurant.name}</h2>
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1"><MapPin size={14} /> {selectedRestaurant.address}</span>
                                    <span className="flex items-center gap-1"><Phone size={14} /> {selectedRestaurant.phone}</span>
                                    <span className="flex items-center gap-1"><Mail size={14} /> {selectedRestaurant.email}</span>
                                </div>
                            </div>
                        </div>

                        {detailsLoading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : details ? (
                            <div className="space-y-6">
                                {/* Navigation Tabs */}
                                <div className="flex border-b">
                                    {['overview', 'admins', 'riders', 'users'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={clsx(
                                                "px-4 py-2 font-medium text-sm transition-colors border-b-2",
                                                activeTab === tab
                                                    ? "border-primary text-primary"
                                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Contents */}
                                <div className="min-h-[300px]">
                                    {/* OVERVIEW TAB */}
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                                <div className="bg-muted/30 p-4 rounded-xl border">
                                                    <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                                                    <div className="text-2xl font-bold">${details.analytics?.totalRevenue || 0}</div>
                                                </div>
                                                <div className="bg-muted/30 p-4 rounded-xl border">
                                                    <div className="text-sm text-muted-foreground mb-1">Total Orders</div>
                                                    <div className="text-2xl font-bold">{details.analytics?.totalOrders || 0}</div>
                                                </div>
                                                <div className="bg-muted/30 p-4 rounded-xl border">
                                                    <div className="text-sm text-muted-foreground mb-1">Active Customers</div>
                                                    <div className="text-2xl font-bold">{details.analytics?.customers?.active || 0} <span className="text-xs font-normal text-muted-foreground ml-1">/ {details.analytics?.customers?.total || 0} total</span></div>
                                                </div>
                                                <div className="bg-muted/30 p-4 rounded-xl border">
                                                    <div className="text-sm text-muted-foreground mb-1">Active Riders</div>
                                                    <div className="text-2xl font-bold">{details.analytics?.riders?.active || 0} <span className="text-xs font-normal text-muted-foreground ml-1">/ {details.analytics?.riders?.total || 0} total</span></div>
                                                </div>
                                            </div>

                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div className="bg-card border rounded-xl p-4">
                                                    <h3 className="font-semibold mb-3 border-b pb-2">Orders by Status</h3>
                                                    {details.analytics?.ordersByStatus && Object.keys(details.analytics.ordersByStatus).length > 0 ? (
                                                        <div className="space-y-2">
                                                            {Object.entries(details.analytics.ordersByStatus).map(([status, count]) => (
                                                                <div key={status} className="flex justify-between items-center text-sm">
                                                                    <span className="capitalize">{status.replace('_', ' ')}</span>
                                                                    <span className="font-medium bg-muted px-2 py-0.5 rounded text-xs">{count}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground italic py-4 text-center">No orders yet</div>
                                                    )}
                                                </div>

                                                <div className="bg-card border rounded-xl p-4">
                                                    <h3 className="font-semibold mb-3 border-b pb-2">Top Selling Foods</h3>
                                                    {details.analytics?.topFoods?.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {details.analytics.topFoods.map((food, index) => (
                                                                <div key={food.id} className="flex items-center gap-3 text-sm">
                                                                    <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">{index + 1}</div>
                                                                    <div className="flex-1 truncate font-medium" title={food.name}>{food.name}</div>
                                                                    <div className="text-muted-foreground text-xs shrink-0">{food.total_sold} sold</div>
                                                                    <div className="font-bold shrink-0">${parseFloat(food.total_revenue).toFixed(2)}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground italic py-4 text-center">No sales data yet</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ADMINS TAB */}
                                    {activeTab === 'admins' && (
                                        <div className="space-y-4">
                                            {details.admins?.length > 0 ? (
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {details.admins.map(admin => (
                                                        <div key={admin.id} className="bg-card border p-4 rounded-lg flex items-center justify-between">
                                                            <div>
                                                                <div className="font-semibold">{admin.name}</div>
                                                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                                    <Mail size={12} /> {admin.email}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded uppercase tracking-wider">
                                                                {admin.role}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center py-8 text-muted-foreground italic">No admins registered to this restaurant.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* RIDERS TAB */}
                                    {activeTab === 'riders' && (
                                        <div className="space-y-4">
                                            {details.riders?.length > 0 ? (
                                                <div className="overflow-x-auto border rounded-lg">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-muted text-muted-foreground">
                                                            <tr>
                                                                <th className="px-4 py-3 font-medium">Name</th>
                                                                <th className="px-4 py-3 font-medium">Contact</th>
                                                                <th className="px-4 py-3 font-medium">Vehicle</th>
                                                                <th className="px-4 py-3 font-medium text-right">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {details.riders.map(rider => (
                                                                <tr key={rider.id} className="bg-card">
                                                                    <td className="px-4 py-3 font-medium">{rider.name}</td>
                                                                    <td className="px-4 py-3">{rider.phone} <br /><span className="text-xs text-muted-foreground">{rider.email}</span></td>
                                                                    <td className="px-4 py-3">{rider.vehicle_number || 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <span className={clsx(
                                                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                                                            rider.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                                        )}>
                                                                            {rider.is_active ? 'Active' : 'Frozen'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-center py-8 text-muted-foreground italic">No riders assigned to this restaurant.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* USERS TAB */}
                                    {activeTab === 'users' && (
                                        <div className="space-y-4">
                                            {details.users?.length > 0 ? (
                                                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                                    {details.users.map(user => (
                                                        <div key={user.id} className="bg-card border p-4 rounded-lg flex gap-3">
                                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-sm truncate">{user.name}</div>
                                                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                                                <div className="text-xs text-muted-foreground truncate mt-0.5">{user.phone}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center py-8 text-muted-foreground italic">No users registered to this restaurant yet.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                Failed to load details.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Restaurants;
