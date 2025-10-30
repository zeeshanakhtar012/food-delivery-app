// src/components/Expenses.jsx
import { useContext, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function Expenses() {
  const { api } = useContext(AuthContext);
  const [form, setForm] = useState({
    type: 'inventory',
    description: '',
    amount: '',
    category: '',
  });
  const [msg, setMsg] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/restaurant-owner/expenses', form);
      setMsg('Expense added successfully');
      setForm({ type: 'inventory', description: '', amount: '', category: '' });
    } catch {
      setMsg('Failed to add expense');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Add Expense</h2>
      {msg && (
        <p className={`mb-4 ${msg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {msg}
        </p>
      )}
      <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow space-y-4 max-w-md">
        <select name="type" value={form.type} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="inventory">Inventory</option>
          <option value="utilities">Utilities</option>
          <option value="salary">Salary</option>
          <option value="other">Other</option>
        </select>
        <input
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
          className="w-full p-2 border rounded"
          required
        />
        <input
          name="amount"
          type="number"
          step="0.01"
          value={form.amount}
          onChange={handleChange}
          placeholder="Amount"
          className="w-full p-2 border rounded"
          required
        />
        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Category (optional)"
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Add Expense
        </button>
      </form>
    </div>
  );
}