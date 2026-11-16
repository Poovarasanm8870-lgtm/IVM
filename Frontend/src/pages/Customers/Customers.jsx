import React, { useState, useEffect } from 'react';
import { customerService } from '../../services';
import {
  Table, Modal, ConfirmModal, Input, Textarea,
  Button, Pagination, SearchBar, PageLoader
} from '../../components/UI';
import { Plus, Edit, Trash2, Users, Mail, Phone, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const initialForm = {
    name: '',
    email: '',
    phone: '',
    address: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const res = await customerService.getAll(params);
      const data = res.data;
      if (data.results) {
        setCustomers(data.results);
        setTotalPages(Math.ceil(data.count / 10) || 1);
      } else {
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setFormData(initialForm);
    setErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrors({});
    try {
      if (selectedCustomer) {
        await customerService.update(selectedCustomer.id, formData);
        toast.success('Customer updated successfully');
      } else {
        await customerService.create(formData);
        toast.success('Customer created successfully');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        toast.error('Failed to save customer');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setActionLoading(true);
    try {
      await customerService.delete(selectedCustomer.id);
      toast.success('Customer deleted successfully');
      setDeleteModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error('Cannot delete customer. Sales orders may be linked to them.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Customer Directory</h2>
          <p className="text-xs text-gray-500">Clients and buyers purchasing inventory items</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus size={16} /> Add Customer
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-3 items-center justify-between shadow-sm">
        <div className="w-full md:w-80">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search customer name, email, phone..."
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchCustomers}>
          <RefreshCw size={14} />
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Customer Name', 'Email', 'Phone', 'Address', 'Joined Date', 'Actions']}
            empty={customers.length === 0 ? 'No customers found.' : null}
          >
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm text-gray-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="text-gray-400" />
                    <span>{c.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    <span>{c.phone}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                  {c.address || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => { setSelectedCustomer(c); setDeleteModalOpen(true); }}
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
        title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Customer Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name?.[0]}
            placeholder="e.g. Acme Corporation"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email?.[0]}
              placeholder="customer@email.com"
              required
            />
            <Input
              label="Phone Number *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={errors.phone?.[0]}
              placeholder="+91 98765 43210"
              required
            />
          </div>

          <Textarea
            label="Billing / Shipping Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g. 12 Anna Salai, Guindy, Chennai, Tamil Nadu 600032"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              {selectedCustomer ? 'Update' : 'Create'}
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
        title="Delete Customer"
        message={`Are you sure you want to delete customer "${selectedCustomer?.name}"?`}
      />
    </div>
  );
};

export default Customers;
