import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SERVICES = [
  ['Online ordering', 'Browse by category, search, filter by price or rating, and build your order in minutes.'],
  ['Secure PayPal payment', 'Pay with PayPal. Your payment is verified on our server before an order is confirmed.'],
  ['Home delivery', 'Your order is delivered to the address you enter at checkout. Delivery is free on larger orders.'],
  ['Live order tracking', 'Watch your order move from confirmed to preparing to out for delivery to delivered.'],
  ['Offers and promo codes', 'Active codes are listed on the Offers page and applied in your cart.'],
  ['Reviews', 'After your order is delivered, rate the dishes you tried to help other customers choose.'],
];

export default function Services() {
  useDocumentTitle('Services');
  return (
    <div className="container-page py-8">
      <h1 className="text-4xl sm:text-5xl">Services</h1>
      <p className="mt-2 max-w-xl text-muted">Everything you can do on the site today.</p>
      <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
        {SERVICES.map(([title, text]) => (
          <div key={title} className="border-l-4 border-ketchup pl-5"><dt className="font-display text-xl font-extrabold">{title}</dt><dd className="mt-1 text-ink/80">{text}</dd></div>
        ))}
      </dl>
      <Link to="/menu" className="btn-primary mt-12">Start an order</Link>
    </div>
  );
}
