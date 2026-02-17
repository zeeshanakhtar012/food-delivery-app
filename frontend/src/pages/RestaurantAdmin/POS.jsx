import React, { useState, useEffect, useRef } from 'react';
import { restaurantAdmin } from '../../services/api';
import MenuGrid from '../../components/pos/MenuGrid';
import Cart from '../../components/pos/Cart';
import KitchenReceipt from '../../components/printing/KitchenReceipt';
import CustomerReceipt from '../../components/printing/CustomerReceipt';
import { useReactToPrint } from 'react-to-print';
import { Monitor, Utensils, ShoppingBag, Printer, X, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

const POS = () => {
    const [categories, setCategories] = useState([]);
    const [foods, setFoods] = useState([]);
    const [tables, setTables] = useState([]);
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // POS State
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cartItems, setCartItems] = useState([]);
    const [orderType, setOrderType] = useState('dine_in'); // dine_in, takeaway
    const [selectedTable, setSelectedTable] = useState(null);
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });

    // Order Success Modal State
    const [lastOrder, setLastOrder] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Print Refs
    const kitchenPrintRef = useRef();
    const customerPrintRef = useRef();

    const handlePrintKitchen = useReactToPrint({
        content: () => kitchenPrintRef.current,
    });

    const handlePrintCustomer = useReactToPrint({
        content: () => customerPrintRef.current,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            // 2. Fetch all data
            const [catsRes, foodsRes, tablesRes, restRes] = await Promise.all([
                restaurantAdmin.getCategories(),
                restaurantAdmin.getAllFoods(),
                restaurantAdmin.getAllTables(),
                restaurantAdmin.getRestaurant() // [UPDATED] Use dedicated admin endpoint
            ]);

            // [FIX] Access res.data.data because successResponse wraps it
            setCategories(catsRes.data.data || []);
            setFoods(foodsRes.data.data || []);
            setTables(tablesRes.data.data || []);
            setRestaurant(restRes.data.data || restRes.data); // getRestaurant might return object directly or wrapped

        } catch (error) {
            console.error('Error fetching POS data:', error);
            const msg = error.response?.data?.error?.message || error.message || 'Failed to load menu data';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };


    const calculateTotal = () => {
        return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleAddToCart = (food) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === food.id);
            if (existing) {
                return prev.map(item =>
                    item.id === food.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...food, quantity: 1, addons: [] }];
        });
    };

    const handleUpdateQuantity = (index, newQuantity) => {
        setCartItems(prev => prev.map((item, i) =>
            i === index ? { ...item, quantity: newQuantity } : item
        ));
    };

    const handleRemoveItem = (index) => {
        setCartItems(prev => prev.filter((_, i) => i !== index));
    };

    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) return;
        if (orderType === 'dine_in' && !selectedTable) {
            toast.error('Please select a table for Dine-in orders');
            return;
        }

        try {
            setLoading(true);
            const orderData = {
                items: cartItems.map(item => ({
                    food_id: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    addons: item.addons // Future proofing
                })),
                order_type: orderType,
                table_id: orderType === 'dine_in' ? selectedTable : null,
                customer_name: customerInfo.name,
                customer_phone: customerInfo.phone,
                // Calculate guest count based on table capacity or default to 1 for now if not tracked
            };

            const res = await restaurantAdmin.createOrder(orderData);
            const createdOrder = res.data;

            // Inject full item details into order object for printing (since backend might return just IDs)
            // Actually backend createOrder returns the Order object, but usually items are separate or simple.
            // Let's manually construct a "Printable Order" merging frontend items + backend order ID
            const printableOrder = {
                ...createdOrder,
                items: cartItems, // Use cart items which have names/prices
                customer_name: customerInfo.name,
                order_type: orderType
            };

            setLastOrder(printableOrder);
            setShowSuccessModal(true);
            toast.success('Order placed successfully!');

            // Reset Form
            setCartItems([]);
            setSelectedTable(null);
            setCustomerInfo({ name: '', phone: '' });
            // Don't refetch everything, just tables maybe?
            // fetchData(); // Optimization: just update table status locally if needed

        } catch (error) {
            console.error('Order error:', error);
            toast.error('Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        setLastOrder(null);
        fetchData(); // Refresh tables status after closing
    };

    if (loading && !restaurant) return <div className="p-8 text-center">Loading POS...</div>;
    if (error) return (
        <div className="p-8 text-center">
            <h2 className="text-xl text-red-600 mb-4">Error loading POS</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 relative">
            {/* Hidden Print Components */}
            <div style={{ display: 'none' }}>
                <KitchenReceipt
                    ref={kitchenPrintRef}
                    order={lastOrder}
                    tableNumber={tables.find(t => t.id === lastOrder?.table_id)?.table_number}
                />
                <CustomerReceipt
                    ref={customerPrintRef}
                    order={lastOrder}
                    restaurant={restaurant}
                    tableNumber={tables.find(t => t.id === lastOrder?.table_id)?.table_number}
                />
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center transform transition-all scale-100">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h3>
                        <p className="text-gray-500 mb-8">Order #{lastOrder?.id.slice(0, 8)} has been sent to kitchen.</p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button
                                onClick={handlePrintKitchen}
                                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all font-semibold text-gray-700"
                            >
                                <Printer className="w-8 h-8 mb-2 text-indigo-600" />
                                Kitchen Ticket
                            </button>
                            <button
                                onClick={handlePrintCustomer}
                                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all font-semibold text-gray-700"
                            >
                                <Printer className="w-8 h-8 mb-2 text-indigo-600" />
                                Customer Receipt
                            </button>
                        </div>

                        <button
                            onClick={handleCloseModal}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                        >
                            New Order
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content (Menu) */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Bar for Mode Selection */}
                <div className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-20">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Monitor className="text-indigo-600" />
                        POS Terminal
                        {restaurant && <span className="text-sm font-normal text-gray-500"> | {restaurant.name}</span>}
                    </h1>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setOrderType('dine_in')}
                            className={clsx(
                                "px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all",
                                orderType === 'dine_in' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Utensils className="w-4 h-4" /> Dine In
                        </button>
                        <button
                            onClick={() => setOrderType('takeaway')}
                            className={clsx(
                                "px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all",
                                orderType === 'takeaway' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <ShoppingBag className="w-4 h-4" /> Takeaway
                        </button>
                    </div>

                    {/* Table Selector (If Dine In) */}
                    {orderType === 'dine_in' && (
                        <div className="min-w-[200px]">
                            <select
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedTable || ''}
                                onChange={(e) => setSelectedTable(e.target.value)}
                            >
                                <option value="">Select Table</option>
                                {tables.map(table => (
                                    <option
                                        key={table.id}
                                        value={table.id}
                                        disabled={table.status === 'occupied'}
                                    >
                                        Table {table.table_number} ({table.capacity}p) - {table.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Customer Info (If Takeaway) */}
                    {orderType === 'takeaway' && (
                        <div className="flex gap-2">
                            <input
                                type="text" placeholder="Customer Name"
                                className="p-2 border rounded-lg text-sm w-32"
                                value={customerInfo.name}
                                onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                            />
                            <input
                                type="text" placeholder="Phone"
                                className="p-2 border rounded-lg text-sm w-32"
                                value={customerInfo.phone}
                                onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {/* Menu Grid */}
                <div className="flex-1 overflow-hidden relative">
                    <MenuGrid
                        categories={categories}
                        foods={foods}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        onAddToCart={handleAddToCart}
                    />
                </div>
            </div>

            {/* Right Sidebar (Cart) */}
            <Cart
                cartItems={cartItems}
                totalAmount={calculateTotal()}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onPlaceOrder={handlePlaceOrder}
                loading={loading}
            />
        </div>
    );
};

export default POS;
