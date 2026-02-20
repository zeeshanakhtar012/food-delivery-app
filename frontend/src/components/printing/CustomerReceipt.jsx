import React from 'react';
import moment from 'moment';

export const CustomerReceipt = React.forwardRef(({ order, restaurant, tableNumber }, ref) => {
    if (!order || !restaurant) return null;

    const calculateSubtotal = () => {
        // If order.total_amount is available, use it. Otherwise calculate based on items.
        // Assuming backend returns total_amount including taxes tailored.
        return parseFloat(order.total_amount);
    };

    return (
        <div ref={ref} className="p-4 w-[80mm] font-serif text-black bg-white">
            {/* Thermal printer CSS — included in react-to-print iframe */}
            <style>{`
                @page { size: 80mm auto; margin: 0mm; }
                html, body { margin: 0; padding: 0; width: 80mm; }
            `}</style>
            {/* Header */}
            <div className="text-center mb-4">
                {restaurant.logo_url && (
                    <img src={restaurant.logo_url} alt="Logo" className="h-12 mx-auto mb-2 grayscale" />
                )}
                <h1 className="text-xl font-bold uppercase">{restaurant.name}</h1>
                <p className="text-xs">{restaurant.address}</p>
                <p className="text-xs">{restaurant.phone}</p>
            </div>

            <div className="text-xs border-b border-black pb-2 mb-2 flex justify-between">
                <div className="text-left">
                    <p>Order: #{order.id.slice(0, 8)}</p>
                    <p>Date: {moment(order.created_at).format('DD/MM/YY HH:mm')}</p>
                </div>
                <div className="text-right">
                    <p>{order.order_type === 'dine_in' ? `Table: ${tableNumber}` : 'Takeaway'}</p>
                    <p>Server: Admin</p>
                </div>
            </div>

            {/* Items */}
            <table className="w-full text-sm mb-4">
                <thead>
                    <tr className="border-b border-black text-left">
                        <th className="pb-1 w-8">Qty</th>
                        <th className="pb-1">Item</th>
                        <th className="pb-1 text-right">Amt</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => (
                        <React.Fragment key={`${item.food_id}-${index}`}>
                            <tr>
                                <td className="align-top pt-1">{item.quantity}</td>
                                <td className="align-top pt-1">
                                    {item.food_name || item.name}
                                    {item.addons && item.addons.length > 0 && (
                                        <div className="text-xs text-gray-600 pl-1">
                                            {item.addons.map(a => (
                                                <div key={a.name}>+ {a.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="align-top pt-1 text-right">
                                    ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                                </td>
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-black pt-2 space-y-1 text-right text-sm">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                {/* Tax logic can be added here */}
                <div className="flex justify-between font-bold text-lg border-t border-dashed border-black pt-1 mt-1">
                    <span>TOTAL:</span>
                    <span>${parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs">
                <p className="font-bold">THANK YOU FOR VISITING!</p>
                <p className="mt-1">Please come again.</p>
                {restaurant.website && <p className="mt-1">{restaurant.website}</p>}
            </div>
        </div>
    );
});

CustomerReceipt.displayName = 'CustomerReceipt';

export default CustomerReceipt;
