const rateLimit = require('express-rate-limit');

// Slows down password guessing / account spam. Counts failed AND successful attempts per IP.
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

// Stops coupon codes being guessed: only FAILED attempts that include a code are counted, so normal shopping is never limited.
exports.couponGuessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 100000 : 15,
  skipSuccessfulRequests: true,
  skip: (req) => !(req.body && (req.body.couponCode || req.body.code)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many incorrect coupon attempts. Please try again in 15 minutes.' },
});
