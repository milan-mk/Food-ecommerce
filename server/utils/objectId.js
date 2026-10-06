// NOTE: mongoose.isValidObjectId() returns true for ANY 12-char string (e.g. the slug "cheese-pizza"),
// so we use a strict 24-hex check to tell ids and slugs apart.
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const isObjectId = (v) => OBJECT_ID_RE.test(String(v));
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
module.exports = { OBJECT_ID_RE, isObjectId, escapeRegex };
