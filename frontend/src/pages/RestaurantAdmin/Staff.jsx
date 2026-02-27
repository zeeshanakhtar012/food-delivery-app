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
import { useSocket } from '../../context/SocketContext'; // Assuming socket context exists

const Staff = () => {
    const [activeTab, setActiveTab] = useState('staff'); // 'staff', 'riders', 'performance'
    const [riders, setRiders] = useState([]);
    const [staffList, setStaffList] = useState([]);
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
    const [selectedRider, setSelectedRider] = useState(null); // For edit/view modal
    const [isEditRiderModalOpen, setIsEditRiderModalOpen] = useState(false);

    // Performance State
    const [performanceData, setPerformanceData] = useState([]);
    const [performanceLoading, setPerformanceLoading] = useState(false);

    // Staff Requests State
    const [staffRequests, setStaffRequests] = useState([]);

    // Rider Requests State
    const [riderRequests, setRiderRequests] = useState([]);

    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.on('staffLoginRequest', (requestData) => {
            setStaffRequests(prev => {
                // Check if request already exists for this staff
                const exists = prev.find(req => req.staff_id === requestData.staff_id);
                if (exists) return prev;
                return [requestData, ...prev];
            });
            // Show alert or toast here if needed
            alert(`New login request from Staff: ${requestData.name}`);
        });

        socket.on('riderLoginRequest', (requestData) => {
            setRiderRequests(prev => {
                // Check if request already exists for this rider
                const exists = prev.find(req => req.rider_id === requestData.rider_id);
                if (exists) return prev;
                return [requestData, ...prev];
            });
            alert(`New login request from Rider: ${requestData.name}`);
        });

        return () => {
            socket.off('staffLoginRequest');
            socket.off('riderLoginRequest');
        };
    }, [socket]);

    const fetchRiders = async () => {
        setLoading(true);
        try {
            const response = await restaurantAdmin.getAllRiders();
            setRiders(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch riders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const response = await restaurantAdmin.getStaff();
            setStaffList(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch staff', error);
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
        if (activeTab === 'riders') fetchRiders();
        if (activeTab === 'staff') fetchStaff();
    }, [activeTab]);

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
            if (activeTab === 'riders') {
                const response = await restaurantAdmin.createRider(formData);
                setCreatedRider(response.data.data);
                fetchRiders();
            } else {
                const response = await restaurantAdmin.createStaff({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    password: formData.password
                });
                setCreatedRider(response.data.data);
                fetchStaff();
            }

            setFormData({ name: '', phone: '', email: '', vehicle_type: 'bike', password: '' });
            setIsModalOpen(false); // Close form modal
        } catch (error) {
            console.error(error);
            alert(`Failed to create ${activeTab === 'riders' ? 'rider' : 'staff member'}. ` + (error.response?.data?.message || ''));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditRiderSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await restaurantAdmin.updateRider(selectedRider.id, {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                vehicle_type: formData.vehicle_type,
                password: formData.password || undefined // Only send if user typed a new password
            });
            fetchRiders();
            setIsEditRiderModalOpen(false);
            setSelectedRider(null);
        } catch (error) {
            console.error(error);
            alert('Failed to update rider. ' + (error.response?.data?.message || ''));
        } finally {
            setSubmitting(false);
        }
    };

    const toggleRiderStatus = async (riderId, isBlocked) => {
        try {
            if (isBlocked) {
                await restaurantAdmin.unblockRider(riderId);
            } else {
                await restaurantAdmin.blockRider(riderId);
            }
            fetchRiders();
            setIsEditRiderModalOpen(false);
            setSelectedRider(null);
        } catch (error) {
            console.error('Error toggling rider status:', error);
            alert('Failed to update rider status');
        }
    };

    const handleDeleteRider = async (riderId) => {
        if (!window.confirm('Are you sure you want to delete this rider? This action cannot be undone.')) return;
        try {
            await restaurantAdmin.deleteRider(riderId);
            fetchRiders();
            setIsEditRiderModalOpen(false);
            setSelectedRider(null);
        } catch (error) {
            console.error('Error deleting rider:', error);
            alert('Failed to delete rider');
        }
    };

    const openEditRiderModal = (rider) => {
        setSelectedRider(rider);
        setFormData({
            name: rider.name || '',
            phone: rider.phone || '',
            email: rider.email || '',
            vehicle_type: rider.vehicle_number || rider.vehicle_type || 'bike',
            password: ''
        });
        setIsEditRiderModalOpen(true);
    };

    const toggleStaffStatus = async (staffId, currentStatus) => {
        try {
            await restaurantAdmin.updateStaff(staffId, { is_active: !currentStatus });
            fetchStaff();
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('Failed to update status');
        }
    };

    const handleDeleteStaff = async (staffId) => {
        if (!window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;
        try {
            await restaurantAdmin.deleteStaff(staffId);
            fetchStaff();
        } catch (error) {
            console.error('Error deleting staff:', error);
            alert('Failed to delete staff');
        }
    };

    const handleApproveStaff = async (staffId) => {
        try {
            await restaurantAdmin.updateStaff(staffId, { is_active: true });
            setStaffRequests(prev => prev.filter(req => req.staff_id !== staffId));
            fetchStaff();
            alert('Staff login approved successfully.');
        } catch (error) {
            console.error('Error approving staff:', error);
            alert('Failed to approve staff login');
        }
    };

    const handleRejectStaff = (staffId) => {
        setStaffRequests(prev => prev.filter(req => req.staff_id !== staffId));
    };

    const handleApproveRider = async (riderId) => {
        try {
            await restaurantAdmin.unblockRider(riderId);
            setRiderRequests(prev => prev.filter(req => req.rider_id !== riderId));
            fetchRiders();
            alert('Rider login approved successfully.');
        } catch (error) {
            console.error('Error approving rider:', error);
            alert('Failed to approve rider login');
        }
    };

    const handleRejectRider = (riderId) => {
        setRiderRequests(prev => prev.filter(req => req.rider_id !== riderId));
    };

    const filteredRiders = riders.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search)
    );

    const filteredStaff = staffList.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.includes(search)
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
                        onClick={() => {
                            setFormData({ name: '', phone: '', email: '', vehicle_type: 'bike', password: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        {activeTab === 'riders' ? 'Add Rider' : 'Add Staff'}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('staff')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors border-b-2",
                        activeTab === 'staff'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    In-House Staff
                </button>
                <button
                    onClick={() => setActiveTab('riders')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors border-b-2",
                        activeTab === 'riders'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Delivery Riders
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

            {/* Login Requests Section */}
            {activeTab === 'staff' && staffRequests.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" /> Pending Login Requests
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {staffRequests.map(request => (
                            <div key={request.staff_id} className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm p-5 flex flex-col gap-3">
                                <div>
                                    <h4 className="font-bold text-lg text-orange-900">{request.name}</h4>
                                    <p className="text-sm text-orange-700">{request.email}</p>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 mt-1 block">{request.role}</span>
                                </div>
                                <div className="mt-2 pt-3 border-t border-orange-200 flex gap-2">
                                    <button
                                        onClick={() => handleApproveStaff(request.staff_id)}
                                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectStaff(request.staff_id)}
                                        className="flex-1 px-3 py-2 bg-white text-orange-700 border border-orange-300 rounded text-sm font-medium hover:bg-orange-100 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'riders' && riderRequests.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <Truck className="h-5 w-5" /> Pending Rider Logins
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {riderRequests.map(request => (
                            <div key={request.rider_id} className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm p-5 flex flex-col gap-3">
                                <div>
                                    <h4 className="font-bold text-lg text-orange-900">{request.name}</h4>
                                    <p className="text-sm text-orange-700">{request.email}</p>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 mt-1 block">{request.vehicle_number || 'N/A'}</span>
                                </div>
                                <div className="mt-2 pt-3 border-t border-orange-200 flex gap-2">
                                    <button
                                        onClick={() => handleApproveRider(request.rider_id)}
                                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectRider(request.rider_id)}
                                        className="flex-1 px-3 py-2 bg-white text-orange-700 border border-orange-300 rounded text-sm font-medium hover:bg-orange-100 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'riders' || activeTab === 'staff' ? (
                <>
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search by Name or Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (activeTab === 'riders' ? filteredRiders.length === 0 : filteredStaff.length === 0) ? (
                        <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                            <h3 className="text-lg font-medium">No {activeTab} found</h3>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {activeTab === 'riders' ? filteredRiders.map(rider => (
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
                                        <div className="flex flex-col">
                                            <span className={clsx(rider.is_available ? "text-green-600" : "text-slate-500")}>
                                                {rider.is_available ? '● Online' : '○ Offline'}
                                            </span>
                                            {rider.is_blocked && (
                                                <span className="text-red-500 text-xs mt-1 font-bold">● BLOCKED</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => openEditRiderModal(rider)}
                                            className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-xs hover:bg-secondary/80 outline"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            )) : filteredStaff.map(staff => (
                                <div key={staff.id} className={clsx("bg-card rounded-xl border shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow", !staff.is_active && "opacity-75")}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                                {staff.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight">{staff.name}</h3>
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{staff.role}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-foreground/70" />
                                            <span>{staff.phone || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-foreground/70" />
                                            <span className="truncate">{staff.email}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t flex justify-between items-center text-sm font-medium mt-auto">
                                        <span className={clsx(staff.is_active ? "text-green-600" : "text-red-500")}>
                                            {staff.is_active ? '● Active' : '○ Frozen'}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleStaffStatus(staff.id, staff.is_active)}
                                                className={clsx("px-3 py-1 rounded text-xs", staff.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100")}
                                            >
                                                {staff.is_active ? 'Freeze' : 'Unfreeze'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStaff(staff.id)}
                                                className="px-3 py-1 rounded text-xs bg-slate-100 text-red-600 hover:bg-slate-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
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
                        <h2 className="text-xl font-bold mb-4">{activeTab === 'riders' ? 'Add New Rider' : 'Add New Staff'}</h2>
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
                            {activeTab === 'riders' && (
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
                            )}
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
                                    Create {activeTab === 'riders' ? 'Rider' : 'Staff'}
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

            {/* Edit Rider Modal */}
            {
                isEditRiderModalOpen && selectedRider && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
                            <button onClick={() => { setIsEditRiderModalOpen(false); setSelectedRider(null); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                            <h2 className="text-xl font-bold mb-4">Manage Rider: {selectedRider.name}</h2>

                            <form onSubmit={handleEditRiderSubmit} className="space-y-4">
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
                                    <label className="block text-sm font-medium mb-1">New Password</label>
                                    <input
                                        type="text" name="password"
                                        placeholder="Leave blank to keep current password"
                                        value={formData.password} onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    />
                                </div>

                                <div className="pt-4 border-t flex items-center justify-between gap-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleRiderStatus(selectedRider.id, selectedRider.is_blocked)}
                                            className={clsx("px-3 py-2 border text-xs font-bold rounded-lg", selectedRider.is_blocked ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100")}
                                        >
                                            {selectedRider.is_blocked ? 'Unblock Rider' : 'Block/Freeze Rider'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteRider(selectedRider.id)}
                                            className="px-3 py-2 bg-slate-100 text-red-600 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <button type="button" onClick={() => { setIsEditRiderModalOpen(false); setSelectedRider(null); }} className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-sm">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 text-sm font-medium">
                                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// Missing icon import fallback
const CheckCircle = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default Staff;
