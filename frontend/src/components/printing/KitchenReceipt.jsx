import React from 'react';
import moment from 'moment';

export const KitchenReceipt = React.forwardRef(({ order, tableNumber }, ref) => {
    if (!order) return null;

    return (
        <div ref={ref} className="p-4 w-[80mm] font-mono text-black print:block hidden">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-black pb-2 mb-2">
                <h2 className="text-2xl font-bold">KITCHEN TICKET</h2>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xl font-bold">Table: {tableNumber || 'Takeaway'}</span>
                    <span className="text-sm">#{order.id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-left mt-1">
                    {moment(order.created_at).format('DD/MM/YYYY HH:mm')}
                </p>
                {order.order_type === 'takeaway' && order.customer_name && (
                    <p className="text-sm font-bold text-left mt-1">
                        Guest: {order.customer_name}
                    </p>
                )}
            </div>

            {/* Items */}
            <div className="space-y-4">
                {order.items.map((item, index) => (
                    <div key={`${item.food_id}-${index}`} className="flex flex-col">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-lg">{item.quantity} x {item.food_name || item.name}</span>
                        </div>

                        {/* Addons / Modifiers */}
                        {item.addons && item.addons.length > 0 && (
                            <ul className="pl-4 mt-1 text-sm list-disc">
                                {item.addons.map((addon, i) => (
                                    <li key={i} className="font-bold uppercase">* {addon.name}</li>
                                ))}
                            </ul>
                        )}

                        {/* Item Note */}
                        {item.note && (
                            <p className="pl-4 text-sm italic">Note: {item.note}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Notes */}
            {order.delivery_instructions && (
                <div className="mt-4 border-t-2 border-dashed border-black pt-2">
                    <p className="font-bold uppercase">ORDER NOTE:</p>
                    <p className="text-lg">{order.delivery_instructions}</p>
                </div>
            )}

            <div className="mt-8 text-center text-xs">
                <p>*** END OF TICKET ***</p>
            </div>
        </div>
    );
});

KitchenReceipt.displayName = 'KitchenReceipt';

export default KitchenReceipt;
