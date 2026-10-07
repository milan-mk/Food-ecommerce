// Picks the best LOCAL image for a product slug from public/images/products.
// Real photos (jpg/png/webp/avif) win over the generated illustration (svg).
// To use your own photos: save them as <slug>.jpg (e.g. classic-chicken-burger.jpg) and run: npm run images:apply
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../public/images/products');
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'];

module.exports = (slug) => {
  for (const ext of EXTENSIONS) if (fs.existsSync(path.join(DIR, `${slug}.${ext}`))) return `/images/products/${slug}.${ext}`;
  return '/images/placeholder.svg';
};
