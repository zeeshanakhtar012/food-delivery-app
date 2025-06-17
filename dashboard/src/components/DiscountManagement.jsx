import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DiscountManagement() {
  const [discounts, setDiscounts] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    value: '',
    startDate: '',
    endDate: '',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5001/api/admin/discounts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDiscounts(res.data.discounts);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch discounts');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5001/api/admin/discounts', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiscounts([...discounts, res.data.discount]);
      setFormData({
        code: '',
        discountType: 'percentage',
        value: '',
        startDate: '',
        endDate: '',
        isActive: true
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add discount');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/admin/discounts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiscounts(discounts.filter(discount => discount._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete discount');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Discount Management</h2>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Add New Discount</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Discount Code"
              className="p-2 border rounded"
              required
            />
            <select
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
              className="p-2 border rounded"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            <input
              type="number"
              name="value"
              value={formData.value}
              onChange={handleChange}
              placeholder="Value"
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
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
            Add Discount
          </button>
        </form>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Code</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Value</th>
              <th className="p-4 text-left">Active</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map(discount => (
              <tr key={discount._id} className="border-t">
                <td className="p-4">{discount.code}</td>
                <td className="p-4">{discount.discountType}</td>
                <td className="p-4">{discount.value}{discount.discountType === 'percentage' ? '%' : '$'}</td>
                <td className="p-4">{discount.isActive ? 'Yes' : 'No'}</td>
                <td className="p-4">
                  <button
                    onClick={() => alert('Edit functionality TBD')}
                    className="text-blue-500 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(discount._id)}
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

export default DiscountManagement;