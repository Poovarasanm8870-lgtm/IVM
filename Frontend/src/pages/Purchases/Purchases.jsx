import React, { useState, useEffect } from 'react';
import { purchaseService, supplierService, productService } from '../../services';
import {
  Table, Modal, Input, Textarea, Select,
  Button, Badge, Pagination, SearchBar, PageLoader
} from '../../components/UI';
import { Plus, Eye, ShoppingCart, Trash2, Printer, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const initialPurchaseForm = {
    supplier: '',
    reference_number: `PO-${Date.now().toString().slice(-6)}`,
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'completed',
    items: [{ product: '', quantity: '1', unit_price: '' }],
  };
  const [formData, setFormData] = useState(initialPurchaseForm);
  const [errors, setErrors] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const [purRes, supRes, prodRes] = await Promise.all([
        purchaseService.getAll(params),
        supplierService.getAll(),
        productService.getAll({ page_size: 200, status: 'active' }),
      ]);

      const data = purRes.data;
      if (data.results) {
        setPurchases(data.results);
        setTotalPages(Math.ceil(data.count / 10) || 1);
      } else {
        setPurchases(Array.isArray(data) ? data : []);
      }

      setSuppliers(supRes.data.results || supRes.data || []);
      setProducts(prodRes.data.results || prodRes.data || []);
    } catch (err) {
      toast.error('Failed to load purchase records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const handleOpenCreate = () => {
    setFormData({
      ...initialPurchaseForm,
      reference_number: `PO-${Date.now().toString().slice(-6)}`,
    });
    setErrors({});
    setCreateModalOpen(true);
  };

  const handleItemProductChange = (index, productId) => {
    const updated = [...formData.items];
    const prod = products.find((p) => p.id === parseInt(productId));
    updated[index].product = productId;
    if (prod) {
      updated[index].unit_price = prod.purchase_price;
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
      toast.error('Purchase must include at least one product');
      return;
    }
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const getError = (field) => {
    if (!errors[field]) return null;
    return Array.isArray(errors[field]) ? errors[field][0] : errors[field];
  };

  const validatePurchase = () => {
    const errs = {};
    if (!formData.supplier) {
      errs.supplier = 'Please select a supplier';
    }
    const ref = (formData.reference_number || '').trim();
    if (!ref) {
      errs.reference_number = 'PO Reference number is required';
    }
    if (!formData.purchase_date) {
      errs.purchase_date = 'Purchase date is required';
    }

    if (!formData.items || formData.items.length === 0) {
      errs.items = 'Purchase order must have at least one product item';
    } else {
      const seenProds = new Set();
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.product) {
          errs[`item_${i}_product`] = `Please select a product for line #${i + 1}`;
        } else {
          if (seenProds.has(item.product)) {
            errs[`item_${i}_product`] = `Product is duplicated in line #${i + 1}. Please combine quantities.`;
          }
          seenProds.add(item.product);
        }

        const qty = Number(item.quantity);
        if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
          errs[`item_${i}_quantity`] = `Quantity for line #${i + 1} must be a whole number >= 1`;
        }

        const price = parseFloat(item.unit_price);
        if (isNaN(price) || price <= 0) {
          errs[`item_${i}_unit_price`] = `Unit price for line #${i + 1} must be greater than ₹0`;
        }
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = validatePurchase();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const first = Object.values(clientErrors)[0];
      toast.error(first);
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        supplier: formData.supplier,
        reference_number: formData.reference_number.trim(),
        purchase_date: formData.purchase_date,
        notes: (formData.notes || '').trim(),
        status: formData.status || 'completed',
        items: formData.items.map((item) => ({
          product: parseInt(item.product, 10),
          quantity: parseInt(item.quantity, 10) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
        })),
      };
      await purchaseService.create(payload);
      toast.success('Purchase recorded! Stock automatically increased.');
      setCreateModalOpen(false);
      fetchData();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
        const serverErr = Object.values(err.response.data)[0];
        toast.error(Array.isArray(serverErr) ? serverErr[0] : 'Failed to record purchase');
      } else {
        toast.error('Failed to create purchase order');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Purchase Orders</h2>
          <p className="text-xs text-gray-500">Record incoming inventory purchases from suppliers</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} /> New Purchase
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search PO reference or supplier..."
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData} className="self-end sm:self-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Reference #', 'Supplier', 'Date', 'Items Count', 'Total Cost', 'Status', 'Invoice']}
            empty={purchases.length === 0 ? 'No purchase orders recorded yet.' : null}
          >
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-sm text-blue-600 whitespace-nowrap">
                  {p.reference_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800 font-medium whitespace-nowrap">
                  {p.supplier_detail?.name || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap font-mono text-xs">
                  {p.purchase_date}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {p.items?.length || 0} item(s)
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                  ₹{Number(p.total_amount).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <Badge color={p.status === 'completed' ? 'green' : 'yellow'}>
                    {p.status?.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <button
                    onClick={() => { setSelectedPurchase(p); setInvoiceModalOpen(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  >
                    <FileText size={14} /> View Invoice
                  </button>
                </td>
              </tr>
            ))}
          </Table>

          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </div>
      )}

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Purchase Order"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              error={getError('supplier')}
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.company_name || 'Individual'})</option>
              ))}
            </Select>

            <Input
              label="Reference Number"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              error={getError('reference_number')}
              required
            />

            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              error={getError('purchase_date')}
              required
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Purchase Order Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Product Row
              </button>
            </div>

            {getError('items') && (
              <p className="mb-2 text-xs text-red-600 font-medium">{getError('items')}</p>
            )}

            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3 w-28">Quantity</th>
                    <th className="p-3 w-32">Unit Price (₹)</th>
                    <th className="p-3 w-32">Subtotal</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {formData.items.map((row, idx) => {
                    const rowSubtotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0);
                    const prodErr = errors[`item_${idx}_product`];
                    const qtyErr = errors[`item_${idx}_quantity`];
                    const priceErr = errors[`item_${idx}_unit_price`];

                    return (
                      <tr key={idx}>
                        <td className="p-2">
                          <select
                            value={row.product}
                            onChange={(e) => handleItemProductChange(idx, e.target.value)}
                            className={`w-full p-2 border rounded-lg bg-white text-xs ${
                              prodErr ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                            }`}
                            required
                          >
                            <option value="">Select Product...</option>
                            {products.filter((p) => p.is_active !== false).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — Stock: {p.stock_quantity}
                              </option>
                            ))}
                          </select>
                          {prodErr && <p className="mt-0.5 text-[10px] text-red-600 font-medium">{prodErr}</p>}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                            className={`w-full p-2 border rounded-lg text-xs ${
                              qtyErr ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                            }`}
                            required
                          />
                          {qtyErr && <p className="mt-0.5 text-[10px] text-red-600 font-medium">{qtyErr}</p>}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={row.unit_price}
                            onChange={(e) => handleItemFieldChange(idx, 'unit_price', e.target.value)}
                            className={`w-full p-2 border rounded-lg text-xs ${
                              priceErr ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                            }`}
                            required
                          />
                          {priceErr && <p className="mt-0.5 text-[10px] text-red-600 font-medium">{priceErr}</p>}
                        </td>
                        <td className="p-3 font-semibold text-gray-800 whitespace-nowrap">
                          ₹{rowSubtotal.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
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

            {/* Total Summary */}
            <div className="flex justify-end mt-3 pr-2">
              <div className="text-right">
                <span className="text-xs text-gray-500 mr-3">Grand Total:</span>
                <span className="text-xl font-bold text-gray-900">
                  ₹{calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Textarea
            label="Purchase Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Delivery instructions, reference PO tags..."
          />

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
            <span>ℹ️ Completing this purchase will automatically increment stock quantities in MySQL.</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Confirm & Increase Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Purchase Invoice Modal */}
      {selectedPurchase && (
        <Modal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title={`Purchase Invoice: ${selectedPurchase.reference_number}`}
          size="lg"
        >
          <div className="space-y-6 print:m-0" id="purchase-invoice-print">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-xl text-gray-900">PURCHASE INVOICE</h3>
                <p className="text-xs font-mono text-gray-500">Ref: {selectedPurchase.reference_number}</p>
                <p className="text-xs text-gray-500 mt-1">Date: {selectedPurchase.purchase_date}</p>
              </div>
              <div className="text-right">
                <Badge color="green">COMPLETED</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="font-semibold text-gray-500 uppercase text-[10px] mb-1">Supplier Info</p>
                <p className="font-bold text-gray-800 text-sm">{selectedPurchase.supplier_detail?.name}</p>
                <p className="text-gray-600">{selectedPurchase.supplier_detail?.company_name}</p>
                <p className="text-gray-600">{selectedPurchase.supplier_detail?.email}</p>
                <p className="text-gray-600">{selectedPurchase.supplier_detail?.phone}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="font-semibold text-gray-500 uppercase text-[10px] mb-1">Order Details</p>
                <p className="text-gray-600">Created: {new Date(selectedPurchase.created_at).toLocaleString()}</p>
                <p className="text-gray-600">Total Items: {selectedPurchase.items?.length || 0}</p>
                {selectedPurchase.notes && (
                  <p className="text-gray-600 mt-1 italic">Notes: {selectedPurchase.notes}</p>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedPurchase.items?.map((item, idx) => (
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
                <tfoot className="bg-gray-50 font-bold text-gray-900">
                  <tr>
                    <td colSpan="4" className="p-3 text-right">Grand Total:</td>
                    <td className="p-3 text-right text-base text-blue-600">
                      ₹{Number(selectedPurchase.total_amount).toFixed(2)}
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

export default Purchases;
