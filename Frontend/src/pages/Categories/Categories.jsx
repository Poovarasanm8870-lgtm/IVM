import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services';
import {
  Table, Modal, ConfirmModal, Input, Textarea,
  Button, Badge, Pagination, SearchBar, PageLoader
} from '../../components/UI';
import { Plus, Edit, Trash2, Tag, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const res = await categoryService.getAll(params);
      const data = res.data;
      if (data.results) {
        setCategories(data.results);
        setTotalPages(Math.ceil(data.count / 10) || 1);
      } else {
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page, search]);

  const handleOpenAdd = () => {
    setSelectedCategory(null);
    setFormData({ name: '', description: '' });
    setErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setSelectedCategory(c);
    setFormData({ name: c.name, description: c.description || '' });
    setErrors({});
    setModalOpen(true);
  };

  const getError = (field) => {
    if (!errors[field]) return null;
    return Array.isArray(errors[field]) ? errors[field][0] : errors[field];
  };

  const validateCategory = () => {
    const errs = {};
    const name = (formData.name || '').trim();
    if (!name) {
      errs.name = 'Category name is required';
    } else if (name.length < 2) {
      errs.name = 'Category name must be at least 2 characters';
    } else if (name.length > 100) {
      errs.name = 'Category name cannot exceed 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errs.description = 'Description cannot exceed 500 characters';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = validateCategory();
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
        description: (formData.description || '').trim(),
      };
      if (selectedCategory) {
        await categoryService.update(selectedCategory.id, payload);
        toast.success('Category updated successfully');
      } else {
        await categoryService.create(payload);
        toast.success('Category created successfully');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
        const serverErr = Object.values(err.response.data)[0];
        toast.error(Array.isArray(serverErr) ? serverErr[0] : 'Validation failed');
      } else {
        toast.error('Failed to save category');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setActionLoading(true);
    try {
      await categoryService.delete(selectedCategory.id);
      toast.success('Category deleted successfully');
      setDeleteModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error('Cannot delete category. Products may be assigned to it.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Category Management</h2>
          <p className="text-xs text-gray-500">Organize and group products into catalog categories</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus size={16} /> Add Category
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search category name..."
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchCategories} className="self-end sm:self-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['Category Name', 'Description', 'Product Count', 'Created At', 'Actions']}
            empty={categories.length === 0 ? 'No categories found.' : null}
          >
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Tag size={16} />
                    </div>
                    <span className="font-semibold text-sm text-gray-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-sm truncate">
                  {c.description || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <Badge color="blue">{c.product_count ?? 0} Products</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 font-mono">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => { setSelectedCategory(c); setDeleteModalOpen(true); }}
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
        title={selectedCategory ? 'Edit Category' : 'Create Category'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={getError('name')}
            placeholder="e.g. Wireless Audio"
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={getError('description')}
            placeholder="Brief overview of items in this category..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              {selectedCategory ? 'Update' : 'Create'}
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
        title="Delete Category"
        message={`Are you sure you want to delete category "${selectedCategory?.name}"?`}
      />
    </div>
  );
};

export default Categories;
