// Validation for the create-admin script (pure, so it can be unit tested).
const EMAIL = /^\S+@\S+\.\S+$/;

function validateAdminInput({ email, name, password }) {
  const errors = [];
  if (!EMAIL.test(email || '')) errors.push('ADMIN_EMAIL must be a valid email address.');
  if (!name || name.trim().length < 2) errors.push('ADMIN_NAME must be at least 2 characters.');
  const pw = password || '';
  if (pw.length < 12 || pw.length > 72 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) errors.push('ADMIN_PASSWORD must be 12-72 characters and include a letter and a number.');
  return errors;
}
module.exports = { validateAdminInput };
