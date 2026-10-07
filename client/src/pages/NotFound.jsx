import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-8xl font-extrabold text-ketchup" aria-hidden="true">404</p>
      <h1 className="mt-2 text-4xl">That page is off the menu</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">The link may be old, or the address may have a typo.</p>
      <div className="mt-8 flex justify-center gap-3"><Link to="/" className="btn-primary">Go home</Link><Link to="/menu" className="btn-ghost">See the menu</Link></div>
    </div>
  );
}
