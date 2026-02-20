/**
 * excelUtils.js
 * All Excel (XLSX) import/export helpers using SheetJS.
 * No backend routes required — calls existing REST APIs row-by-row.
 */

import * as XLSX from 'xlsx';

/* ─────────────────────────────────────────────────────────────── */
/*  COLUMN DEFINITIONS                                             */
/* ─────────────────────────────────────────────────────────────── */

const CAT_COLS = ['category_name', 'description', 'sort_order', 'is_active'];
const FOOD_COLS = ['category_name', 'item_name', 'description', 'price', 'preparation_time_mins', 'is_available', 'stock_quantity', 'is_unlimited'];
const COUPON_COLS = ['code', 'type', 'value', 'min_order_amount', 'max_discount_amount', 'usage_limit', 'valid_from', 'valid_until', 'is_active'];

/* ─────────────────────────────────────────────────────────────── */
/*  HELPER: style a sheet header row                               */
/* ─────────────────────────────────────────────────────────────── */
function applyHeaderStyle(ws, cols) {
    const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
        border: {
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
        alignment: { horizontal: 'center', wrapText: true },
    };
    const guideStyle = {
        font: { italic: true, color: { rgb: '555555' }, sz: 10 },
        fill: { fgColor: { rgb: 'FFF9C4' }, patternType: 'solid' },
        alignment: { wrapText: true },
    };
    cols.forEach((_, ci) => {
        const headerCell = `${String.fromCharCode(65 + ci)}1`;
        const guideCell = `${String.fromCharCode(65 + ci)}2`;
        if (ws[headerCell]) ws[headerCell].s = headerStyle;
        if (ws[guideCell]) ws[guideCell].s = guideStyle;
    });
    // Set column widths
    ws['!cols'] = cols.map(() => ({ wch: 22 }));
}

/* ─────────────────────────────────────────────────────────────── */
/*  DOWNLOAD TEMPLATE                                              */
/* ─────────────────────────────────────────────────────────────── */
export function downloadTemplate() {
    const wb = XLSX.utils.book_new();

    /* ---------- Sheet 1: Categories ---------- */
    const catData = [
        CAT_COLS,
        ['GUIDE → Required', 'Optional text', 'Number (0,1,2…)', 'TRUE or FALSE'],
        ['Appetizers', 'Starters and small bites', 1, 'TRUE'],
        ['Main Course', 'Full meals and entrées', 2, 'TRUE'],
        ['Desserts', 'Sweet treats', 3, 'TRUE'],
    ];
    const wsCategories = XLSX.utils.aoa_to_sheet(catData);
    applyHeaderStyle(wsCategories, CAT_COLS);
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Categories');

    /* ---------- Sheet 2: Menu Items ---------- */
    const foodData = [
        FOOD_COLS,
        [
            'Must match a Category name',
            'Item name (required)',
            'Description',
            'Price in dollars (e.g. 9.99)',
            'Prep time in minutes',
            'TRUE / FALSE',
            '0 if unlimited',
            'TRUE = no stock limit',
        ],
        ['Appetizers', 'Chicken Wings', 'Crispy fried wings with sauce', 12.99, 15, 'TRUE', 0, 'TRUE'],
        ['Appetizers', 'Spring Rolls', 'Vegetable spring rolls (4 pcs)', 8.99, 12, 'TRUE', 0, 'TRUE'],
        ['Main Course', 'Grilled Steak', '8oz prime sirloin, medium-rare', 24.99, 25, 'TRUE', 0, 'TRUE'],
        ['Main Course', 'Pasta Carbonara', 'Creamy egg & pancetta pasta', 14.99, 20, 'TRUE', 0, 'TRUE'],
        ['Desserts', 'Chocolate Lava Cake', 'Warm chocolate fondant', 7.99, 10, 'TRUE', 50, 'FALSE'],
    ];
    const wsFoods = XLSX.utils.aoa_to_sheet(foodData);
    applyHeaderStyle(wsFoods, FOOD_COLS);
    XLSX.utils.book_append_sheet(wb, wsFoods, 'Menu Items');

    /* ---------- Sheet 3: Coupons ---------- */
    const couponData = [
        COUPON_COLS,
        [
            'Unique code (e.g. SAVE10)',
            'percentage OR fixed_amount OR free_delivery',
            'Discount value (10 = 10% or $10)',
            'Min order to apply ($)',
            'Max discount cap ($, leave blank for none)',
            'Max times usable (leave blank for unlimited)',
            'YYYY-MM-DD (start)',
            'YYYY-MM-DD (expiry)',
            'TRUE or FALSE',
        ],
        ['WELCOME10', 'percentage', 10, 0, '', '', '2026-01-01', '2026-12-31', 'TRUE'],
        ['FLAT5OFF', 'fixed_amount', 5, 20, 10, 100, '2026-02-01', '2026-06-30', 'TRUE'],
        ['FREEDEL', 'free_delivery', 0, 30, '', '', '2026-03-01', '2026-03-31', 'TRUE'],
    ];
    const wsCoupons = XLSX.utils.aoa_to_sheet(couponData);
    applyHeaderStyle(wsCoupons, COUPON_COLS);
    XLSX.utils.book_append_sheet(wb, wsCoupons, 'Coupons');

    XLSX.writeFile(wb, 'NoteNest_Menu_Template.xlsx');
}

/* ─────────────────────────────────────────────────────────────── */
/*  EXPORT LIVE DATA                                               */
/* ─────────────────────────────────────────────────────────────── */
export function exportData({ categories = [], foods = [], coupons = [] }) {
    const wb = XLSX.utils.book_new();

    /* Categories */
    const catRows = [CAT_COLS, ...categories.map(c => [
        c.name, c.description || '', c.sort_order || 0, c.is_active ? 'TRUE' : 'FALSE',
    ])];
    const wsCat = XLSX.utils.aoa_to_sheet(catRows);
    applyHeaderStyle(wsCat, CAT_COLS);
    XLSX.utils.book_append_sheet(wb, wsCat, 'Categories');

    /* Foods — use category_name resolved from categories list */
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const foodRows = [FOOD_COLS, ...foods.map(f => [
        catMap[f.category_id] || '',
        f.name,
        f.description || '',
        parseFloat(f.price || 0),
        f.preparation_time || 15,
        f.is_available ? 'TRUE' : 'FALSE',
        f.stock_quantity || 0,
        f.is_unlimited ? 'TRUE' : 'FALSE',
    ])];
    const wsFood = XLSX.utils.aoa_to_sheet(foodRows);
    applyHeaderStyle(wsFood, FOOD_COLS);
    XLSX.utils.book_append_sheet(wb, wsFood, 'Menu Items');

    /* Coupons */
    const couponRows = [COUPON_COLS, ...coupons.map(c => [
        c.code, c.type, c.value,
        c.min_order_amount || 0,
        c.max_discount_amount || '',
        c.usage_limit || '',
        c.valid_from ? c.valid_from.slice(0, 10) : '',
        c.valid_until ? c.valid_until.slice(0, 10) : '',
        c.is_active ? 'TRUE' : 'FALSE',
    ])];
    const wsCoupon = XLSX.utils.aoa_to_sheet(couponRows);
    applyHeaderStyle(wsCoupon, COUPON_COLS);
    XLSX.utils.book_append_sheet(wb, wsCoupon, 'Coupons');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `NoteNest_Export_${date}.xlsx`);
}

/* ─────────────────────────────────────────────────────────────── */
/*  PARSE IMPORT FILE                                              */
/* ─────────────────────────────────────────────────────────────── */
export function parseImportFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });

                /* Helper: sheet → array of row objects (skip row 1 header + row 2 guide) */
                const sheetToObjects = (sheetName) => {
                    const ws = wb.Sheets[sheetName];
                    if (!ws) return [];
                    // read_with_header uses row 1 as keys
                    const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
                    // skip the guide row (row index 0 = second row in file after header)
                    return rows.slice(1);
                };

                const rawCats = sheetToObjects('Categories');
                const rawFoods = sheetToObjects('Menu Items');
                const rawCoupons = sheetToObjects('Coupons');

                const boolVal = (v) => String(v).trim().toUpperCase() === 'TRUE';

                const categories = rawCats
                    .filter(r => r['category_name']?.trim())
                    .map(r => ({
                        name: r['category_name'].trim(),
                        description: r['description'] || '',
                        sort_order: parseInt(r['sort_order']) || 0,
                        is_active: boolVal(r['is_active'] ?? 'TRUE'),
                    }));

                const foods = rawFoods
                    .filter(r => r['item_name']?.trim() && r['price'])
                    .map(r => ({
                        category_name: r['category_name'].trim(),
                        name: r['item_name'].trim(),
                        description: r['description'] || '',
                        price: parseFloat(r['price']) || 0,
                        preparation_time: parseInt(r['preparation_time_mins']) || 15,
                        is_available: boolVal(r['is_available'] ?? 'TRUE'),
                        stock_quantity: parseInt(r['stock_quantity']) || 0,
                        is_unlimited: boolVal(r['is_unlimited'] ?? 'TRUE'),
                    }));

                const coupons = rawCoupons
                    .filter(r => r['code']?.trim() && r['type']?.trim())
                    .map(r => ({
                        code: r['code'].trim().toUpperCase(),
                        type: r['type'].trim(),
                        value: parseFloat(r['value']) || 0,
                        min_order_amount: parseFloat(r['min_order_amount']) || 0,
                        max_discount_amount: r['max_discount_amount'] ? parseFloat(r['max_discount_amount']) : null,
                        usage_limit: r['usage_limit'] ? parseInt(r['usage_limit']) : null,
                        valid_from: r['valid_from'] || new Date().toISOString().slice(0, 10),
                        valid_until: r['valid_until'] || '',
                        is_active: boolVal(r['is_active'] ?? 'TRUE'),
                    }));

                resolve({ categories, foods, coupons });
            } catch (err) {
                reject(new Error('Failed to parse Excel file: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}
