import { Check } from 'lucide-react';

export const STEPS = ['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

// Shows how far an order has come. Pending means "not paid yet", so no step is complete.
export default function StatusTracker({ status }) {
  if (status === 'Cancelled') {
    return <p role="status" className="rounded-lg bg-ketchup-light px-4 py-3 font-bold text-ketchup-dark">This order was cancelled.</p>;
  }
  const current = STEPS.indexOf(status); // -1 while Pending
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i < current || status === 'Delivered';
        const active = i === current && status !== 'Delivered';
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="flex flex-col items-center gap-2 text-center">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold ${done ? 'border-leaf bg-leaf text-white' : active ? 'border-ink bg-mustard' : 'border-line text-muted'}`}>
              {done ? <Check size={20} aria-label="Completed" /> : i + 1}
            </span>
            <span className={`text-xs font-bold sm:text-sm ${done || active ? 'text-ink' : 'text-muted'}`}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
