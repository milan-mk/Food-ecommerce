// Points existing products at the best local image for their slug, WITHOUT wiping any data.
// Run after generating illustrations or adding your own photos:  npm run images:apply --prefix server
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const imageFor = require('../seed/imageFor');

(async () => {
  await connectDB();
  let changed = 0, kept = 0;
  for (const p of await Product.find().select('slug image')) {
    const best = imageFor(p.slug);
    if (best === '/images/placeholder.svg' && p.image && p.image !== '/images/placeholder.svg') { kept++; continue; } // keep custom/admin-set images
    if (best !== p.image) { await Product.updateOne({ _id: p._id }, { image: best }); changed++; }
  }
  console.log(`Updated ${changed} product image(s). Left ${kept} custom image(s) untouched.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
