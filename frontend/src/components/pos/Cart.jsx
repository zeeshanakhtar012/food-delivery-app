import React from 'react';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

const Cart = ({
    cartItems,
    onUpdateQuantity,
    onRemoveItem,
    onPlaceOrder,
    totalAmount,
    loading
}) => {
    return (
        <div className="flex flex-col h-full bg-white border-l shadow-xl w-full lg:w-96 shrink-0 z-10">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-gray-800">Current Order</h2>
                </div>
                <p className="text-sm text-gray-500">{cartItems.length} Items</p>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                        <p>Cart is empty</p>
                    </div>
                ) : (
                    cartItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex justify-between items-start border-b pb-4 last:border-0">
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                {/* Addons display would go here */}
                                {item.addons && item.addons.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        + {item.addons.map(a => a.name).join(', ')}
                                    </p>
                                )}
                                <p className="text-indigo-600 font-medium">${parseFloat(item.price).toFixed(2)}</p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center bg-gray-100 rounded-lg">
                                    <button
                                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                                        className="p-1 hover:bg-gray-200 rounded-l-lg transition-colors"
                                        disabled={item.quantity <= 1}
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                                        className="p-1 hover:bg-gray-200 rounded-r-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(index)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-600">Tax (0%)</span>
                    <span className="font-medium">$0.00</span>
                </div>
                <div className="flex justify-between items-center mb-6 text-xl font-bold text-indigo-900 border-t pt-2">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                </div>

                <button
                    onClick={onPlaceOrder}
                    disabled={cartItems.length === 0 || loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                    {loading ? 'Processing...' : 'Place Order'}
                </button>
            </div>
        </div>
    );
};

export default Cart;
