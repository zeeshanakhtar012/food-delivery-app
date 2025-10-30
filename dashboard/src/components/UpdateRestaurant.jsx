import { useContext, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function UpdateRestaurant() {
  const { api, user } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: user.restaurant?.name || '',
    email: user.restaurant?.email || '',
    phone: user.restaurant?.phone || '',
    description: user.restaurant?.description || '',
    address: JSON.stringify(user.restaurant?.address || {}, null, 2),
  });
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFile = (e) => setFiles(e.target.files);

  const submit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    for (const f of files) data.append('restaurantImages', f);

    try {
      await api.post('/api/restaurant-owner/details', data);
      setMsg('Updated successfully');
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Update Restaurant</h2>
      {msg && <p className={msg.includes('success') ? 'text-green-600' : 'text-red-600'}>{msg}</p>}
      <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="input" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="input" required />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="input" required />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="input" rows={3} />
        <textarea
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder='{"street":"...", "city":"..."}'
          className="input font-mono text-sm"
          rows={5}
          required
        />
        <input type="file" multiple accept="image/*" onChange={handleFile} className="input" />
        <button type="submit" className="btn-primary">Save Changes</button>
      </form>
    </div>
  );
}