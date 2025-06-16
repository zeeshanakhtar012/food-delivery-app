const { useState, useEffect } = React;

function FoodManagement() {
  const [foods, setFoods] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', description: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5001/api/foods', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFoods(res.data.foods);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch foods');
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editId) {
        const res = await axios.put(`http://localhost:5001/api/foods/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFoods(foods.map(food => food._id === editId ? res.data.food : food));
        setEditId(null);
      } else {
        const res = await axios.post('http://localhost:5001/api/foods', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFoods([...foods, res.data.food]);
      }
      setFormData({ name: '', price: '', description: '' });
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editId ? 'update' : 'add'} food`);
    }
  };

  const handleEdit = (food) => {
    setFormData({ name: food.name, price: food.price, description: food.description });
    setEditId(food._id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this food?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/foods/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoods(foods.filter(food => food._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete food');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Food Management</h2>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">{editId ? 'Edit Food' : 'Add New Food'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Food Name"
              className="p-2 border rounded"
              required
            />
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Price"
              className="p-2 border rounded"
              required
            />
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description"
              className="p-2 border rounded col-span-2"
              rows="4"
            ></textarea>
          </div>
          <button
            type="submit"
            className="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            {editId ? 'Update Food' : 'Add Food'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setEditId(null); setFormData({ name: '', price: '', description: '' }); }}
              className="mt-4 ml-2 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </form>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">Description</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {foods.map(food => (
              <tr key={food._id} className="border-t">
                <td className="p-4">{food.name}</td>
                <td className="p-4">${food.price.toFixed(2)}</td>
                <td className="p-4">{food.description}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleEdit(food)}
                    className="text-blue-500 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(food._id)}
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

export default FoodManagement;