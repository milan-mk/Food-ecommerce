const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required'], unique: true, trim: true, maxlength: 60 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 300 },
    image: { type: String, default: '/images/placeholder.svg' },
  },
  { timestamps: true }
);

categorySchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
  next();
});

module.exports = mongoose.model('Category', categorySchema);
