const { useState, useEffect } = React;

function AdvertisementManagement() {
  const [ads, setAds] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    targetUrl: '',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5001/api/admin/advertisements', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAds(res.data.advertisements);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch advertisements');
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5001/api/admin/advertisements', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAds([...ads, res.data.advertisement]);
      setFormData({ title: '', imageUrl: '', targetUrl: '', isActive: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add advertisement');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/admin/advertisements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAds(ads.filter(ad => ad._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete advertisement');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Advertisement Management</h2>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Add New Advertisement</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ad Title"
              className="p-2 border rounded"
              required
            />
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="Image URL"
              className="p-2 border rounded"
              required
            />
            <input
              type="url"
              name="targetUrl"
              value={formData.targetUrl}
              onChange={handleChange}
              placeholder="Target URL"
              className="p-2 border rounded"
              required
            />
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="mr-2"
              />
              Active
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Add Advertisement
          </button>
        </form>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Title</th>
              <th className="p-4 text-left">Image</th>
              <th className="p-4 text-left">Target URL</th>
              <th className="p-4 text-left">Active</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.map(ad => (
              <tr key={ad._id} className="border-t">
                <td className="p-4">{ad.title}</td>
                <td className="p-4">
                  <img src={ad.imageUrl} alt={ad.title} className="h-10" />
                </td>
                <td className="p-4">
                  <a href={ad.targetUrl} target="_blank" className="text-blue-500">Link</a>
                </td>
                <td className="p-4">{ad.isActive ? 'Yes' : 'No'}</td>
                <td className="p-4">
                  <button
                    onClick={() => alert('Edit functionality TBD')}
                    className="text-blue-500 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ad._id)}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdvertisementManagement;