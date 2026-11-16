import React, { useState, useEffect } from 'react';
import { inventoryService, productService } from '../../services';
import {
  Table, Modal, Input, Textarea, Select,
  Button, Badge, Pagination, SearchBar, PageLoader
} from '../../components/UI';
import {
  Warehouse, ArrowUpRight, ArrowDownLeft, Sliders,
  AlertTriangle, XCircle, Clock, RefreshCw, Plus, PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const REASON_LABELS = {
  purchase: 'Purchase Receiving',
  adjustment: 'Physical Audit / Count',
  damage: 'Damaged / Broken',
  expired: 'Expired Lot Disposal',
  return: 'Supplier Return',
};

const Stock = () => {
  const [tab, setTab] = useState('overview'); // 'overview' | 'movements' | 'alerts'
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Adjustment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [movementForm, setMovementForm] = useState({
    product: '',
    movement_type: 'adjustment', // 'in' | 'out' | 'adjustment'
    reason: 'adjustment',
    quantity: '',
    notes: '',
  });

  const getError = (field) => {
    if (!errors[field]) return null;
    return Array.isArray(errors[field]) ? errors[field][0] : errors[field];
  };

  const validateStockMovement = () => {
    const errs = {};
    if (!movementForm.product) {
      errs.product = 'Please select a product';
    }

    const qty = Number(movementForm.quantity);
    if (movementForm.quantity === '' || isNaN(qty) || !Number.isInteger(qty)) {
      errs.quantity = 'Please enter a valid whole number for quantity';
    } else if (movementForm.movement_type === 'in' && qty <= 0) {
      errs.quantity = 'Quantity to add must be at least 1 unit';
    } else if (movementForm.movement_type === 'out') {
      if (qty <= 0) {
        errs.quantity = 'Quantity to deduct must be at least 1 unit';
      } else {
        const prod = products.find((p) => p.id === parseInt(movementForm.product, 10));
        if (prod && qty > prod.stock_quantity) {
          errs.quantity = `Cannot deduct ${qty} units. Only ${prod.stock_quantity} units available in stock!`;
        }
      }
    } else if (movementForm.movement_type === 'adjustment' && qty < 0) {
      errs.quantity = 'Audit stock count cannot be negative';
    }

    if (!movementForm.reason) {
      errs.reason = 'Please select a reason';
    }

    return errs;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'overview' || tab === 'alerts') {
        const res = await productService.getAll({ search, page_size: 50 });
        const data = res.data;
        const list = data.results || (Array.isArray(data) ? data : []);
        setProducts(list);
      } else {
        const res = await inventoryService.getMovements({ page, search });
        const data = res.data;
        if (data.results) {
          setMovements(data.results);
          setTotalPages(Math.ceil(data.count / 10) || 1);
        } else {
          setMovements(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab, page, search]);

  const handleOpenAdjustment = async (prod = null, type = 'adjustment') => {
    if (prod && !prod.is_active) {
      toast.error('Cannot adjust stock for an inactive product. Please reactivate it in the Products page first.');
      return;
    }
    setErrors({});
    let activeProds = products.filter((p) => p.is_active !== false);
    if (activeProds.length === 0) {
      try {
        const res = await productService.getAll({ status: 'active', page_size: 100 });
        activeProds = res.data?.results || res.data || [];
        setProducts(activeProds);
      } catch (e) {
        // ignore
      }
    }
    const defaultProdId = prod ? prod.id : (activeProds[0]?.id || '');
    setMovementForm({
      product: defaultProdId,
      movement_type: type,
      reason: type === 'in' ? 'purchase' : type === 'out' ? 'damage' : 'adjustment',
      quantity: type === 'adjustment' && prod ? String(prod.stock_quantity) : '1',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = validateStockMovement();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const first = Object.values(clientErrors)[0];
      toast.error(first);
      return;
    }

    const qty = parseInt(movementForm.quantity, 10);
    setActionLoading(true);
    try {
      await inventoryService.createMovement({
        ...movementForm,
        quantity: qty,
        notes: (movementForm.notes || '').trim(),
      });
      toast.success('Stock adjusted successfully!');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
        const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to adjust stock';
        toast.error(msg);
      } else {
        toast.error('Failed to adjust stock');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (tab === 'alerts') {
      return p.stock_status === 'low_stock' || p.stock_status === 'out_of_stock';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Stock & Inventory Management</h2>
          <p className="text-xs text-gray-500">Track stock levels, physical counts, lot disposals, and audit movements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => handleOpenAdjustment(null, 'in')} className="shadow-2xs">
            <ArrowUpRight size={14} className="text-emerald-600" /> Stock In
          </Button>
          <Button variant="secondary" onClick={() => handleOpenAdjustment(null, 'out')} className="shadow-2xs">
            <ArrowDownLeft size={14} className="text-red-500" /> Stock Out
          </Button>
          <Button onClick={() => handleOpenAdjustment(null, 'adjustment')} className="shadow-sm">
            <Sliders size={14} /> Adjust Count
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => { setTab('overview'); setPage(1); }}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex-shrink-0 ${
            tab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Stock Overview
        </button>
        <button
          onClick={() => { setTab('alerts'); setPage(1); }}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
            tab === 'alerts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle size={14} className="text-amber-500" />
          Low & Out of Stock Alerts
        </button>
        <button
          onClick={() => { setTab('movements'); setPage(1); }}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
            tab === 'movements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={14} />
          Movement Audit Trail
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        <div className="w-full sm:w-96">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search stock..."
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData} className="self-end sm:self-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Content based on Tab */}
      {loading ? (
        <PageLoader />
      ) : tab === 'movements' ? (
        /* Movements Table */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Date & Time', 'Product', 'Type', 'Reason', 'Quantity Change', 'Prev → New Stock', 'Audit Notes', 'Logged By']}
            empty={movements.length === 0 ? 'No stock movement audit records found.' : null}
          >
            {movements.map((m) => {
              const typeColor = m.movement_type === 'in' ? 'green' : m.movement_type === 'out' ? 'red' : 'blue';
              const typeText = m.movement_type === 'in' ? 'STOCK IN' : m.movement_type === 'out' ? 'STOCK OUT' : 'ADJUST';
              const reasonText = REASON_LABELS[m.reason] || m.reason;

              return (
                <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-sm text-gray-800">{m.product_name}</p>
                    <p className="text-xs font-mono text-blue-600">{m.product_sku}</p>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <Badge color={typeColor}>{typeText}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-medium">
                    {reasonText}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">
                    {m.movement_type === 'out' ? (
                      <span className="text-red-600 font-mono">-{Math.abs(m.quantity)}</span>
                    ) : m.movement_type === 'in' ? (
                      <span className="text-emerald-600 font-mono">+{Math.abs(m.quantity)}</span>
                    ) : (
                      <span className="text-blue-600 font-mono">
                        {m.new_stock >= m.previous_stock ? `+${m.new_stock - m.previous_stock}` : `${m.new_stock - m.previous_stock}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                    {m.previous_stock} → <span className="font-bold text-gray-900">{m.new_stock}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                    {m.notes || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {m.created_by_name || 'System'}
                  </td>
                </tr>
              );
            })}
          </Table>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </div>
      ) : (
        /* Overview or Alerts Table */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Product', 'SKU', 'Available Stock', 'Threshold (Min)', 'Status', 'Stock Value', 'Action']}
            empty={filteredProducts.length === 0 ? 'No matching products found.' : null}
          >
            {filteredProducts.map((p) => {
              const statusColor =
                p.stock_status === 'in_stock' ? 'green' :
                p.stock_status === 'low_stock' ? 'yellow' : 'red';
              const statusLabel =
                p.stock_status === 'in_stock' ? 'In Stock' :
                p.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock';

              return (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-sm text-gray-800 whitespace-nowrap">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold whitespace-nowrap">{p.sku}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-800 whitespace-nowrap">
                    <span className={`text-base ${p.stock_quantity <= p.minimum_stock ? 'text-red-600' : 'text-gray-900'}`}>
                      {p.stock_quantity}
                    </span> units
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {p.minimum_stock} units
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Badge color={statusColor}>{statusLabel}</Badge>
                      {!p.is_active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-800 whitespace-nowrap">
                    ₹{Number(p.stock_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAdjustment(p, 'adjustment')}
                      disabled={!p.is_active}
                      title={!p.is_active ? 'Reactivate product to adjust stock' : 'Adjust stock'}
                    >
                      Adjust
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Warehouse Stock Adjustment"
        size="md"
      >
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
          <Select
            label="Product"
            value={movementForm.product}
            onChange={(e) => setMovementForm({ ...movementForm, product: e.target.value })}
            error={getError('product')}
            required
          >
            <option value="">Select Product...</option>
            {products.filter((p) => p.is_active !== false).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — Current: {p.stock_quantity} units
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Action Type"
              value={movementForm.movement_type}
              onChange={(e) => {
                const newType = e.target.value;
                setMovementForm({
                  ...movementForm,
                  movement_type: newType,
                  reason: newType === 'in' ? 'purchase' : newType === 'out' ? 'damage' : 'adjustment',
                });
              }}
              error={getError('movement_type')}
              required
            >
              <option value="in">Stock In (+ Add)</option>
              <option value="out">Stock Out (- Deduct)</option>
              <option value="adjustment">Manual Set (Exact Count)</option>
            </Select>

            <Select
              label="Reason"
              value={movementForm.reason}
              onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
              error={getError('reason')}
              required
            >
              {movementForm.movement_type === 'in' ? (
                <>
                  <option value="purchase">Purchase Receiving / Inflow</option>
                  <option value="adjustment">Physical Count Surplus</option>
                  <option value="return">Returned to Storage / Restock</option>
                </>
              ) : movementForm.movement_type === 'out' ? (
                <>
                  <option value="damage">Damaged / Broken Goods</option>
                  <option value="expired">Expired Lot Disposal</option>
                  <option value="return">Returned to Supplier / Vendor</option>
                  <option value="adjustment">Physical Count Shortage / Shrinkage</option>
                </>
              ) : (
                <>
                  <option value="adjustment">Manual Physical Audit Count</option>
                  <option value="damage">Damage Correction</option>
                  <option value="expired">Expired Batch Correction</option>
                </>
              )}
            </Select>
          </div>

          <Input
            label={
              movementForm.movement_type === 'adjustment'
                ? 'New Absolute Stock Quantity'
                : 'Quantity to Add / Deduct'
            }
            type="number"
            min="0"
            placeholder="0"
            value={movementForm.quantity}
            onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
            error={getError('quantity')}
            required
          />

          <Textarea
            label="Audit Notes / Reason Description"
            value={movementForm.notes}
            onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
            error={getError('notes')}
            placeholder="e.g. Broken packaging, physical count audit, supplier batch return..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Save Stock Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Stock;
