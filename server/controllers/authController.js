const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendToken, clearToken } = require('../utils/token');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.exists({ email })) throw AppError.conflict('An account with this email already exists');
  // role is NOT read from the body: public registration can only ever create customers.
  const user = await User.create({ name, email, password, phone });
  sendToken(res, user, 201, 'Account created');
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password, so attackers can't discover which emails exist.
  if (!user || !(await user.comparePassword(password))) throw AppError.unauthorized('Invalid email or password');
  if (!user.isActive) throw AppError.forbidden('This account has been disabled');
  sendToken(res, user, 200, 'Logged in');
});

exports.me = (req, res) => res.json({ success: true, data: { user: req.user } });

exports.logout = (req, res) => {
  clearToken(res);
  res.json({ success: true, message: 'Logged out' });
};
