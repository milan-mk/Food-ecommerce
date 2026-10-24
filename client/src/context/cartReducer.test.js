import { cartReducer, cartCount, cartSubtotal, toOrderItems, sanitizeStored, MAX_QTY } from './cartReducer';

const burger = { _id: 'b1', name: 'Burger', slug: 'burger', price: 5.99, image: '/i.svg', stock: 10 };
const fries = { _id: 'f1', name: 'Fries', slug: 'fries', price: 2.99, image: '/i.svg', stock: 3 };
const add = (items, product, quantity = 1) => cartReducer(items, { type: 'add', product, quantity });

describe('cart reducer', () => {
  it('adds a product and merges repeat adds into one line', () => {
    let items = add([], burger);
    items = add(items, burger, 2);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });
  it('never exceeds the stock or the per-item maximum', () => {
    expect(add([], fries, 99)[0].quantity).toBe(3);
    expect(add([], { ...burger, stock: 500 }, 99)[0].quantity).toBe(MAX_QTY);
  });
  it('refuses sold-out products', () => {
    expect(add([], { ...burger, stock: 0 })).toEqual([]);
  });
  it('sets quantity within limits and removes the line at zero', () => {
    let items = add([], fries);
    items = cartReducer(items, { type: 'setQuantity', id: 'f1', quantity: 50 });
    expect(items[0].quantity).toBe(3);
    items = cartReducer(items, { type: 'setQuantity', id: 'f1', quantity: 0 });
    expect(items).toEqual([]);
  });
  it('removes and clears', () => {
    const items = add(add([], burger), fries);
    expect(cartReducer(items, { type: 'remove', id: 'b1' }).map((i) => i.id)).toEqual(['f1']);
    expect(cartReducer(items, { type: 'clear' })).toEqual([]);
  });
  it('refresh updates prices, trims quantity to new stock and drops vanished or sold-out items', () => {
    const items = add(add([], burger, 5), fries, 2);
    const next = cartReducer(items, { type: 'refresh', products: [{ ...burger, price: 6.5, stock: 2 }] });
    expect(next).toHaveLength(1);
    expect(next[0].price).toBe(6.5);
    expect(next[0].quantity).toBe(2);
    expect(cartReducer(items, { type: 'refresh', products: [{ ...burger, stock: 0 }] })).toEqual([]);
  });
  it('totals without floating point drift', () => {
    const items = add(add([], { ...burger, price: 0.1 }, 1), { ...fries, price: 0.2 }, 1);
    expect(cartSubtotal(items)).toBe(0.3);
    expect(cartCount(add(items, burger, 2))).toBe(4); // merges into the existing burger line: 3 burgers + 1 fries
  });
  it('sends only ids and quantities to the server', () => {
    expect(toOrderItems(add([], burger, 2))).toEqual([{ product: 'b1', quantity: 2 }]);
  });
  it('ignores corrupted stored carts', () => {
    expect(sanitizeStored('nonsense')).toEqual([]);
    expect(sanitizeStored([{ id: 'x' }, null, { id: 'ok', name: 'N', price: 1, quantity: 2 }, { id: 'big', name: 'N', price: 1, quantity: 999 }]).map((i) => i.id)).toEqual(['ok']);
  });
});
