import { useState, useEffect } from 'react';
import { superAdmin } from '../../services/api';
import { Search, Loader2, Users as UsersIcon, CheckCircle, Ban, Lock, Unlock, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await superAdmin.getAllUsers();
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleFreeze = async (id, currentStatus) => {
        const action = currentStatus ? 'freeze' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await superAdmin.toggleUserFreeze(id);
            setUsers(users.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
        } catch (error) {
            alert('Failed to update user status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await superAdmin.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground">Manage platform users across all restaurants.</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search by Name or Email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-w-md shadow-sm"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium">No users found</h3>
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restaurant</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                                                    {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-foreground">{user.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm">{user.email || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{user.phone || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium">{user.restaurant_name || 'Global'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", user.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200')}>
                                                {user.is_active ? <CheckCircle size={12} className="mr-1.5" /> : <Ban size={12} className="mr-1.5" />}
                                                {user.is_active ? 'Active' : 'Frozen'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleFreeze(user.id, user.is_active)}
                                                    className={clsx("p-1.5 rounded-md transition-colors", user.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50")}
                                                    title={user.is_active ? "Freeze User" : "Activate User"}
                                                >
                                                    {user.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
