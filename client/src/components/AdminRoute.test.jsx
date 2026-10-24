import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../services/authService', () => ({ me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() }));
import * as authService from '../services/authService';
import { AdminRoute, ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

const setup = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <AuthProvider>
      <Routes>
        <Route path="/admin" element={<AdminRoute />}><Route index element={<p>ADMIN AREA</p>} /></Route>
        <Route element={<ProtectedRoute />}><Route path="/orders" element={<p>MY ORDERS</p>} /></Route>
        <Route path="/admin/login" element={<p>ADMIN LOGIN</p>} />
        <Route path="/login" element={<p>CUSTOMER LOGIN</p>} />
        <Route path="/" element={<p>HOME</p>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>
);

const as = (role) => authService.me.mockResolvedValue({ data: { user: { _id: 'u1', name: 'Test', role } } });

beforeEach(() => vi.clearAllMocks());

describe('route guards', () => {
  it('sends a signed-out visitor to the admin login', async () => {
    authService.me.mockRejectedValue(new Error('no session'));
    setup('/admin');
    expect(await screen.findByText('ADMIN LOGIN')).toBeInTheDocument();
  });
  it('keeps customers out of the admin area', async () => {
    as('customer');
    setup('/admin');
    expect(await screen.findByText('HOME')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN AREA')).not.toBeInTheDocument();
  });
  it('lets admins in', async () => {
    as('admin');
    setup('/admin');
    expect(await screen.findByText('ADMIN AREA')).toBeInTheDocument();
  });
  it('sends a signed-out visitor from a customer page to the customer login', async () => {
    authService.me.mockRejectedValue(new Error('no session'));
    setup('/orders');
    expect(await screen.findByText('CUSTOMER LOGIN')).toBeInTheDocument();
  });
  it('shows a customer page to a signed-in customer', async () => {
    as('customer');
    setup('/orders');
    expect(await screen.findByText('MY ORDERS')).toBeInTheDocument();
  });
});
