import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api';
import { Plus, Edit2, Trash2, Loader2, Layers, Image as ImageIcon, X } from 'lucide-react';
import ImportExportPanel from '../../components/ImportExportPanel';
import { API_CONFIG } from '../../config/api';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sort_order: 0,
        is_active: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await restaurantAdmin.getCategories();
            setCategories(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
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
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const openModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                description: category.description || '',
                sort_order: category.sort_order || 0,
                is_active: category.is_active
            });
            setImagePreview(category.image_url ? `${API_CONFIG.baseURL}${category.image_url}` : null);
            setImageFile(null);
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                description: '',
                sort_order: 0,
                is_active: true
            });
            setImagePreview(null);
            setImageFile(null);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);
            data.append('sort_order', formData.sort_order);
            data.append('is_active', formData.is_active);
            if (imageFile) {
                data.append('image', imageFile);
            }

            if (editingCategory) {
                await restaurantAdmin.updateCategory(editingCategory.id, data);
            } else {
                await restaurantAdmin.createCategory(data);
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Failed to save category', error);
            alert('Failed to save category. ' + (error.response?.data?.message || ''));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        try {
            await restaurantAdmin.deleteCategory(id);
            // Optimistic update or refetch
            setCategories(categories.filter(c => c.id !== id));
        } catch (error) {
            console.error('Failed to delete category', error);
            alert('Failed to delete category. ' + (error.response?.data?.message || ''));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
                    <p className="text-muted-foreground">Manage food categories for your menu.</p>
                </div>
                <div className="flex items-center gap-3">
                    <ImportExportPanel onImportComplete={fetchCategories} />
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Add Category
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground w-16">Image</th>
                                <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Name</th>
                                <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Description</th>
                                <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Sort Order</th>
                                <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                                <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-muted-foreground">
                                        No categories found. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                                {cat.image_url ? (
                                                    <img
                                                        src={`${API_CONFIG.baseURL}${cat.image_url}`}
                                                        alt={cat.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Layers size={20} className="text-muted-foreground" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium">{cat.name}</td>
                                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">{cat.description}</td>
                                        <td className="py-3 px-4 text-center">{cat.sort_order}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {cat.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(cat)}
                                                    className="p-2 hover:bg-muted rounded-lg transition-colors text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Layers className="h-5 w-5" />
                                {editingCategory ? 'Edit Category' : 'New Category'}
                            </h2>
                        </div>
                        <div className="p-6">
                            <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <input
                                        name="name" required
                                        value={formData.name} onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                        placeholder="e.g. Appetizers"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description} onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg bg-background min-h-[80px]"
                                        placeholder="Optional description..."
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1">Sort Order</label>
                                        <input
                                            name="sort_order" type="number"
                                            value={formData.sort_order} onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-lg bg-background"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox" id="is_active"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleInputChange}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">Active</label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Category Image</label>
                                    <div className="mt-1 flex items-center gap-4">
                                        <div className="relative w-24 h-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
                                            {imagePreview ? (
                                                <>
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="absolute top-1 right-1 p-1 bg-background/80 rounded-full shadow-sm hover:bg-background text-destructive"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <ImageIcon className="text-muted-foreground" size={32} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground mb-2">
                                                JPG, PNG or WEBP. Max size 5MB.
                                            </p>
                                            <label className="cursor-pointer px-3 py-1.5 bg-background border rounded-lg hover:bg-muted transition-colors text-sm font-medium inline-block">
                                                {imagePreview ? 'Change Image' : 'Select Image'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                />
                                            </label>
                                        </div>
                                    </div>
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
                                form="category-form"
                                disabled={submitLoading}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingCategory ? 'Save Changes' : 'Create Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categories;
