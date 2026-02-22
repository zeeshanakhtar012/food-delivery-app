import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { Save, Loader2, Building, Phone, MapPin, Lock } from 'lucide-react';

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        email: '', // Read-only usually
        current_password: '',
        new_password: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const [profileRes, restaurantRes] = await Promise.all([
                    restaurantAdmin.getProfile(),
                    restaurantAdmin.getRestaurant().catch(() => ({ data: { data: {} } })) // Fallback in case it fails
                ]);

                const profileData = profileRes.data.data;
                const restaurantData = restaurantRes.data.data;

                setFormData(prev => ({
                    ...prev,
                    name: restaurantData.name || profileData.restaurant?.name || profileData.admin?.name || '',
                    phone: restaurantData.phone || profileData.restaurant?.phone || profileData.admin?.phone || '',
                    address: restaurantData.address || profileData.restaurant?.address || '',
                    email: profileData.email || profileData.admin?.email || '',
                    restaurant_id: profileData.restaurant_id || profileData.admin?.restaurant_id || ''
                }));
            } catch (error) {
                console.error('Failed to fetch profile', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Filter out empty password fields if not changing password
            const dataToSend = { ...formData };
            if (!dataToSend.new_password) {
                delete dataToSend.current_password;
                delete dataToSend.new_password;
            }

            await restaurantAdmin.updateProfile(dataToSend);
            alert('Profile updated successfully');
            setFormData(prev => ({ ...prev, current_password: '', new_password: '' }));
        } catch (error) {
            console.error(error);
            alert('Failed to update profile. ' + (error.response?.data?.message || ''));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-6">Settings</h1>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-muted/20">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        Restaurant Details
                    </h2>
                    <p className="text-sm text-muted-foreground">Update your restaurant profile and contact information.</p>
                </div>

                {/* For testing only - show restaurant ID */}
                <div className="px-6 py-4 bg-blue-50/50 border-b flex justify-between items-center text-sm">
                    <div>
                        <p className="font-semibold text-blue-900">Restaurant ID (Development Only)</p>
                        <p className="text-blue-700 max-w-md truncate font-mono text-xs mt-1">
                            {formData.restaurant_id || 'Not assigned'}
                        </p>
                    </div>
                    {formData.restaurant_id && (
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(formData.restaurant_id);
                                alert('Restaurant ID copied to clipboard!');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wider bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded transition-colors"
                        >
                            Copy ID
                        </button>
                    )}
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Restaurant Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        name="name" required
                                        value={formData.name} onChange={handleChange}
                                        className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email Address</label>
                                <div className="px-3 py-2 border rounded-lg bg-muted text-muted-foreground">
                                    {formData.email}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Contact support to change email.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        name="phone" required
                                        value={formData.phone} onChange={handleChange}
                                        className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <textarea
                                        name="address" rows="2"
                                        value={formData.address} onChange={handleChange}
                                        className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                                <Lock className="h-4 w-4 text-primary" />
                                Security
                            </h3>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">New Password</label>
                                    <input
                                        type="password" name="new_password"
                                        placeholder="Leave blank to keep current"
                                        value={formData.new_password} onChange={handleChange}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Current Password</label>
                                    <input
                                        type="password" name="current_password"
                                        placeholder="Required if changing password"
                                        value={formData.current_password} onChange={handleChange}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;
