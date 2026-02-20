import { useRef, useState } from 'react';
import { restaurantAdmin } from '../services/api';
import { downloadTemplate, exportData, parseImportFile } from '../utils/excelUtils';
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────── */
/*  Result Modal                                                   */
/* ─────────────────────────────────────────────────────────────── */
const ResultModal = ({ results, onClose }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">Import Results</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>
            <div className="p-6 space-y-4">
                {results.map((section) => (
                    <div key={section.label} className="rounded-xl border p-4">
                        <p className="font-semibold text-sm text-gray-700 mb-2">{section.label}</p>
                        <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" /> {section.created} created
                            </span>
                            <span className="flex items-center gap-1 text-yellow-600">
                                <XCircle className="w-4 h-4" /> {section.skipped} skipped
                            </span>
                            <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="w-4 h-4" /> {section.errors} errors
                            </span>
                        </div>
                        {section.errorList?.length > 0 && (
                            <ul className="mt-2 text-xs text-red-600 space-y-1 max-h-24 overflow-auto">
                                {section.errorList.map((e, i) => <li key={i}>• {e}</li>)}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
            <div className="px-6 pb-5">
                <button
                    onClick={onClose}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                    Done
                </button>
            </div>
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────── */
/*  ImportExportPanel                                              */
/* ─────────────────────────────────────────────────────────────── */
const ImportExportPanel = ({ onImportComplete }) => {
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [results, setResults] = useState(null);

    /* ── Template download ── */
    const handleDownloadTemplate = () => {
        try {
            downloadTemplate();
            toast.success('Template downloaded!');
        } catch {
            toast.error('Failed to download template');
        }
    };

    /* ── Export live data ── */
    const handleExport = async () => {
        setExporting(true);
        try {
            const [catsRes, foodsRes, couponsRes] = await Promise.allSettled([
                restaurantAdmin.getCategories(),
                restaurantAdmin.getAllFoods(),
                restaurantAdmin.getCoupons(),
            ]);
            exportData({
                categories: catsRes.value?.data?.data || [],
                foods: foodsRes.value?.data?.data || [],
                coupons: couponsRes.value?.data?.data || [],
            });
            toast.success('Data exported successfully!');
        } catch {
            toast.error('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    /* ── File picked → import ── */
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';           // reset so same file can be re-picked
        if (!file) return;

        setImporting(true);
        const toastId = toast.loading('Parsing file…');

        try {
            const { categories, foods, coupons } = await parseImportFile(file);

            // ── 1. Import Categories ──
            let catCreated = 0, catSkipped = 0, catErrors = 0;
            const catErrorList = [];
            const catNameToId = {};

            // Fetch existing categories to avoid duplicates
            const existingCatsRes = await restaurantAdmin.getCategories();
            const existingCats = existingCatsRes.data?.data || [];
            existingCats.forEach(c => { catNameToId[c.name.toLowerCase()] = c.id; });

            for (const cat of categories) {
                const key = cat.name.toLowerCase();
                if (catNameToId[key]) {
                    catSkipped++;
                    continue;
                }
                try {
                    toast.loading(`Creating category: ${cat.name}`, { id: toastId });
                    const res = await restaurantAdmin.createCategory(cat);
                    catNameToId[key] = res.data?.data?.id || res.data?.id;
                    catCreated++;
                } catch (err) {
                    catErrors++;
                    catErrorList.push(`"${cat.name}": ${err.response?.data?.error?.message || err.message}`);
                }
            }

            // ── 2. Import Menu Items ──
            let foodCreated = 0, foodSkipped = 0, foodErrors = 0;
            const foodErrorList = [];

            for (const food of foods) {
                const catId = catNameToId[food.category_name.toLowerCase()];
                if (!catId) {
                    foodErrors++;
                    foodErrorList.push(`"${food.name}": category "${food.category_name}" not found`);
                    continue;
                }
                try {
                    toast.loading(`Creating item: ${food.name}`, { id: toastId });
                    const formData = new FormData();
                    formData.append('name', food.name);
                    formData.append('description', food.description);
                    formData.append('price', food.price);
                    formData.append('category_id', catId);
                    formData.append('preparation_time', food.preparation_time);
                    formData.append('is_available', food.is_available);
                    formData.append('stock_quantity', food.stock_quantity);
                    formData.append('is_unlimited', food.is_unlimited);
                    await restaurantAdmin.createFood(formData);
                    foodCreated++;
                } catch (err) {
                    foodErrors++;
                    foodErrorList.push(`"${food.name}": ${err.response?.data?.error?.message || err.message}`);
                }
            }

            // ── 3. Import Coupons ──
            let couponCreated = 0, couponSkipped = 0, couponErrors = 0;
            const couponErrorList = [];

            for (const coupon of coupons) {
                if (!coupon.valid_until) {
                    couponSkipped++;
                    couponErrorList.push(`"${coupon.code}": missing valid_until date`);
                    continue;
                }
                try {
                    toast.loading(`Creating coupon: ${coupon.code}`, { id: toastId });
                    await restaurantAdmin.createCoupon(coupon);
                    couponCreated++;
                } catch (err) {
                    const msg = err.response?.data?.error?.message || err.message;
                    // duplicate code → treat as skipped
                    if (msg?.includes('unique') || msg?.includes('duplicate') || msg?.includes('already exists')) {
                        couponSkipped++;
                    } else {
                        couponErrors++;
                        couponErrorList.push(`"${coupon.code}": ${msg}`);
                    }
                }
            }

            toast.dismiss(toastId);
            setResults([
                { label: 'Categories', created: catCreated, skipped: catSkipped, errors: catErrors, errorList: catErrorList },
                { label: 'Menu Items', created: foodCreated, skipped: foodSkipped, errors: foodErrors, errorList: foodErrorList },
                { label: 'Coupons', created: couponCreated, skipped: couponSkipped, errors: couponErrors, errorList: couponErrorList },
            ]);
            onImportComplete?.();
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setImporting(false);
        }
    };

    return (
        <>
            {results && (
                <ResultModal results={results} onClose={() => setResults(null)} />
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Button group */}
            <div className="flex items-center gap-2">
                {/* Download Template */}
                <button
                    onClick={handleDownloadTemplate}
                    title="Download Excel template with sample data & guide"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-green-400 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Template
                </button>

                {/* Import */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    title="Import from Excel (.xlsx)"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-indigo-400 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                >
                    {importing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                        : <><Upload className="w-4 h-4" /> Import</>
                    }
                </button>

                {/* Export */}
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    title="Export current data to Excel"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-blue-400 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition-colors"
                >
                    {exporting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
                        : <><Download className="w-4 h-4" /> Export</>
                    }
                </button>
            </div>
        </>
    );
};

export default ImportExportPanel;
