import api, { body } from './api';
export const quote = (items, couponCode) => body(api.post('/orders/quote', { items, couponCode }));
export const createOrder = (payload) => body(api.post('/orders', payload));
export const getMyOrders = (params, opts) => body(api.get('/orders/my-orders', { params, ...opts }));
export const getOrder = (id, opts) => body(api.get(`/orders/${id}`, opts));
export const cancelOrder = (id) => body(api.put(`/orders/${id}/cancel`));
