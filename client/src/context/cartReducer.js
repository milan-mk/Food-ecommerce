// Pure cart logic. The cart only remembers WHAT the customer picked; the server re-prices everything at checkout.
export const MAX_QTY = 20;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const limitFor = (stock) => (Number.isFinite(stock) ? Math.min(MAX_QTY, stock) : MAX_QTY);
const clamp = (qty, stock) => Math.max(1, Math.min(Math.floor(qty), limitFor(stock)));

const snapshot = (p, quantity) => ({ id: p._id, name: p.name, slug: p.slug, price: p.price, image: p.image, stock: p.stock, quantity });

export function cartReducer(items, action) {
  switch (action.type) {
    case 'add': {
      const { product, quantity = 1 } = action;
      if (limitFor(product.stock) < 1) return items; // sold out
      const found = items.find((i) => i.id === product._id);
      if (found) return items.map((i) => (i.id === product._id ? { ...i, ...snapshot(product, clamp(i.quantity + quantity, product.stock)) } : i));
      return [...items, snapshot(product, clamp(quantity, product.stock))];
    }
    case 'setQuantity':
      if (action.quantity < 1) return items.filter((i) => i.id !== action.id);
      return items.map((i) => (i.id === action.id ? { ...i, quantity: clamp(action.quantity, i.stock) } : i));
    case 'remove':
      return items.filter((i) => i.id !== action.id);
    case 'clear':
      return [];
    case 'refresh': { // update prices/stock from fresh product data; drops products that no longer exist
      const byId = new Map(action.products.map((p) => [p._id, p]));
      return items
        .filter((i) => byId.has(i.id))
        .map((i) => { const p = byId.get(i.id); return limitFor(p.stock) < 1 ? null : { ...i, ...snapshot(p, clamp(i.quantity, p.stock)) }; })
        .filter(Boolean);
    }
    default:
      return items;
  }
}

export const cartCount = (items) => items.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = (items) => round2(items.reduce((s, i) => s + i.price * i.quantity, 0));
export const toOrderItems = (items) => items.map((i) => ({ product: i.id, quantity: i.quantity }));

// Defends against a corrupted or hand-edited localStorage value.
export function sanitizeStored(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((i) => i && typeof i.id === 'string' && typeof i.name === 'string' && Number.isFinite(i.price) && Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= MAX_QTY);
}
