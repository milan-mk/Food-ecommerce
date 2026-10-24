import { useEffect, useState } from 'react';

// Returns `value` only after it has stopped changing for `ms` (used for search boxes).
export function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
