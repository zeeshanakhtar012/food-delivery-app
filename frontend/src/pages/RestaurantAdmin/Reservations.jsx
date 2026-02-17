import React, { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { Calendar, Clock, Users, Phone, Search, Plus, Trash2, Edit } from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-hot-toast';

const Reservations = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_phone: '',
        reservation_time: '',
        guest_count: 2,
        table_id: '',
        notes: ''
    });

    useEffect(() => {
        fetchReservations();
    }, []);

    const fetchReservations = async () => {
        try {
            setLoading(true);
            const res = await restaurantAdmin.getReservations();
            setReservations(res.data);
        } catch (error) {
            console.error('Error fetching reservations:', error);
            toast.error('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await restaurantAdmin.createReservation({
                ...formData,
                reservation_time: new Date(formData.reservation_time).toISOString()
            });
            toast.success('Reservation created');
            setShowModal(false);
            setFormData({
                customer_name: '',
                customer_phone: '',
                reservation_time: '',
                guest_count: 2,
                table_id: '',
                notes: ''
            });
            fetchReservations();
        } catch (error) {
            console.error('Error creating reservation:', error);
            toast.error('Failed to create reservation');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reservation?')) return;
        try {
            await restaurantAdmin.deleteReservation(id);
            toast.success('Reservation deleted');
            setReservations(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            toast.error('Failed to delete reservation');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="text-indigo-600" /> Reservations
                </h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
                >
                    <Plus className="w-4 h-4" /> New Reservation
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Customer</th>
                                <th className="p-4 font-semibold text-gray-600">Date & Time</th>
                                <th className="p-4 font-semibold text-gray-600">Guests</th>
                                <th className="p-4 font-semibold text-gray-600">Table</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {reservations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">No reservations found</td>
                                </tr>
                            ) : (
                                reservations.map(res => (
                                    <tr key={res.id} className="hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{res.customer_name}</div>
                                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {res.customer_phone}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {moment(res.reservation_time).format('MMM D, YYYY')}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                {moment(res.reservation_time).format('h:mm A')}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-4 h-4 text-gray-400" /> {res.guest_count}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {res.table_id ? `Table` : 'Any'}
                                            {/* Ideally fetch table number */}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                                        ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                    res.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                        res.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'}`}>
                                                {res.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDelete(res.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">New Reservation</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.customer_name}
                                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.customer_phone}
                                    onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className="w-full p-2 border rounded-lg"
                                        value={formData.reservation_time}
                                        onChange={e => setFormData({ ...formData, reservation_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                                    <input
                                        require
                                        type="number"
                                        min="1"
                                        className="w-full p-2 border rounded-lg"
                                        value={formData.guest_count}
                                        onChange={e => setFormData({ ...formData, guest_count: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Create Reservation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reservations;
