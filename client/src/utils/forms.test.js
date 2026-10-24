import { flattenAddressErrors } from './forms';

describe('flattenAddressErrors', () => {
  it('maps deliveryAddress.* errors to form field names and drops unrelated ones', () => {
    const err = Object.assign(new Error('Validation failed'), {
      errors: [{ field: 'deliveryAddress.city', message: 'City is required' }, { field: 'items.0.quantity', message: 'Too many' }, { field: 'phone', message: 'Bad phone' }],
    });
    expect(flattenAddressErrors(err).errors).toEqual([{ field: 'city', message: 'City is required' }, { field: 'phone', message: 'Bad phone' }]);
  });
  it('keeps the original message and copes with no field errors', () => {
    const out = flattenAddressErrors(Object.assign(new Error('Only 1 left'), { status: 409 }));
    expect(out.message).toBe('Only 1 left');
    expect(out.errors).toEqual([]);
  });
});
