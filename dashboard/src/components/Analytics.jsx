import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function Analytics() {
  const { api } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    api.get('/api/restaurant-owner/analytics', { params: { period } }).then((r) => setData(r.data.analytics));
  }, [api, period]);

  if (!data) return <p className="p-6">Loading analytics…</p>;

  const { orders, revenue, expenses, balance, topDemandedFoods } = data;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Analytics ({period})</h2>

      <select value={period} onChange={(e) => setPeriod(e.target.value)} className="mb-4 input">
        <option value="daily">Daily</option>
        <option value="monthly">Monthly</option>
        <option value="6months">6 Months</option>
      </select>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <p className="font-semibold">Orders</p>
          <p className="text-2xl">{orders.totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="font-semibold">Revenue</p>
          <p className="text-2xl">${revenue.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="font-semibold">Balance</p>
          <p className={`text-2xl ${balance.current >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${balance.current.toFixed(2)}
          </p>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">Top Foods</h3>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Sold</th>
              <th className="p-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topDemandedFoods.map((f) => (
              <tr key={f._id}>
                <td className="p-3">{f.name}</td>
                <td className="p-3">{f.totalSold}</td>
                <td className="p-3">${f.totalRevenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}