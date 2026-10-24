import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../context/ToastContext';
import { getCategories } from '../../services/catalogService';
import { createCategory, deleteCategory, updateCategory } from '../../services/adminService';
import Field from '../../components/Field';
import { ErrorState } from '../../components/States';
import { applyServerErrors } from '../../utils/forms';
import { Card, PageHeader, TableSkeleton, TableWrap, Td, Th } from '../ui';

function CategoryForm({ initial, onDone, onCancel }) {
  const toast = useToast();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: initial ? initial.name : '', description: initial ? initial.description || '' : '' } });
  const onSubmit = async (v) => {
    const payload = { name: v.name.trim(), ...(v.description.trim() ? { description: v.description.trim() } : {}) };
    try {
      if (initial) await updateCategory(initial._id, payload); else await createCategory(payload);
      toast.success(initial ? 'Category saved' : 'Category created');
      onDone();
    } catch (err) { applyServerErrors(err, setError); }
  };
  return (
    <Card title={initial ? `Edit ${initial.name}` : 'New category'} className="mb-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark sm:col-span-2">{errors.root.server.message}</div>}
        <Field label="Name" error={errors.name && errors.name.message} {...register('name', { required: 'Enter a name', minLength: { value: 2, message: 'Name is too short' } })} />
        <Field label="Description (optional)" error={errors.description && errors.description.message} {...register('description', { maxLength: { value: 300, message: 'Keep it under 300 characters' } })} />
        <div className="flex gap-3 sm:col-span-2"><button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">{isSubmitting ? 'Saving...' : 'Save'}</button><button type="button" onClick={onCancel} className="btn-ghost btn-sm">Cancel</button></div>
      </form>
    </Card>
  );
}

export default function AdminCategories() {
  useDocumentTitle('Categories');
  const toast = useToast();
  const result = useFetch((signal) => getCategories({ signal }), []);
  const [mode, setMode] = useState(null); // null | 'new' | category object
  const list = result.data ? result.data.data : [];

  const done = () => { setMode(null); result.reload(); };
  const remove = async (c) => {
    if (!window.confirm(`Delete the category "${c.name}"?`)) return;
    try { await deleteCategory(c._id); toast.success('Category deleted'); result.reload(); } catch (err) { toast.error(err.message); } // e.g. "Cannot delete: 4 product(s) still use this category"
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="A category with dishes in it cannot be deleted. Move or delete the dishes first." actions={mode === null && <button onClick={() => setMode('new')} className="btn-primary"><Plus size={18} aria-hidden="true" /> Add category</button>} />
      {mode !== null && <CategoryForm key={mode === 'new' ? 'new' : mode._id} initial={mode === 'new' ? null : mode} onDone={done} onCancel={() => setMode(null)} />}
      {result.loading && !result.data && <TableSkeleton rows={4} />}
      {result.error && !result.data && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.data && (
        <TableWrap label="Categories">
          <thead><tr><Th>Name</Th><Th>Slug</Th><Th>Visible dishes</Th><Th>Description</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>{list.map((c) => (
            <tr key={c._id}>
              <Td className="font-bold">{c.name}</Td><Td className="font-mono text-muted">{c.slug}</Td><Td>{c.productCount}</Td><Td className="text-muted">{c.description || '-'}</Td>
              <Td><div className="flex justify-end gap-1">
                <button onClick={() => { setMode(c); window.scrollTo(0, 0); }} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface" aria-label={`Edit ${c.name}`}><Pencil size={18} /></button>
                <button onClick={() => remove(c)} className="flex h-10 w-10 items-center justify-center rounded-lg text-ketchup-dark hover:bg-ketchup-light" aria-label={`Delete ${c.name}`}><Trash2 size={18} /></button>
              </div></Td>
            </tr>))}</tbody>
        </TableWrap>
      )}
    </>
  );
}
