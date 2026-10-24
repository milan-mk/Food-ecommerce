import { Link } from 'react-router-dom';
import Logo from './Logo';
import { BRAND, TAGLINE } from '../config';

const COLUMNS = [
  ['Order', [['/menu', 'Full menu'], ['/offers', 'Offers and codes'], ['/cart', 'Your cart'], ['/orders', 'Track an order']]],
  ['Company', [['/about', 'About us'], ['/services', 'Services'], ['/contact', 'Contact']]],
  ['Account', [['/login', 'Log in'], ['/register', 'Create account'], ['/profile', 'Profile']]],
];

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo className="[&_span]:text-white" />
          <p className="mt-4 max-w-xs text-white/75">{TAGLINE}</p>
          <p className="mt-6 text-sm text-white/75">Open daily, 10:00 to 23:00</p>
        </div>
        {COLUMNS.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="text-base text-mustard">{title}</h2>
            <ul className="mt-3 space-y-2">
              {links.map(([to, label]) => <li key={to}><Link to={to} className="text-white/85 hover:text-white hover:underline">{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15 py-5 text-center text-sm text-white/65">
        &copy; {new Date().getFullYear()} {BRAND}. Payments are processed securely by PayPal.
      </div>
    </footer>
  );
}
