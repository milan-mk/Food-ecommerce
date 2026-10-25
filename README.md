# Snackyard: Fast Food E-Commerce Website

A complete online ordering site for a fast food restaurant, built with **Node.js, Express, MongoDB and React**. Customers browse the menu, build a cart, check out and pay with **PayPal**, then follow their order until it arrives. Staff run the business from an **admin dashboard**.

> "Snackyard" is a placeholder brand. Rename it in one place: `client/src/config.js`.

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Environment variables](#environment-variables)
6. [Database setup](#database-setup)
7. [Seed data](#seed-data)
8. [Running the backend and frontend](#running-the-backend-and-frontend)
9. [PayPal sandbox setup](#paypal-sandbox-setup)
10. [API documentation](#api-documentation)
11. [Admin credentials for development](#admin-credentials-for-development)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Security](#security)
15. [Screenshots](#screenshots)
16. [Future improvements](#future-improvements)

## Features

**Customers**
- Menu with category pills, search (name, description, category), price range, rating and in-stock filters, 5 sort orders and pagination. Filters live in the URL, so any view can be shared.
- Dish pages with ingredients, nutrition, stock status, related dishes and reviews (reviews open once an order containing the dish is delivered).
- Cart saved in the browser; every price, tax, delivery fee and discount is **calculated by the server**.
- Promo codes, an Offers page, and saved delivery addresses (up to 5).
- Checkout with **PayPal**, payment verified on the server, order confirmation, order history and a live order tracker that refreshes itself.
- Registration, login, logout, profile editing and password change.

**Admin**
- Dashboard: sales, orders, customers, low stock, a daily sales chart, orders by status, recent orders and popular dishes.
- Orders: search, filters, status updates with enforced rules, cancellation with automatic PayPal refund.
- Products, categories, inventory (quick stock adjustments), coupons and users (disable accounts, change roles).

**Platform**: JWT in an httpOnly cookie, rate limiting, input validation on every endpoint, atomic stock and coupon handling, responsive and keyboard accessible UI, and about 200 automated tests.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3, React Router 6, Axios, React Hook Form, Lucide icons |
| Backend | Node.js 18+, Express 4, Mongoose 8, Zod validation, JWT, bcryptjs, Helmet, CORS, express-rate-limit, express-mongo-sanitize |
| Database | MongoDB (local or Atlas) |
| Payments | PayPal Orders v2 (REST), behind a provider interface so another gateway can be added |
| Testing | Jest, Supertest, mongodb-memory-server (backend), Vitest and React Testing Library (frontend) |

## Architecture

```
food-ecommerce/
├── client/                    React app (Vite)
│   └── src/
│       ├── admin/             admin layout, pages, chart and form helpers
│       ├── components/        shared UI (cards, forms, PayPal button, order tracker...)
│       ├── context/           auth, cart and toast state
│       ├── hooks/             useFetch, useCartQuote, useDebounced...
│       ├── layouts/ pages/    customer layout and pages
│       ├── services/          one Axios instance + a small module per API area
│       └── utils/             formatting, URL params, order status rules
├── server/
│   ├── config/                environment + database connection
│   ├── controllers/ routes/   HTTP layer
│   ├── services/              pricing, orders, payments (PayPal), admin order logic
│   ├── middleware/            auth, validation, rate limits, error handling
│   ├── models/ validators/    Mongoose schemas and Zod schemas
│   ├── seed/ scripts/         seed data, image tools, create-admin, smoke tests
│   └── tests/                 Jest test suites
├── docs/MANUAL_QA.md          checks that need a human and a browser
├── render.yaml                optional Render blueprint
└── .env.example
```

**How a payment works (the server never trusts the browser):**

```
Cart (browser) -> POST /orders/quote      server prices the cart from database values
Checkout       -> POST /orders            order saved: Pending, unpaid, stock reserved
PayPal button  -> POST /payments/paypal/create-order   amount comes from OUR saved order
Buyer approves in PayPal
PayPal button  -> POST /payments/paypal/capture-order  server captures, then verifies with PayPal:
                  same PayPal order, status COMPLETED, reference = this order, same currency, same amount (to the cent)
Only then      -> order becomes Confirmed + paid, sales counted
```

Other design decisions: stock is reserved when an order is created and returned on cancellation; a paid order can only be cancelled by an admin, which refunds through PayPal first and changes nothing if the refund fails; duplicate captures are harmless (idempotent); a PayPal capture id can belong to only one order.

## Installation

Requirements: **Node.js 18 or newer** and a MongoDB database (local or free Atlas).

```bash
git clone <your-repository-url> food-ecommerce
cd food-ecommerce
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
npm install                     # root (installs "concurrently")
npm install --prefix server
npm install --prefix client
```

Open `.env` and fill in at least `MONGODB_URI` and `JWT_SECRET` (see below).

## Environment variables

One `.env` file in the project root is used by the server. **Never commit it** (it is in `.gitignore`).

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string, including the database name, e.g. `mongodb://127.0.0.1:27017/food-ecommerce` |
| `JWT_SECRET` | yes | Long random string. In production it must be 32+ characters or the server refuses to start. |
| `JWT_EXPIRES_IN` | no | Login lifetime, default `7d` |
| `PORT` | no | API port, default `5000` |
| `CLIENT_URL` | no | Exact URL of the website (CORS), default `http://localhost:5173` |
| `TRUST_PROXY` | no | Reverse proxies in front of the API, default `1`. Use `2` behind a Vercel rewrite plus Render. |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | for payments | From the PayPal developer dashboard. The secret is only ever read by the server. |
| `PAYPAL_ENVIRONMENT` | no | `sandbox` (default) or `live` |
| `CURRENCY` | no | Default `USD`. Must be a currency your PayPal account supports. |
| `TAX_RATE` | no | Default `0.05` (5%), charged on the discounted amount |
| `DELIVERY_FEE` / `FREE_DELIVERY_THRESHOLD` | no | Default `2.99` and `30` (free when the subtotal before discount reaches it) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | no | Development seed admin (defaults below) |

Generate a strong secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

The client needs no `.env` in development (Vite proxies `/api` and `/images` to the API). For production see `client/.env.example` and [Deployment](#deployment).

## Database setup

**Option A: MongoDB Atlas (free, recommended).** Create an M0 cluster, add a database user (letters and numbers only in the password), allow your IP under Network Access, then copy the connection string and add the database name:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/food-ecommerce?retryWrites=true&w=majority
```

If the password contains `@ : / ? # %`, URL-encode them (`@` becomes `%40`). Do not leave the `<` `>` brackets from Atlas's template.

**Option B: local MongoDB.** Install MongoDB Community Server and keep the default `mongodb://127.0.0.1:27017/food-ecommerce`. Collections and indexes are created automatically on first use.

## Seed data

```bash
npm run seed --prefix server        # DEVELOPMENT ONLY: wipes the database, then loads sample data
```

This creates 6 categories, 21 dishes (with generated illustrations), 2 coupons (`WELCOME10`, `SAVE3`) and two demo accounts. It refuses to run when `NODE_ENV=production`.

For a production database use the safe variant, which loads only the menu, creates no accounts, and refuses to run if any orders exist:

```bash
npm run seed:menu --prefix server
```

**Dish photos.** Each dish gets a generated illustration. To use real photos, save them in `server/public/images/products/` named after the dish slug (`classic-chicken-burger.jpg`, `margherita-pizza.webp`...) and run `npm run images:apply --prefix server`. Photos beat illustrations, and images set by hand in the admin are left alone.

## Running the backend and frontend

```bash
npm run dev                          # API on :5000 and website on :5173, together
# or separately:
npm run dev --prefix server          # API   http://localhost:5000  (health check: /api/health)
npm run dev --prefix client          # site  http://localhost:5173
```

Production build of the site: `npm run build` (output in `client/dist`). Production API: `npm start --prefix server`.

## PayPal sandbox setup

1. Sign in at [developer.paypal.com](https://developer.paypal.com), open **Apps & Credentials**, switch to **Sandbox**, and create an app (type *Merchant*).
2. Copy the **Client ID** and **Secret** into `.env` as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. Keep `PAYPAL_ENVIRONMENT=sandbox`. Restart the API.
3. Under **Testing Tools, Sandbox Accounts** use the **Personal** (buyer) account to pay. Never use a real PayPal account while testing.
4. Test a payment in the browser: add dishes, check out, pay with the sandbox buyer, and confirm the order shows **Paid** under My orders and in the admin.
5. Test from the terminal: `npm run smoke:payments --prefix server -- --interactive` walks one real sandbox payment and verifies it.
6. Test a refund: pay an order, then cancel it in the admin (Orders, open the order, *Cancel and refund*). The refund appears in the sandbox business account.

Going live: create **Live** credentials in the same dashboard, set `PAYPAL_ENVIRONMENT=live` with the live ID and secret on your host, confirm your currency is supported, and test with one small real payment and refund.

## API documentation

Base URL in development: `http://localhost:5000` (the website reaches it through the `/api` proxy).

**Authentication.** `register` and `login` set an httpOnly cookie named `token` (7 days). Browsers send it automatically; API tools may send `Authorization: Bearer <token>` instead. *Auth* below means a logged-in user, *Admin* means a user with role `admin`.

**Success responses** look like `{ "success": true, "data": ..., "message": "...", "pagination": { "page", "limit", "total", "pages" } }` (`message` and `pagination` appear where relevant).

**Error responses** always look like `{ "success": false, "message": "Product not found", "errors": [{ "field": "price", "message": "Price must be greater than 0" }] }` (`errors` only for validation).

| Status | Meaning |
|---|---|
| 400 | Malformed JSON or id |
| 401 | Not logged in, or the session expired |
| 402 | Payment declined |
| 403 | Logged in but not allowed (not an admin, account disabled, review not allowed) |
| 404 | Not found (also used for another customer's order or address) |
| 409 | Conflict: duplicate, out of stock, wrong order state |
| 422 | Validation failed (see `errors`) |
| 429 | Rate limited (general 300 per 15 min per IP, login and register 20, payments 60, wrong coupon guesses 15) |
| 502 / 503 | Payment provider problem or not configured |

### System

#### `GET /api/health`
Public. Returns `{ "success": true, "status": "ok", "time": "..." }`. Used by hosting health checks.

### Authentication

#### `POST /api/auth/register`
Public. Body: `name` (2-80), `email`, `password` (8-72, a letter and a number), `phone?`. Returns **201** `{ data: { user } }` and sets the cookie. Always creates a *customer*; a `role` in the body is ignored. Errors: 409 email taken, 422.

#### `POST /api/auth/login`
Public. Body: `email`, `password`. Returns `{ data: { user } }` and sets the cookie. Errors: 401 (same message for wrong email or wrong password), 403 account disabled, 422, 429.

#### `POST /api/auth/logout`
Public. Clears the cookie. Returns `{ "message": "Logged out" }`.

#### `GET /api/auth/me`
Auth. Returns `{ data: { user } }` including saved `addresses`. Error: 401.

#### `PUT /api/auth/profile`
Auth. Body: `name?`, `phone?` (an empty string clears it). Email and role cannot be changed. Returns `{ data: { user } }`. Error: 422.

#### `PUT /api/auth/password`
Auth. Body: `currentPassword`, `newPassword`. Returns `{ message: "Password changed" }`. Errors: 422 with `errors[].field` of `currentPassword` (wrong) or `newPassword` (weak or unchanged), 429.

#### `POST /api/auth/addresses`
Auth. Body: `label?`, `fullName`, `phone`, `address`, `city`, `state`, `postalCode`, `isDefault?`. The first address becomes the default. Returns **201** `{ data: { user } }`. Errors: 409 (limit is 5), 422.

#### `PUT /api/auth/addresses/:addressId`
Auth. Any of the address fields. One address is always the default. Returns `{ data: { user } }`. Errors: 404, 422.

#### `DELETE /api/auth/addresses/:addressId`
Auth. Deletes the address (another default is promoted). Returns `{ data: { user } }`. Error: 404.

### Categories

#### `GET /api/categories`
Public. Returns every category with `productCount` (visible dishes only).

#### `GET /api/categories/:id`
Public. `:id` may be the id or the slug. Error: 404.

#### `POST /api/categories`
Admin. Body: `name` (2-60), `description?`, `image?`. Returns **201**. Errors: 409 duplicate name, 422.

#### `PUT /api/categories/:id`
Admin. Any of the create fields (the slug follows the name). Errors: 404, 409, 422.

#### `DELETE /api/categories/:id`
Admin. Error: 409 if dishes still use the category, 404.

### Products

#### `GET /api/products`
Public. Query: `q` (name, description, category name), `category` (id or slug), `minPrice`, `maxPrice`, `rating` (minimum), `inStock`, `featured`, `sort` (`newest`, `popular`, `rating`, `price_asc`, `price_desc`), `page`, `limit` (1-50, default 12). Hidden dishes are excluded; admins may add `includeInactive=true`. Returns `data[]` and `pagination`. Error: 422 for a bad query.

#### `GET /api/products/:id`
Public. `:id` may be the id or the slug. Returns `{ data: product, related: [up to 4] }`. Hidden dishes are 404 for the public.

#### `POST /api/products`
Admin. Body: `name` (2-120), `description` (10-1000), `price` (> 0), `category` (id), `image?` (`/path` or `http(s)://`), `ingredients?` (string array), `nutrition?` (`calories`, `protein`, `carbs`, `fat`), `stock?`, `isAvailable?`, `featured?`. Ratings and sales counts cannot be set. Returns **201**. Errors: 422 (including a category that does not exist).

#### `PUT /api/products/:id`
Admin. Any create field; at least one is required. Errors: 404, 422.

#### `DELETE /api/products/:id`
Admin. Also deletes the dish's reviews; past orders keep their own copy of name and price. Error: 404.

### Reviews

#### `GET /api/products/:id/reviews`
Public. Query: `page`, `limit` (default 10). Returns `{ data: [{ rating, comment, user: { name } }], summary: { ratingAverage, ratingCount }, pagination }`. Emails are never included.

#### `POST /api/products/:id/reviews`
Auth. Body: `rating` (1-5), `comment?` (500 max). Returns **201**. Errors: 403 unless the user has a **Delivered** order containing the dish, 409 already reviewed, 422.

#### `PUT /api/reviews/:id`
Auth, author only. Body: `rating?`, `comment?`. The dish rating is recalculated. Errors: 403, 404, 422.

#### `DELETE /api/reviews/:id`
Auth, author or admin. Errors: 403, 404.

### Cart and orders

There is no server-side cart: the browser keeps product ids and quantities, and the server prices them on demand. `quote` is the cart's price calculation.

#### `POST /api/orders/quote`
Public. Body: `items` (`[{ product, quantity }]`, quantity 1-20, up to 30 lines), `couponCode?`. Prices are taken from the database; any price or total in the body is ignored. Returns `{ data: { items, subtotal, discount, tax, deliveryFee, total, couponCode, currency } }`. Errors: 404 unknown dish, 409 hidden, sold out or not enough stock, 422 (including `errors[].field = "couponCode"` for an unknown, expired, used-up or below-minimum code), 429 for repeated wrong codes.

#### `POST /api/orders`
Auth. Body: `items`, `couponCode?`, `deliveryAddress` (`fullName`, `phone`, `address`, `city`, `state`, `postalCode`). Returns **201** the order: status `Pending`, payment `pending`, stock and coupon use reserved. Errors: 409 stock changed, 422.

#### `GET /api/orders/my-orders`
Auth. Query: `status?`, `page`, `limit` (default 10). Newest first. Returns `data[]` and `pagination`.

#### `GET /api/orders/:id`
Auth. The owner, or an admin (who also gets the customer details). Anyone else gets 404. Error: 422 for a malformed id.

#### `PUT /api/orders/:id/cancel`
Auth, owner only. Works only for an unpaid `Pending` order; releases stock and coupon use. Errors: 404, 409 (already cancelled, already paid, or past `Pending`).

### Coupons

#### `GET /api/coupons/active`
Public. Coupons that can be used right now (code, description, type, value, minimum order, maximum discount, expiry). Usage counters are not exposed.

#### `POST /api/coupons/validate`
Public. Body: `code`, `items`. Returns `{ data: { code, discount, quote } }`. Errors as for `quote`.

### Payments

#### `GET /api/payments/config`
Public. Returns `{ data: { provider, enabled, clientId, environment, currency } }`. The client id is public by design; the secret never leaves the server.

#### `POST /api/payments/paypal/create-order`
Auth. Body: `orderId`. Creates (or reuses) the PayPal order for **our saved order total** and stores its id. Returns `{ data: { paypalOrderId, approveUrl } }`. Errors: 404 (not your order), 409 (paid, cancelled or not `Pending`), 503 PayPal not configured.

#### `POST /api/payments/paypal/capture-order`
Auth. Body: `orderId`, `paypalOrderId`. Captures the approved payment, then verifies it with PayPal before marking the order paid and `Confirmed`. Safe to repeat. Errors: 402 declined, 409 (not approved yet, wrong PayPal order for this order, cancelled, or verification failed), 404, 502.

### Admin

All endpoints below require an admin; anonymous users get 401 and customers get 403.

#### `GET /api/admin/stats`
Query: `days` (1-90, default 14). Returns totals (orders, sales from paid orders, customers, products, low stock), `pendingOrders`, `activeOrders`, `completedOrders`, `statusCounts`, `recentOrders`, `popularProducts` and a zero-filled `salesByDay` (UTC days).

#### `GET /api/admin/orders`
Query: `status`, `paymentStatus`, `q` (full order id, the last characters of an id, customer name, email or phone), `from`, `to` (dates, inclusive), `page`, `limit`. Returns orders with the customer populated.

#### `PUT /api/admin/orders/:id/status`
Body: `status`. Allowed moves: Pending to Cancelled; Confirmed to Preparing or Cancelled; Preparing to Out for Delivery or Cancelled; Out for Delivery to Delivered or Cancelled. Delivered and Cancelled are final, and an unpaid order cannot move forward. Cancelling a paid order **refunds it through PayPal first**; if the refund fails the order is unchanged. Cancelling restores stock and coupon use. Errors: 409, 422, 502/503.

#### `POST /api/admin/orders/:id/refund`
Refunds a cancelled order that is still marked paid (a customer who paid just as it was cancelled). Error: 409 for any other order.

#### `GET /api/admin/users`
Query: `q`, `role`, `isActive`, `page`, `limit`. Passwords are never returned.

#### `GET /api/admin/users/:id`
Returns the user, `stats` (order count, total spent on paid orders) and `recentOrders`. Error: 404.

#### `PUT /api/admin/users/:id`
Body: `isActive?`, `role?` (nothing else can be edited). Disabling signs the person out immediately. Admins cannot change their own role or status (409). Errors: 404, 422.

#### `GET /api/admin/inventory`
Query: `filter` (`all`, `low`, `out`), `threshold` (default 10), `q`, `page`, `limit`. Lowest stock first.

#### `PUT /api/admin/inventory/:id`
Body: exactly one of `set` (absolute stock) or `adjust` (positive or negative, applied atomically). Errors: 404, 409 if the adjustment would go below zero, 422.

#### `GET /api/admin/coupons`
Returns every coupon with a computed `state`: `active`, `inactive`, `expired` or `exhausted`.

#### `POST /api/admin/coupons`
Body: `code` (3-30 of letters, numbers, `-`, `_`; stored upper-case), `description?`, `discountType` (`percentage` or `fixed`), `discountValue` (> 0, at most 100 for percentages), `minOrder?`, `maxDiscount?`, `expiresAt` (future), `usageLimit?`, `isActive?`. Returns **201**. Errors: 409 duplicate code, 422.

#### `PUT /api/admin/coupons/:id`
Any create field. Usage counters cannot be edited. Errors: 404, 422.

#### `DELETE /api/admin/coupons/:id`
Past orders keep their discount. Error: 404.

## Admin credentials for development

After `npm run seed --prefix server`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin@12345` |
| Customer | `customer@example.com` | `Customer@123` |

Admin login page: `http://localhost:5173/admin/login`. These accounts exist **only in development**. Never run the full seed against a production database; create your real admin with `npm run create-admin --prefix server` (see Deployment).

Coupons to try: `WELCOME10` (10% off orders over 10, up to 5) and `SAVE3` (3 off orders over 15).

## Testing

```bash
npm test                      # backend + frontend
npm run test:server           # Jest + Supertest, about 200 tests, in-memory MongoDB, fake PayPal
npm run test:client           # Vitest + React Testing Library
```

- **Backend:** authentication, products, orders and pricing, payments (including tampered amounts, declined cards, double clicks and cancelled orders), admin actions and authorization, profile and addresses, plus a test that **fails if any API route is missing from this README**. The first run downloads a MongoDB binary (about 100 MB). To use your own server set `TEST_MONGODB_URI`; tests only ever touch databases named `test_*`.
- **PayPal in tests** is an in-memory fake that behaves like PayPal (capture before approval fails, a second capture fails...), so no credentials or network are needed.
- **Smoke tests against a running server:** `npm run smoke --prefix server` (catalog and auth), `smoke:orders`, `smoke:payments` (add `-- --interactive` for a real sandbox payment) and `smoke:admin`.
- **Checks that need a person and a browser** (responsive layouts at 320 to 1440 px, the real PayPal sandbox flow, console errors, keyboard use) are listed in [`docs/MANUAL_QA.md`](docs/MANUAL_QA.md).

## Deployment

Recommended: **MongoDB Atlas** (database), **Render** (API), **Vercel** (website). Use a *separate* Atlas database for production (for example `food-ecommerce-prod`), not your development one.

**1. Database.** In Atlas create the production database user and allow connections (Render's IP addresses change, so Network Access usually needs `0.0.0.0/0`; the password is what protects it, so make it long).

**2. API on Render.** New Web Service from your repository (or use `render.yaml`):
- Root directory `server`, build command `npm install`, start command `npm start`, health check path `/api/health`.
- Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (32+ random characters), `CLIENT_URL` (your Vercel URL, no trailing slash), `TRUST_PROXY=2`, `CURRENCY`, `PAYPAL_ENVIRONMENT=sandbox` plus `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
- Open `https://YOUR-API.onrender.com/api/health`. It should answer `ok`. (Free instances sleep when idle, so the first request can take about a minute.)

**3. Load the menu and create your admin** (run these from your own computer, with `MONGODB_URI` pointing at the **production** database):

```bash
npm run seed:menu --prefix server        # menu only: no demo accounts, refuses if orders exist
# PowerShell:
$env:ADMIN_EMAIL='you@example.com'; $env:ADMIN_NAME='Your Name'; $env:ADMIN_PASSWORD='a-long-password-1'
npm run create-admin --prefix server
```

Use a password of 12+ characters, then close the terminal so it does not linger in the session.

**4. Website on Vercel.** Import the repository: root directory `client`, framework Vite, build `npm run build`, output `dist`. Before deploying, edit **`client/vercel.json`** and replace `YOUR-API.onrender.com` with your API host. That file proxies `/api` and `/images` to the API (so the login cookie stays first-party; browsers increasingly block cookies between different domains) and makes deep links like `/menu` work. No client environment variables are needed this way. On Netlify, edit `client/public/_redirects` the same way.

**5. Final checks.** Log in at `/admin/login`; place and pay a sandbox order; confirm it appears in the admin; cancel it and confirm the refund. Then see "Going live" under PayPal setup.

Without the proxy (separate domains) set `VITE_API_URL` and `VITE_API_ORIGIN` for the client build; this needs `SameSite=None; Secure` cookies, which the API already uses in production, but some browsers will still block them.

## Security

Passwords are hashed with bcrypt; login is an httpOnly cookie, never readable by page scripts; every input is validated on the server; NoSQL operators are stripped from requests; Helmet headers, a single allowed CORS origin and rate limits (including a limiter on wrong coupon guesses) are on by default; customers can only read their own orders and addresses; admin routes check the role on every request; prices and payment status are decided by the server and verified with PayPal; error responses never include stack traces in production; the PayPal secret, JWT secret and database password exist only in server environment variables. A search of the project found no committed secrets, and `.env` is ignored by git. Run `npm audit` periodically for dependency advisories.

## Screenshots

Screenshots cannot be generated from the source code, so capture them from your running site and save them in `docs/screenshots/`. Suggested set (add them to this section with `![Home](docs/screenshots/home.png)`):

`home.png`, `menu.png`, `product.png`, `cart.png`, `checkout-paypal.png`, `order-tracking.png`, `profile.png`, `admin-dashboard.png`, `admin-orders.png`, `admin-products.png` (desktop) and `home-mobile.png`, `menu-mobile.png` (about 375 px wide).

## Future improvements

- **Forgot password** by email (needs an email provider such as SendGrid or SMTP and a reset-token endpoint).
- **Image upload** for products (Cloudinary or S3). Today images are set by URL or path.
- **PayPal webhooks** to learn about disputes and refunds made outside the admin.
- **Expire unpaid orders** automatically so abandoned checkouts release their reserved stock.
- **Sign out other devices** when the password changes (token versioning).
- Email notifications for order status changes; a contact form that sends email.
- A shared rate-limit store (Redis) when running more than one API instance.
- Search through Atlas Search for very large menus; multi-currency prices.
- An admin audit log of who changed what.
