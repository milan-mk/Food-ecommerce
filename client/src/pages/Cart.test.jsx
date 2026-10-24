import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../services/catalogService', () => ({ getProduct: vi.fn() }));
vi.mock('../services/orderService', () => ({ quote: vi.fn() }));
import { getProduct } from '../services/catalogService';
import { quote } from '../services/orderService';
import Cart from './Cart';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';

const item = { id: 'p1', name: 'Classic Burger', slug: 'classic-burger', price: 5.99, image: '/i.svg', stock: 10, quantity: 2 };
const serverQuote = { data: { subtotal: 11.98, discount: 0, tax: 0.6, deliveryFee: 2.99, total: 15.57, items: [] } };

const setup = () => render(<MemoryRouter><ToastProvider><CartProvider><Cart /></CartProvider></ToastProvider></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('snackyard-cart-v1', JSON.stringify([item]));
  getProduct.mockResolvedValue({ data: { _id: 'p1', name: 'Classic Burger', slug: 'classic-burger', price: 5.99, image: '/i.svg', stock: 10 } });
  quote.mockResolvedValue(serverQuote);
});

describe('Cart page', () => {
  it('shows an empty state when there is nothing in the cart', () => {
    localStorage.clear();
    setup();
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(quote).not.toHaveBeenCalled();
  });

  it('shows the totals calculated by the server, not by the browser', async () => {
    setup();
    expect(await screen.findByText('$15.57')).toBeInTheDocument();
    expect(screen.getByText('$0.60')).toBeInTheDocument();
    expect(screen.getByText('$2.99')).toBeInTheDocument();
    expect(quote).toHaveBeenCalledWith([{ product: 'p1', quantity: 2 }], undefined); // only ids and quantities are sent
  });

  it('keeps checkout disabled until the cart has been priced', async () => {
    quote.mockReturnValue(new Promise(() => {})); // never resolves
    setup();
    expect(screen.getByRole('button', { name: 'Go to checkout' })).toBeDisabled();
  });

  it('removes an item and returns to the empty state', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /remove classic burger from cart/i }));
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
  });

  it('shows the reason when a promo code is refused, then re-prices without it', async () => {
    setup();
    await screen.findByText('$15.57');
    quote.mockRejectedValueOnce(Object.assign(new Error('This coupon has expired'), { status: 422, errors: [{ field: 'couponCode', message: 'This coupon has expired' }] }));
    await userEvent.type(screen.getByLabelText('Promo code'), 'OLDCODE');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('This coupon has expired')).toBeInTheDocument();
    expect(await screen.findByText('$15.57')).toBeInTheDocument(); // priced again without the code
  });

  it('drops items that are no longer on the menu', async () => {
    getProduct.mockRejectedValue(Object.assign(new Error('Product not found'), { status: 404 }));
    setup();
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
  });
});
