import api, { body } from './api';
export const getPaymentConfig = (opts) => body(api.get('/payments/config', opts));
export const createPaypalOrder = (orderId) => body(api.post('/payments/paypal/create-order', { orderId }));
export const capturePaypalOrder = (orderId, paypalOrderId) => body(api.post('/payments/paypal/capture-order', { orderId, paypalOrderId }));
