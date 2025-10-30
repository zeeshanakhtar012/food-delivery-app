// src/components/Reports.jsx
import { useContext, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function Reports() {
  const { api } = useContext(AuthContext);
  const [type, setType] = useState('sales');
  const [period, setPeriod] = useState('daily');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/restaurant-owner/reports', {
        params: { type, period },
      });
      setReport(data.data);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Generate Reports</h2>

      <div className="bg-white p-6 rounded-lg shadow space-y-4 max-w-md">
        <div>
          <label className="block font-medium mb-1">Report Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="sales">Sales</option>
            <option value="topFoods">Top Foods</option>
            <option value="balance">Balance</option>
            <option value="foodCosts">Food Costs</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {report && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Report Result</h3>
          <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}