const jwt = require('jsonwebtoken');
const { jwt: jwtCfg, isProd } = require('../config/env');

const COOKIE_NAME = 'token';
const UNIT = { d: 864e5, h: 36e5, m: 6e4 };

function expiryMs() {
  const m = /^(\d+)([dhm])$/.exec(jwtCfg.expiresIn);
  return m ? Number(m[1]) * UNIT[m[2]] : 7 * UNIT.d;
}

const cookieOptions = () => ({
  httpOnly: true,                       // JS in the browser can never read the token
  secure: isProd,                       // HTTPS only in production
  sameSite: isProd ? 'none' : 'lax',    // 'none' needed when client and API are on different domains
  path: '/',
});

const signToken = (id) => jwt.sign({ id }, jwtCfg.secret, { expiresIn: jwtCfg.expiresIn });

function sendToken(res, user, status, message) {
  res.cookie(COOKIE_NAME, signToken(user._id), { ...cookieOptions(), maxAge: expiryMs() });
  res.status(status).json({ success: true, message, data: { user } });
}

const clearToken = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

module.exports = { COOKIE_NAME, sendToken, clearToken };
