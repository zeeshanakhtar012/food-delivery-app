const { useState, useEffect } = React;

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5001/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data.users);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleToggleBlock = async (id, isBlocked) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5001/api/admin/users/${id}/block`, { isBlocked: !isBlocked }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.map(user => user._id === id ? { ...user, isBlocked: !isBlocked } : user));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle block status');
    }
  };

  const handleToggleAdmin = async (id, isAdmin) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5001/api/admin/users/${id}/admin`, { isAdmin: !isAdmin }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.map(user => user._id === id ? { ...user, isAdmin: !isAdmin } : user));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle admin status');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Phone</th>
              <th className="p-4 text-left">Blocked</th>
              <th className="p-4 text-left">Admin</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id} className="border-t">
                <td className="p-4">{user.name}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.phone}</td>
                <td className="p-4">{user.isBlocked ? 'Yes' : 'No'}</td>
                <td className="p-4">{user.isAdmin ? 'Yes' : 'No'}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggleBlock(user._id, user.isBlocked)}
                    className={`mr-2 ${user.isBlocked ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {user.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    onClick={() => handleToggleAdmin(user._id, user.isAdmin)}
                    className={user.isAdmin ? 'text-blue-500' : 'text-purple-500'}
                  >
                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
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

export default UserManagement;