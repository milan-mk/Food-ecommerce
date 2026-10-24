import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CONTACT } from '../config';

export default function Contact() {
  useDocumentTitle('Contact');
  const rows = [
    [Mail, 'Email', CONTACT.email, `mailto:${CONTACT.email}`],
    [Phone, 'Phone', CONTACT.phone, `tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`],
    [MapPin, 'Kitchen', CONTACT.address],
    [Clock, 'Opening hours', CONTACT.hours],
  ];
  return (
    <div className="container-page py-8">
      <h1 className="text-4xl sm:text-5xl">Contact</h1>
      <p className="mt-2 max-w-xl text-muted">Questions about an order? Have your order number ready, you can find it on the My orders page.</p>
      <ul className="mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
        {rows.map(([Icon, label, value, href]) => (
          <li key={label} className="flex gap-4 rounded-xl border-2 border-line p-5">
            <Icon size={24} className="mt-1 shrink-0 text-ketchup" aria-hidden="true" />
            <div><p className="text-sm font-bold text-muted">{label}</p>{href ? <a href={href} className="text-lg font-bold underline decoration-ketchup decoration-2 underline-offset-4">{value}</a> : <p className="text-lg font-bold">{value}</p>}</div>
          </li>
        ))}
      </ul>
      <p className="mt-8"><Link to="/orders" className="font-bold text-ketchup-dark underline">Go to My orders</Link></p>
    </div>
  );
}
