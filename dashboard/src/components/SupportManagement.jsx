const { useState, useEffect, useContext } = React;
import AuthContext from '../context/AuthContext.jsx';

function SupportManagement() {
  const { token } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize Socket.IO
    const newSocket = io('http://localhost:5001', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('supportMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('error', (err) => {
      setError(err.message);
    });

    setSocket(newSocket);

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/support/messages', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data.messages);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => newSocket.disconnect();
  }, [token]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('supportMessage', { content: newMessage });
    setNewMessage('');
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Support Management</h2>
      <div className="bg-white p-6 rounded-lg shadow mb-6 h-96 overflow-y-auto">
        {messages.map(msg => (
          <div
            key={msg._id}
            className={`mb-4 p-4 rounded-lg ${msg.senderType === 'admin' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'}`}
          >
            <p className="font-semibold">{msg.senderType === 'admin' ? 'Admin' : `User ${msg.userId}`}</p>
            <p>{msg.content}</p>
            <p className="text-sm text-gray-500">{new Date(msg.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="bg-white p-6 rounded-lg shadow">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full p-2 border rounded mb-4"
          rows="3"
        ></textarea>
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default SupportManagement;