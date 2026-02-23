import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { Plus, Edit2, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import ImportExportPanel from '../../components/ImportExportPanel';

const Menu = () => {
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFood, setEditingFood] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category_id: '',
        preparation_time: '15',
        is_available: true,
        stock_quantity: '0',
        is_unlimited: true,
        image: null
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [foodsResponse, categoriesResponse] = await Promise.all([
                restaurantAdmin.getAllFoods(),
                restaurantAdmin.getCategories()
            ]);
            setFoods(Array.isArray(foodsResponse.data.data) ? foodsResponse.data.data : []);
            setCategories(Array.isArray(categoriesResponse.data.data) ? categoriesResponse.data.data : []);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, image: file }));
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const openModal = (food = null) => {
        if (food) {
            setEditingFood(food);
            setFormData({
                name: food.name,
                description: food.description || '',
                price: food.price,
                category_id: food.category_id,
                preparation_time: food.preparation_time,
                is_available: food.is_available,
                stock_quantity: food.stock_quantity || '0',
                is_unlimited: food.is_unlimited !== false, // Default to true if undefined
                image: null
            });
            setImagePreview(food.image_url ? `${food.image_url}` : null); // Adjust base URL if needed
        } else {
            setEditingFood(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                category_id: categories.length > 0 ? categories[0].id : '',
                preparation_time: '15',
                is_available: true,
                stock_quantity: '0',
                is_unlimited: true,
                image: null
            });
            setImagePreview(null);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);

        // Create FormData object
        const data = new FormData();
        data.append('name', formData.name);
        data.append('description', formData.description);
        data.append('price', formData.price);
        data.append('category_id', formData.category_id);
        data.append('preparation_time', formData.preparation_time);
        data.append('is_available', formData.is_available);
        data.append('stock_quantity', formData.stock_quantity);
        data.append('is_unlimited', formData.is_unlimited);
        if (formData.image) {
            data.append('foodImages', formData.image);
        }

        try {
            if (editingFood) {
                await restaurantAdmin.updateFood(editingFood.id, data);
            } else {
                await restaurantAdmin.createFood(data);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save food', error);
            alert('Failed to save food item. ' + (error.response?.data?.message || ''));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await restaurantAdmin.deleteFood(id);
            setFoods(foods.filter(f => f.id !== id));
        } catch (error) {
            console.error('Failed to delete food', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Menu Items</h1>
                    <p className="text-muted-foreground">Manage your food items and categories.</p>
                </div>
                <div className="flex items-center gap-3">
                    <ImportExportPanel onImportComplete={fetchData} />
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Add Item
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {foods.map(food => (
                        <div key={food.id} className="bg-card rounded-xl border shadow-sm overflow-hidden group hover:shadow-md transition-all">
                            <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
                                {food.image_url ? (
                                    <img src={food.image_url.startsWith('http') ? food.image_url : `${API_CONFIG.baseURL}${food.image_url.startsWith('/') ? '' : '/'}${food.image_url}`} alt={food.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-muted-foreground h-12 w-12 opacity-50" />
                                )}
                                {!food.is_available && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                        <span className="text-white font-bold px-3 py-1 border border-white/50 rounded-full text-sm">Unavailable</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg line-clamp-1" title={food.name}>{food.name}</h3>
                                    <span className="font-bold text-primary">${parseFloat(food.price).toFixed(2)}</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                                    {food.description || 'No description available'}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openModal(food)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                                    >
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(food.id)}
                                        className="p-2 text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-black rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">{editingFood ? 'Edit Item' : 'Add New Item'}</h2>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="food-form" onSubmit={handleSubmit} className="space-y-4">
                                <div className="flex flex-col gap-4 sm:flex-row">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1">Name</label>
                                        <input
                                            name="name" required
                                            value={formData.name} onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-lg bg-white"
                                        />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                                        <input
                                            name="price" type="number" step="0.01" required
                                            value={formData.price} onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-lg bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description} onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg bg-white min-h-[80px]"
                                    />
                                </div>

                                <div className="flex flex-col gap-4 sm:flex-row">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1">Prep Time (mins)</label>
                                        <input
                                            name="preparation_time" type="number" required
                                            value={formData.preparation_time} onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-lg bg-white"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1">Category</label>
                                        <select
                                            name="category_id"
                                            required
                                            value={formData.category_id}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-lg bg-white"
                                        >
                                            <option value="" disabled>Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 sm:flex-row items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                                        <input
                                            name="stock_quantity"
                                            type="number"
                                            disabled={formData.is_unlimited}
                                            value={formData.stock_quantity}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-lg bg-white disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pb-3">
                                        <input
                                            type="checkbox"
                                            id="is_unlimited"
                                            name="is_unlimited"
                                            checked={formData.is_unlimited}
                                            onChange={handleInputChange}
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                        />
                                        <label htmlFor="is_unlimited" className="text-sm font-medium cursor-pointer">Unlimited Stock</label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Image</label>
                                    <input
                                        type="file" accept="image/*"
                                        onChange={handleImageChange}
                                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                    {imagePreview && (
                                        <div className="mt-2 relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox" id="available"
                                        name="is_available"
                                        checked={formData.is_available}
                                        onChange={handleInputChange}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                    />
                                    <label htmlFor="available" className="text-sm font-medium cursor-pointer">Available for ordering</label>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t bg-muted/20 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="food-form"
                                disabled={submitLoading}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingFood ? 'Save Changes' : 'Create Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Menu;
