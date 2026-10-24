import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// TEMPORARY: replaced by the real page in slice 8.
export default function PageSoon({ title }) {
  useDocumentTitle(title);
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-4xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">This page is built in the next development step.</p>
      <Link to="/" className="btn-ghost mt-8">Back to home</Link>
    </div>
  );
}
