import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, min = 1, max = 20, onChange, label }) {
  const btn = 'flex h-11 w-11 items-center justify-center rounded-lg border-2 border-line hover:border-ink disabled:opacity-40 disabled:hover:border-line';
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Decrease quantity of ${label}`}><Minus size={16} /></button>
      <output className="w-8 text-center text-lg font-bold" aria-live="polite">{value}</output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase quantity of ${label}`}><Plus size={16} /></button>
    </div>
  );
}
