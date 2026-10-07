// Converts between the product API object and the (all-strings) values an HTML form works with.
const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'];
const toNumber = (x) => (x === '' || x === null || x === undefined ? undefined : Number(x));

export function toFormValues(p) {
  const n = p.nutrition || {};
  return {
    name: p.name, description: p.description, price: String(p.price), stock: String(p.stock),
    category: (p.category && p.category._id) || p.category || '',
    image: p.image || '', featured: Boolean(p.featured), isAvailable: p.isAvailable !== false,
    ingredients: (p.ingredients || []).join(', '),
    nutrition: Object.fromEntries(NUTRIENTS.map((k) => [k, n[k] === undefined || n[k] === null ? '' : String(n[k])])),
  };
}

export function toProductPayload(v) {
  const nutrition = {};
  NUTRIENTS.forEach((k) => { const n = toNumber(v.nutrition && v.nutrition[k]); if (n !== undefined && !Number.isNaN(n)) nutrition[k] = n; });
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    price: Number(v.price),
    category: v.category,
    image: v.image.trim() || undefined,
    stock: Number(v.stock || 0),
    featured: Boolean(v.featured),
    isAvailable: Boolean(v.isAvailable),
    ingredients: v.ingredients.split(',').map((s) => s.trim()).filter(Boolean),
    ...(Object.keys(nutrition).length ? { nutrition } : {}),
  };
}
