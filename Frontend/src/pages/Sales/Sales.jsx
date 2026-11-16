import React, { useState, useEffect } from 'react';
import { saleService, customerService, productService } from '../../services';
import {
  Table, Modal, ConfirmModal, Input, Textarea, Select,
  Button, Badge, Pagination, SearchBar, PageLoader
} from '../../components/UI';
import { Plus, Eye, TrendingUp, Trash2, Printer, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const initialSaleForm = {
    customer: '',
    reference_number: `SO-${Date.now().toString().slice(-6)}`,
    sale_date: new Date().toISOString().split('T')[0],
    discount: '',
    notes: '',
    status: 'completed',
    items: [{ product: '', quantity: '1', unit_price: '' }],
  };
  const [formData, setFormData] = useState(initialSaleForm);
  const [errors, setErrors] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const [saleRes, custRes, prodRes] = await Promise.all([
        saleService.getAll(params),
        customerService.getAll(),
        productService.getAll({ page_size: 200, status: 'active' }),
      ]);

      const data = saleRes.data;
      if (data.results) {
        setSales(data.results);
        setTotalPages(Math.ceil(data.count / 10) || 1);
      } else {
        setSales(Array.isArray(data) ? data : []);
      }

      setCustomers(custRes.data.results || custRes.data || []);
      setProducts(prodRes.data.results || prodRes.data || []);
    } catch (err) {
      toast.error('Failed to load sales records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const handleOpenCreate = () => {
    setFormData({
      ...initialSaleForm,
      reference_number: `SO-${Date.now().toString().slice(-6)}`,
    });
    setErrors({});
    setCreateModalOpen(true);
  };

  const handleItemProductChange = (index, productId) => {
    const updated = [...formData.items];
    const prod = products.find((p) => p.id === parseInt(productId));
    updated[index].product = productId;
    if (prod) {
      updated[index].unit_price = prod.selling_price;
    }
    setFormData({ ...formData, items: updated });
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    setFormData({ ...formData, items: updated });
  };

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: '1', unit_price: '' }],
    });
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length === 1) {
      toast.error('Sale order must include at least one product');
      return;
    }
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const calculateFinalTotal = () => {
    const subtotal = calculateSubtotal();
    const discountPercent = parseFloat(formData.discount) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    return Math.max(0, subtotal - discountAmount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer) {
      toast.error('Please select a customer');
      return;
    }

    // Client-side stock check validation
    for (const item of formData.items) {
      if (!item.product) {
        toast.error('Please choose a product for each line');
        return;
      }
      const qty = parseInt(item.quantity, 10) || 0;
      if (qty <= 0) {
        toast.error('Quantity must be at least 1');
        return;
      }
      const prod = products.find((p) => p.id === parseInt(item.product));
      if (!prod) continue;
      if (prod.stock_quantity < qty) {
        toast.error(
          `Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, Requested: ${qty}`
        );
        return;
      }
    }

    setActionLoading(true);
    setErrors({});
    try {
      const payload = {
        ...formData,
        discount: parseFloat(formData.discount) || 0,
        items: formData.items.map((item) => ({
          ...item,
          quantity: parseInt(item.quantity, 10) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
        })),
      };
      await saleService.create(payload);
      toast.success('Sale completed! Stock updated.');
      setCreateModalOpen(false);
      fetchData();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
        const errDetail = err.response.data.detail || err.response.data.non_field_errors?.[0] || 'Validation error';
        toast.error(errDetail);
      } else {
        toast.error('Failed to create sale');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    setActionLoading(true);
    try {
      await saleService.delete(saleToDelete.id);
      toast.success('Sale order removed successfully');
      setDeleteModalOpen(false);
      setSaleToDelete(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete sale order');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Sales Orders</h2>
          <p className="text-xs text-gray-500">Record customer orders, discounts, and dispatch inventory</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} /> New Sale
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-3 items-center justify-between shadow-sm">
        <div className="w-full md:w-80">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search SO reference or customer..."
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData}>
          <RefreshCw size={14} />
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Reference #', 'Customer', 'Date', 'Subtotal', 'Discount', 'Total Amount', 'Status', 'Actions']}
            empty={sales.length === 0 ? 'No sales recorded yet. Click "New Sale" to create an order.' : null}
          >
            {sales.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-sm text-blue-600">
                  {s.reference_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                  {s.customer_detail?.name || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {s.sale_date}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  ₹{Number(s.subtotal).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-amber-600 font-medium">
                  {s.discount}%
                </td>
                <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                  ₹{Number(s.total_amount).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge color="green">{s.status?.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedSale(s); setInvoiceModalOpen(true); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                      title="View Invoice"
                    >
                      <FileText size={14} /> Invoice
                    </button>
                    <button
                      onClick={() => { setSaleToDelete(s); setDeleteModalOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Sale Order"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>

          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </div>
      )}

      {/* Create Sale Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Sale Order"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Customer *"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </Select>
            </div>

            <Input
              label="Reference Number *"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              required
            />

            <Input
              label="Sale Date *"
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              required
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Products to Sell
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Product Row
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Product (Available Stock)</th>
                    <th className="p-3 w-28">Quantity</th>
                    <th className="p-3 w-32">Selling Price (₹)</th>
                    <th className="p-3 w-32">Subtotal</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {formData.items.map((row, idx) => {
                    const selectedProd = products.find((p) => p.id === parseInt(row.product));
                    const isOverStock = selectedProd && selectedProd.stock_quantity < row.quantity;
                    const rowSubtotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0);

                    return (
                      <tr key={idx} className={isOverStock ? 'bg-red-50/50' : ''}>
                        <td className="p-2">
                          <select
                            value={row.product}
                            onChange={(e) => handleItemProductChange(idx, e.target.value)}
                            className="w-full p-2 border border-gray-200 rounded-lg bg-white text-xs"
                            required
                          >
                            <option value="">Select Product...</option>
                            {products.filter((p) => p.is_active !== false).map((p) => (
                              <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                                {p.name} ({p.sku}) — Available: {p.stock_quantity} {p.stock_quantity === 0 ? '(Out of Stock)' : ''}
                              </option>
                            ))}
                          </select>
                          {isOverStock && (
                            <p className="text-[10px] text-red-600 font-medium mt-0.5 flex items-center gap-1">
                              <AlertCircle size={10} /> Cannot exceed available stock ({selectedProd.stock_quantity})
                            </p>
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            max={selectedProd ? selectedProd.stock_quantity : undefined}
                            value={row.quantity}
                            onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                            className={`w-full p-2 border rounded-lg text-xs ${isOverStock ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={row.unit_price}
                            onChange={(e) => handleItemFieldChange(idx, 'unit_price', e.target.value)}
                            className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                            required
                          />
                        </td>
                        <td className="p-3 font-semibold text-gray-800">
                          ₹{rowSubtotal.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations & Discount */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                  Discount (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex items-center gap-6 text-xs text-right">
                <div>
                  <span className="text-gray-400 block">Subtotal</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    ₹{calculateSubtotal().toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Final Amount</span>
                  <span className="font-bold text-emerald-600 text-lg">
                    ₹{calculateFinalTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Textarea
            label="Sales Order Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Delivery terms, special customer requests..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
              Complete Sale & Deduct Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sales Invoice Modal */}
      {selectedSale && (
        <Modal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title={`Sales Invoice: ${selectedSale.reference_number}`}
          size="lg"
        >
          <div className="space-y-6 print:m-0">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-xl text-gray-900">SALES INVOICE</h3>
                <p className="text-xs font-mono text-gray-500">Order Ref: {selectedSale.reference_number}</p>
                <p className="text-xs text-gray-500 mt-1">Date: {selectedSale.sale_date}</p>
              </div>
              <div className="text-right">
                <Badge color="green">PAID & DISPATCHED</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="font-semibold text-gray-500 uppercase text-[10px] mb-1">Billed To (Customer)</p>
                <p className="font-bold text-gray-800 text-sm">{selectedSale.customer_detail?.name}</p>
                <p className="text-gray-600">{selectedSale.customer_detail?.email}</p>
                <p className="text-gray-600">{selectedSale.customer_detail?.phone}</p>
                <p className="text-gray-600">{selectedSale.customer_detail?.address}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="font-semibold text-gray-500 uppercase text-[10px] mb-1">Invoice Summary</p>
                <p className="text-gray-600">Created: {new Date(selectedSale.created_at).toLocaleString()}</p>
                <p className="text-gray-600">Subtotal: ₹{Number(selectedSale.subtotal).toFixed(2)}</p>
                <p className="text-amber-600 font-semibold">Discount: {selectedSale.discount}%</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedSale.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-mono text-gray-500">{item.product_sku}</td>
                      <td className="p-3 font-medium text-gray-800">{item.product_name}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold text-gray-900">
                        ₹{Number(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 text-gray-900">
                  <tr>
                    <td colSpan="4" className="p-2.5 text-right font-medium text-gray-600">Subtotal:</td>
                    <td className="p-2.5 text-right font-semibold">₹{Number(selectedSale.subtotal).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="4" className="p-2.5 text-right font-medium text-amber-600">Discount ({selectedSale.discount}%):</td>
                    <td className="p-2.5 text-right font-semibold text-amber-600">
                      -₹{((Number(selectedSale.subtotal) * Number(selectedSale.discount)) / 100).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td colSpan="4" className="p-3 text-right font-bold text-sm">Total Paid:</td>
                    <td className="p-3 text-right font-bold text-base text-emerald-600">
                      ₹{Number(selectedSale.total_amount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-1.5"
              >
                <Printer size={15} /> Print Invoice
              </Button>
              <Button variant="secondary" onClick={() => setInvoiceModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Sales;
