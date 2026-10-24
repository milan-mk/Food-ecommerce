import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { BRAND } from '../config';

const VALUES = [
  ['Made when you order', 'Nothing sits under a heat lamp. The kitchen starts your food after your payment is confirmed.'],
  ['Honest prices', 'The price you see is the price you pay. Tax, delivery and any discount are shown before you pay.'],
  ['Clear information', 'Every dish lists its ingredients and nutrition, so you know what is on your plate.'],
];

export default function About() {
  useDocumentTitle('About us');
  return (
    <div className="container-page py-8">
      <h1 className="max-w-3xl text-4xl sm:text-6xl">Fast food that is cooked after you ask for it.</h1>
      <p className="mt-6 max-w-2xl text-lg text-ink/85">{BRAND} is an online kitchen for burgers, pizza, sides and desserts. You choose, pay securely through PayPal, and follow the order from confirmation to your door. No phone calls, no guessing where your food is.</p>

      <ul className="mt-14 grid gap-10 md:grid-cols-3">
        {VALUES.map(([title, text]) => (
          <li key={title} className="border-t-4 border-ink pt-4"><h2 className="text-2xl">{title}</h2><p className="mt-2 text-ink/80">{text}</p></li>
        ))}
      </ul>

      <div className="mt-16 rounded-2xl bg-mustard p-8 sm:p-12">
        <h2 className="text-3xl">Hungry already?</h2>
        <p className="mt-2 max-w-md">The full menu is a tap away.</p>
        <Link to="/menu" className="btn-dark mt-6">See the menu</Link>
      </div>
    </div>
  );
}
