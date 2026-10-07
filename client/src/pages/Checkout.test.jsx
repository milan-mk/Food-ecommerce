import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../services/orderService', () => ({ quote: vi.fn(), createOrder: vi.fn(), getOrder: vi.fn(), cancelOrder: vi.fn() }));
vi.mock('../services/authService', () => ({ me: vi.fn(), addAddress: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() }));
vi.mock('../services/paymentService', () => ({ getPaymentConfig: vi.fn(), createPaypalOrder: vi.fn(), capturePaypalOrder: vi.fn() }));
// A stand-in for the PayPal buttons: clicking "Mock PayPal pay" runs the same createOrder -> onApprove sequence PayPal would.
vi.mock('@paypal/react-paypal-js', async () => {
  const React = await import('react');
  const h = React.createElement;
  return {
    PayPalScriptProvider: ({ children }) => h('div', null, children),
    PayPalButtons: ({ createOrder, onApprove, onCancel }) => h('div', null,
      h('button', { onClick: async () => { const id = await createOrder(); await onApprove({ orderID: id }); } }, 'Mock PayPal pay'),
      h('button', { onClick: onCancel }, 'Mock PayPal cancel')),
  };
});

import * as orderService from '../services/orderService';
import * as authService from '../services/authService';
import * as paymentService from '../services/paymentService';
import Checkout from './Checkout';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

const user = { _id: 'u1', name: 'Milan Kumar', email: 'milan@example.com', role: 'customer', addresses: [] };
const item = { id: 'p1', name: 'Classic Burger', slug: 'classic-burger', price: 5.99, image: '/i.svg', stock: 10, quantity: 2 };
const serverQuote = { data: { subtotal: 11.98, discount: 0, tax: 0.6, deliveryFee: 2.99, total: 15.57, items: [] } };
const address = { fullName: 'Milan Kumar', phone: '9876543210', address: '12 Test Street', city: 'Indore', state: 'MP', postalCode: '452001' };
const savedOrder = { _id: 'o1', status: 'Pending', currency: 'USD', items: [{ product: 'p1', name: 'Classic Burger', image: '/i.svg', price: 5.99, quantity: 2 }], subtotal: 11.98, discount: 0, tax: 0.6, deliveryFee: 2.99, total: 15.57, deliveryAddress: address, payment: { status: 'pending' } };

const setup = () => render(
  <MemoryRouter initialEntries={['/checkout']}>
    <ToastProvider><AuthProvider><CartProvider>
      <Routes>
        <Route element={<ProtectedRoute />}><Route path="/checkout" element={<Checkout />} /></Route>
        <Route path="/cart" element={<p>CART PAGE</p>} />
        <Route path="/order-success/:id" element={<p>SUCCESS PAGE</p>} />
      </Routes>
    </CartProvider></AuthProvider></ToastProvider>
  </MemoryRouter>
);

const fillAddress = async () => {
  await userEvent.type(await screen.findByLabelText('Phone'), address.phone);
  await userEvent.type(screen.getByLabelText('Street address'), address.address);
  await userEvent.type(screen.getByLabelText('City'), address.city);
  await userEvent.type(screen.getByLabelText('State'), address.state);
  await userEvent.type(screen.getByLabelText('Postal code'), address.postalCode);
};
const clickContinue = async () => {
  const button = await screen.findByRole('button', { name: 'Continue to payment' });
  await screen.findByText('$15.57');     // wait for the server-priced total
  await userEvent.click(button);
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('snackyard-cart-v1', JSON.stringify([item]));
  authService.me.mockResolvedValue({ data: { user } });
  orderService.quote.mockResolvedValue(serverQuote);
  orderService.createOrder.mockResolvedValue({ data: savedOrder });
  paymentService.getPaymentConfig.mockResolvedValue({ data: { enabled: true, clientId: 'test', currency: 'USD' } });
  paymentService.createPaypalOrder.mockResolvedValue({ data: { paypalOrderId: 'PP1' } });
  paymentService.capturePaypalOrder.mockResolvedValue({ data: { ...savedOrder, status: 'Confirmed', payment: { status: 'paid' } } });
});

describe('Checkout', () => {
  it('sends an empty cart back to the cart page', async () => {
    localStorage.clear();
    setup();
    expect(await screen.findByText('CART PAGE')).toBeInTheDocument();
  });

  it('validates the delivery details before creating an order', async () => {
    setup();
    await clickContinue();
    expect(await screen.findByText('Enter a phone number')).toBeInTheDocument();
    expect(screen.getByText('Enter the city')).toBeInTheDocument();
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it('creates the order from ids and quantities only, then moves to payment', async () => {
    setup();
    await fillAddress();
    await clickContinue();
    expect(orderService.createOrder).toHaveBeenCalledWith({ items: [{ product: 'p1', quantity: 2 }], couponCode: undefined, deliveryAddress: address });
    expect(await screen.findByRole('heading', { name: 'Pay $15.57 with PayPal' })).toBeInTheDocument();
    expect(sessionStorage.getItem('snackyard-pending-order')).toBe('o1');
  });

  it('shows the server message when the order is refused', async () => {
    orderService.createOrder.mockRejectedValue(Object.assign(new Error('Only 1 of Classic Burger left'), { status: 409, errors: [] }));
    setup();
    await fillAddress();
    await clickContinue();
    expect(await screen.findByRole('alert')).toHaveTextContent('Only 1 of Classic Burger left');
  });

  it('captures through our server after approval, clears the cart and shows the success page', async () => {
    setup();
    await fillAddress();
    await clickContinue();
    await userEvent.click(await screen.findByRole('button', { name: 'Mock PayPal pay' }));
    expect(paymentService.createPaypalOrder).toHaveBeenCalledWith('o1');
    expect(paymentService.capturePaypalOrder).toHaveBeenCalledWith('o1', 'PP1');
    expect(await screen.findByText('SUCCESS PAGE')).toBeInTheDocument();
    expect(localStorage.getItem('snackyard-cart-v1')).toBe('[]');
    expect(sessionStorage.getItem('snackyard-pending-order')).toBeNull();
  });

  it('keeps the cart and the saved order when the payment is cancelled', async () => {
    setup();
    await fillAddress();
    await clickContinue();
    await userEvent.click(await screen.findByRole('button', { name: 'Mock PayPal cancel' }));
    expect(await screen.findByText(/payment cancelled/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('snackyard-cart-v1'))).toHaveLength(1);
    expect(sessionStorage.getItem('snackyard-pending-order')).toBe('o1');
  });

  it('resumes an unpaid order after a reload instead of creating a duplicate', async () => {
    sessionStorage.setItem('snackyard-pending-order', 'o1');
    orderService.getOrder.mockResolvedValue({ data: savedOrder });
    setup();
    expect(await screen.findByRole('heading', { name: 'Pay for your order' })).toBeInTheDocument();
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it('lets the customer change details, which cancels the saved order', async () => {
    orderService.cancelOrder.mockResolvedValue({ data: { ...savedOrder, status: 'Cancelled' } });
    setup();
    await fillAddress();
    await clickContinue();
    await userEvent.click(await screen.findByRole('button', { name: 'Change delivery details' }));
    expect(orderService.cancelOrder).toHaveBeenCalledWith('o1');
    expect(await screen.findByRole('heading', { name: 'Where should we deliver?' })).toBeInTheDocument();
  });
});
