import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services';
import {
  Table, Modal, ConfirmModal, Input, Textarea,
  Button, Pagination, SearchBar, PageLoader
} from '../../components/UI';
import { Plus, Edit, Trash2, Truck, Mail, Phone, MapPin, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const initialForm = {
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const res = await supplierService.getAll(params);
      const data = res.data;
      if (data.results) {
        setSuppliers(data.results);
        setTotalPages(Math.ceil(data.count / 10) || 1);
      } else {
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page, search]);

  const handleOpenAdd = () => {
    setSelectedSupplier(null);
    setFormData(initialForm);
    setErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setSelectedSupplier(s);
    setFormData({
      name: s.name,
      company_name: s.company_name || '',
      email: s.email,
      phone: s.phone,
      address: s.address || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const getError = (field) => {
    if (!errors[field]) return null;
    return Array.isArray(errors[field]) ? errors[field][0] : errors[field];
  };

  const validateSupplier = () => {
    const errs = {};
    const name = (formData.name || '').trim();
    if (!name) {
      errs.name = 'Contact person name is required';
    } else if (name.length < 2) {
      errs.name = 'Contact name must be at least 2 characters';
    }

    const email = (formData.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(email)) {
      errs.email = 'Please enter a valid email address (e.g. vendor@domain.com)';
    }

    const phone = (formData.phone || '').trim();
    const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
    if (!phone) {
      errs.phone = 'Phone number is required';
    } else if (!phoneRegex.test(phone)) {
      errs.phone = 'Please enter a valid phone number (at least 7 digits)';
    }

    if (formData.address && formData.address.length > 500) {
      errs.address = 'Address cannot exceed 500 characters';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = validateSupplier();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const first = Object.values(clientErrors)[0];
      toast.error(first);
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        company_name: (formData.company_name || '').trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: (formData.address || '').trim(),
      };
      if (selectedSupplier) {
        await supplierService.update(selectedSupplier.id, payload);
        toast.success('Supplier updated successfully');
      } else {
        await supplierService.create(payload);
        toast.success('Supplier created successfully');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
        const serverErr = Object.values(err.response.data)[0];
        toast.error(Array.isArray(serverErr) ? serverErr[0] : 'Validation failed');
      } else {
        toast.error('Failed to save supplier');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    setActionLoading(true);
    try {
      await supplierService.delete(selectedSupplier.id);
      toast.success('Supplier deleted successfully');
      setDeleteModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      toast.error('Cannot delete supplier. Products or purchases may be linked to them.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Supplier Directory</h2>
          <p className="text-xs text-gray-500">Vendors and partners providing goods and stock</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus size={16} /> Add Supplier
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search name, company, email, phone..."
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchSuppliers} className="self-end sm:self-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Supplier / Contact', 'Company', 'Contact Info', 'Address', 'Actions']}
            empty={suppliers.length === 0 ? 'No suppliers found.' : null}
          >
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <Truck size={16} />
                    </div>
                    <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {s.company_name || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="space-y-0.5 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Mail size={12} className="text-gray-400" />
                      <span>{s.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Phone size={12} className="text-gray-400" />
                      <span>{s.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                  {s.address || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => { setSelectedSupplier(s); setDeleteModalOpen(true); }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>

          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedSupplier ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={getError('name')}
              placeholder="e.g. John Doe"
              required
            />
            <Input
              label="Company Name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              error={getError('company_name')}
              placeholder="e.g. TechCorp LLC"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={getError('email')}
              placeholder="supplier@company.com"
              required
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={getError('phone')}
              placeholder="+91 98400 12345"
              required
            />
          </div>

          <Textarea
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={getError('address')}
            placeholder="e.g. SIPCOT Industrial Complex, Hosur, Tamil Nadu 635126"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              {selectedSupplier ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier "${selectedSupplier?.name}"?`}
      />
    </div>
  );
};

export default Suppliers;
