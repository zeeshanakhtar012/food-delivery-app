import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { superAdmin } from '../../services/api';
import {
    Save,
    Shield,
    Globe,
    Mail,
    Bell,
    Loader2,
    Plus,
    Trash2,
    Settings as SettingsIcon,
    Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // New setting modal state
    const [showNewModal, setShowNewModal] = useState(false);
    const [newSetting, setNewSetting] = useState({ key: '', value: '', type: 'string', description: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await superAdmin.getSettings();
            setSettings(response.data.settings || []);
        } catch (error) {
            console.error('Failed to load settings', error);
            toast.error('Failed to load platform settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (index, value) => {
        const newSettings = [...settings];
        newSettings[index].value = value;
        setSettings(newSettings);
    };

    const handleSaveSetting = async (setting) => {
        try {
            // Upsert setting expects key, value, type
            await superAdmin.upsertSetting({
                key: setting.key,
                value: setting.value,
                type: setting.type,
                description: setting.description
            });
            toast.success(`Setting '${setting.key}' saved successfully`);
        } catch (error) {
            console.error('Failed to save setting', error);
            toast.error(`Failed to save '${setting.key}'`);
        }
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            // Save all settings sequentially or with Promise.all
            await Promise.all(settings.map(s => superAdmin.upsertSetting({
                key: s.key,
                value: s.value,
                type: s.type,
                description: s.description
            })));
            toast.success('All settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings', error);
            toast.error('Failed to save some settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (key) => {
        if (!window.confirm(`Are you sure you want to delete setting '${key}'?`)) return;
        try {
            await superAdmin.deleteSetting(key);
            setSettings(settings.filter(s => s.key !== key));
            toast.success('Setting deleted');
        } catch (error) {
            toast.error('Failed to delete setting');
        }
    };

    const handleCreateSetting = async (e) => {
        e.preventDefault();
        try {
            await superAdmin.upsertSetting(newSetting);
            toast.success('New setting created');
            setShowNewModal(false);
            setNewSetting({ key: '', value: '', type: 'string', description: '' });
            fetchSettings(); // Refresh list
        } catch (error) {
            toast.error('Failed to create setting');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Settings</h1>
                    <p className="text-muted-foreground mt-1">Configure global application parameters and defaults.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        New Key
                    </button>
                    <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                        Save All Changes
                    </button>
                </div>
            </div>

            {/* Main Settings Form */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Terminal className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Environment Variables & Keys</h2>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {settings.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            No custom settings have been configured yet.
                        </div>
                    ) : (
                        settings.map((setting, index) => (
                            <div key={setting.key} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-muted/5 transition-colors">
                                <div className="md:w-1/3 space-y-1">
                                    <label className="text-sm font-medium text-foreground block">
                                        {setting.key}
                                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                                            {setting.type}
                                        </span>
                                    </label>
                                    {setting.description && (
                                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                                    )}
                                </div>
                                <div className="md:w-2/3 flex items-start gap-3">
                                    <div className="flex-1">
                                        {setting.type === 'boolean' ? (
                                            <select
                                                value={setting.value}
                                                onChange={(e) => handleSettingChange(index, e.target.value)}
                                                className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            >
                                                <option value="true">True</option>
                                                <option value="false">False</option>
                                            </select>
                                        ) : setting.type === 'json' ? (
                                            <textarea
                                                value={setting.value}
                                                onChange={(e) => handleSettingChange(index, e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
                                            />
                                        ) : (
                                            <input
                                                type={setting.type === 'number' ? 'number' : 'text'}
                                                value={setting.value}
                                                onChange={(e) => handleSettingChange(index, e.target.value)}
                                                className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => handleSaveSetting(setting)}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                            title="Save specific setting"
                                        >
                                            <Save size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(setting.key)}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                            title="Delete setting"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Admin Profile Details */}
            <div className="bg-card border rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Super Admin Profile</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-transparent">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Admin Name</p>
                            <p className="font-medium">{user?.name || 'Administrator'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-transparent">
                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xl">
                            <Mail size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Contact Email</p>
                            <p className="font-medium">{user?.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Setting Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
                        <div className="p-6 border-b">
                            <h3 className="text-lg font-bold">Add Platform Setting</h3>
                            <p className="text-sm text-muted-foreground mt-1">Create a new key-value string in the database.</p>
                        </div>
                        <form onSubmit={handleCreateSetting} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Key Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. PLATFORM_FEE_PERCENTAGE"
                                    value={newSetting.key}
                                    onChange={e => setNewSetting({ ...newSetting, key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                    className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 font-mono text-sm text-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Data Type</label>
                                <select
                                    className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                    value={newSetting.type}
                                    onChange={e => setNewSetting({ ...newSetting, type: e.target.value })}
                                >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="json">JSON</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Value</label>
                                {newSetting.type === 'boolean' ? (
                                    <select
                                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                        value={newSetting.value}
                                        onChange={e => setNewSetting({ ...newSetting, value: e.target.value })}
                                    >
                                        <option value="true">True</option>
                                        <option value="false">False</option>
                                    </select>
                                ) : (
                                    <input
                                        type={newSetting.type === 'number' ? 'number' : 'text'}
                                        required
                                        value={newSetting.value}
                                        onChange={e => setNewSetting({ ...newSetting, value: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={newSetting.description}
                                    onChange={e => setNewSetting({ ...newSetting, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="flex-1 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors"
                                >
                                    Create Setting
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
