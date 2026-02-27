import { useState, useEffect } from 'react';
import { superAdmin } from '../../services/api';
import { Search, Loader2, Activity as ActivityIcon, CheckCircle, Ban, Lock, Unlock, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const Riders = () => {
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchRiders = async () => {
        try {
            setLoading(true);
            const response = await superAdmin.getAllRiders();
            setRiders(response.data.riders || []);
        } catch (error) {
            console.error('Failed to fetch riders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiders();
    }, []);

    const handleToggleFreeze = async (id, currentStatus) => {
        const action = currentStatus ? 'freeze' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this rider?`)) return;

        try {
            await superAdmin.toggleRiderFreeze(id);
            setRiders(riders.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
        } catch (error) {
            alert('Failed to update rider status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this rider? This action cannot be undone.')) return;
        try {
            await superAdmin.deleteRider(id);
            setRiders(riders.filter(r => r.id !== id));
        } catch (error) {
            alert('Failed to delete rider');
        }
    };

    const filteredRiders = riders.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.vehicle_number?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Riders</h1>
                    <p className="text-muted-foreground">Manage delivery personnel across the platform.</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search by Name, Email, or Vehicle..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-w-md shadow-sm"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredRiders.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <ActivityIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium">No riders found</h3>
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rider</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restaurant</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRiders.map((rider) => (
                                    <tr key={rider.id} className="hover:bg-muted/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">{rider.name}</div>
                                            <div className="text-xs text-muted-foreground">Joined {new Date(rider.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm">{rider.email || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{rider.phone || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm">{rider.vehicle_number || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm">{rider.restaurant_name || 'Global'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border w-fit", rider.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200')}>
                                                    {rider.is_active ? <CheckCircle size={10} className="mr-1" /> : <Ban size={10} className="mr-1" />}
                                                    {rider.is_active ? 'Active' : 'Frozen'}
                                                </span>
                                                <span className={clsx("text-xs w-fit", rider.is_available ? 'text-green-600' : 'text-gray-500')}>
                                                    {rider.is_available ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-green-600 font-medium">${parseFloat(rider.total_earnings || 0).toFixed(2)}</div>
                                            <div className="text-xs text-muted-foreground">Wallet: ${parseFloat(rider.wallet_balance || 0).toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleFreeze(rider.id, rider.is_active)}
                                                    className={clsx("p-1.5 rounded-md transition-colors", rider.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50")}
                                                    title={rider.is_active ? "Freeze Rider" : "Activate Rider"}
                                                >
                                                    {rider.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rider.id)}
                                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                    title="Delete Rider"
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
        </div>
    );
};

export default Riders;
