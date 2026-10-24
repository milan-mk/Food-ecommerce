// Usage: npm run seed   (wipes users/categories/products/reviews/coupons/orders, then reseeds)
const { isProd } = require('../config/env');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const slugify = require('../utils/slugify');
const imageFor = require('./imageFor');
const Order = require('../models/Order');


const { categories, products } = require('./data');

async function seed() {
  if (isProd && process.env.ALLOW_PROD_SEED !== 'true') {
    console.error('Refusing to seed in production (set ALLOW_PROD_SEED=true to override).');
    process.exit(1);
  }
  await connectDB();
  await Promise.all([User, Category, Product, Review, Coupon, Order].map((m) => m.deleteMany({})));

  const cats = await Category.create(categories.map(([name, description]) => ({ name, description })));
  const catId = Object.fromEntries(cats.map((c) => [c.name, c._id]));

  await Product.create(
    products.map(([cat, name, price, description, ingredients, calories, protein, carbs, fat, featured]) => ({
      name, price, description, ingredients, featured, image: imageFor(slugify(name)), category: catId[cat],
      nutrition: { calories, protein, carbs, fat }, stock: 100, isAvailable: true,
    }))
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  await User.create([
    { name: 'Admin', email: adminEmail, password: adminPass, role: 'admin' },
    { name: 'Demo Customer', email: 'customer@example.com', password: 'Customer@123', phone: '9999999999' },
  ]);

  const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
  await Coupon.create([
    { code: 'WELCOME10', description: '10% off your order', discountType: 'percentage', discountValue: 10, minOrder: 10, maxDiscount: 5, expiresAt: nextYear },
    { code: 'SAVE3', description: '$3 off orders over $15', discountType: 'fixed', discountValue: 3, minOrder: 15, expiresAt: nextYear },
  ]);

  console.log(`Seeded ${cats.length} categories, ${products.length} products, 2 users, 2 coupons.`);
  console.log(`Admin login: ${adminEmail} / ${adminPass}`);
  console.log('Customer login: customer@example.com / Customer@123');
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
