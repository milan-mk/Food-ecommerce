const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, required: [true, 'Rating is required'], min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, product: 1 }, { unique: true }); // one review per user per product
reviewSchema.index({ product: 1, createdAt: -1 });

// Recomputes the product's cached rating after any review change.
reviewSchema.statics.recalculate = async function recalculate(productId) {
  const [stats] = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await mongoose.model('Product').findByIdAndUpdate(productId, {
    ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  });
};

reviewSchema.post('save', function afterSave() { return this.constructor.recalculate(this.product); });
reviewSchema.post('findOneAndDelete', function afterDelete(doc) {
  if (doc) return doc.constructor.recalculate(doc.product);
});

module.exports = mongoose.model('Review', reviewSchema);
