import { useState, useEffect } from 'react';
import { restaurantAdmin } from '../../services/api'; // Ensure this has new endpoints
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
    Calendar, TrendingUp, DollarSign, Package, AlertTriangle,
    Download, Loader2, Filter
} from 'lucide-react';
import clsx from 'clsx';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Reports = () => {
    const [activeTab, setActiveTab] = useState('sales');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const fetchReportData = async () => {
        setLoading(true);
        try {
            let response;
            const params = { startDate: dateRange.startDate, endDate: dateRange.endDate };

            switch (activeTab) {
                case 'sales':
                    response = await restaurantAdmin.getSalesReport({ ...params, groupBy: 'day' });
                    setData(response.data.data.sales);
                    break;
                case 'income':
                    response = await restaurantAdmin.getIncomeTrends({ ...params });
                    setData(response.data.data.trends);
                    break;
                case 'products':
                    response = await restaurantAdmin.getTopProducts({ limit: 10 });
                    setData(response.data.data);
                    break;
                case 'categories':
                    response = await restaurantAdmin.getCategoryPerformance();
                    setData(response.data.data);
                    break;
                case 'risks':
                    response = await restaurantAdmin.getLowStockItems({ threshold: 10 });
                    setData(response.data.data);
                    break;
                default:
                    setData(null);
            }
        } catch (error) {
            console.error("Failed to fetch report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [activeTab, dateRange]); // Refetch on tab or date change

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={clsx(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                    <p className="text-muted-foreground">Deep dive into your restaurant's performance.</p>
                </div>

                {/* Date Filter (Only for temporal charts) */}
                {['sales', 'income'].includes(activeTab) && (
                    <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
                        <Calendar size={16} className="text-muted-foreground ml-2" />
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="bg-transparent text-sm border-none focus:ring-0 w-32"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="bg-transparent text-sm border-none focus:ring-0 w-32"
                        />
                        <button onClick={fetchReportData} title="Apply Filter" className="p-1 hover:bg-muted rounded">
                            <Filter size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="border-b overflow-x-auto">
                    <div className="flex w-max">
                        <TabButton id="sales" label="Sales & Orders" icon={TrendingUp} />
                        <TabButton id="income" label="Income Analysis" icon={DollarSign} />
                        <TabButton id="products" label="Top Products" icon={Package} />
                        <TabButton id="categories" label="Category Performance" icon={PieChart} />
                        <TabButton id="risks" label="Risk Analysis" icon={AlertTriangle} />
                    </div>
                </div>

                <div className="p-6 min-h-[400px]">
                    {loading ? (
                        <div className="h-full w-full flex flex-col items-center justify-center p-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p>Generating report...</p>
                        </div>
                    ) : !data || data.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-muted-foreground opacity-50">
                            <BarChart className="h-16 w-16 mb-4" />
                            <p>No data available for this criteria.</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'sales' && (
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="period" />
                                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                            <Tooltip
                                                formatter={(value, name) => [
                                                    name === 'total_sales' ? `$${value}` : value,
                                                    name === 'total_sales' ? 'Revenue' : 'Orders'
                                                ]}
                                                labelStyle={{ color: 'black' }}
                                            />
                                            <Bar yAxisId="left" dataKey="total_sales" fill="#8884d8" name="Revenue" radius={[4, 4, 0, 0]} />
                                            <Bar yAxisId="right" dataKey="order_count" fill="#82ca9d" name="Orders" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {activeTab === 'income' && (
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip formatter={(value) => [`$${value}`, 'Avg Income']} labelStyle={{ color: 'black' }} />
                                            <Line type="monotone" dataKey="daily_income" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {activeTab === 'products' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold mb-4">Top 10 Selling Items</h3>
                                    <div className="grid gap-4">
                                        {data.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-card rounded object-cover flex items-center justify-center text-xs border font-medium">
                                                        {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover rounded" /> : `#${idx + 1}`}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.total_quantity} units sold</div>
                                                    </div>
                                                </div>
                                                <div className="font-bold">
                                                    ${parseFloat(item.total_revenue).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'categories' && (
                                <div className="flex flex-col md:flex-row items-center justify-around h-[400px]">
                                    <div className="h-full w-full md:w-1/2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data}
                                                    cx="50%" cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="total_revenue"
                                                >
                                                    {data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => `$${value}`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-full md:w-1/2 space-y-2">
                                        {data.map((entry, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                    <span>{entry.category_name}</span>
                                                </div>
                                                <span className="font-medium">${entry.total_revenue}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'risks' && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-100">
                                        <AlertTriangle size={16} />
                                        <span>Showing items with stock quantity lower than 10.</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {data.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg hover:border-red-300 transition-colors">
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-red-600 font-bold">{item.stock_quantity ?? 0} left</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/10 flex justify-end">
                    <button
                        onClick={() => alert('Export functionality to be implemented')}
                        className="flex items-center gap-2 text-sm text-primary font-medium hover:underline disabled:opacity-50"
                        disabled={!data || data.length === 0}
                    >
                        <Download size={16} /> Download Report (CSV)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reports;
