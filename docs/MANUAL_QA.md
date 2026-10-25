# Manual QA checklist

Automated tests cover the logic. These checks need a person and a browser. Run the site with `npm run dev`, seed the database, and tick each box. Note anything that fails.

## 1. Responsive layouts

Open each page at these widths (browser dev tools, device toolbar): **320, 375, 425, 768, 1024 and 1440 px.**

For every width check that: nothing scrolls sideways, text is readable, buttons are easy to tap (about 44 px), the navigation works (menu button on small screens), and images do not stretch.

- [ ] Home  - [ ] Menu (open the filters on a phone width)  - [ ] Dish page  - [ ] Cart
- [ ] Checkout (both steps)  - [ ] My orders and an order page  - [ ] Profile
- [ ] Login and Register  - [ ] Offers, About, Services, Contact
- [ ] Admin: dashboard, orders (tables scroll inside their box), product form, inventory

## 2. The complete order flow with the PayPal Sandbox

Use a sandbox **buyer** account (developer.paypal.com, Testing Tools, Sandbox Accounts).

1. [ ] Register a new customer, then log out and log in again.
2. [ ] Menu: search "burger", filter by category and price, sort by price, open page 2.
3. [ ] Open a dish, change the quantity, add to cart. The cart badge updates; refresh the page and it stays.
4. [ ] Cart: change quantities, remove an item, apply `WELCOME10` (discount appears), try a wrong code (reason shown).
5. [ ] Checkout: submit with empty fields (errors shown); enter an address; tick "save this address".
6. [ ] Continue to payment, then **cancel inside PayPal**. You see a message, the order is kept, and the cart is not emptied.
7. [ ] Reload the checkout page. It resumes the unpaid order (no duplicate).
8. [ ] Pay with the sandbox buyer. You land on the confirmation page; the cart is empty.
9. [ ] My orders: the order shows **Paid** and **Confirmed**; its page shows the progress tracker.
10. [ ] Admin: the order appears. Move it to Preparing, Out for Delivery, Delivered.
11. [ ] Customer: within about 20 seconds the order page shows the new status without reloading.
12. [ ] Customer: leave a review on a delivered dish; the dish rating changes. Edit it, then delete it.
13. [ ] Place and pay a second order, then **cancel it in the admin**. The status becomes Cancelled and the customer sees "refunded"; the refund is visible in the sandbox business account.
14. [ ] Profile: change the name, add and delete an address, change the password, log in with the new one.

## 3. Admin

- [ ] `/admin/login` rejects a customer account with a clear message.
- [ ] A customer who types `/admin` in the address bar is sent away.
- [ ] Dashboard numbers match what you just did (sales, orders, popular dishes); the chart shows today's sale.
- [ ] Products: create a dish (with an image path), edit it, hide it (it disappears from the public menu), delete it.
- [ ] Categories: try deleting one that has dishes (refused with a message).
- [ ] Inventory: +1, -1, set a value; stock cannot go below zero.
- [ ] Coupons: create, deactivate (vanishes from Offers), delete.
- [ ] Users: disable the test customer; their open browser session is signed out; enable again.

## 4. Browser console and network

With dev tools open, click through the whole site.

- [ ] No red errors in the Console on any page (blue/yellow development notices are fine).
- [ ] The Network tab shows no failed (red) requests except deliberate ones, such as a wrong password.
- [ ] No request contains a PayPal secret or JWT secret (only the public PayPal client id appears).

## 5. Keyboard and accessibility quick check

- [ ] Press Tab through the Home page: focus is always visible, and the first Tab offers "Skip to content".
- [ ] Complete a login using only the keyboard.
- [ ] Open the mobile menu and the account menu with the keyboard; Escape closes them.
- [ ] Zoom the browser to 200%: nothing overlaps or disappears.

## 6. Production build

- [ ] `npm run build` finishes without errors; `npm run preview --prefix client` serves the built site and the basic pages load.
