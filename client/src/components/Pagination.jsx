import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageWindow } from '../utils/menuParams';

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const base = 'flex h-11 min-w-[44px] items-center justify-center rounded-lg px-3 font-bold';
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={`${base} border-2 border-line hover:border-ink disabled:opacity-40`} aria-label="Previous page"><ChevronLeft size={18} /></button>
      {pageWindow(page, pages).map((n, i) => n === null
        ? <span key={`gap${i}`} className="px-1 text-muted" aria-hidden="true">...</span>
        : <button key={n} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined} aria-label={`Page ${n}`} className={`${base} ${n === page ? 'bg-ink text-white' : 'border-2 border-line hover:border-ink'}`}>{n}</button>)}
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} className={`${base} border-2 border-line hover:border-ink disabled:opacity-40`} aria-label="Next page"><ChevronRight size={18} /></button>
    </nav>
  );
}
