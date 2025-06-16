const { useState, useEffect } = React;

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5001/api/admin/audit-logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data.logs);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Audit Logs</h2>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Action</th>
              <th className="p-4 text-left">Entity</th>
              <th className="p-4 text-left">Details</th>
              <th className="p-4 text-left">Performed By</th>
              <th className="p-4 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log._id} className="border-t">
                <td className="p-4">{log.action}</td>
                <td className="p-4">{log.entity}</td>
                <td className="p-4">{log.details}</td>
                <td className="p-4">{log.performedBy?.name || log.performedBy}</td>
                <td className="p-4">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditLogs;