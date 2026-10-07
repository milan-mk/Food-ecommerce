import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebounced } from '../../hooks/useDebounced';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../context/ToastContext';
import { getInventory, updateStock } from '../../services/adminService';
import Pagination from '../../components/Pagination';
import SafeImage from '../../components/SafeImage';
import { ErrorState } from '../../components/States';
import { PageHeader, TableSkeleton, TableWrap, Td, Th } from '../ui';

const TABS = [['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']];

function StockRow({ p, threshold }) {
  const toast = useToast();
  const [stock, setStock] = useState(p.stock);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async (payload) => {
    setBusy(true);
    try { const r = await updateStock(p._id, payload); setStock(r.data.stock); setValue(''); toast.success(`${p.name}: ${r.data.stock} in stock`); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const setAbsolute = (e) => {
    e.preventDefault();
    if (value.trim() === '' || !Number.isInteger(Number(value)) || Number(value) < 0) return toast.error('Enter a whole number, 0 or more.');
    return apply({ set: Number(value) });
  };
  const btn = 'flex h-10 min-w-[40px] items-center justify-center rounded-lg border-2 border-line px-2 text-sm font-bold hover:border-ink disabled:opacity-40';

  return (
    <tr>
      <Td><div className="flex items-center gap-3"><SafeImage src={p.image} alt="" width="56" height="42" className="h-10 w-14 rounded object-cover" /><div><p className="font-bold">{p.name}</p><p className="text-muted">{p.category ? p.category.name : ''}{!p.isAvailable && ' (hidden)'}</p></div></div></Td>
      <Td><span className={`chip text-base ${stock === 0 ? 'bg-ketchup-light text-ketchup-dark' : stock <= threshold ? 'bg-mustard-light' : 'bg-leaf-light text-leaf'}`} aria-live="polite">{stock}</span></Td>
      <Td>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn} disabled={busy || stock < 1} onClick={() => apply({ adjust: -1 })} aria-label={`Remove 1 from ${p.name}`}>-1</button>
          <button className={btn} disabled={busy} onClick={() => apply({ adjust: 1 })} aria-label={`Add 1 to ${p.name}`}>+1</button>
          <button className={btn} disabled={busy} onClick={() => apply({ adjust: 10 })} aria-label={`Add 10 to ${p.name}`}>+10</button>
          <form onSubmit={setAbsolute} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`set-${p._id}`}>Set stock for {p.name}</label>
            <input id={`set-${p._id}`} value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" placeholder="Set to" className="input w-24 min-h-[40px] py-1" />
            <button type="submit" disabled={busy} className={btn}>Set</button>
          </form>
        </div>
      </Td>
    </tr>
  );
}

export default function AdminInventory() {
  useDocumentTitle('Inventory');
  const [sp, setSp] = useSearchParams();
  const filter = TABS.some(([k]) => k === sp.get('filter')) ? sp.get('filter') : 'all';
  const [threshold, setThreshold] = useState(10);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const t = Math.max(1, Math.min(1000, Number(threshold) || 10));
  const result = useFetch((signal) => getInventory({ filter, threshold: t, page, limit: 15, ...(dq.trim() && { q: dq.trim() }) }, { signal }), [filter, t, dq, page]);
  const rows = result.data ? result.data.data : [];

  return (
    <>
      <PageHeader title="Inventory" subtitle="Orders reserve stock the moment they are created, and cancelled orders give it back." actions={<Link to="/admin/products" className="btn-ghost">Manage products</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2" role="group" aria-label="Stock filter">
          {TABS.map(([k, label]) => <button key={k} onClick={() => { setSp(k === 'all' ? {} : { filter: k }); setPage(1); }} aria-pressed={filter === k} className={`rounded-full border-2 px-4 py-2 font-bold ${filter === k ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`}>{label}</button>)}
        </div>
        <div className="flex items-center gap-2"><label htmlFor="threshold" className="text-sm font-bold">Low means</label><input id="threshold" value={threshold} onChange={(e) => { setThreshold(e.target.value); setPage(1); }} inputMode="numeric" className="input w-20" /><span className="text-sm">or fewer</span></div>
        <div className="relative min-w-[220px] flex-1">
          <label htmlFor="i-q" className="sr-only">Search products</label>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="i-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name" className="input pl-10" />
        </div>
      </div>
      {result.loading && !result.data && <TableSkeleton />}
      {result.error && !result.data && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.data && rows.length === 0 && <p className="rounded-xl border-2 border-dashed border-line p-10 text-center text-muted">{filter === 'all' ? 'No products found.' : 'Nothing here. Stock levels look healthy.'}</p>}
      {rows.length > 0 && (
        <>
          <TableWrap label="Inventory">
            <thead><tr><Th>Product</Th><Th>In stock</Th><Th>Change stock</Th></tr></thead>
            <tbody>{rows.map((p) => <StockRow key={p._id} p={p} threshold={t} />)}</tbody>
          </TableWrap>
          <Pagination page={result.data.pagination.page} pages={result.data.pagination.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
