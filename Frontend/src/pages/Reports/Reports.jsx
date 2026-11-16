import React, { useState, useEffect } from 'react';
import { reportService } from '../../services';
import {
  Table, Input, Button, Badge, PageLoader
} from '../../components/UI';
import {
  BarChart3, Download, Calendar, DollarSign,
  ShoppingCart, Package, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
  const [reportType, setReportType] = useState('purchases'); // 'stock' | 'purchases'
  const [purchaseViewMode, setPurchaseViewMode] = useState('products'); // 'products' | 'orders'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      let res;
      if (reportType === 'purchases') {
        res = await reportService.getPurchaseReport(params);
      } else {
        res = await reportService.getStockReport(params);
      }
      setReportData(res.data);
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExportCSV = () => {
    const token = localStorage.getItem('access_token');
    const query = new URLSearchParams({
      export: 'csv',
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    }).toString();

    fetch(`http://localhost:8000/api/reports/${reportType}/?${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('CSV downloaded successfully');
      })
      .catch(() => toast.error('CSV export failed'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Inventory & Procurement Reports</h2>
          <p className="text-xs text-gray-500">Audit warehouse valuation, lot invoices, and supplier procurement inflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchReport} className="flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button onClick={handleExportCSV} className="flex items-center gap-1.5 shadow-sm">
            <Download size={14} /> Export to CSV
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setReportType('stock')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
            reportType === 'stock'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={16} /> Stock Valuation & Lot Report
        </button>
        <button
          onClick={() => setReportType('purchases')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
            reportType === 'purchases'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingCart size={16} /> Purchase Procurement Report
        </button>
      </div>

      {/* Date Filters & View Toggle (For Purchases) */}
      {reportType === 'purchases' && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button size="sm" onClick={fetchReport}>
              Filter Report
            </Button>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Reset Dates
              </button>
            )}
          </div>

          {/* Sub-view toggle between Procured Products and PO Orders */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setPurchaseViewMode('products')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                purchaseViewMode === 'products'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Procured Products ({reportData?.procured_products?.length || 0})
            </button>
            <button
              onClick={() => setPurchaseViewMode('orders')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                purchaseViewMode === 'orders'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Purchase Orders ({reportData?.purchases?.length || 0})
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reportType === 'stock' ? (
            <>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-medium">Catalog Active Products</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{reportData.summary.total_products || 0} Products</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{reportData.summary.total_units || 0} total units in stock</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-medium">Total Inventory Asset Worth</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  ₹{Number(reportData.summary.total_inventory_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Based on purchase cost</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-medium">Restock Attention Status</p>
                <p className="text-xl font-bold text-amber-600 mt-1">
                  {reportData.summary.low_stock || 0} Low / {reportData.summary.out_of_stock || 0} Out
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Products below threshold</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-medium">Procured Products Count</p>
                <p className="text-xl font-bold text-gray-800 mt-1">
                  {reportData.summary.unique_products_count || reportData.procured_products?.length || 0} Products
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {reportData.summary.total_units_procured || 0} total units acquired
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-medium">Total Procurement Expenditure</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  ₹{Number(reportData.summary.total_spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Across {reportData.summary.total_orders || 0} completed purchase orders
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-medium">Purchase Orders (POs)</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{reportData.summary.total_orders || 0} POs</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Avg. ₹{reportData.summary.total_orders ? (reportData.summary.total_spent / reportData.summary.total_orders).toFixed(2) : '0.00'} per PO
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Data Table */}
      {loading ? (
        <PageLoader />
      ) : reportType === 'stock' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Product', 'SKU', 'Invoice #', 'Category', 'Unit Cost', 'Selling Price', 'Stock Qty', 'Total Valuation', 'Shelf Life']}
            empty={reportData?.products?.length === 0 ? 'No inventory products found.' : null}
          >
            {reportData?.products?.map((prod) => (
              <tr key={prod.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-semibold text-sm text-gray-800">
                  {prod.name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-bold text-blue-600">
                  {prod.sku}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {prod.invoice_number || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                  {prod.category_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-medium">
                  ₹{Number(prod.purchase_price).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-800">
                  ₹{Number(prod.selling_price).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-900">
                  {prod.stock_quantity} units
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-600">
                  ₹{Number(prod.stock_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-gray-600">{prod.expiry_date || '—'}</span>
                    {prod.expiry_status === 'expired' && <Badge color="red">EXPIRED</Badge>}
                    {prod.expiry_status === 'expiring_soon' && <Badge color="yellow">SOON</Badge>}
                    {prod.expiry_status === 'valid' && <Badge color="green">VALID</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      ) : purchaseViewMode === 'products' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Product', 'SKU', 'Invoice #', 'Supplier', 'PO Reference', 'Procured Date', 'Qty Procured', 'Unit Cost', 'Total Cost', 'Status']}
            empty={reportData?.procured_products?.length === 0 ? 'No procured products found for this period.' : null}
          >
            {reportData?.procured_products?.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-semibold text-sm text-gray-800">
                  {item.name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-bold text-blue-600">
                  {item.sku}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {item.invoice_number || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">
                  {item.supplier_name || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-blue-600">
                  {item.reference_number}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                  {item.purchase_date}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-900">
                  {item.quantity} units
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">
                  ₹{Number(item.unit_price).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-600">
                  ₹{Number(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">
                  <Badge color="green">COMPLETED</Badge>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['PO Reference #', 'Supplier', 'Date', 'Items Inflow', 'Total Investment', 'Status']}
            empty={reportData?.purchases?.length === 0 ? 'No purchase records found for this period.' : null}
          >
            {reportData?.purchases?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-sm text-blue-600">
                  {p.reference_number}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                  {p.supplier_name || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                  {p.purchase_date}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-semibold">
                  {p.items_count || 1} item line(s)
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  ₹{Number(p.total_amount).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">
                  <Badge color="green">COMPLETED</Badge>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </div>
  );
};

export default Reports;
