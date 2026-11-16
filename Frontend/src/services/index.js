import api from './api';

export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  logout: (refreshToken) => api.post('/auth/logout/', { refresh_token: refreshToken }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
};

export const userService = {
  getAll: (params) => api.get('/auth/users/', { params }),
  getOne: (id) => api.get(`/auth/users/${id}/`),
  create: (data) => api.post('/auth/users/', data),
  update: (id, data) => api.patch(`/auth/users/${id}/`, data),
  delete: (id) => api.delete(`/auth/users/${id}/`),
};

export const categoryService = {
  getAll: (params) => api.get('/categories/', { params }),
  getOne: (id) => api.get(`/categories/${id}/`),
  create: (data) => api.post('/categories/', data),
  update: (id, data) => api.patch(`/categories/${id}/`, data),
  delete: (id) => api.delete(`/categories/${id}/`),
};

export const supplierService = {
  getAll: (params) => api.get('/suppliers/', { params }),
  getOne: (id) => api.get(`/suppliers/${id}/`),
  create: (data) => api.post('/suppliers/', data),
  update: (id, data) => api.patch(`/suppliers/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/${id}/`),
};

export const customerService = {
  getAll: (params) => api.get('/customers/', { params }),
  getOne: (id) => api.get(`/customers/${id}/`),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.patch(`/customers/${id}/`, data),
  delete: (id) => api.delete(`/customers/${id}/`),
};

export const productService = {
  getAll: (params) => api.get('/products/', { params }),
  getOne: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => {
    const isFormData = data instanceof FormData;
    return api.patch(`/products/${id}/`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
  },
  delete: (id) => api.delete(`/products/${id}/`),
  getNextIdentifiers: () => api.get('/products/next_identifiers/'),
  toggleActive: (id) => api.post(`/products/${id}/toggle_active/`),
  getLowStock: () => api.get('/products/low_stock/'),
  getOutOfStock: () => api.get('/products/out_of_stock/'),
};

export const purchaseService = {
  getAll: (params) => api.get('/purchases/', { params }),
  getOne: (id) => api.get(`/purchases/${id}/`),
  create: (data) => api.post('/purchases/', data),
  update: (id, data) => api.patch(`/purchases/${id}/`, data),
  delete: (id) => api.delete(`/purchases/${id}/`),
};

export const saleService = {
  getAll: (params) => api.get('/sales/', { params }),
  getOne: (id) => api.get(`/sales/${id}/`),
  create: (data) => api.post('/sales/', data),
  update: (id, data) => api.patch(`/sales/${id}/`, data),
  delete: (id) => api.delete(`/sales/${id}/`),
};

export const inventoryService = {
  getMovements: (params) => api.get('/inventory/movements/', { params }),
  createMovement: (data) => api.post('/inventory/movements/', data),
  getLowStock: () => api.get('/inventory/movements/low_stock_products/'),
  getOutOfStock: () => api.get('/inventory/movements/out_of_stock_products/'),
};

export const reportService = {
  getDashboard: () => api.get('/reports/dashboard/'),
  getSalesReport: (params) => api.get('/reports/sales/', { params }),
  getPurchaseReport: (params) => api.get('/reports/purchases/', { params }),
  getStockReport: (params) => api.get('/reports/stock/', { params }),
};
