const { z } = require('zod');
const { OBJECT_ID_RE } = require('../utils/objectId');
const { password, phone } = require('./authSchemas');

const nonEmpty = (o) => Object.keys(o).length > 0;

exports.updateProfile = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
  phone: phone.or(z.literal('')).optional(), // '' clears the phone number
}).refine(nonEmpty, 'Provide a name and/or phone');

exports.changePassword = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

const address = z.object({
  label: z.string().trim().min(1).max(30).optional(),
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  phone,
  address: z.string().trim().min(5, 'Address is too short').max(200),
  city: z.string().trim().min(2, 'City is required').max(60),
  state: z.string().trim().min(2, 'State is required').max(60),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9\- ]{3,10}$/, 'Invalid postal code'),
  isDefault: z.boolean().optional(),
});
exports.createAddress = address;
exports.updateAddress = address.partial().refine(nonEmpty, 'Provide at least one field to update');
exports.addressParam = z.object({ addressId: z.string().regex(OBJECT_ID_RE, 'Invalid address id') });
