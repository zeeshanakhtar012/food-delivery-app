import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';

const MenuGrid = ({
    categories,
    foods,
    selectedCategory,
    onSelectCategory,
    onAddToCart
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    // 1. Filter by category
    const byCategory = selectedCategory === 'all'
        ? foods
        : foods.filter(food => food.category_id === selectedCategory);

    // 2. Filter by search query (name or description)
    const filteredFoods = searchQuery.trim() === ''
        ? byCategory
        : byCategory.filter(food =>
            food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (food.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

    // If searching across all categories, also search globally (ignore category filter)
    const globalSearch = searchQuery.trim() !== '' && selectedCategory !== 'all'
        ? foods.filter(food =>
            food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (food.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : null;

    // Use globalSearch when there's a query (better UX — search all items regardless of selected category)
    const displayFoods = searchQuery.trim() !== ''
        ? foods.filter(food =>
            food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (food.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : byCategory;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Search & Categories */}
            <div className="p-4 bg-white shadow-sm z-10">
                {/* Search Input */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search menu items..."
                        className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Category Pills */}
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
                {/* Search result count */}
                {searchQuery.trim() !== '' && (
                    <p className="text-xs text-gray-500 mb-3">
                        {displayFoods.length} result{displayFoods.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                    </p>
                )}

                {displayFoods.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                        <Search className="w-10 h-10 opacity-30" />
                        <p className="text-sm">
                            {searchQuery.trim()
                                ? `No items found for "${searchQuery}"`
                                : 'No items found in this category'}
                        </p>
                        {searchQuery.trim() && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-indigo-500 text-sm hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {displayFoods.map(food => (
                            <div
                                key={food.id}
                                onClick={() => food.is_available && onAddToCart(food)}
                                className={clsx(
                                    "bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-transparent hover:border-indigo-500",
                                    (!food.is_available || (!food.is_unlimited && food.stock_quantity <= 0))
                                    && "opacity-60 cursor-not-allowed"
                                )}
                            >
                                <div className="h-32 bg-gray-200 relative">
                                    {food.image_url ? (
                                        <img src={food.image_url} alt={food.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                                    )}
                                    {!food.is_unlimited && food.stock_quantity <= 0 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">
                                            Out of Stock
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-gray-800 truncate">{food.name}</h3>
                                    {searchQuery.trim() && food.description && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{food.description}</p>
                                    )}
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
