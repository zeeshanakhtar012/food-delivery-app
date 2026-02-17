import React from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';

const MenuGrid = ({
    categories,
    foods,
    selectedCategory,
    onSelectCategory,
    onAddToCart
}) => {
    // Filter foods based on category
    const filteredFoods = selectedCategory === 'all'
        ? foods
        : foods.filter(food => food.category_id === selectedCategory);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Search & Categories */}
            <div className="p-4 bg-white shadow-sm z-10">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => onSelectCategory('all')}
                        className={clsx(
                            "px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors",
                            selectedCategory === 'all'
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        All Items
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={clsx(
                                "px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors",
                                selectedCategory === cat.id
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            )}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {filteredFoods.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        No items found in this category
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredFoods.map(food => (
                            <div
                                key={food.id}
                                onClick={() => onAddToCart(food)}
                                className={clsx(
                                    "bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-transparent hover:border-indigo-500",
                                    !food.is_available && "opacity-60 cursor-not-allowed"
                                )}
                            >
                                <div className="h-32 bg-gray-200 relative">
                                    {food.image_url ? (
                                        <img src={food.image_url} alt={food.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                    )}
                                    {food.stock_quantity <= 0 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                                            Out of Stock
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-gray-800 truncate">{food.name}</h3>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-indigo-600 font-bold">${parseFloat(food.price).toFixed(2)}</span>
                                        <span className="text-xs text-gray-500">{food.preparation_time}m</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuGrid;
