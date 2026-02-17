import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import {
    Users, Plus, Phone, Mail, Truck, Search, Star, Clock, Package,
    MapPin, Loader2, X, TrendingUp
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import clsx from 'clsx';

const Staff = () => {
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'performance'
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        vehicle_type: 'bike',
        password: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [createdRider, setCreatedRider] = useState(null);

    // Performance State
    const [performanceData, setPerformanceData] = useState([]);
    const [performanceLoading, setPerformanceLoading] = useState(false);

    const fetchRiders = async () => {
        try {
            const response = await restaurantAdmin.getAllRiders();
            setRiders(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch riders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPerformance = async () => {
        setPerformanceLoading(true);
        try {
            const response = await restaurantAdmin.getRiderPerformance(); // Add date params if needed
            setPerformanceData(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch performance', error);
        } finally {
            setPerformanceLoading(false);
        }
    };

    useEffect(() => {
        fetchRiders();
    }, []);

    useEffect(() => {
        if (activeTab === 'performance') {
            fetchPerformance();
        }
    }, [activeTab]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await restaurantAdmin.createRider(formData);
            setCreatedRider(response.data.data); // Show success modal with password
            fetchRiders();
            setFormData({ name: '', phone: '', email: '', vehicle_type: 'bike', password: '' });
            setIsModalOpen(false); // Close form modal
        } catch (error) {
            console.error(error);
            alert('Failed to create rider. ' + (error.response?.data?.message || ''));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredRiders = riders.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Staff & Riders</h1>
                    <p className="text-muted-foreground">Manage your delivery fleet and performance.</p>
                </div>
                {!createdRider && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Add Rider
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('list')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors border-b-2",
                        activeTab === 'list'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Rider List
                </button>
                <button
                    onClick={() => setActiveTab('performance')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors border-b-2",
                        activeTab === 'performance'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Performance Metrics
                </button>
            </div>

            {activeTab === 'list' ? (
                <>
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search by Name or Phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredRiders.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                            <h3 className="text-lg font-medium">No riders found</h3>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredRiders.map(rider => (
                                <div key={rider.id} className="bg-card rounded-xl border shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                                {rider.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight">{rider.name}</h3>
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{rider.vehicle_type}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">
                                            <Star size={12} fill="currentColor" />
                                            <span>{rider.rating || 'New'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-foreground/70" />
                                            <span>{rider.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-foreground/70" />
                                            <span className="truncate">{rider.email || 'No email provided'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t flex justify-between items-center text-sm font-medium">
                                        <span className={clsx(rider.is_available ? "text-green-600" : "text-slate-500")}>
                                            {rider.is_available ? '● Online' : '○ Offline'}
                                        </span>
                                        {/* Future: Block/Edit buttons */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-primary" /> Rider Performance
                    </h3>

                    {performanceLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : !performanceData.length ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No performance data available yet.
                        </div>
                    ) : (
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        labelStyle={{ color: 'black' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="total_deliveries" name="Deliveries" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="avg_delivery_time" name="Avg Time (min)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Add New Rider</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input
                                    required name="name"
                                    value={formData.name} onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number</label>
                                <input
                                    required name="phone"
                                    value={formData.phone} onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email (Optional)</label>
                                <input
                                    type="email" name="email"
                                    value={formData.email} onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Vehicle Type</label>
                                <select
                                    name="vehicle_type"
                                    value={formData.vehicle_type} onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                >
                                    <option value="bike">Bike</option>
                                    <option value="scooter">Scooter</option>
                                    <option value="bicycle">Bicycle</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                    type="text" name="password"
                                    placeholder="Leave blank to auto-generate"
                                    value={formData.password} onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                                <p className="text-xs text-muted-foreground mt-1">If left blank, a random password will be created.</p>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-sm">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 text-sm font-medium">
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Create Rider
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success/Credentials Modal */}
            {createdRider && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
                        <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={24} />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Rider Created!</h2>
                        <p className="text-muted-foreground text-sm mb-6">Please share these credentials with the rider.</p>

                        <div className="bg-muted p-4 rounded-lg text-left space-y-2 mb-6">
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase">Phone (Login ID)</span>
                                <div className="font-mono text-lg">{createdRider.phone}</div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase">Password</span>
                                <div className="font-mono text-lg bg-background border px-2 py-1 rounded select-all">
                                    {createdRider.password}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setCreatedRider(null)}
                            className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Missing icon import fallback
const CheckCircle = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default Staff;
