const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Please provide a valid email').max(120);
const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt ignores bytes beyond 72
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

exports.register = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password,
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid phone number').optional(),
});

exports.login = z.object({ email, password: z.string().min(1, 'Password is required') });

exports.password = password;
exports.phone = z.string().trim().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid phone number');
