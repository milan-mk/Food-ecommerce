import { Star } from 'lucide-react';

export default function Rating({ value = 0, count = 0, className = '' }) {
  if (!count) return <span className={`text-sm text-muted ${className}`}>No reviews yet</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`} aria-label={`Rated ${value} out of 5 from ${count} reviews`}>
      <Star size={16} className="fill-mustard text-mustard-dark" aria-hidden="true" />
      <b>{value.toFixed(1)}</b>
      <span className="text-muted">({count})</span>
    </span>
  );
}
