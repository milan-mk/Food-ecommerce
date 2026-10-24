const jwt = require('jsonwebtoken');
const { jwt: jwtCfg } = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { COOKIE_NAME } = require('../utils/token');

const extractToken = (req) => {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const h = req.headers.authorization; // fallback for Postman / API clients
  return h && h.startsWith('Bearer ') ? h.slice(7) : null;
};

async function userFromToken(token) {
  const { id } = jwt.verify(token, jwtCfg.secret);
  const user = await User.findById(id);
  return user && user.isActive ? user : null;
}

// Requires a valid login.
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw AppError.unauthorized('Please log in to continue');
  const user = await userFromToken(token);
  if (!user) throw AppError.unauthorized('Account not found or disabled');
  req.user = user;
  next();
});

// Attaches req.user if logged in, but never rejects (used on public routes that behave differently for admins).
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try { req.user = (await userFromToken(token)) || undefined; } catch (e) { /* invalid token = anonymous */ }
  }
  next();
});

const restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role) ? next() : next(AppError.forbidden());

module.exports = { protect, optionalAuth, restrictTo };
