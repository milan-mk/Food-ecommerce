import { nextStatuses, needsRefund, TRANSITIONS } from './orderStatus';

const order = (status, pay = 'paid') => ({ status, payment: { status: pay } });

describe('nextStatuses', () => {
  it('offers the next step and cancel for a paid, active order', () => {
    expect(nextStatuses(order('Confirmed'))).toEqual(['Preparing', 'Cancelled']);
    expect(nextStatuses(order('Out for Delivery'))).toEqual(['Delivered', 'Cancelled']);
  });
  it('offers only cancel while the order is unpaid', () => {
    expect(nextStatuses(order('Pending', 'pending'))).toEqual(['Cancelled']);
    expect(nextStatuses(order('Confirmed', 'failed'))).toEqual(['Cancelled']);
  });
  it('offers nothing for final orders', () => {
    expect(nextStatuses(order('Delivered'))).toEqual([]);
    expect(nextStatuses(order('Cancelled'))).toEqual([]);
  });
  it('matches the server table', () => { expect(Object.keys(TRANSITIONS)).toHaveLength(6); });
});

describe('needsRefund', () => {
  it('is true only for a cancelled order that is still marked paid', () => {
    expect(needsRefund(order('Cancelled', 'paid'))).toBe(true);
    expect(needsRefund(order('Cancelled', 'refunded'))).toBe(false);
    expect(needsRefund(order('Confirmed', 'paid'))).toBe(false);
  });
});
