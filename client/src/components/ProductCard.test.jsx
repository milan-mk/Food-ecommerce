import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from './ProductCard';
import { CartProvider, useCart } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';

const product = { _id: 'p1', name: 'Classic Burger', slug: 'classic-burger', price: 5.99, image: '/images/x.svg', stock: 5, ratingAverage: 4.5, ratingCount: 2, category: { name: 'Burgers' } };

function CartCount() { const { count } = useCart(); return <output data-testid="count">{count}</output>; }
const setup = (p = product) => render(
  <MemoryRouter><ToastProvider><CartProvider><ProductCard product={p} /><CartCount /></CartProvider></ToastProvider></MemoryRouter>
);

beforeEach(() => localStorage.clear());

describe('ProductCard', () => {
  it('shows the name, category, price and rating', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Classic Burger' })).toHaveAttribute('href', '/product/classic-burger');
    expect(screen.getByText('Burgers')).toBeInTheDocument();
    expect(screen.getByText('$5.99')).toBeInTheDocument();
    expect(screen.getByLabelText(/rated 4.5 out of 5/i)).toBeInTheDocument();
  });

  it('adds the product to the cart and confirms with a message', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /add classic burger to cart/i }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(await screen.findByText(/added classic burger/i)).toBeInTheDocument();
  });

  it('is disabled when the product is sold out', () => {
    setup({ ...product, stock: 0 });
    expect(screen.getByRole('button', { name: /sold out/i })).toBeDisabled();
  });

  it('falls back to the placeholder image if the photo fails to load', () => {
    setup();
    const img = document.querySelector('img');
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe('/placeholder.svg');
  });
});
