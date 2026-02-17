import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import {
    Plus, Search, Edit2, Trash2, Loader2,
    LayoutGrid, Users, QrCode, MonitorSmartphone, X
} from 'lucide-react';
import clsx from 'clsx';

const Tables = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [formData, setFormData] = useState({
        table_number: '',
        capacity: 4,
        qr_code_url: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [activeOrderModal, setActiveOrderModal] = useState(null);
    const [activeOrderLoading, setActiveOrderLoading] = useState(false);
    const [activeOrder, setActiveOrder] = useState(null);

    const fetchTables = async () => {
        try {
            setLoading(true);
            const response = await restaurantAdmin.getAllTables();
            setTables(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch tables', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingTable) {
                await restaurantAdmin.updateTable(editingTable.id, formData);
                alert('Table updated successfully');
            } else {
                await restaurantAdmin.createTable(formData);
                alert('Table created successfully');
            }
            setIsModalOpen(false);
            fetchTables();
            resetForm();
        } catch (error) {
            console.error(error);
            alert('Operation failed. ' + (error.response?.data?.message || ''));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (table) => {
        setEditingTable(table);
        setFormData({
            table_number: table.table_number,
            capacity: table.capacity,
            qr_code_url: table.qr_code_url || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this table?')) return;
        try {
            await restaurantAdmin.deleteTable(id);
            setTables(tables.filter(t => t.id !== id));
        } catch (error) {
            alert('Failed to delete table');
        }
    };

    const resetForm = () => {
        setEditingTable(null);
        setFormData({ table_number: '', capacity: 4, qr_code_url: '' });
    };

    const handleViewActiveOrder = async (table) => {
        setActiveOrderModal(table);
        setActiveOrderLoading(true);
        setActiveOrder(null);
        try {
            const response = await restaurantAdmin.getTableActiveOrder(table.id);
            setActiveOrder(response.data.data);
        } catch (error) {
            console.error("Failed active order check", error);
        } finally {
            setActiveOrderLoading(false);
        }
    };

    const filteredTables = tables.filter(t =>
        t.table_number.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tables</h1>
                    <p className="text-muted-foreground">Manage restaurant tables and QR codes.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Add Table
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search by Table Number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium">No tables found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Add tables to manage dine-in orders.</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredTables.map(table => (
                        <div key={table.id} className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group">
                            <div className={clsx(
                                "h-2 w-full",
                                table.status === 'occupied' ? "bg-orange-500" : "bg-green-500"
                            )}></div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">Table {table.table_number}</h3>
                                        <div className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1",
                                            table.status === 'occupied' ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"
                                        )}>
                                            {table.status === 'occupied' ? 'Occupied' : 'Available'}
                                        </div>
                                    </div>
                                    <div className="bg-muted/30 p-2 rounded-lg text-muted-foreground">
                                        <QrCode size={24} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                    <Users size={16} />
                                    <span>Capacity: {table.capacity} Guests</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <button
                                        onClick={() => handleEdit(table)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                                    >
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleViewActiveOrder(table)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium border border-transparent"
                                    >
                                        <MonitorSmartphone size={14} /> View
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleDelete(table.id)}
                                    className="absolute top-4 right-2 p-1.5 text-destructive/0 group-hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Table"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">{editingTable ? 'Edit Table' : 'Add New Table'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Table Number/Name</label>
                                <input
                                    required name="table_number"
                                    value={formData.table_number} onChange={handleInputChange}
                                    placeholder="e.g. T-10 or Patio 1"
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Seating Capacity</label>
                                <input
                                    required type="number" name="capacity" min="1"
                                    value={formData.capacity} onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">QR Code URL (Optional)</label>
                                <input
                                    name="qr_code_url"
                                    value={formData.qr_code_url} onChange={handleInputChange}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-sm">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 text-sm font-medium">
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingTable ? 'Update Table' : 'Create Table'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Active Order Modal */}
            {activeOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative min-h-[200px]">
                        <button onClick={() => setActiveOrderModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-1">Active Order</h2>
                        <p className="text-sm text-muted-foreground mb-4">Table {activeOrderModal.table_number}</p>

                        {activeOrderLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : activeOrder ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                                    <span className="font-medium text-sm">Order #{activeOrder.id.slice(0, 8)}</span>
                                    <span className={clsx("px-2 py-0.5 rounded text-xs font-bold uppercase",
                                        activeOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            activeOrder.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'
                                    )}>
                                        {activeOrder.status}
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {activeOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-0">
                                            <span>{item.quantity}x {item.food_name || 'Item'}</span>
                                            <span className="font-medium">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-3 border-t flex justify-between items-center font-bold text-lg">
                                    <span>Total</span>
                                    <span>${parseFloat(activeOrder.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="bg-muted/30 inline-flex p-3 rounded-full mb-3">
                                    <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">No active order for this table.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tables;
