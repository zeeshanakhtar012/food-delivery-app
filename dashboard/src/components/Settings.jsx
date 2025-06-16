const { useState, useEffect } = React;

function Settings() {
  const [config, setConfig] = useState({
    appName: '',
    maintenanceMode: false,
    deliveryFee: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5001/api/admin/app-config', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConfig(res.data.config);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch config');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({ ...config, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5001/api/admin/app-config', config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Settings updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="appName">App Name</label>
            <input
              type="text"
              name="appName"
              id="appName"
              value={config.appName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="deliveryFee">Delivery Fee</label>
            <input
              type="number"
              name="deliveryFee"
              id="deliveryFee"
              value={config.deliveryFee}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              min="0"
              step="0.01"
            />
          </div>
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="maintenanceMode"
                checked={config.maintenanceMode}
                onChange={handleChange}
                className="mr-2"
              />
              Maintenance Mode
            </label>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}

export default Settings;