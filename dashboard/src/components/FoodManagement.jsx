import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function FoodManagement() {
  const { api } = useContext(AuthContext);
  const [foods, setFoods] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    category: '',
    preparationTime: 15,
    discountType: '',
    discountValue: 0,
    isAvailable: true,
  });
  const [files, setFiles] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/restaurant-owner/categories'),
      api.get('/api/restaurant-owner/foods'),
    ])
      .then(([cRes, fRes]) => {
        setCats(cRes.data.categories);
        setFoods(fRes.data.foods || []);
      })
      .finally(() => setLoading(false));
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    for (const f of files) data.append('foodImages', f);

    try {
      if (editId) {
        await api.post(`/api/restaurant-owner/foods/${editId}`, data);
        setEditId(null);
      } else {
        const { data: res } = await api.post('/api/restaurant-owner/foods', data);
        setFoods((f) => [...f, res.food]);
      }
      resetForm();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      costPrice: '',
      category: '',
      preparationTime: 15,
      discountType: '',
      discountValue: 0,
      isAvailable: true,
    });
    setFiles([]);
  };

  const startEdit = (f) => {
    setForm({
      name: f.name,
      description: f.description,
      price: f.price,
      costPrice: f.costPrice || '',
      category: f.category._id || f.category,
      preparationTime: f.preparationTime,
      discountType: f.discountType || '',
      discountValue: f.discountValue || 0,
      isAvailable: f.isAvailable,
    });
    setEditId(f._id);
  };

  const del = async (id) => {
    if (!confirm('Delete food?')) return;
    await api.delete(`/api/restaurant-owner/foods/${id}`);
    setFoods((f) => f.filter((x) => x._id !== id));
  };

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Food Management</h2>

      <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow mb-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="input" required />
          <input name="price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" className="input" required />
          <input name="costPrice" type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="Cost Price" className="input" />
          <select name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" required>
            <option value="">Select Category</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="preparationTime" type="number" value={form.preparationTime} onChange={(e) => setForm({ ...form, preparationTime: e.target.value })} placeholder="Prep time (min)" className="input" />
          <select name="discountType" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="input">
            <option value="">No Discount</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
          {form.discountType && (
            <input name="discountValue" type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder="Discount value" className="input" required />
          )}
        </div>

        <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="input" rows={3} required />
        <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="input" />
        <label className="flex items-center">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="mr-2" />
          Available
        </label>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary">{editId ? 'Update' : 'Add'} Food</button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); resetForm(); }} className="btn-gray">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {foods.map((f) => (
          <div key={f._id} className="bg-white p-4 rounded-lg shadow">
            {f.image && <img src={f.image} alt={f.name} className="w-full h-40 object-cover rounded mb-2" />}
            <h3 className="font-semibold">{f.name}</h3>
            <p className="text-sm text-gray-600">{f.category?.name || '—'}</p>
            <p className="font-bold">${f.price.toFixed(2)}</p>
            {f.discountType && (
              <p className="text-green-600">
                -{f.discountValue}
                {f.discountType === 'percentage' ? '%' : '$'}
              </p>
            )}
            <div className="flex justify-between mt-2">
              <button onClick={() => startEdit(f)} className="text-blue-600">Edit</button>
              <button onClick={() => del(f._id)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}