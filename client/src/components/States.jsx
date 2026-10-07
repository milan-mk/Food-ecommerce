import { Link } from 'react-router-dom';

export function EmptyState({ title, message, actionLabel, actionTo, emoji = '🍽️' }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-line px-6 py-14 text-center">
      <div className="text-4xl" aria-hidden="true">{emoji}</div>
      <h3 className="mt-3 text-xl">{title}</h3>
      {message && <p className="mx-auto mt-1 max-w-md text-muted">{message}</p>}
      {actionTo && <Link to={actionTo} className="btn-primary mt-5">{actionLabel}</Link>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'We could not load this' }) {
  return (
    <div className="rounded-xl border-2 border-ketchup/30 bg-ketchup-light px-6 py-10 text-center" role="alert">
      <h3 className="text-xl">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-ink/80">{(error && error.message) || 'Please try again.'}</p>
      {onRetry && <button onClick={onRetry} className="btn-dark mt-5">Try again</button>}
    </div>
  );
}
