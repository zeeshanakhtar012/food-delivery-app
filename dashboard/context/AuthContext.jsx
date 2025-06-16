const { createContext, useState, useEffect } = React;
const { useNavigate } = ReactRouterDOM;

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.get('http://localhost:5001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setUser(res.data.user))
        .catch(() => {
          setToken(null);
          localStorage.removeItem('token');
          navigate('/login');
        });
    }
  }, [token, navigate]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5001/api/users/login', { email, password });
      if (res.data.user.isAdmin) {
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
        navigate('/');
      } else {
        throw new Error('Access denied: Admin only');
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
export default AuthContext;