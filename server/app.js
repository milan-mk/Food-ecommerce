const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { clientUrl, env } = require('./config/env');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // correct client IPs behind Render/Railway proxies
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // lets the client load /images
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . operators from input (NoSQL injection)
if (env === 'development') app.use(morgan('dev'));

app.use('/images', express.static(path.join(__dirname, 'public/images'), { maxAge: '7d' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
}));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payments', require('./routes/payments'));
// Admin routes are mounted in a later slice.

app.use(notFound);
app.use(errorHandler);

module.exports = app;
