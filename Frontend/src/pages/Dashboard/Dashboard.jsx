import React, { useState, useEffect } from 'react';
import { reportService } from '../../services';
import { StatCard, PageLoader, Badge, Button } from '../../components/UI';
import {
  Package, Tag, Truck, Users, IndianRupee, Warehouse,
  AlertTriangle, CheckCircle2, Clock, ShieldCheck, ArrowUpRight,
  RefreshCw, Barcode, ShoppingCart, Sliders, Boxes, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await reportService.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <PageLoader />;

  const stats = data?.stats || {};
  const topInventory = data?.top_inventory || [];
  const stockByCategory = data?.stock_by_category || [];
  const recentMovements = data?.recent_movements || [];
  const recentPurchases = data?.recent_purchases || [];

  const totalStockVal = stats.total_stock_value || 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Warehouse className="text-blue-600" size={22} />
            Inventory & Warehouse Overview
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time stock valuation, batch expiration monitoring, and Barcode-tracked inventory
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/products"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
          >
            <Barcode size={14} /> Add Product / Barcode
          </Link>
          <Link
            to="/purchases"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
          >
            <ShoppingCart size={14} className="text-emerald-600" /> New Purchase
          </Link>
          <Link
            to="/stock"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
          >
            <Sliders size={14} className="text-blue-600" /> Stock Audit
          </Link>
          <button
            onClick={fetchDashboardData}
            className="p-2 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            title="Refresh Metrics"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stock Value"
          value={`₹${totalStockVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={IndianRupee}
          color="green"
          subtitle="Current warehouse asset worth"
        />
        <StatCard
          title="Total Stock Units"
          value={`${stats.total_stock_units || 0} Units`}
          icon={Package}
          color="blue"
          subtitle="Available physical quantity"
        />
        <StatCard
          title="Catalog Products"
          value={`${stats.total_products || 0} Items`}
          icon={Boxes}
          color="purple"
          subtitle={`Across ${stats.total_categories || 0} categories`}
        />
        <StatCard
          title="Batch Expiry Status"
          value={`${stats.valid_expiry_count || 0} Valid`}
          icon={ShieldCheck}
          color={stats.expired_count > 0 ? 'red' : stats.expiring_soon_count > 0 ? 'yellow' : 'indigo'}
          subtitle={
            stats.expired_count > 0
              ? `${stats.expired_count} expired batch(es)`
              : stats.expiring_soon_count > 0
              ? `${stats.expiring_soon_count} expiring within 30 days`
              : 'All batches in shelf life'
          }
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Tag size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Categories</p>
            <p className="text-lg font-bold text-gray-800">{stats.total_categories || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
            <Truck size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Suppliers</p>
            <p className="text-lg font-bold text-gray-800">{stats.total_suppliers || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShoppingCart size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Purchases Made</p>
            <p className="text-lg font-bold text-gray-800">{stats.total_purchases_count || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Low / Out of Stock</p>
            <p className="text-lg font-bold text-gray-800">
              {stats.low_stock_count || 0} / {stats.out_of_stock_count || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Main Visual Section: Category Valuation Breakdown + Batch Expiry Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Valuation & Distribution Cards (Replaces the empty single-dot graph) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">Category Valuation & Stock Distribution</h3>
                <p className="text-xs text-gray-400">Inventory assets grouped by departmental category</p>
              </div>
              <Link to="/products" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
                View All Products <ArrowRight size={13} />
              </Link>
            </div>

            {stockByCategory.length > 0 ? (
              <div className="space-y-4">
                {stockByCategory.map((cat, idx) => {
                  const catVal = parseFloat(cat.category_val) || 0;
                  const percent = totalStockVal > 0 ? Math.round((catVal / totalStockVal) * 100) : 0;
                  const barColors = ['bg-blue-600', 'bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-purple-500'];
                  const color = barColors[idx % barColors.length];

                  return (
                    <div key={idx} className="p-3.5 bg-gray-50/70 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${color}`}></span>
                          <span className="font-semibold text-sm text-gray-800">
                            {cat.category__name || 'Uncategorized'}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            ({cat.count} product{cat.count > 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-gray-900">
                            ₹{catVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-gray-400 ml-2 font-medium">
                            {percent}% of total
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(percent, 4)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center mt-2 text-[11px] text-gray-500">
                        <span>Total Quantity: <strong>{cat.stock || 0} units</strong></span>
                        <span className="text-blue-600 font-medium">Active Warehouse Stock</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm">
                No categorized stock records found. Assign products to categories to visualize valuation.
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Aggregated from live XAMPP MySQL database records</span>
            <span className="font-semibold text-gray-700">Total Asset: ₹{totalStockVal.toFixed(2)}</span>
          </div>
        </div>

        {/* Quality Control & Expiration Radar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                <h3 className="text-base font-bold text-gray-800">Batch Expiry Radar</h3>
              </div>
              <Badge color={stats.expired_count > 0 ? 'red' : 'green'}>
                {stats.expired_count > 0 ? 'ATTENTION' : 'HEALTHY'}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mb-4">Batch expiration status across all catalog items</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-emerald-950">Valid & Fresh</p>
                    <p className="text-[10px] text-emerald-700">Shelf life &gt; 30 days</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-800">{stats.valid_expiry_count || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-amber-950">Expiring Soon</p>
                    <p className="text-[10px] text-amber-700">Within next 30 days</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-amber-800">{stats.expiring_soon_count || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/70 border border-red-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-red-950">Expired Lots</p>
                    <p className="text-[10px] text-red-700">Past expiration date</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-red-800">{stats.expired_count || 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              to="/products"
              className="w-full py-2.5 text-center text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <Barcode size={14} /> View Batch Expiry in Products
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Inventory Value Assets & Recent Audit Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highest Value Inventory Assets */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">Top Inventory Assets</h3>
              <p className="text-xs text-gray-400">Products with highest capital valuation</p>
            </div>
            <Link to="/products" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
              Manage Catalog <ArrowUpRight size={14} />
            </Link>
          </div>

          {topInventory.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {topInventory.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-mono text-blue-600 font-medium">{item.sku}</span>
                        <span>•</span>
                        <span>Inv: <strong className="text-gray-600 font-mono">{item.invoice_number || 'N/A'}</strong></span>
                        <span>•</span>
                        <span>{item.stock_quantity} in stock</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-600 block">
                      ₹{Number(item.total_val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      @ ₹{Number(item.purchase_price).toFixed(2)}/unit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">
              No products available in stock. Add products or purchase orders to populate assets.
            </div>
          )}
        </div>

        {/* Recent Stock Audit & Movements */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">Recent Stock Movements</h3>
              <p className="text-xs text-gray-400">Audit logs & warehouse adjustments</p>
            </div>
            <Link to="/stock" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
              Stock Center <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentMovements.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentMovements.map((m) => {
                const isPositive = m.quantity >= 0;
                return (
                  <div key={m.id} className="py-2.5 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.movement_type === 'in' ? 'bg-emerald-100 text-emerald-700' :
                        m.movement_type === 'out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {m.movement_type}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{m.product_name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{m.reason} • {m.created_at}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-xs ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositive ? `+${m.quantity}` : m.quantity} units
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">
              No recent stock audit movements recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
