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
                    {/* ... Previous Modal Code ... */}
                    {/* Reusing the same structure as before, just ensuring it's included */}
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">Add New Restaurant</h2>
                            <p className="text-sm text-muted-foreground">Create a restaurant and its initial admin account.</p>
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
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setDetailsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-4 mb-6">
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
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                                        <Shield className="h-4 w-4 text-primary" /> Admins
                                    </h3>
                                    {details.admins?.length > 0 ? (
                                        <ul className="space-y-3">
                                            {details.admins.map(admin => (
                                                <li key={admin.id} className="bg-muted/20 p-3 rounded-lg flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-sm">{admin.name}</div>
                                                        <div className="text-xs text-muted-foreground">{admin.email}</div>
                                                    </div>
                                                    <div className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded">
                                                        {admin.role}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No admins found.</p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                                        <Users className="h-4 w-4 text-primary" /> Riders
                                    </h3>
                                    {details.riders?.length > 0 ? (
                                        <ul className="space-y-3">
                                            {details.riders.map(rider => (
                                                <li key={rider.id} className="bg-muted/20 p-3 rounded-lg flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-sm">{rider.name}</div>
                                                        <div className="text-xs text-muted-foreground">{rider.phone}</div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className={clsx("text-xs font-medium px-2 py-0.5 rounded", rider.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}>
                                                            {rider.is_available ? 'Online' : 'Offline'}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No riders found.</p>
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
