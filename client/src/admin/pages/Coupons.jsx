import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../context/ToastContext';
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '../../services/adminService';
import Field from '../../components/Field';
import { ErrorState } from '../../components/States';
import { applyServerErrors } from '../../utils/forms';
import { describeCoupon, formatDay } from '../../utils/format';
import { emptyCoupon, toCouponFormValues, toCouponPayload } from '../couponPayload';
import { Card, PageHeader, TableSkeleton, TableWrap, Td, Th } from '../ui';

const STATE = { active: 'bg-leaf-light text-leaf', inactive: 'bg-surface', expired: 'bg-ketchup-light text-ketchup-dark', exhausted: 'bg-mustard-light' };

function CouponForm({ initial, onDone, onCancel }) {
  const toast = useToast();
  const editing = Boolean(initial);
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: initial ? toCouponFormValues(initial) : emptyCoupon });
  const type = watch('discountType');
  const m = (k) => errors[k] && errors[k].message;
  const discountRule = (v) => {
    if (!(Number(v) > 0)) return 'Discount must be greater than 0';
    if (type === 'percentage' && Number(v) > 100) return 'A percentage cannot exceed 100';
    return true;
  };

  const onSubmit = async (values) => {
    try {
      const payload = toCouponPayload(values);
      if (editing) await updateCoupon(initial._id, payload); else await createCoupon(payload);
      toast.success(editing ? 'Coupon saved' : 'Coupon created');
      onDone();
    } catch (err) { applyServerErrors(err, setError); }
  };

  return (
    <Card title={editing ? `Edit ${initial.code}` : 'New coupon'} className="mb-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark sm:col-span-2 lg:col-span-3">{errors.root.server.message}</div>}
        <Field label="Code" hint="Letters, numbers, - or _. Customers type this in." autoCapitalize="characters" error={m('code')} {...register('code', { required: 'Enter a code', pattern: { value: /^[A-Za-z0-9_-]{3,30}$/, message: '3-30 letters, numbers, - or _' } })} />
        <div>
          <label htmlFor="discountType" className="label">Discount type</label>
          <select id="discountType" className="input" {...register('discountType')}><option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option></select>
        </div>
        <Field label={type === 'percentage' ? 'Percent off' : 'Amount off'} inputMode="decimal" error={m('discountValue')}
          {...register('discountValue', { required: 'Enter a value', validate: discountRule })} />
        <Field label="Minimum order (optional)" inputMode="decimal" error={m('minOrder')} {...register('minOrder', { validate: (v) => v === '' || Number(v) >= 0 || 'Must be 0 or more' })} />
        {type === 'percentage' && <Field label="Maximum discount (optional)" inputMode="decimal" hint="Caps how much a percentage can take off." error={m('maxDiscount')} {...register('maxDiscount', { validate: (v) => v === '' || Number(v) > 0 || 'Must be greater than 0' })} />}
        <Field label="Valid through" type="date" error={m('expiresAt')} {...register('expiresAt', { required: 'Choose an expiry date', validate: (v) => editing || new Date(`${v}T23:59:59`) > new Date() || 'Choose a date in the future' })} />
        <Field label="Usage limit (optional)" inputMode="numeric" hint="Total redemptions allowed." error={m('usageLimit')} {...register('usageLimit', { validate: (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1) || 'Whole number, 1 or more' })} />
        <Field className="sm:col-span-2" label="Description (optional)" error={m('description')} {...register('description', { maxLength: { value: 200, message: 'Keep it under 200 characters' } })} />
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-ketchup" {...register('isActive')} /> Active</label>
        <div className="flex gap-3 sm:col-span-2 lg:col-span-3"><button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">{isSubmitting ? 'Saving...' : 'Save coupon'}</button><button type="button" onClick={onCancel} className="btn-ghost btn-sm">Cancel</button></div>
      </form>
    </Card>
  );
}

export default function AdminCoupons() {
  useDocumentTitle('Coupons');
  const toast = useToast();
  const result = useFetch((signal) => getCoupons({ signal }), []);
  const [mode, setMode] = useState(null); // null | 'new' | coupon object
  const list = result.data ? result.data.data : [];

  const done = () => { setMode(null); result.reload(); };
  const toggle = async (c) => { try { await updateCoupon(c._id, { isActive: !c.isActive }); toast.success(`${c.code} ${c.isActive ? 'deactivated' : 'activated'}`); result.reload(); } catch (err) { toast.error(err.message); } };
  const remove = async (c) => {
    if (!window.confirm(`Delete the coupon ${c.code}? Past orders keep their discount.`)) return;
    try { await deleteCoupon(c._id); toast.success('Coupon deleted'); result.reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <PageHeader title="Offers and coupons" subtitle="Active coupons are listed on the public Offers page." actions={mode === null && <button onClick={() => setMode('new')} className="btn-primary"><Plus size={18} aria-hidden="true" /> New coupon</button>} />
      {mode !== null && <CouponForm key={mode === 'new' ? 'new' : mode._id} initial={mode === 'new' ? null : mode} onDone={done} onCancel={() => setMode(null)} />}
      {result.loading && !result.data && <TableSkeleton rows={4} />}
      {result.error && !result.data && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.data && list.length === 0 && <p className="rounded-xl border-2 border-dashed border-line p-10 text-center text-muted">No coupons yet. Create one to run a promotion.</p>}
      {list.length > 0 && (
        <TableWrap label="Coupons">
          <thead><tr><Th>Code</Th><Th>Offer</Th><Th>Used</Th><Th>Valid through</Th><Th>State</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>{list.map((c) => (
            <tr key={c._id}>
              <Td><span className="font-mono font-bold">{c.code}</span>{c.description && <p className="text-muted">{c.description}</p>}</Td>
              <Td>{describeCoupon(c)}</Td>
              <Td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</Td>
              <Td className="whitespace-nowrap">{formatDay(c.expiresAt)}</Td>
              <Td><span className={`chip capitalize ${STATE[c.state]}`}>{c.state}</span></Td>
              <Td><div className="flex justify-end gap-1">
                <button onClick={() => { setMode(c); window.scrollTo(0, 0); }} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface" aria-label={`Edit ${c.code}`}><Pencil size={18} /></button>
                <button onClick={() => toggle(c)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface" aria-label={`${c.isActive ? 'Deactivate' : 'Activate'} ${c.code}`}><Power size={18} /></button>
                <button onClick={() => remove(c)} className="flex h-10 w-10 items-center justify-center rounded-lg text-ketchup-dark hover:bg-ketchup-light" aria-label={`Delete ${c.code}`}><Trash2 size={18} /></button>
              </div></Td>
            </tr>))}</tbody>
        </TableWrap>
      )}
    </>
  );
}
