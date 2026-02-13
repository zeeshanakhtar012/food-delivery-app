import { useAuth } from '../../context/AuthContext';
import { Shield, Server, Database, Info } from 'lucide-react';

const Settings = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Card */}
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-muted/20">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Admin Profile
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
                            <div className="font-medium text-lg">{user?.name || 'Super Admin'}</div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                            <div className="font-medium">{user?.email}</div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</label>
                            <div className="inline-block bg-primary/10 text-primary px-2 py-1 rounded-md text-sm font-bold mt-1">
                                {user?.role?.replace('_', ' ').toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-muted/20">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Server className="h-5 w-5 text-primary" />
                            System Information
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Backend Status</span>
                                <span className="text-green-600 font-bold text-sm">Online</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full w-full"></div>
                            </div>
                        </div>

                        <div className="pt-4 border-t grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                    <Database size={12} /> Database
                                </div>
                                <div className="font-medium">PostgreSQL</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                    <Info size={12} /> Version
                                </div>
                                <div className="font-medium">v1.0.0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
