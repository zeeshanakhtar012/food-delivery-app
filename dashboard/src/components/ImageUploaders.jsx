// src/components/ImageUploaders.jsx
import { useContext, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function RestaurantImages() {
  const { api } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');

  const upload = async () => {
    if (!files.length) return;
    const data = new FormData();
    for (const f of files) data.append('restaurantImages', f);

    try {
      const res = await api.post('/api/restaurant-owner/images', data);
      setMsg(`${res.data.images.length} image(s) uploaded`);
      setFiles([]);
    } catch {
      setMsg('Upload failed');
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Restaurant Images</h3>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files))}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <button
        onClick={upload}
        disabled={!files.length}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Upload
      </button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}