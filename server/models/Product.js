const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 120 },
    slug: { type: String, unique: true },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 1000 },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    image: { type: String, default: '/images/placeholder.svg' },
    ingredients: [{ type: String, trim: true }],
    nutrition: {
      calories: Number,
      protein: Number, // grams
      carbs: Number,   // grams
      fat: Number,     // grams
    },
    isAvailable: { type: Boolean, default: true },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
    featured: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 }, // drives the "Popular" sort
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ featured: 1, isAvailable: 1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ createdAt: -1 });

productSchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
  next();
});

module.exports = mongoose.model('Product', productSchema);
