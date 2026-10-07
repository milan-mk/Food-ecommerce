// Creates a branded illustration for every seed product: npm run images:generate --prefix server
// (No dependencies. Replace any of them by dropping a real photo named <slug>.jpg next to it.)
const fs = require('fs');
const path = require('path');
const { products } = require('../seed/data');
const slugify = require('../utils/slugify');

const OUT = path.join(__dirname, '../public/images/products');
const TINT = { Burgers: ['#FFF3CC', '#FFC233'], Pizza: ['#FCE4E0', '#F2A59C'], Sides: ['#FFF3CC', '#FFD76A'], Beverages: ['#DDF3E6', '#8AD1A8'], Desserts: ['#F6E9E2', '#D9A98F'], Combos: ['#FCE4E0', '#FFC233'] };
const EMOJI = {
  'classic-chicken-burger': '🍔', 'crispy-chicken-burger': '🍗', 'cheese-burger': '🧀', 'double-patty-burger': '🍔',
  'margherita-pizza': '🍕', 'farmhouse-pizza': '🍄', 'chicken-tikka-pizza': '🍕', 'cheese-burst-pizza': '🧀',
  'french-fries': '🍟', 'peri-peri-fries': '🌶️', 'chicken-nuggets': '🍗', 'onion-rings': '🧅',
  'coca-cola': '🥤', pepsi: '🥤', lemonade: '🍋', 'cold-coffee': '🧋',
  'chocolate-brownie': '🍫', 'ice-cream': '🍨', 'chocolate-shake': '🥛',
  'burger-combo': '🍔🍟', 'pizza-party-combo': '🍕🍗',
};
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(name, category, emoji) {
  const [bg, accent] = TINT[category] || TINT.Burgers;
  const double = [...emoji].length > 2;
  const size = Math.max(22, Math.min(40, 40 - (name.length - 14) * 1.2));
  const pill = Math.round(name.length * size * 0.56 + 56);
  const art = double
    ? `<text x="270" y="345" font-size="150" text-anchor="middle">${[...emoji][0]}</text><text x="540" y="360" font-size="150" text-anchor="middle">${[...emoji].slice(1).join('')}</text>`
    : `<text x="400" y="372" font-size="230" text-anchor="middle">${emoji}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${esc(name)}">
<rect width="800" height="600" fill="${bg}"/>
<circle cx="130" cy="110" r="150" fill="${accent}" opacity=".25"/><circle cx="700" cy="520" r="190" fill="${accent}" opacity=".2"/>
<ellipse cx="400" cy="470" rx="230" ry="26" fill="#231815" opacity=".12"/>
<circle cx="400" cy="300" r="180" fill="#fff" stroke="#231815" stroke-width="6"/>
<g font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${art}</g>
<g transform="translate(${400 - pill / 2} 520)"><rect width="${pill}" height="56" rx="12" fill="#231815"/><text x="${pill / 2}" y="${37 + (size - 30) * 0.15}" font-size="${size * 0.82}" font-weight="700" fill="#fff" text-anchor="middle" font-family="'DM Sans','Segoe UI',Arial,sans-serif">${esc(name)}</text></g>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [category, name] of products) {
  const slug = slugify(name);
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg(name, category, EMOJI[slug] || '🍽️'));
  n++;
}
console.log(`Generated ${n} product images in ${OUT}`);
