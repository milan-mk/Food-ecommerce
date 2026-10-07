import api, { body } from './api';

export const getStats = (days, opts) => body(api.get('/admin/stats', { params: { days }, ...opts }));

export const getAdminOrders = (params, opts) => body(api.get('/admin/orders', { params, ...opts }));
export const setOrderStatus = (id, status) => body(api.put(`/admin/orders/${id}/status`, { status }));
export const refundOrder = (id) => body(api.post(`/admin/orders/${id}/refund`));

export const getUsers = (params, opts) => body(api.get('/admin/users', { params, ...opts }));
export const getUser = (id, opts) => body(api.get(`/admin/users/${id}`, opts));
export const updateUser = (id, payload) => body(api.put(`/admin/users/${id}`, payload));

export const getInventory = (params, opts) => body(api.get('/admin/inventory', { params, ...opts }));
export const updateStock = (id, payload) => body(api.put(`/admin/inventory/${id}`, payload));

export const getCoupons = (opts) => body(api.get('/admin/coupons', opts));
export const createCoupon = (payload) => body(api.post('/admin/coupons', payload));
export const updateCoupon = (id, payload) => body(api.put(`/admin/coupons/${id}`, payload));
export const deleteCoupon = (id) => body(api.delete(`/admin/coupons/${id}`));

export const createProduct = (payload) => body(api.post('/products', payload));
export const updateProduct = (id, payload) => body(api.put(`/products/${id}`, payload));
export const deleteProduct = (id) => body(api.delete(`/products/${id}`));

export const createCategory = (payload) => body(api.post('/categories', payload));
export const updateCategory = (id, payload) => body(api.put(`/categories/${id}`, payload));
export const deleteCategory = (id) => body(api.delete(`/categories/${id}`));
