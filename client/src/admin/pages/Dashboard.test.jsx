import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../services/adminService', () => ({ getStats: vi.fn() }));
import { getStats } from '../../services/adminService';
import Dashboard from './Dashboard';

const stats = {
  totals: { orders: 12, sales: 1234.5, paidOrders: 9, customers: 7, products: 21, lowStock: 3 },
  pendingOrders: 2, activeOrders: 4, completedOrders: 5, lowStockThreshold: 10,
  statusCounts: { Pending: 2, Confirmed: 1, Preparing: 2, 'Out for Delivery': 1, Delivered: 5, Cancelled: 1 },
  recentOrders: [{ _id: '64b7f0f2a1b2c3d4e5f60718', user: { name: 'Cathy Customer' }, total: 18.71, status: 'Confirmed', createdAt: '2026-10-06T10:00:00Z' }],
  popularProducts: [{ _id: 'p1', name: 'French Fries', soldCount: 20 }],
  salesByDay: [{ date: '2026-10-04', revenue: 40, orders: 2 }, { date: '2026-10-05', revenue: 0, orders: 0 }, { date: '2026-10-06', revenue: 60, orders: 3 }],
};

const setup = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);
beforeEach(() => { vi.clearAllMocks(); getStats.mockResolvedValue({ data: stats }); });

describe('Admin dashboard', () => {
  it('shows the headline numbers from the API', async () => {
    setup();
    expect(await screen.findByText('$1,234.50')).toBeInTheDocument();
    expect(screen.getByText('9 paid orders')).toBeInTheDocument();
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review stock' })).toHaveAttribute('href', '/admin/inventory?filter=low');
  });

  it('adds up the sales for the chosen period and describes the chart for screen readers', async () => {
    setup();
    expect(await screen.findByText('$100.00')).toBeInTheDocument(); // 40 + 0 + 60
    expect(screen.getByRole('img', { name: /daily sales for the last 14 days/i })).toBeInTheDocument();
  });

  it('lists recent orders with a link to the admin order page, and popular dishes', async () => {
    setup();
    const link = await screen.findByRole('link', { name: '#F60718' });
    expect(link).toHaveAttribute('href', '/admin/orders/64b7f0f2a1b2c3d4e5f60718');
    expect(screen.getByText('Cathy Customer')).toBeInTheDocument();
    expect(within(screen.getByText('Popular dishes').closest('section')).getByText('French Fries')).toBeInTheDocument();
  });

  it('asks for the new range when the period changes', async () => {
    setup();
    await screen.findByText('$1,234.50');
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.selectOptions(screen.getByLabelText('Time range'), '30');
    expect(getStats).toHaveBeenLastCalledWith(30, expect.anything());
  });

  it('shows an error with a retry button when the stats fail to load', async () => {
    getStats.mockRejectedValue(new Error('Cannot reach the server.'));
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
