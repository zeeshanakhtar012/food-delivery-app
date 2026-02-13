import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { UserPlus, Bike, Star, Phone, Mail, Loader2 } from 'lucide-react';

const Staff = () => {
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        vehicle_type: 'bike'
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [createdRiderCreds, setCreatedRiderCreds] = useState(null);

    const fetchRiders = async () => {
        setLoading(true);
        try {
            const response = await restaurantAdmin.getAllRiders();
            setRiders(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (error) {
            console.error('Failed to fetch riders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiders();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const response = await restaurantAdmin.createRider(formData);
            // Show credentials
            setCreatedRiderCreds({
                email: response.data.data.email,
                password: response.data.data.password
            });
            fetchRiders();
            setFormData({ name: '', email: '', phone: '', vehicle_type: 'bike' });
        } catch (error) {
            alert('Failed to create rider');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCreatedRiderCreds(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Staff & Riders</h1>
                    <p className="text-muted-foreground">Manage your delivery fleet and staff.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <UserPlus size={18} />
                    Add Rider
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : riders.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <Bike className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium">No riders found</h3>
                    <p className="text-sm text-muted-foreground">Add your first delivery rider to get started.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {riders.map(rider => (
                        <div key={rider.id} className="bg-card p-6 rounded-xl border shadow-sm flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Bike size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{rider.name}</h3>
                                        <span className="text-xs uppercase tracking-wide font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">{rider.vehicle_type}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-50 px-2 py-1 rounded-full text-xs">
                                    <Star size={12} fill="currentColor" />
                                    {rider.rating || 'N/A'}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-muted-foreground mt-2">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} /> {rider.phone}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} /> {rider.email}
                                </div>
                            </div>

                            <div className="pt-4 mt-auto border-t flex justify-between items-center">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${rider.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {rider.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button className="text-sm text-primary hover:underline">View History</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
                        {!createdRiderCreds ? (
                            <>
                                <h2 className="text-xl font-bold mb-4">Register New Rider</h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Full Name</label>
                                        <input required className="w-full px-3 py-2 border rounded-lg bg-background"
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email</label>
                                        <input type="email" required className="w-full px-3 py-2 border rounded-lg bg-background"
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Phone</label>
                                        <input required className="w-full px-3 py-2 border rounded-lg bg-background"
                                            value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Vehicle Type</label>
                                        <select className="w-full px-3 py-2 border rounded-lg bg-background"
                                            value={formData.vehicle_type} onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })}>
                                            <option value="bike">Bike</option>
                                            <option value="bicycle">Bicycle</option>
                                            <option value="scooter">Scooter</option>
                                            <option value="car">Car</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-sm">Cancel</button>
                                        <button type="submit" disabled={submitLoading} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 text-sm font-medium">
                                            {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                            Create Account
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserPlus size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-green-700">Rider Created!</h2>
                                <p className="text-sm text-muted-foreground mt-2 mb-6">Please copy these credentials and share them with the rider.</p>

                                <div className="bg-muted p-4 rounded-lg text-left space-y-2 mb-6 border">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Email:</span>
                                        <span className="font-mono text-sm">{createdRiderCreds.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Password:</span>
                                        <span className="font-mono font-bold text-sm tracking-wide">{createdRiderCreds.password}</span>
                                    </div>
                                </div>

                                <button onClick={handleCloseModal} className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium">
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Staff;
