const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const Coupon = require('../../models/Coupon');
const Order = require('../../models/Order');

const PASSWORD = 'Passw0rd1';
let n = 0;
const uniq = () => `${Date.now()}${++n}`;

exports.PASSWORD = PASSWORD;
exports.ADDRESS = { fullName: 'Test Buyer', phone: '9876543210', address: '12 Test Street', city: 'Indore', state: 'MP', postalCode: '452001' };

exports.makeUser = (over = {}) => User.create({ name: 'Test User', email: `user${uniq()}@example.com`, password: PASSWORD, ...over });

// A supertest agent that keeps the login cookie, like a browser.
exports.agentFor = async (user) => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);
  return agent;
};

// Small known catalog so expected totals can be written as plain numbers.
exports.seedCatalog = async () => {
  const [burgers, sides, pizza] = await Category.create([{ name: 'Burgers' }, { name: 'Sides' }, { name: 'Pizza' }]);
  const mk = (name, price, category, extra = {}) => ({ name, price, category: category._id, description: `${name} - tasty and fresh`, stock: 10, ...extra });
  const [burger, fries, cheesePizza, rings, hidden, platter] = await Product.create([
    mk('Classic Burger', 5.99, burgers, { featured: true, soldCount: 5 }),
    mk('French Fries', 2.99, sides, { soldCount: 20 }),
    mk('Cheese Pizza', 9.99, pizza, { soldCount: 1, ratingAverage: 4.5, ratingCount: 2, stock: 5 }), // slug "cheese-pizza" is exactly 12 chars
    mk('Onion Rings', 3.29, sides, { stock: 0 }),
    mk('Hidden Special', 4.99, burgers, { isAvailable: false }),
    mk('Party Platter', 25, pizza),
  ]);
  const future = new Date(Date.now() + 30 * 864e5), past = new Date(Date.now() - 864e5);
  await Coupon.create([
    { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minOrder: 10, maxDiscount: 5, expiresAt: future },
    { code: 'SAVE3', discountType: 'fixed', discountValue: 3, minOrder: 15, expiresAt: future },
    { code: 'OLDCODE', discountType: 'fixed', discountValue: 1, expiresAt: past },
    { code: 'USEDUP', discountType: 'fixed', discountValue: 1, expiresAt: future, usageLimit: 1, usedCount: 1 },
  ]);
  return { burgers, sides, pizza, burger, fries, cheesePizza, rings, hidden, platter };
};

// Inserts an order directly (bypasses the API) so admin tests don't depend on the checkout flow.
exports.insertOrder = (user, product, { quantity = 1, status = 'Confirmed', paid = true, couponCode } = {}) => {
  const id = uniq();
  const total = Math.round(product.price * quantity * 100) / 100;
  return Order.create({
    user: user._id,
    items: [{ product: product._id, name: product.name, image: product.image, price: product.price, quantity }],
    deliveryAddress: exports.ADDRESS, subtotal: total, tax: 0, deliveryFee: 0, discount: 0, total, currency: 'USD', couponCode, status,
    payment: paid ? { status: 'paid', transactionId: `CAP-${id}`, paypalOrderId: `PP-${id}`, amount: total, paidAt: new Date() } : { status: 'pending' },
  });
};
