/**
 * generateSampleMenu.js
 * Generates NoteNest_FullMenu_10Categories.xlsx
 * Run: node scripts/generateSampleMenu.js
 */

const XLSX = require('../frontend/node_modules/xlsx');
const path = require('path');
const os = require('os');

const CAT_COLS = ['category_name', 'description', 'sort_order', 'is_active'];
const FOOD_COLS = ['category_name', 'item_name', 'description', 'price', 'preparation_time_mins', 'is_available', 'stock_quantity', 'is_unlimited'];
const COUPON_COLS = ['code', 'type', 'value', 'min_order_amount', 'max_discount_amount', 'usage_limit', 'valid_from', 'valid_until', 'is_active'];

/* ─── 10 Categories ─── */
const categories = [
    ['Appetizers', 'Starters, small bites and soups to begin your meal', 1, 'TRUE'],
    ['Soups & Salads', 'Fresh salads and warming soups', 2, 'TRUE'],
    ['Main Course', 'Hearty full-plate meals — grills, stews and curries', 3, 'TRUE'],
    ['Burgers & Wraps', 'Gourmet burgers, wraps and sandwiches', 4, 'TRUE'],
    ['Pizzas', 'Wood-fired and pan pizzas with premium toppings', 5, 'TRUE'],
    ['Pasta & Noodles', 'Italian pasta, Asian noodles and rice dishes', 6, 'TRUE'],
    ['Seafood', 'Fresh fish, prawns and grilled seafood specialties', 7, 'TRUE'],
    ['Rice & Biryani', 'Fragrant biryanis, pulao and fried rice dishes', 8, 'TRUE'],
    ['Desserts', 'Sweet treats, cakes, ice creams and warm puddings', 9, 'TRUE'],
    ['Beverages', 'Hot and cold drinks, juices, shakes and speciality coffees', 10, 'TRUE'],
];

/* ─── Foods per category ─── */
const foods = [

    // ── 1. APPETIZERS (6 items) ──
    ['Appetizers', 'Chicken Wings', 'Crispy fried wings tossed in buffalo sauce with ranch dip (6 pcs)', 10.99, 15, 'TRUE', 0, 'TRUE'],
    ['Appetizers', 'Garlic Bread', 'Toasted sourdough with herb butter and melted parmesan', 4.99, 8, 'TRUE', 0, 'TRUE'],
    ['Appetizers', 'Mozzarella Sticks', 'Golden fried mozzarella with marinara dipping sauce (6 pcs)', 7.99, 10, 'TRUE', 0, 'TRUE'],
    ['Appetizers', 'Spinach Artichoke Dip', 'Creamy warm dip served with toasted pita chips', 9.99, 12, 'TRUE', 0, 'TRUE'],
    ['Appetizers', 'Shrimp Cocktail', 'Chilled jumbo shrimp, zesty cocktail sauce and lemon wedges', 12.99, 12, 'TRUE', 30, 'FALSE'],
    ['Appetizers', 'Loaded Potato Skins', 'Crispy skins filled with cheddar, bacon bits and sour cream (4 pcs)', 8.99, 14, 'TRUE', 0, 'TRUE'],

    // ── 2. SOUPS & SALADS (5 items) ──
    ['Soups & Salads', 'Chicken Noodle Soup', 'Classic homemade chicken broth with egg noodles and vegetables', 5.99, 10, 'TRUE', 0, 'TRUE'],
    ['Soups & Salads', 'Tomato Basil Soup', 'Creamy roasted tomato soup with fresh basil and croutons', 5.49, 10, 'TRUE', 0, 'TRUE'],
    ['Soups & Salads', 'Caesar Salad', 'Romaine lettuce, parmesan, croutons and house Caesar dressing', 8.99, 8, 'TRUE', 0, 'TRUE'],
    ['Soups & Salads', 'Greek Salad', 'Tomatoes, cucumber, olives, red onion, feta and oregano dressing', 9.49, 8, 'TRUE', 0, 'TRUE'],
    ['Soups & Salads', 'Mushroom Cream Soup', 'Velvety wild mushroom soup with truffle oil and toasted bread', 6.99, 12, 'TRUE', 0, 'TRUE'],

    // ── 3. MAIN COURSE (7 items) ──
    ['Main Course', 'Grilled Chicken Breast', 'Herb-marinated chicken with roasted veggies and mashed potato', 15.99, 22, 'TRUE', 0, 'TRUE'],
    ['Main Course', 'Beef Tenderloin Steak', '8oz prime sirloin, garlic butter, grilled to your preference', 28.99, 28, 'TRUE', 0, 'TRUE'],
    ['Main Course', 'Lamb Chops', 'Herb-crusted lamb chops with mint jelly and roasted potatoes', 26.99, 30, 'TRUE', 15, 'FALSE'],
    ['Main Course', 'Chicken Tikka Masala', 'Tender chicken in rich tomato-cream curry with garlic naan', 16.99, 22, 'TRUE', 0, 'TRUE'],
    ['Main Course', 'Vegetable Stir Fry', 'Seasonal vegetables wok-tossed with soy-ginger glaze and steamed rice', 11.99, 15, 'TRUE', 0, 'TRUE'],
    ['Main Course', 'Beef Lasagna', 'Layered beef and ricotta lasagna baked with béchamel and mozzarella', 17.99, 25, 'TRUE', 0, 'TRUE'],
    ['Main Course', 'BBQ Ribs Half Rack', 'Slow-cooked pork ribs glazed with smoky BBQ sauce and coleslaw', 22.99, 35, 'TRUE', 20, 'FALSE'],

    // ── 4. BURGERS & WRAPS (6 items) ──
    ['Burgers & Wraps', 'Classic Cheeseburger', 'Angus beef, cheddar, lettuce, tomato, pickles and house sauce', 9.99, 12, 'TRUE', 0, 'TRUE'],
    ['Burgers & Wraps', 'BBQ Bacon Burger', 'Double patty, crispy bacon, cheddar, onion rings and BBQ sauce', 13.99, 15, 'TRUE', 0, 'TRUE'],
    ['Burgers & Wraps', 'Truffle Wagyu Burger', 'Premium wagyu beef, truffle mayo, caramelized onions and brie', 17.99, 18, 'TRUE', 25, 'FALSE'],
    ['Burgers & Wraps', 'Spicy Jalapeño Burger', 'Beef patty, jalapeños, pepper jack cheese and chipotle mayo', 11.99, 13, 'TRUE', 0, 'TRUE'],
    ['Burgers & Wraps', 'Crispy Chicken Wrap', 'Buttermilk fried chicken, coleslaw, pickles and sriracha in a soft tortilla', 10.99, 14, 'TRUE', 0, 'TRUE'],
    ['Burgers & Wraps', 'Veggie Black Bean Burger', 'House black bean patty, avocado, tomato and lime aioli', 10.99, 13, 'TRUE', 0, 'TRUE'],

    // ── 5. PIZZAS (5 items) ──
    ['Pizzas', 'Margherita Pizza', 'San Marzano tomato, fresh mozzarella, basil and extra virgin oil', 12.99, 18, 'TRUE', 0, 'TRUE'],
    ['Pizzas', 'Pepperoni Pizza', 'Classic tomato base, mozzarella and double pepperoni', 13.99, 18, 'TRUE', 0, 'TRUE'],
    ['Pizzas', 'BBQ Chicken Pizza', 'Smoky BBQ sauce, grilled chicken, red onion and coriander', 14.99, 20, 'TRUE', 0, 'TRUE'],
    ['Pizzas', 'Four Cheese Pizza', 'Mozzarella, gorgonzola, parmesan and ricotta on a garlic base', 15.99, 20, 'TRUE', 0, 'TRUE'],
    ['Pizzas', 'Veggie Supreme Pizza', 'Bell peppers, mushrooms, olives, corn, red onion and mozzarella', 13.49, 20, 'TRUE', 0, 'TRUE'],

    // ── 6. PASTA & NOODLES (5 items) ──
    ['Pasta & Noodles', 'Pasta Carbonara', 'Spaghetti, pancetta, egg yolk, parmesan and cracked black pepper', 14.99, 18, 'TRUE', 0, 'TRUE'],
    ['Pasta & Noodles', 'Penne Arrabbiata', 'Penne in a spicy San Marzano tomato and garlic sauce with basil', 12.99, 16, 'TRUE', 0, 'TRUE'],
    ['Pasta & Noodles', 'Beef Bolognese', 'Slow-cooked beef ragù on tagliatelle with aged parmesan', 15.99, 20, 'TRUE', 0, 'TRUE'],
    ['Pasta & Noodles', 'Pad Thai', 'Wok-fried rice noodles with prawns, egg, bean sprouts and peanuts', 14.49, 18, 'TRUE', 0, 'TRUE'],
    ['Pasta & Noodles', 'Chicken Chow Mein', 'Stir-fried egg noodles with chicken, vegetables and oyster sauce', 13.99, 16, 'TRUE', 0, 'TRUE'],

    // ── 7. SEAFOOD (5 items) ──
    ['Seafood', 'Grilled Salmon Fillet', 'Atlantic salmon, lemon-dill butter, asparagus and baby potatoes', 22.99, 22, 'TRUE', 20, 'FALSE'],
    ['Seafood', 'Pan-Fried Sea Bass', 'Crispy-skinned sea bass, capers, lemon butter and wilted spinach', 24.99, 22, 'TRUE', 15, 'FALSE'],
    ['Seafood', 'Garlic Butter Prawns', 'Jumbo prawns sautéed in garlic, butter and white wine with crusty bread', 18.99, 18, 'TRUE', 0, 'TRUE'],
    ['Seafood', 'Fish & Chips', 'Beer-battered cod fillet, thick-cut chips, mushy peas and tartare sauce', 14.99, 20, 'TRUE', 0, 'TRUE'],
    ['Seafood', 'Seafood Pasta', 'Spaghetti with prawns, mussels, squid in a spicy tomato bisque', 19.99, 25, 'TRUE', 0, 'TRUE'],

    // ── 8. RICE & BIRYANI (5 items) ──
    ['Rice & Biryani', 'Chicken Biryani', 'Aromatic basmati rice slow-cooked with spiced chicken and saffron', 15.99, 30, 'TRUE', 0, 'TRUE'],
    ['Rice & Biryani', 'Lamb Biryani', 'Tender lamb pieces slow-cooked with fragrant basmati and whole spices', 17.99, 35, 'TRUE', 0, 'TRUE'],
    ['Rice & Biryani', 'Prawn Biryani', 'Juicy prawns in spiced basmati with caramelized onions and mint raita', 18.99, 30, 'TRUE', 15, 'FALSE'],
    ['Rice & Biryani', 'Vegetable Pulao', 'Fragrant basmati with mixed vegetables, nuts and warm spices', 11.99, 20, 'TRUE', 0, 'TRUE'],
    ['Rice & Biryani', 'Egg Fried Rice', 'Wok-tossed jasmine rice with scrambled egg, spring onion and soy sauce', 9.99, 15, 'TRUE', 0, 'TRUE'],

    // ── 9. DESSERTS (5 items) ──
    ['Desserts', 'Chocolate Lava Cake', 'Warm molten chocolate fondant with vanilla ice cream and berry coulis', 7.99, 12, 'TRUE', 50, 'FALSE'],
    ['Desserts', 'New York Cheesecake', 'Classic rich cheesecake on a digestive base with seasonal berry compote', 6.99, 5, 'TRUE', 40, 'FALSE'],
    ['Desserts', 'Crème Brûlée', 'French vanilla custard with a perfectly caramelized sugar crust', 7.49, 10, 'TRUE', 30, 'FALSE'],
    ['Desserts', 'Tiramisu', 'Espresso-soaked ladyfingers, mascarpone cream, dusted with cocoa', 7.99, 5, 'TRUE', 35, 'FALSE'],
    ['Desserts', 'Sticky Toffee Pudding', 'Warm date sponge with toffee sauce and clotted cream ice cream', 6.49, 10, 'TRUE', 0, 'TRUE'],

    // ── 10. BEVERAGES (5 items) ──
    ['Beverages', 'Fresh Orange Juice', 'Freshly squeezed orange juice, served chilled', 4.49, 5, 'TRUE', 0, 'TRUE'],
    ['Beverages', 'Classic Milkshake', 'Thick hand-spun milkshake — choose chocolate, vanilla or strawberry', 5.99, 8, 'TRUE', 0, 'TRUE'],
    ['Beverages', 'Sparkling Lemonade', 'House-made lemonade with fresh mint and soda water', 3.99, 5, 'TRUE', 0, 'TRUE'],
    ['Beverages', 'Flat White Coffee', 'Double espresso with velvety microfoam steamed milk', 3.99, 6, 'TRUE', 0, 'TRUE'],
    ['Beverages', 'Mango Lassi', 'Creamy blended yogurt drink with ripe mango pulp and a hint of cardamom', 4.49, 5, 'TRUE', 0, 'TRUE'],
];

/* ─── Coupons ─── */
const coupons = [
    ['WELCOME20', 'percentage', 20, 0, '', '', '2026-01-01', '2026-12-31', 'TRUE'],
    ['SAVE10', 'fixed_amount', 10, 30, 15, 200, '2026-01-01', '2026-12-31', 'TRUE'],
    ['FREEDEL', 'free_delivery', 0, 25, '', '', '2026-01-01', '2026-06-30', 'TRUE'],
    ['BIRYANI5', 'fixed_amount', 5, 15, '', '', '2026-02-01', '2026-04-30', 'TRUE'],
    ['VIP30', 'percentage', 30, 50, 20, 50, '2026-03-01', '2026-03-31', 'TRUE'],
];

/* ─── Guide rows ─── */
const catGuide = ['GUIDE → Required', 'Optional description', 'Number (1,2,3…)', 'TRUE or FALSE'];
const foodGuide = ['Must match a Category name exactly', 'Item name (required)', 'Full customer-facing description', 'Price in USD e.g. 12.99', 'Minutes to prepare', 'TRUE / FALSE', '0 if unlimited', 'TRUE = infinite stock'];
const couponGuide = ['Unique code e.g. SAVE10', 'percentage | fixed_amount | free_delivery', 'Discount value (10 = 10% or $10; 0 for free delivery)', 'Min order ($)', 'Max discount cap (blank = none)', 'Max uses (blank = unlimited)', 'YYYY-MM-DD', 'YYYY-MM-DD', 'TRUE or FALSE'];

/* ─── Build workbook ─── */
const INDIGO = '4F46E5', WHITE = 'FFFFFF', YELLOW = 'FFF9C4', GREEN = 'D1FAE5';

function makeSheet(headerRow, guideRow, dataRows) {
    const ws = XLSX.utils.aoa_to_sheet([headerRow, guideRow, ...dataRows]);
    const hStyle = { font: { bold: true, color: { rgb: WHITE }, sz: 11 }, fill: { fgColor: { rgb: INDIGO }, patternType: 'solid' }, alignment: { horizontal: 'center', wrapText: true } };
    const gStyle = { font: { italic: true, color: { rgb: '555555' }, sz: 10 }, fill: { fgColor: { rgb: YELLOW }, patternType: 'solid' }, alignment: { wrapText: true } };
    const dStyle = { fill: { fgColor: { rgb: GREEN }, patternType: 'solid' } };

    headerRow.forEach((_, ci) => {
        const h = XLSX.utils.encode_cell({ r: 0, c: ci });
        const g = XLSX.utils.encode_cell({ r: 1, c: ci });
        if (ws[h]) ws[h].s = hStyle;
        if (ws[g]) ws[g].s = gStyle;
    });

    // Light green tint on data rows
    for (let r = 2; r < dataRows.length + 2; r++) {
        if (r % 2 === 0) {
            headerRow.forEach((_, ci) => {
                const c = XLSX.utils.encode_cell({ r, c: ci });
                if (ws[c]) ws[c].s = { ...ws[c].s, fill: { fgColor: { rgb: 'F0FDF4' }, patternType: 'solid' } };
            });
        }
    }

    ws['!cols'] = headerRow.map(() => ({ wch: 28 }));
    return ws;
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, makeSheet(CAT_COLS, catGuide, categories), 'Categories');
XLSX.utils.book_append_sheet(wb, makeSheet(FOOD_COLS, foodGuide, foods), 'Menu Items');
XLSX.utils.book_append_sheet(wb, makeSheet(COUPON_COLS, couponGuide, coupons), 'Coupons');

const outPath = path.join(os.homedir(), 'Desktop', 'NoteNest_FullMenu_10Categories.xlsx');
XLSX.writeFile(wb, outPath);

console.log(`✅  Saved → ${outPath}`);
console.log(`📋  ${categories.length} categories · ${foods.length} menu items · ${coupons.length} coupons`);
foods.forEach(([cat]) => { });

// Summary per category
const catCounts = {};
foods.forEach(([cat]) => { catCounts[cat] = (catCounts[cat] || 0) + 1; });
console.log('\nItems per category:');
Object.entries(catCounts).forEach(([cat, count]) => console.log(`  ${cat}: ${count} items`));
