import { Link } from 'react-router-dom';
import { BRAND } from '../config';

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`} aria-label={`${BRAND} home`}>
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#D93A2B" />
        <path d="M7 15a9 7 0 0 1 18 0z" fill="#FFC233" stroke="#231815" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6 19h20" stroke="#231815" strokeWidth="3" strokeLinecap="round" />
        <path d="M8 23h16a4 3 0 0 1-4 3h-8a4 3 0 0 1-4-3z" fill="#FFC233" stroke="#231815" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-2xl font-extrabold tracking-tight">{BRAND}</span>
    </Link>
  );
}
