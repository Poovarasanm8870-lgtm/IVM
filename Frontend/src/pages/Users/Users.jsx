import React, { useState, useEffect } from 'react';
import { userService } from '../../services';
import {
  Table, Modal, ConfirmModal, Input, Select,
  Button, Badge, Pagination, SearchBar, PageLoader
} from '../../components/UI';
import { Plus, Edit, Trash2, UserCheck, UserX, Shield, User, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const initialForm = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'staff',
    phone: '',
    is_active: true,
    password: '',
    password2: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const res = await userService.getAll(params);
      const data = res.data;
      if (data.results) {
        setUsers(data.results);
        setTotalPages(Math.ceil(data.count / 10) || 1);
      } else {
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData(initialForm);
    setErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setFormData({
      username: u.username,
      email: u.email,
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      role: u.role || 'staff',
      phone: u.phone || '',
      is_active: u.is_active,
      password: '',
      password2: '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleToggleActive = async (u) => {
    try {
      await userService.update(u.id, { is_active: !u.is_active });
      toast.success(`User ${!u.is_active ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const getError = (field) => {
    if (!errors[field]) return null;
    return Array.isArray(errors[field]) ? errors[field][0] : errors[field];
  };

  const validateUser = () => {
    const errs = {};
    if (!formData.first_name.trim()) errs.first_name = 'First name is required';
    if (!formData.last_name.trim()) errs.last_name = 'Last name is required';

    const u = formData.username.trim();
    if (!u) {
      errs.username = 'Username is required';
    } else if (u.length < 3) {
      errs.username = 'Username must be at least 3 characters';
    }

    const email = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!selectedUser) {
      if (!formData.password) {
        errs.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errs.password = 'Password must be at least 8 characters';
      }
      if (!formData.password2) {
        errs.password2 = 'Please confirm password';
      } else if (formData.password !== formData.password2) {
        errs.password2 = 'Passwords do not match';
      }
    }

    if (formData.phone && !/^[0-9+\-\s()]{7,20}$/.test(formData.phone.trim())) {
      errs.phone = 'Please enter a valid phone number';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = validateUser();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const first = Object.values(clientErrors)[0];
      toast.error(first);
      return;
    }

    setActionLoading(true);
    try {
      if (selectedUser) {
        const payload = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          role: formData.role,
          phone: (formData.phone || '').trim(),
          is_active: formData.is_active,
        };
        await userService.update(selectedUser.id, payload);
        toast.success('User updated successfully');
      } else {
        await userService.create({
          ...formData,
          username: formData.username.trim(),
          email: formData.email.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: (formData.phone || '').trim(),
        });
        toast.success('User created successfully');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
        const serverErr = Object.values(err.response.data)[0];
        toast.error(Array.isArray(serverErr) ? serverErr[0] : 'Validation failed');
      } else {
        toast.error('Failed to save user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await userService.delete(selectedUser.id);
      toast.success('User deleted successfully');
      setDeleteModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error('Cannot delete this user');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">User Management</h2>
          <p className="text-xs text-gray-500">Manage team member roles, permissions, and account status</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus size={16} /> Add New User
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search username, email, name..."
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchUsers} className="self-end sm:self-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <Table
            headers={['User', 'Username', 'Email', 'Role', 'Status', 'Joined Date', 'Actions']}
            empty={users.length === 0 ? 'No users found.' : null}
          >
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {(u.first_name?.charAt(0) || u.username.charAt(0)).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {u.full_name || u.username}
                      </p>
                      <p className="text-xs text-gray-400">{u.phone || 'No phone'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">{u.username}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{u.email}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <Badge color={u.role === 'admin' ? 'purple' : 'blue'}>
                    {u.role?.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <Badge color={u.is_active ? 'green' : 'red'}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap font-mono">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        u.is_active
                          ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={u.is_active ? 'Deactivate User' : 'Activate User'}
                    >
                      {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => { setSelectedUser(u); setDeleteModalOpen(true); }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete User"
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
        title={selectedUser ? 'Edit User Details' : 'Add New System User'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              error={getError('first_name')}
              placeholder="e.g. Sarah"
              required
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              error={getError('last_name')}
              placeholder="e.g. Connor"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              error={getError('username')}
              disabled={!!selectedUser}
              placeholder="sconnor"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={getError('email')}
              placeholder="sconnor@company.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="System Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              error={getError('role')}
              required
            >
              <option value="staff">Staff (Standard Access)</option>
              <option value="admin">Admin (Full Control)</option>
            </Select>
            <Input
              label="Phone Number"
              value={formData.phone}
              placeholder="+91 98765 43210"
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={getError('phone')}
            />
          </div>

          {!selectedUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={getError('password')}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                value={formData.password2}
                onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                error={getError('password2')}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              {selectedUser ? 'Update User' : 'Create User'}
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
        title="Delete User"
        message={`Are you sure you want to delete user "${selectedUser?.username}"?`}
      />
    </div>
  );
};

export default Users;
