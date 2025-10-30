import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function OrderManagement() {
  const { api } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const fetch = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/restaurant-owner/orders', {
        params: { status: filter || undefined, page: p, limit: 15 },
      });
      setOrders(data.orders);
      setPagination(data.pagination);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [filter, api]);

  const changeStatus = async (id, status) => {
    await api.post(`/api/restaurant-owner/orders/${id}/status`, { status });
    setOrders((o) => o.map((x) => (x._id === id ? { ...x, status } : x)));
  };

  const accept = async (id) => {
    await api.post(`/api/restaurant-owner/orders/${id}/accept`);
    fetch(page);
  };
  const reject = async (id) => {
    const reason = prompt('Reason for rejection');
    if (!reason) return;
    await api.post(`/api/restaurant-owner/orders/${id}/reject`, { reason });
    fetch(page);
  };

  if (loading) return <p className="p-6">Loading orders…</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Order Management</h2>

      <div className="mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-t">
                <td className="p-3">{o.orderId}</td>
                <td className="p-3">{o.userDisplay?.name || '—'}</td>
                <td className="p-3">${o.totalAmount.toFixed(2)}</td>
                <td className="p-3">
                  <select value={o.status} onChange={(e) => changeStatus(o._id, e.target.value)} className="input text-sm">
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="p-3 flex gap-1">
                  {o.status === 'pending' && (
                    <>
                      <button onClick={() => accept(o._id)} className="text-green-600 text-sm">Accept</button>
                      <button onClick={() => reject(o._id)} className="text-red-600 text-sm">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between">
        <button disabled={page === 1} onClick={() => fetch(page - 1)} className="btn-gray">Prev</button>
        <span>
          Page {page} / {pagination.totalPages || 1}
        </span>
        <button disabled={!pagination.hasNextPage} onClick={() => fetch(page + 1)} className="btn-gray">Next</button>
      </div>
    </div>
  );
}