const { z } = require('zod');

const rating = z.coerce.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5');
const comment = z.string().trim().max(500).optional();

exports.createReview = z.object({ rating, comment });
exports.updateReview = z.object({ rating: rating.optional(), comment })
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');
exports.listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
