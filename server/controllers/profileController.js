const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendToken } = require('../utils/token');

const MAX_ADDRESSES = 5;
const respond = (res, user, message, status = 200) => res.status(status).json({ success: true, message, data: { user } });
// Exactly one saved address is the default whenever at least one exists.
const ensureDefault = (user) => {
  if (user.addresses.length && !user.addresses.some((a) => a.isDefault)) user.addresses[0].isDefault = true;
};

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body; // email and role are deliberately not editable here
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone || undefined;
  await req.user.save();
  respond(res, req.user, 'Profile updated');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  const fail = (field, message) => { throw AppError.unprocessable(message, [{ field, message }]); };
  if (!(await user.comparePassword(currentPassword))) fail('currentPassword', 'Your current password is incorrect');
  if (await user.comparePassword(newPassword)) fail('newPassword', 'Choose a password you are not already using');
  user.password = newPassword; // hashed by the model's save hook
  await user.save();
  sendToken(res, user, 200, 'Password changed');
});

exports.addAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.addresses.length >= MAX_ADDRESSES) throw AppError.conflict(`You can save up to ${MAX_ADDRESSES} addresses`);
  const makeDefault = req.body.isDefault === true || user.addresses.length === 0;
  if (makeDefault) user.addresses.forEach((a) => { a.isDefault = false; });
  user.addresses.push({ ...req.body, isDefault: makeDefault });
  await user.save();
  respond(res, user, 'Address saved', 201);
});

// Addresses are looked up inside the logged-in user's own document, so another user's address id is simply "not found".
exports.updateAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) throw AppError.notFound('Address not found');
  if (req.body.isDefault === true) user.addresses.forEach((a) => { a.isDefault = false; });
  Object.assign(addr, req.body);
  ensureDefault(user);
  await user.save();
  respond(res, user, 'Address updated');
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) throw AppError.notFound('Address not found');
  user.addresses.pull(addr._id);
  ensureDefault(user);
  await user.save();
  respond(res, user, 'Address deleted');
});
