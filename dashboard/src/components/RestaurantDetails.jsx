import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function RestaurantDetails() {
  const { api, user } = useContext(AuthContext);
  const [restaurant, setRestaurant] = useState(user?.restaurant || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/api/restaurant-owner/details');
        setRestaurant(data.restaurant);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [api]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Restaurant Details</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid md:grid-cols-2 gap-6">
          <div><span className="font-semibold">Name:</span> {restaurant.name}</div>
          <div><span className="font-semibold">Email:</span> {restaurant.email}</div>
          <div><span className="font-semibold">Phone:</span> {restaurant.phone}</div>
          <div>
            <span className="font-semibold">Address:</span>{' '}
            {restaurant.address.street}, {restaurant.address.city}, {restaurant.address.state}{' '}
            {restaurant.address.postalCode}
          </div>
          <div className="md:col-span-2">
            <span className="font-semibold">Description:</span> {restaurant.description}
          </div>
          {restaurant.logo && (
            <div className="md:col-span-2">
              <span className="font-semibold">Logo:</span>
              <img src={restaurant.logo} alt="logo" className="h-24 mt-2 rounded" />
            </div>
          )}
          {restaurant.images?.length > 0 && (
            <div className="md:col-span-2">
              <span className="font-semibold">Gallery:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {restaurant.images.map((img, i) => (
                  <img key={i} src={img} alt={`gallery-${i}`} className="h-20 rounded" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}