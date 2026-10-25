// Creates an admin account (or promotes an existing user). Needed in production, where the seed script is disabled.
//
//   PowerShell:  $env:ADMIN_EMAIL='you@example.com'; $env:ADMIN_NAME='Your Name'; $env:ADMIN_PASSWORD='a-long-password-1'
//                npm run create-admin --prefix server
//   Bash:        ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-long-password-1' npm run create-admin --prefix server
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { validateAdminInput } = require('../utils/adminInput');

const input = {
  email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  name: (process.env.ADMIN_NAME || 'Admin').trim(),
  password: process.env.ADMIN_PASSWORD || '',
};

(async () => {
  const errors = validateAdminInput(input);
  if (errors.length) { errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

  await connectDB();
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    existing.role = 'admin';
    existing.isActive = true;
    await existing.save();
    console.log(`Existing account ${input.email} is now an admin (its password was not changed).`);
  } else {
    await User.create({ name: input.name, email: input.email, password: input.password, role: 'admin' });
    console.log(`Admin account created for ${input.email}.`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
