import React, { useState, useEffect, useRef, useCallback } from 'react';
import { restaurantAdmin } from '../../services/api';
import MenuGrid from '../../components/pos/MenuGrid';
import Cart from '../../components/pos/Cart';
import KitchenReceipt from '../../components/printing/KitchenReceipt';
import CustomerReceipt from '../../components/printing/CustomerReceipt';
import { useReactToPrint } from 'react-to-print';
import {
    Monitor, Utensils, ShoppingBag, Printer, CheckCircle,
    ChefHat, Receipt, X, RefreshCw, Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────── */
/*  Shared thermal-printer page style (80mm roll paper)               */
/* ─────────────────────────────────────────────────────────────────── */
const THERMAL_PAGE_STYLE = `
    @page {
        size: 80mm auto;
        margin: 0mm;
    }
    html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 80mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
`;

/* ─────────────────────────────────────────────────────────────────── */
/*  Order Complete Modal                                               */
/* ─────────────────────────────────────────────────────────────────── */
const OrderCompleteModal = ({
    order,
    restaurant,
    tableNumber,
    onCompleteOrder,
    onClose,
    completing,
    autoPrintKitchen,
    onToggleAutoPrint,
}) => {
    const [activeTab, setActiveTab] = useState('customer');
    const [printingCustomer, setPrintingCustomer] = useState(false);
    const [printingKitchen, setPrintingKitchen] = useState(false);

    // Both refs always mounted via hidden divs → refs always ready
    const customerPrintRef = useRef(null);
    const kitchenPrintRef = useRef(null);

    // ── react-to-print v3 API: contentRef (not content callback) ──
    const handlePrintCustomer = useReactToPrint({
        contentRef: customerPrintRef,
        pageStyle: THERMAL_PAGE_STYLE,
        onBeforePrint: () => { setPrintingCustomer(true); return Promise.resolve(); },
        onAfterPrint: () => {
            setPrintingCustomer(false);
            toast.success('Customer receipt sent to printer');
        },
    });

    const handlePrintKitchen = useReactToPrint({
        contentRef: kitchenPrintRef,
        pageStyle: THERMAL_PAGE_STYLE,
        onBeforePrint: () => { setPrintingKitchen(true); return Promise.resolve(); },
        onAfterPrint: () => {
            setPrintingKitchen(false);
            toast.success('Kitchen ticket sent to printer');
        },
    });

    // Auto-print kitchen ticket immediately on modal open
    useEffect(() => {
        if (autoPrintKitchen && order) {
            // Small delay so the ref is definitely attached
            const timer = setTimeout(() => {
                handlePrintKitchen();
            }, 400);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once on mount

    if (!order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh]">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Order Placed!</h3>
                            <p className="text-xs text-gray-500">
                                #{order.id ? order.id.slice(0, 8) : 'N/A'} —{' '}
                                {order.order_type === 'dine_in' ? `Table ${tableNumber}` : 'Takeaway'}
                            </p>
                        </div>
                    </div>

                    {/* Auto-print toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleAutoPrint}
                            title={autoPrintKitchen ? 'Auto-print ON' : 'Auto-print OFF'}
                            className={clsx(
                                'flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors',
                                autoPrintKitchen
                                    ? 'bg-amber-100 border-amber-400 text-amber-700'
                                    : 'bg-gray-100 border-gray-300 text-gray-500'
                            )}
                        >
                            <Zap className="w-3 h-3" />
                            Auto-print {autoPrintKitchen ? 'ON' : 'OFF'}
                        </button>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* ── Tab Switcher ── */}
                <div className="flex border-b bg-gray-50">
                    {[
                        { key: 'customer', icon: Receipt, label: 'Customer Receipt' },
                        { key: 'kitchen', icon: ChefHat, label: 'Kitchen Ticket' },
                    ].map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={clsx(
                                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                                activeTab === key
                                    ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    ))}
                </div>

                {/* ── Receipt Preview (scrollable, shows active tab) ── */}
                <div className="flex-1 overflow-y-auto bg-gray-100 flex justify-center p-4">
                    <div className="shadow-lg">
                        {/* Always render BOTH, only show active → both refs always valid */}
                        <div className={activeTab === 'customer' ? 'block' : 'hidden'}>
                            <CustomerReceipt
                                ref={customerPrintRef}
                                order={order}
                                restaurant={restaurant}
                                tableNumber={tableNumber}
                            />
                        </div>
                        <div className={activeTab === 'kitchen' ? 'block' : 'hidden'}>
                            <KitchenReceipt
                                ref={kitchenPrintRef}
                                order={order}
                                tableNumber={tableNumber}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Action Buttons ── */}
                <div className="px-6 py-4 border-t space-y-2 bg-white">

                    {/* Print buttons side by side */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handlePrintCustomer}
                            disabled={printingCustomer}
                            className="flex items-center justify-center gap-2 py-3 border-2 border-indigo-500 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 disabled:opacity-60 transition-colors text-sm"
                        >
                            {printingCustomer
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Printing...</>
                                : <><Printer className="w-4 h-4" /> Customer</>
                            }
                        </button>
                        <button
                            onClick={handlePrintKitchen}
                            disabled={printingKitchen}
                            className="flex items-center justify-center gap-2 py-3 border-2 border-orange-400 text-orange-600 rounded-xl font-semibold hover:bg-orange-50 disabled:opacity-60 transition-colors text-sm"
                        >
                            {printingKitchen
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Printing...</>
                                : <><ChefHat className="w-4 h-4" /> Kitchen</>
                            }
                        </button>
                    </div>

                    {/* Complete Order */}
                    <button
                        onClick={onCompleteOrder}
                        disabled={completing}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {completing
                            ? <><RefreshCw className="w-5 h-5 animate-spin" /> Completing...</>
                            : <><CheckCircle className="w-5 h-5" /> Complete Order</>
                        }
                    </button>

                    {/* Skip */}
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Skip &amp; Start New Order
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────── */
/*  POS Page                                                           */
/* ─────────────────────────────────────────────────────────────────── */
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
    const [orderType, setOrderType] = useState('dine_in');
    const [selectedTable, setSelectedTable] = useState(null);
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });

    // Order modal state
    const [lastOrder, setLastOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [completing, setCompleting] = useState(false);

    // Auto-print setting (persisted to localStorage)
    const [autoPrintKitchen, setAutoPrintKitchen] = useState(() => {
        try {
            const saved = localStorage.getItem('pos_auto_print_kitchen');
            return saved === null ? true : saved === 'true'; // default ON
        } catch { return true; }
    });

    const handleToggleAutoPrint = useCallback(() => {
        setAutoPrintKitchen(prev => {
            const next = !prev;
            localStorage.setItem('pos_auto_print_kitchen', String(next));
            toast(next ? '⚡ Auto-print Kitchen Ticket: ON' : '🔕 Auto-print Kitchen Ticket: OFF', { duration: 2000 });
            return next;
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [catsRes, foodsRes, tablesRes, restRes] = await Promise.all([
                restaurantAdmin.getCategories(),
                restaurantAdmin.getAllFoods(),
                restaurantAdmin.getAllTables(),
                restaurantAdmin.getRestaurant(),
            ]);
            setCategories(catsRes.data.data || []);
            setFoods(foodsRes.data.data || []);
            setTables(tablesRes.data.data || []);
            setRestaurant(restRes.data.data || restRes.data);
        } catch (err) {
            console.error('Error fetching POS data:', err);
            const msg = err.response?.data?.error?.message || err.message || 'Failed to load menu data';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () =>
        cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

    const handleUpdateQuantity = (index, newQuantity) =>
        setCartItems(prev => prev.map((item, i) => (i === index ? { ...item, quantity: newQuantity } : item)));

    const handleRemoveItem = (index) =>
        setCartItems(prev => prev.filter((_, i) => i !== index));

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
                    addons: item.addons,
                })),
                order_type: orderType,
                table_id: orderType === 'dine_in' ? selectedTable : null,
                customer_name: customerInfo.name,
                customer_phone: customerInfo.phone,
            };

            const res = await restaurantAdmin.createOrder(orderData);
            const createdOrder = res.data?.data || res.data;

            const printableOrder = {
                ...createdOrder,
                items: cartItems.map(item => ({ ...item, food_name: item.name })),
                customer_name: customerInfo.name,
                order_type: orderType,
                total_amount: createdOrder.total_amount ?? calculateTotal(),
                created_at: createdOrder.created_at ?? new Date().toISOString(),
            };

            setLastOrder(printableOrder);
            setShowModal(true);
            toast.success('Order placed successfully!');

            // Reset cart
            setCartItems([]);
            setSelectedTable(null);
            setCustomerInfo({ name: '', phone: '' });
        } catch (err) {
            console.error('Order error:', err);
            const errorMsg = err.response?.data?.error?.message || 'Failed to place order';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteOrder = async () => {
        if (!lastOrder?.id) return;
        try {
            setCompleting(true);
            await restaurantAdmin.updateOrderStatus(lastOrder.id, 'completed');
            toast.success('Order marked as completed!');
            setShowModal(false);
            setLastOrder(null);
            fetchData();
        } catch (err) {
            console.error('Complete order error:', err);
            const msg = err.response?.data?.error?.message || 'Failed to complete order';
            toast.error(msg);
        } finally {
            setCompleting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setLastOrder(null);
        fetchData();
    };

    if (loading && !restaurant) return <div className="p-8 text-center text-gray-500">Loading POS...</div>;
    if (error) return (
        <div className="p-8 text-center">
            <h2 className="text-xl text-red-600 mb-4">Error loading POS</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
        </div>
    );

    const tableNumber = tables.find(t => t.id === lastOrder?.table_id)?.table_number;

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100 relative">

            {/* ── Order Complete Modal ── */}
            {showModal && lastOrder && (
                <OrderCompleteModal
                    order={lastOrder}
                    restaurant={restaurant}
                    tableNumber={tableNumber}
                    onCompleteOrder={handleCompleteOrder}
                    onClose={handleCloseModal}
                    completing={completing}
                    autoPrintKitchen={autoPrintKitchen}
                    onToggleAutoPrint={handleToggleAutoPrint}
                />
            )}

            {/* ── Main Content (Menu) ── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* Top Bar */}
                <div className="min-h-16 py-2 bg-white border-b flex flex-wrap items-center justify-between px-4 lg:px-6 shadow-sm z-20 gap-4">
                    <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
                        <Monitor className="text-indigo-600 shrink-0" />
                        <span className="truncate">POS Terminal</span>
                        {restaurant && (
                            <span className="text-xs font-normal text-gray-500 hidden sm:inline">| {restaurant.name}</span>
                        )}
                    </h1>

                    {/* Order Type Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                        <button
                            onClick={() => setOrderType('dine_in')}
                            className={clsx(
                                'px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all',
                                orderType === 'dine_in'
                                    ? 'bg-white shadow-sm text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <Utensils className="w-4 h-4" /> Dine In
                        </button>
                        <button
                            onClick={() => setOrderType('takeaway')}
                            className={clsx(
                                'px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all',
                                orderType === 'takeaway'
                                    ? 'bg-white shadow-sm text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <ShoppingBag className="w-4 h-4" /> Takeaway
                        </button>
                    </div>

                    {/* Table Selector (Dine In) */}
                    {orderType === 'dine_in' && (
                        <div className="min-w-[200px]">
                            <select
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedTable || ''}
                                onChange={e => setSelectedTable(e.target.value)}
                            >
                                <option value="">Select Table</option>
                                {tables.map(table => (
                                    <option
                                        key={table.id}
                                        value={table.id}
                                        disabled={table.status === 'occupied'}
                                    >
                                        Table {table.table_number} ({table.capacity}p) — {table.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Customer Info (Takeaway) */}
                    {orderType === 'takeaway' && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Customer Name"
                                className="p-2 border rounded-lg text-sm w-36"
                                value={customerInfo.name}
                                onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Phone"
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
