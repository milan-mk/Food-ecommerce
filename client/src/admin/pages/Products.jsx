import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebounced } from '../../hooks/useDebounced';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../context/ToastContext';
import { getCategories, getProducts } from '../../services/catalogService';
import { deleteProduct, updateProduct } from '../../services/adminService';
import Pagination from '../../components/Pagination';
import SafeImage from '../../components/SafeImage';
import { ErrorState } from '../../components/States';
import { formatPrice } from '../../utils/format';
import { PageHeader, Select, TableSkeleton, TableWrap, Td, Th } from '../ui';

export default function AdminProducts() {
  useDocumentTitle('Products');
  const toast = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const categories = useFetch((signal) => getCategories({ signal }), []);
  const result = useFetch((signal) => getProducts({ includeInactive: true, sort: 'newest', limit: 12, page, ...(dq.trim() && { q: dq.trim() }), ...(category && { category }) }, { signal }), [dq, category, page]);
  const products = result.data ? result.data.data : [];

  const toggle = async (p) => {
    try { await updateProduct(p._id, { isAvailable: !p.isAvailable }); toast.success(`${p.name} is now ${p.isAvailable ? 'hidden from' : 'visible on'} the menu`); result.reload(); } catch (err) { toast.error(err.message); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}" and its reviews? Past orders keep their own record of it. Hiding the dish is usually safer.`)) return;
    try { await deleteProduct(p._id); toast.success(`${p.name} deleted`); result.reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <PageHeader title="Products" subtitle="Hidden dishes stay in the system but are not shown to customers." actions={<Link to="/admin/products/new" className="btn-primary"><Plus size={18} aria-hidden="true" /> Add product</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <label htmlFor="p-q" className="sr-only">Search products</label>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="p-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name or description" className="input pl-10" />
        </div>
        <Select id="p-cat" label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>{categories.data && categories.data.data.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
        </Select>
      </div>

      {result.loading && !result.data && <TableSkeleton />}
      {result.error && !result.data && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.data && products.length === 0 && <p className="rounded-xl border-2 border-dashed border-line p-10 text-center text-muted">No products found.</p>}
      {products.length > 0 && (
        <>
          <TableWrap label="Products">
            <thead><tr><Th>Product</Th><Th>Category</Th><Th>Price</Th><Th>Stock</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>{products.map((p) => (
              <tr key={p._id}>
                <Td><div className="flex items-center gap-3"><SafeImage src={p.image} alt="" width="56" height="42" className="h-10 w-14 rounded object-cover" /><div><p className="font-bold">{p.name}</p>{p.featured && <span className="chip bg-mustard-light text-xs">Featured</span>}</div></div></Td>
                <Td>{p.category ? p.category.name : '-'}</Td>
                <Td className="font-bold">{formatPrice(p.price)}</Td>
                <Td>{p.stock === 0 ? <span className="chip bg-ketchup-light text-ketchup-dark">Out of stock</span> : p.stock <= 10 ? <span className="chip bg-mustard-light">{p.stock} left</span> : p.stock}</Td>
                <Td>{p.isAvailable ? <span className="chip bg-leaf-light text-leaf">Visible</span> : <span className="chip bg-surface">Hidden</span>}</Td>
                <Td><div className="flex justify-end gap-1">
                  <Link to={`/admin/products/${p._id}/edit`} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface" aria-label={`Edit ${p.name}`}><Pencil size={18} /></Link>
                  <button onClick={() => toggle(p)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface" aria-label={`${p.isAvailable ? 'Hide' : 'Show'} ${p.name}`}>{p.isAvailable ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  <button onClick={() => remove(p)} className="flex h-10 w-10 items-center justify-center rounded-lg text-ketchup-dark hover:bg-ketchup-light" aria-label={`Delete ${p.name}`}><Trash2 size={18} /></button>
                </div></Td>
              </tr>))}</tbody>
          </TableWrap>
          <Pagination page={result.data.pagination.page} pages={result.data.pagination.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
