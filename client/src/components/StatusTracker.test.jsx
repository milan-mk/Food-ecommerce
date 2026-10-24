import { render, screen } from '@testing-library/react';
import StatusTracker from './StatusTracker';

describe('StatusTracker', () => {
  it('shows no completed steps while the order is waiting for payment', () => {
    render(<StatusTracker status="Pending" />);
    expect(screen.queryAllByLabelText('Completed')).toHaveLength(0);
  });
  it('marks earlier steps complete and the current step as active', () => {
    render(<StatusTracker status="Preparing" />);
    expect(screen.getAllByLabelText('Completed')).toHaveLength(1);
    expect(screen.getByText('Preparing').closest('li')).toHaveAttribute('aria-current', 'step');
  });
  it('completes every step once delivered', () => {
    render(<StatusTracker status="Delivered" />);
    expect(screen.getAllByLabelText('Completed')).toHaveLength(4);
  });
  it('says so clearly when the order was cancelled', () => {
    render(<StatusTracker status="Cancelled" />);
    expect(screen.getByRole('status')).toHaveTextContent('This order was cancelled.');
  });
});
