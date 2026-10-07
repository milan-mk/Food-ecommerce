import { formatPrice, imageUrl } from './format';

describe('formatPrice', () => {
  it('formats dollars with two decimals', () => {
    expect(formatPrice(5.99, 'USD')).toBe('$5.99');
    expect(formatPrice(18, 'USD')).toBe('$18.00');
  });
  it('treats bad input as zero instead of printing NaN', () => {
    expect(formatPrice(undefined, 'USD')).toBe('$0.00');
  });
});

describe('imageUrl', () => {
  it('falls back to the local placeholder when there is no image', () => {
    expect(imageUrl('')).toBe('/placeholder.svg');
    expect(imageUrl(null)).toBe('/placeholder.svg');
  });
  it('keeps full URLs and server paths', () => {
    expect(imageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(imageUrl('/images/a.svg')).toBe('/images/a.svg');
  });
});
