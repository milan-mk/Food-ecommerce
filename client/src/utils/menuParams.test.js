import { readParams, writeParams, toApiParams, pageWindow, activeFilterCount } from './menuParams';

const sp = (qs) => new URLSearchParams(qs);

describe('readParams', () => {
  it('uses safe defaults', () => {
    expect(readParams(sp(''))).toEqual({ q: '', category: '', minPrice: '', maxPrice: '', rating: '', inStock: false, sort: 'newest', page: 1 });
  });
  it('reads valid values', () => {
    const f = readParams(sp('q=burger&category=pizza&minPrice=3&maxPrice=9.5&rating=4&inStock=true&sort=price_asc&page=3'));
    expect(f).toEqual({ q: 'burger', category: 'pizza', minPrice: '3', maxPrice: '9.5', rating: '4', inStock: true, sort: 'price_asc', page: 3 });
  });
  it('ignores junk instead of breaking the page', () => {
    const f = readParams(sp('sort=bogus&page=-4&minPrice=abc&rating=9&maxPrice=-1'));
    expect(f).toEqual({ q: '', category: '', minPrice: '', maxPrice: '', rating: '', inStock: false, sort: 'newest', page: 1 });
  });
  it('keeps 0 as a real price bound', () => { expect(readParams(sp('minPrice=0')).minPrice).toBe('0'); });
});

describe('writeParams / toApiParams', () => {
  it('writes only non-default values', () => {
    expect(writeParams(readParams(sp('')))).toEqual({});
    expect(writeParams({ ...readParams(sp('')), category: 'pizza', page: 2, sort: 'rating' })).toEqual({ category: 'pizza', page: '2', sort: 'rating' });
  });
  it('round-trips', () => {
    const qs = 'q=cheese&category=pizza&minPrice=3&inStock=true&sort=popular&page=2';
    const f = readParams(sp(qs));
    expect(readParams(new URLSearchParams(writeParams(f)))).toEqual(f);
  });
  it('converts to API parameters with numbers and booleans', () => {
    expect(toApiParams(readParams(sp('minPrice=3&maxPrice=9&rating=4&inStock=true&category=pizza&page=2')))).toEqual(
      { sort: 'newest', page: 2, limit: 12, category: 'pizza', minPrice: 3, maxPrice: 9, rating: 4, inStock: true });
  });
  it('counts active filters (not sort or page)', () => {
    expect(activeFilterCount(readParams(sp('q=a&category=pizza&sort=rating&page=3')))).toBe(2);
    expect(activeFilterCount(readParams(sp('inStock=true&minPrice=1')))).toBe(2);
  });
});

describe('pageWindow', () => {
  it('shows every page when there are few', () => { expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]); });
  it('collapses long ranges with gaps', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, null, 19, 20]);
    expect(pageWindow(10, 20)).toEqual([1, 2, null, 9, 10, 11, null, 19, 20]);
    expect(pageWindow(20, 20)).toEqual([1, 2, null, 19, 20]);
    expect(pageWindow(4, 8)).toEqual([1, 2, 3, 4, 5, null, 7, 8]);
  });
});
