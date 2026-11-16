import React, { useState, useEffect, useRef } from 'react';
import { productService, categoryService, supplierService } from '../../services';
import {
  Table, Modal, ConfirmModal, Input, Textarea, Select,
  Button, Badge, Pagination, SearchBar, PageLoader, Barcode
} from '../../components/UI';
import {
  Plus, Edit, Trash2, Eye, Image as ImageIcon,
  RefreshCw, Barcode as BarcodeIcon, Printer, Download, Calendar, FileText, CheckCircle2, AlertTriangle, Power
} from 'lucide-react';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'active' | 'inactive'
  const [mfgFilter, setMfgFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [statusTargetProduct, setStatusTargetProduct] = useState(null);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const initialForm = {
    sku: '',
    name: '',
    invoice_number: '',
    manufacture_date: '',
    expiry_date: '',
    description: '',
    category: '',
    supplier: '',
    purchase_price: '',
    selling_price: '',
    stock_quantity: '',
    minimum_stock: '5',
    is_active: true,
  };
  const [formData, setFormData] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (supplierFilter) params.supplier = supplierFilter;
      if (statusFilter) params.status = statusFilter;
      if (mfgFilter) params.manufacture_date = mfgFilter;
      if (expiryFilter) params.expiry_date = expiryFilter;

      const [prodRes, catRes, supRes] = await Promise.all([
        productService.getAll(params),
        categoryService.getAll(),
        supplierService.getAll(),
      ]);

      const data = prodRes.data;
      let list = data.results ? data.results : (Array.isArray(data) ? data : []);
      // Keep strictly sequential: PRD-001, PRD-002, PRD-003...
      list = [...list].sort((a, b) => {
        const numA = parseInt(a.sku?.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.sku?.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });
      setProducts(list);
      setTotalPages(Math.ceil((data.count || list.length) / 10) || 1);

      setCategories(catRes.data.results || catRes.data || []);
      setSuppliers(supRes.data.results || supRes.data || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, categoryFilter, supplierFilter, statusFilter, mfgFilter, expiryFilter]);

  // Fallback monotonic generator based on highest issued number (never reuses deleted gaps)
  const getNextSequentialSku = (currentProducts = products) => {
    let maxNum = 0;
    currentProducts.forEach((p) => {
      const m = p.sku?.match(/\d+/);
      if (m) {
        const num = parseInt(m[0], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `PRD-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const minExpDate = new Date();
  minExpDate.setDate(minExpDate.getDate() + 4);
  const minExpStr = minExpDate.toISOString().slice(0, 10);

  const getNextInvoice = (skuValue) => {
    const year = new Date().getFullYear();
    const m = (skuValue || '').match(/\d+/);
    const numPart = m ? m[0].padStart(3, '0') : '001';
    return `INV-${year}-${numPart}`;
  };

  const handleOpenAdd = async () => {
    setSelectedProduct(null);
    let nextSku = '';
    let nextInv = '';
    try {
      const res = await productService.getNextIdentifiers();
      if (res.data) {
        nextSku = res.data.next_sku || '';
        nextInv = res.data.next_invoice || '';
      }
    } catch (err) {
      console.warn('Could not fetch next identifiers from backend, using sequential fallback', err);
    }

    if (!nextSku) {
      nextSku = getNextSequentialSku(products);
    }
    if (!nextInv) {
      nextInv = getNextInvoice(nextSku);
    }

    setFormData({
      ...initialForm,
      sku: nextSku,
      invoice_number: nextInv,
      manufacture_date: todayStr,
      expiry_date: '',
      is_active: true,
    });
    setImageFile(null);
    setFormErrors({});
    setFormModalOpen(true);
  };

  const handleAutoGenerateIdentifiers = async () => {
    try {
      const res = await productService.getNextIdentifiers();
      if (res.data?.next_sku) {
        setFormData((prev) => ({
          ...prev,
          sku: res.data.next_sku,
          invoice_number: res.data.next_invoice || getNextInvoice(res.data.next_sku),
        }));
        return;
      }
    } catch (e) {
      // fallback to client sequential calculation
    }
    const nextSku = getNextSequentialSku(products);
    setFormData((prev) => ({
      ...prev,
      sku: nextSku,
      invoice_number: getNextInvoice(nextSku),
    }));
  };

  const handleOpenEdit = (p) => {
    setSelectedProduct(p);
    setFormData({
      sku: p.sku || '',
      name: p.name || '',
      invoice_number: p.invoice_number || '',
      manufacture_date: p.manufacture_date || '',
      expiry_date: p.expiry_date || '',
      description: p.description || '',
      category: p.category || '',
      supplier: p.supplier || '',
      purchase_price: p.purchase_price || '',
      selling_price: p.selling_price || '',
      stock_quantity: p.stock_quantity !== undefined && p.stock_quantity !== null ? String(p.stock_quantity) : '',
      minimum_stock: p.minimum_stock !== undefined && p.minimum_stock !== null ? String(p.minimum_stock) : '5',
      is_active: p.is_active !== undefined ? p.is_active : true,
    });
    setImageFile(null);
    setFormErrors({});
    setFormModalOpen(true);
  };

  const handleOpenStatusModal = (p) => {
    setStatusTargetProduct(p);
    setStatusModalOpen(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusTargetProduct) return;
    setActionLoading(true);
    try {
      const res = await productService.toggleActive(statusTargetProduct.id);
      const isNowActive = res.data?.is_active;
      toast.success(
        isNowActive
          ? `Product "${statusTargetProduct.name}" has been reactivated successfully.`
          : `Product "${statusTargetProduct.name}" has been deactivated.`
      );
      setStatusModalOpen(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update product status';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const getError = (field) => {
    if (!formErrors[field]) return null;
    return Array.isArray(formErrors[field]) ? formErrors[field][0] : formErrors[field];
  };

  const validateProductForm = () => {
    const errs = {};
    const name = (formData.name || '').trim();
    if (!name) {
      errs.name = 'Product name is required';
    } else if (name.length < 2) {
      errs.name = 'Product name must be at least 2 characters';
    }

    const sku = (formData.sku || '').trim();
    if (!sku) {
      errs.sku = 'SKU is required (e.g. PRD-001)';
    }

    const invoice = (formData.invoice_number || '').trim();
    if (!invoice) {
      errs.invoice_number = 'Invoice number is required';
    }

    if (!formData.category) {
      errs.category = 'Please select a product category';
    }

    const buyPrice = parseFloat(formData.purchase_price);
    if (isNaN(buyPrice) || buyPrice <= 0) {
      errs.purchase_price = 'Purchase cost must be greater than ₹0';
    }

    const sellPrice = parseFloat(formData.selling_price);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      errs.selling_price = 'Selling price must be greater than ₹0';
    } else if (!isNaN(buyPrice) && sellPrice < buyPrice) {
      errs.selling_price = `Selling price (₹${sellPrice}) cannot be lower than purchase cost (₹${buyPrice})`;
    }

    if (!selectedProduct && formData.stock_quantity !== '') {
      const stock = Number(formData.stock_quantity);
      if (isNaN(stock) || !Number.isInteger(stock) || stock < 0) {
        errs.stock_quantity = 'Stock must be a non-negative whole number (0, 1, 2...)';
      }
    }

    const minStock = Number(formData.minimum_stock);
    if (isNaN(minStock) || !Number.isInteger(minStock) || minStock < 0) {
      errs.minimum_stock = 'Minimum alert level must be 0 or greater';
    }

    if (formData.manufacture_date) {
      if (formData.manufacture_date > todayStr) {
        errs.manufacture_date = 'Manufacture date cannot be in the future (today or earlier only)';
      }
    }

    if (formData.expiry_date) {
      if (formData.expiry_date < minExpStr) {
        errs.expiry_date = `Expiry date must be at least 4 days in the future (cannot expire within 1 to 3 days, min date: ${minExpStr})`;
      } else if (formData.manufacture_date && formData.expiry_date <= formData.manufacture_date) {
        errs.expiry_date = 'Expiry date must be strictly after the manufacture date';
      }
    }

    if (imageFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(imageFile.type)) {
        errs.image = 'Image must be JPEG, PNG, WEBP, or GIF';
      } else if (imageFile.size > 5 * 1024 * 1024) {
        errs.image = 'Image file size must be less than 5MB';
      }
    }

    return errs;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const clientErrors = validateProductForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstError = Object.values(clientErrors)[0];
      toast.error(firstError);
      return;
    }

    setActionLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        if (key === 'stock_quantity') {
          data.append(key, val === '' ? '0' : String(val));
        } else if (key === 'minimum_stock') {
          data.append(key, val === '' ? '5' : String(val));
        } else {
          data.append(key, typeof val === 'string' ? val.trim() : val);
        }
      }
    });
    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      if (selectedProduct) {
        await productService.update(selectedProduct.id, data);
        toast.success('Product updated with Barcode!');
      } else {
        await productService.create(data);
        toast.success('Product added & unique Barcode generated!');
      }
      setFormModalOpen(false);
      fetchData();
    } catch (err) {
      if (err.response?.data) {
        setFormErrors(err.response.data);
        const serverErr = Object.values(err.response.data)[0];
        toast.error(Array.isArray(serverErr) ? serverErr[0] : 'Validation error occurred');
      } else {
        toast.error('Failed to save product');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setActionLoading(true);
    try {
      const res = await productService.delete(selectedProduct.id);
      if (res?.data?.deactivated) {
        toast.success(res.data.message || 'Product has transaction history and was marked as Inactive to preserve records.');
      } else {
        toast.success('Product removed successfully');
      }
      setDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.response?.data?.error || 'Failed to delete product.';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const downloadBarcode = (prod) => {
    const svg = document.getElementById(`barcode-modal-svg-${prod.id}`) || document.getElementById(`barcode-svg-${prod.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = Math.max(img.width + 40, 340);
      canvas.height = img.height + 90;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(prod.name, canvas.width / 2, 26);

      const xOffset = (canvas.width - img.width) / 2;
      ctx.drawImage(img, xOffset, 34);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`₹${Number(prod.selling_price).toFixed(2)}`, canvas.width / 2, canvas.height - 12);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `BARCODE_${prod.sku}_${prod.invoice_number || 'INV'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success('Barcode downloaded successfully!');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printBarcodeLabel = (prod) => {
    const printWindow = window.open('', '_blank');
    const svg = (document.getElementById(`barcode-modal-svg-${prod.id}`) || document.getElementById(`barcode-svg-${prod.id}`))?.outerHTML || '';
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Label - ${prod.sku}</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; text-align: center; }
            .label-card { border: 2px dashed #111; border-radius: 12px; padding: 18px; max-width: 330px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.06); }
            h2 { margin: 0 0 4px 0; font-size: 17px; color: #111; }
            .sku-tag { font-family: monospace; font-size: 13px; color: #2563eb; font-weight: bold; margin-bottom: 8px; }
            .barcode-box { margin: 10px 0; display: flex; justify-content: center; }
            .barcode-box svg { max-width: 100%; height: auto; }
            .meta-grid { font-size: 11px; text-align: left; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .price { font-size: 17px; font-weight: bold; color: #059669; text-align: center; margin-top: 10px; }
            @media print { body { padding: 0; } .label-card { border: 1px solid #000; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="label-card">
            <h2>${prod.name}</h2>
            <div class="sku-tag">${prod.sku}</div>
            <div class="barcode-box">${svg}</div>
            <div class="meta-grid">
              <div class="meta-row"><span>Invoice #:</span><strong>${prod.invoice_number || 'N/A'}</strong></div>
              <div class="meta-row"><span>Mfg Date:</span><strong>${prod.manufacture_date || 'N/A'}</strong></div>
              <div class="meta-row"><span>Expiry Date:</span><strong>${prod.expiry_date || 'N/A'}</strong></div>
              <div class="meta-row"><span>Category:</span><strong>${prod.category_detail?.name || 'Standard'}</strong></div>
            </div>
            <div class="price">₹${Number(prod.selling_price).toFixed(2)}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Products & Inventory Catalog</h2>
          <p className="text-xs text-gray-500">Manage products, lot invoices, manufacturing & expiry dates, and scannable barcodes</p>
        </div>
        <Button onClick={handleOpenAdd} className="self-start sm:self-auto">
          <Plus size={16} /> Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search products..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">All Products</option>
            <option value="active">Active Products</option>
            <option value="inactive">Inactive Products</option>
          </select>

          {/* Manufacture Date Search Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700">
            <Calendar size={13} className="text-gray-400" />
            <span className="text-gray-500 font-medium">Mfg:</span>
            <input
              type="date"
              value={mfgFilter}
              onChange={(e) => { setMfgFilter(e.target.value); setPage(1); }}
              className="text-xs bg-transparent focus:outline-none text-gray-700 cursor-pointer"
              title="Filter by Manufacture Date"
            />
            {mfgFilter && (
              <button
                type="button"
                onClick={() => { setMfgFilter(''); setPage(1); }}
                className="text-gray-400 hover:text-gray-600 font-bold ml-0.5 px-0.5"
                title="Clear Mfg Date Filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Expiry Date Search Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700">
            <Calendar size={13} className="text-gray-400" />
            <span className="text-gray-500 font-medium">Exp:</span>
            <input
              type="date"
              value={expiryFilter}
              onChange={(e) => { setExpiryFilter(e.target.value); setPage(1); }}
              className="text-xs bg-transparent focus:outline-none text-gray-700 cursor-pointer"
              title="Filter by Expiry Date"
            />
            {expiryFilter && (
              <button
                type="button"
                onClick={() => { setExpiryFilter(''); setPage(1); }}
                className="text-gray-400 hover:text-gray-600 font-bold ml-0.5 px-0.5"
                title="Clear Expiry Date Filter"
              >
                ✕
              </button>
            )}
          </div>

          {(search || categoryFilter || supplierFilter || statusFilter || mfgFilter || expiryFilter) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setSupplierFilter('');
                setStatusFilter('');
                setMfgFilter('');
                setExpiryFilter('');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Product', 'SKU', 'Invoice #', 'Status', 'Manufacture Date', 'Expiry Date', 'Barcode', 'Buy / Sell Price', 'Stock Level', 'Actions']}
            empty={products.length === 0 ? 'No products found. Click "Add Product" to create one.' : null}
          >
            {products.map((p) => {
              return (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category_detail?.name || 'Uncategorized'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-bold text-blue-600">
                    {p.sku}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200 inline-block whitespace-nowrap">
                      {p.invoice_number || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar size={13} className="text-gray-400" />
                      <span>{p.manufacture_date || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className={`font-semibold ${p.expiry_status === 'expired' ? 'text-red-600' : 'text-gray-800'}`}>
                        {p.expiry_date || '—'}
                      </span>
                      {p.expiry_status === 'expired' && <Badge color="red">EXPIRED</Badge>}
                      {p.expiry_status === 'expiring_soon' && <Badge color="yellow">SOON</Badge>}
                      {p.expiry_status === 'valid' && <Badge color="green">VALID</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => { setSelectedBarcodeProduct(p); setBarcodeModalOpen(true); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all shadow-2xs hover:scale-105"
                      title="View & Print Barcode"
                    >
                      <BarcodeIcon size={14} className="text-blue-600" />
                      <span>Barcode</span>
                    </button>
                    {/* Hidden SVG for direct download/printing */}
                    <div style={{ display: 'none' }}>
                      <Barcode id={`barcode-svg-${p.id}`} value={p.sku} width={2} height={50} fontSize={14} />
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className="text-gray-500 font-medium">₹{Number(p.purchase_price).toFixed(2)}</span>
                    <span className="text-gray-300 mx-1.5">/</span>
                    <span className="font-bold text-gray-900">₹{Number(p.selling_price).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`font-bold ${p.stock_quantity <= p.minimum_stock ? 'text-amber-600' : 'text-gray-900'}`}>
                      {p.stock_quantity}
                    </span>
                    <span className="text-xs text-gray-400 ml-1.5">(min: {p.minimum_stock})</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setSelectedProduct(p); setDetailModalOpen(true); }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenStatusModal(p)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.is_active
                            ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={p.is_active ? 'Deactivate Product' : 'Reactivate Product'}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => { setSelectedProduct(p); setDeleteModalOpen(true); }}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>

          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={selectedProduct ? 'Edit Product Details' : 'Add New Product & Generate Barcode'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Product SKU <span className="text-red-500">*</span>
                </label>
                {!selectedProduct && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateIdentifiers}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    title="Generate next available sequential SKU & Invoice #"
                  >
                    <RefreshCw size={11} /> Auto Generate
                  </button>
                )}
              </div>
              <input
                className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  getError('sku') ? 'border-red-400 bg-red-50/50 text-red-900 ring-1 ring-red-300' : 'border-gray-200 bg-white'
                }`}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. PRD-005"
                required
              />
              {getError('sku') && <p className="mt-1 text-xs text-red-600 font-medium">{getError('sku')}</p>}
            </div>

            <Input
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={getError('name')}
              placeholder="e.g. Logitech Wireless Mouse"
              required
            />
          </div>

          {/* Product Active / Inactive Status Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Product Status</p>
                {formData.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inactive
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {formData.is_active
                  ? 'Active: Available for purchases, sales, and stock movements.'
                  : 'Inactive: Hidden from new transaction dropdowns; historical data remains intact.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Invoice Number & Date Fields */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-blue-600" />
                Invoice & Batch Expiry Tracking
              </span>
              <button
                type="button"
                onClick={handleAutoGenerateIdentifiers}
                className="text-[11px] text-blue-700 hover:underline font-semibold"
              >
                Auto Generate Invoice #
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Invoice Number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                error={getError('invoice_number')}
                placeholder="e.g. INV-2026-001"
                required
              />
              <div>
                <Input
                  label="Manufacture Date"
                  type="date"
                  max={todayStr}
                  value={formData.manufacture_date}
                  onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })}
                  error={getError('manufacture_date')}
                />
                <span className="text-[10px] text-gray-500 block mt-1">Today or earlier (no future)</span>
              </div>
              <div>
                <Input
                  label="Expiry Date"
                  type="date"
                  min={minExpStr}
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  error={getError('expiry_date')}
                />
                <span className="text-[10px] text-gray-500 block mt-1">Min 4 days future (min: {minExpStr})</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              error={getError('category')}
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>

            <Select
              label="Supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              error={getError('supplier')}
            >
              <option value="">Select Supplier (Optional)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Purchase Price (₹)"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              error={getError('purchase_price')}
              required
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
              error={getError('selling_price')}
              required
            />
            <Input
              label="Initial Stock"
              type="number"
              min="0"
              placeholder="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              error={getError('stock_quantity')}
              disabled={!!selectedProduct}
              title={selectedProduct ? "Stock is adjusted via Purchases or Stock Adjustments" : ""}
            />
            <Input
              label="Min Alert Level"
              type="number"
              min="0"
              placeholder="5"
              value={formData.minimum_stock}
              onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
              error={getError('minimum_stock')}
              required
            />
          </div>

          <Textarea
            label="Product Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={getError('description')}
            placeholder="Detailed specifications..."
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Product Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {getError('image') && <p className="mt-1 text-xs text-red-600 font-medium">{getError('image')}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setFormModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              {selectedProduct ? 'Update Product' : 'Create & Generate Barcode'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Product: ${selectedProduct.name}`}
          size="lg"
        >
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedProduct.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-mono font-semibold text-blue-600">{selectedProduct.sku}</p>
                    {selectedProduct.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Invoice: <span className="font-mono font-semibold text-gray-800">{selectedProduct.invoice_number || 'N/A'}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printBarcodeLabel(selectedProduct)}
                  className="flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print Label
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadBarcode(selectedProduct)}
                  className="flex items-center gap-1.5"
                >
                  <Download size={14} /> Download Barcode
                </Button>
              </div>
            </div>

            {/* Barcode and Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-full flex justify-center py-2 overflow-hidden">
                  <Barcode id={`barcode-modal-svg-${selectedProduct.id}`} value={selectedProduct.sku} width={2.2} height={60} fontSize={14} />
                </div>
                <p className="text-[11px] font-mono font-semibold text-gray-700 mt-2">Scan SKU Barcode</p>
              </div>

              <div className="sm:col-span-2 grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-500">Invoice Number:</span>
                  <p className="font-mono font-bold text-gray-800 mt-0.5">{selectedProduct.invoice_number || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedProduct.category_detail?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Manufacture Date:</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedProduct.manufacture_date || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Expiry Date:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-gray-800">{selectedProduct.expiry_date || 'N/A'}</span>
                    {selectedProduct.expiry_status === 'expired' && <Badge color="red">EXPIRED</Badge>}
                    {selectedProduct.expiry_status === 'expiring_soon' && <Badge color="yellow">EXPIRING SOON</Badge>}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Purchase Price:</span>
                  <p className="font-semibold text-gray-800 mt-0.5">₹{Number(selectedProduct.purchase_price).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Selling Price:</span>
                  <p className="font-bold text-emerald-600 mt-0.5">₹{Number(selectedProduct.selling_price).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Available Stock:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedProduct.stock_quantity} units</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Stock Value:</span>
                  <p className="font-bold text-blue-600 mt-0.5">₹{Number(selectedProduct.stock_value || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {selectedProduct.description && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                <p className="text-xs text-gray-700 bg-white p-3 border border-gray-100 rounded-lg">
                  {selectedProduct.description}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Standalone Barcode Modal */}
      {selectedBarcodeProduct && (
        <Modal
          isOpen={barcodeModalOpen}
          onClose={() => setBarcodeModalOpen(false)}
          title={`Product Barcode — ${selectedBarcodeProduct.sku}`}
          size="sm"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-md w-full flex justify-center overflow-hidden">
              <Barcode
                id={`barcode-modal-svg-${selectedBarcodeProduct.id}`}
                value={selectedBarcodeProduct.sku}
                width={2.4}
                height={70}
                fontSize={15}
              />
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-base">{selectedBarcodeProduct.name}</h3>
              <p className="font-mono text-xs text-blue-600 font-semibold">{selectedBarcodeProduct.sku}</p>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>Invoice: <strong className="font-mono text-gray-800">{selectedBarcodeProduct.invoice_number || 'N/A'}</strong></p>
                <p>Mfg: <strong>{selectedBarcodeProduct.manufacture_date || 'N/A'}</strong> | Exp: <strong>{selectedBarcodeProduct.expiry_date || 'N/A'}</strong></p>
                <p className="text-emerald-700 font-bold text-sm">Selling Price: ₹{Number(selectedBarcodeProduct.selling_price).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3 w-full pt-2">
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-1.5"
                onClick={() => printBarcodeLabel(selectedBarcodeProduct)}
              >
                <Printer size={15} /> Print Label
              </Button>
              <Button
                className="flex-1 flex items-center justify-center gap-1.5"
                onClick={() => downloadBarcode(selectedBarcodeProduct)}
              >
                <Download size={15} /> Save PNG
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Activate / Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        loading={actionLoading}
        title={statusTargetProduct?.is_active ? 'Deactivate Product' : 'Reactivate Product'}
        message={
          statusTargetProduct?.is_active
            ? `Are you sure you want to deactivate "${statusTargetProduct?.name}" (${statusTargetProduct?.sku})? It will be hidden from new purchase and sales product selection dropdowns and stock transactions, while historical records will remain intact.`
            : `Are you sure you want to reactivate "${statusTargetProduct?.name}" (${statusTargetProduct?.sku})? It will immediately become available again for new purchases, sales, and stock movements.`
        }
        confirmText={statusTargetProduct?.is_active ? 'Deactivate Product' : 'Reactivate Product'}
        confirmColor={statusTargetProduct?.is_active ? 'amber' : 'emerald'}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}" (${selectedProduct?.sku})? This action cannot be undone.`}
      />
    </div>
  );
};

export default Products;
