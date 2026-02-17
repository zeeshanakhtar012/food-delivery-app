import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, ChefHat, ArrowRight, Loader2 } from 'lucide-react';
import ErrorDialog from '../components/ErrorDialog';

const Login = () => {
    const [role, setRole] = useState('restaurant_admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname ||
        (role === 'super_admin' ? '/super-admin' : '/restaurant-admin');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsErrorDialogOpen(false);
        setLoading(true);

        try {
            await login(role, { email, password });
            navigate(from, { replace: true });
        } catch (err) {
            console.error("Login caught error:", err);
            const errorMessage = err.response?.data?.message ||
                err.response?.data?.error?.message ||
                'Login failed. Please verify your credentials.';
            setError(errorMessage);
            setIsErrorDialogOpen(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-background">
            <ErrorDialog
                isOpen={isErrorDialogOpen}
                onClose={() => setIsErrorDialogOpen(false)}
                title="Login Failed"
                message={error}
            />
            {/* Left Side - Hero/Branding */}
            <div className="hidden lg:flex w-1/2 bg-zinc-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black z-0" />
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2874&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />

                <div className="relative z-10 p-12 text-white max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <ChefHat size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">NoteNest</h1>
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight mb-4 leading-tight">
                        Manage your restaurant with <span className="text-orange-500">confidence</span>.
                    </h2>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        The all-in-one platform for seamless food delivery operations, real-time analytics, and superior customer experiences.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
                        <p className="mt-2 text-muted-foreground">
                            Please sign in to your admin dashboard.
                        </p>
                    </div>

                    <div className="bg-muted/30 p-1.5 rounded-lg flex relative">
                        <div
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-background shadow-sm rounded-md transition-all duration-300 ease-in-out ${role === 'super_admin' ? 'translate-x-[100%] ml-1.5' : 'translate-x-0'}`}
                        />
                        <button
                            onClick={() => setRole('restaurant_admin')}
                            className={`flex-1 relative z-10 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${role === 'restaurant_admin' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Restaurant Admin
                        </button>
                        <button
                            onClick={() => setRole('super_admin')}
                            className={`flex-1 relative z-10 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${role === 'super_admin' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Super Admin
                        </button>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Email address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-muted-foreground/50 sm:text-sm"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-muted-foreground/50 sm:text-sm"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Inline error removed in favor of dialog, or kept as backup if needed? 
                            User said "make sure that it shows the errors dialogs", so I'll remove the inline error to avoid duplication 
                            or I can keep it consistent with the request which implies they want dialogs specifically.
                            I will remove the inline error block to be cleaner as requested. 
                         */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
                            Contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
