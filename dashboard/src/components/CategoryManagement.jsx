import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function CategoryManagement() {
  const { api } = useContext(AuthContext);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: '' });
  const [files, setFiles] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/restaurant-owner/categories')
      .then((r) => setCats(r.data.categories))
      .finally(() => setLoading(false));
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', form.name);
    for (const f of files) data.append('categoryImages', f);

    try {
      if (editId) {
        await api.put(`/api/restaurant-owner/categories/${editId}`, data);
        setEditId(null);
      } else {
        const { data: res } = await api.post('/api/restaurant-owner/categories', data);
        setCats((c) => [...c, res.category]);
      }
      setForm({ name: '' });
      setFiles([]);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const del = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/api/restaurant-owner/categories/${id}`);
    setCats((c) => c.filter((x) => x._id !== id));
  };

  const startEdit = (c) => {
    setForm({ name: c.name });
    setEditId(c._id);
  };

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Category Management</h2>

      <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow mb-6 space-y-4">
        <input name="name" value={form.name} onChange={(e) => setForm({ name: e.target.value })} placeholder="Category name" className="input" required />
        <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="input" />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">{editId ? 'Update' : 'Add'}</button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ name: '' }); setFiles([]); }} className="btn-gray">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c._id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
            <div className="flex items-center">
              {c.image && <img src={c.image} alt={c.name} className="w-12 h-12 rounded mr-3" />}
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-gray-500">{c.images?.length || 0} images</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(c)} className="text-blue-600">Edit</button>
              <button onClick={() => del(c._id)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}