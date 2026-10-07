import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { addReview, deleteReview, getReviews, updateReview } from '../services/catalogService';
import { formatDay } from '../utils/format';
import Pagination from './Pagination';
import Rating from './Rating';
import { ErrorState } from './States';

function Stars({ value }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} aria-hidden="true" className={n <= value ? 'fill-mustard text-mustard-dark' : 'text-line'} />)}
    </span>
  );
}

function StarInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface">
          <Star size={28} className={n <= value ? 'fill-mustard text-mustard-dark' : 'text-line'} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId, existing, onSaved, onCancel }) {
  const toast = useToast();
  const [rating, setRating] = useState(existing ? existing.rating : 0);
  const [comment, setComment] = useState(existing ? existing.comment || '' : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Choose a star rating first.');
    setBusy(true); setError('');
    try {
      if (existing) await updateReview(existing._id, { rating, comment: comment.trim() });
      else await addReview(productId, { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      toast.success(existing ? 'Review updated' : 'Thanks for your review!');
      return onSaved();
    } catch (err) {
      return setError(err.message); // e.g. "You can only review products from your delivered orders"
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border-2 border-line p-5" noValidate>
      <StarInput value={rating} onChange={setRating} />
      <label htmlFor="comment" className="label mt-3">Comment (optional)</label>
      <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3} className="input" placeholder="What did you like?" />
      <p className="mt-1 text-right text-xs text-muted">{comment.length}/500</p>
      {error && <p role="alert" className="mt-2 rounded-lg bg-ketchup-light px-3 py-2 font-medium text-ketchup-dark">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={busy} className="btn-primary btn-sm">{busy ? 'Saving...' : existing ? 'Save changes' : 'Post review'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost btn-sm">Cancel</button>}
      </div>
    </form>
  );
}

export default function Reviews({ product, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const reviews = useFetch((signal) => getReviews(product._id, { page, limit: 5 }, { signal }), [product._id, page]);

  const changed = () => { setEditing(null); reviews.reload(); onChanged(); };
  const remove = async (id) => {
    if (!window.confirm('Delete your review?')) return;
    try { await deleteReview(id); toast.success('Review deleted'); changed(); } catch (err) { toast.error(err.message); }
  };

  const list = reviews.data ? reviews.data.data : [];
  return (
    <section aria-labelledby="reviews" className="mt-16">
      <h2 id="reviews" className="text-3xl">Reviews</h2>
      <div className="mt-2"><Rating value={product.ratingAverage} count={product.ratingCount} /></div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {reviews.loading && <p className="text-muted" role="status">Loading reviews...</p>}
          {reviews.error && <ErrorState error={reviews.error} onRetry={reviews.reload} title="Reviews did not load" />}
          {reviews.data && list.length === 0 && <p className="rounded-xl border-2 border-dashed border-line p-6 text-muted">No reviews yet. Be the first once you have tried it.</p>}
          <ul className="divide-y divide-line">
            {list.map((r) => {
              const mine = user && r.user && r.user._id === user._id;
              return (
                <li key={r._id} className="py-5">
                  {editing === r._id ? (
                    <ReviewForm productId={product._id} existing={r} onSaved={changed} onCancel={() => setEditing(null)} />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold">{r.user ? r.user.name : 'Customer'}{mine && <span className="chip ml-2 bg-leaf-light">You</span>}</p>
                        <time className="text-sm text-muted" dateTime={r.createdAt}>{formatDay(r.createdAt)}</time>
                      </div>
                      <div className="mt-1"><Stars value={r.rating} /></div>
                      {r.comment && <p className="mt-2 text-ink/90">{r.comment}</p>}
                      {(mine || (user && user.role === 'admin')) && (
                        <div className="mt-3 flex gap-4 text-sm font-bold">
                          {mine && <button onClick={() => setEditing(r._id)} className="underline">Edit</button>}
                          <button onClick={() => remove(r._id)} className="text-ketchup-dark underline">Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {reviews.data && <Pagination page={reviews.data.pagination.page} pages={reviews.data.pagination.pages} onChange={setPage} />}
        </div>

        <div>
          <h3 className="text-xl">Write a review</h3>
          {user ? (
            <div className="mt-3">
              <p className="mb-3 text-sm text-muted">Reviews open once an order containing this dish has been delivered.</p>
              <ReviewForm productId={product._id} onSaved={changed} />
            </div>
          ) : (
            <p className="mt-3 text-muted"><Link to="/login" state={{ from: `/product/${product.slug}` }} className="font-bold text-ketchup-dark underline">Log in</Link> to review this dish.</p>
          )}
        </div>
      </div>
    </section>
  );
}
