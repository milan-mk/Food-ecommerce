import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapPin, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import * as authService from '../services/authService';
import AddressFields from '../components/AddressFields';
import Field from '../components/Field';
import { applyServerErrors } from '../utils/forms';

function Section({ title, children, action }) {
  return (
    <section className="border-t-2 border-ink py-8" aria-label={title}>
      <div className="flex items-center justify-between gap-3"><h2 className="text-2xl">{title}</h2>{action}</div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DetailsForm() {
  const { user, replaceUser } = useAuth();
  const toast = useToast();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: { name: user.name, phone: user.phone || '' } });
  const onSubmit = async (values) => {
    try {
      const r = await authService.updateProfile({ name: values.name.trim(), phone: values.phone.trim() });
      replaceUser(r.data.user);
      toast.success('Profile updated');
    } catch (err) { applyServerErrors(err, setError); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-xl gap-4">
      {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{errors.root.server.message}</div>}
      <Field label="Full name" autoComplete="name" error={errors.name && errors.name.message}
        {...register('name', { required: 'Enter your name', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} />
      <Field label="Phone" type="tel" autoComplete="tel" error={errors.phone && errors.phone.message}
        {...register('phone', { pattern: { value: /^[0-9+\-\s()]{7,15}$/, message: 'Enter a valid phone number' } })} />
      <div>
        <p className="label">Email</p>
        <p className="min-h-[44px] rounded-lg bg-surface px-3.5 py-2.5">{user.email}</p>
        <p className="mt-1 text-sm text-muted">Your email is your login, so it cannot be changed here.</p>
      </div>
      <button type="submit" disabled={isSubmitting || !isDirty} className="btn-dark w-fit">{isSubmitting ? 'Saving...' : 'Save changes'}</button>
    </form>
  );
}

function AddressForm({ initial, onSave, onCancel }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      label: (initial && initial.label) || 'Home', fullName: (initial && initial.fullName) || '', phone: (initial && initial.phone) || '',
      address: (initial && initial.address) || '', city: (initial && initial.city) || '', state: (initial && initial.state) || '',
      postalCode: (initial && initial.postalCode) || '', isDefault: Boolean(initial && initial.isDefault),
    },
  });
  const submit = async (values) => { try { await onSave(values); } catch (err) { applyServerErrors(err, setError); } };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="rounded-xl border-2 border-ink p-5">
      {errors.root && errors.root.server && <div role="alert" className="mb-4 rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{errors.root.server.message}</div>}
      <Field label="Label" hint="For example Home or Work." className="mb-4 max-w-xs" error={errors.label && errors.label.message}
        {...register('label', { required: 'Give this address a name', maxLength: { value: 30, message: 'Keep the label short' } })} />
      <AddressFields register={register} errors={errors} />
      <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-ketchup" {...register('isDefault')} /> Use as my default address</label>
      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">{isSubmitting ? 'Saving...' : 'Save address'}</button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );
}

function Addresses() {
  const { user, replaceUser } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState(null); // null | 'new' | address _id being edited
  const list = user.addresses || [];

  const apply = (r, message) => { replaceUser(r.data.user); setMode(null); toast.success(message); };
  const remove = async (a) => {
    if (!window.confirm(`Delete the address "${a.label || 'Address'}"?`)) return;
    try { apply(await authService.deleteAddress(a._id), 'Address deleted'); } catch (err) { toast.error(err.message); }
  };
  const makeDefault = async (a) => {
    try { apply(await authService.updateAddress(a._id, { isDefault: true }), 'Default address changed'); } catch (err) { toast.error(err.message); }
  };

  return (
    <Section title="Saved addresses" action={mode !== 'new' && list.length < 5 && <button onClick={() => setMode('new')} className="btn-ghost btn-sm"><Plus size={16} aria-hidden="true" /> Add address</button>}>
      {list.length === 0 && mode !== 'new' && <p className="text-muted">No saved addresses yet. Add one to check out faster.</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((a) => (
          <li key={a._id} className={mode === a._id ? 'md:col-span-2' : ''}>
            {mode === a._id ? (
              <AddressForm initial={a} onSave={async (v) => apply(await authService.updateAddress(a._id, v), 'Address updated')} onCancel={() => setMode(null)} />
            ) : (
              <div className="flex h-full flex-col rounded-xl border-2 border-line p-5">
                <p className="flex items-center gap-2 font-display text-lg font-extrabold"><MapPin size={18} className="text-ketchup" aria-hidden="true" />{a.label || 'Address'}{a.isDefault && <span className="chip bg-leaf-light text-leaf">Default</span>}</p>
                <address className="mt-2 flex-1 not-italic text-ink/85">{a.fullName}, {a.phone}<br />{a.address}<br />{a.city}, {a.state} {a.postalCode}</address>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
                  <button onClick={() => setMode(a._id)} className="underline" aria-label={`Edit ${a.label || 'address'}`}>Edit</button>
                  {!a.isDefault && <button onClick={() => makeDefault(a)} className="underline" aria-label={`Make ${a.label || 'address'} the default`}>Make default</button>}
                  <button onClick={() => remove(a)} className="text-ketchup-dark underline" aria-label={`Delete ${a.label || 'address'}`}>Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {mode === 'new' && <div className="mt-4"><AddressForm onSave={async (v) => apply(await authService.addAddress(v), 'Address saved')} onCancel={() => setMode(null)} /></div>}
      {list.length >= 5 && <p className="mt-4 text-sm text-muted">You have reached the limit of 5 saved addresses. Delete one to add another.</p>}
    </Section>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, reset, setError, getValues, formState: { errors, isSubmitting } } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });
  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      await authService.changePassword({ currentPassword, newPassword });
      reset();
      toast.success('Password changed');
    } catch (err) { applyServerErrors(err, setError); }
  };
  const type = show ? 'text' : 'password';
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-xl gap-4">
      {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{errors.root.server.message}</div>}
      <Field label="Current password" type={type} autoComplete="current-password" error={errors.currentPassword && errors.currentPassword.message}
        {...register('currentPassword', { required: 'Enter your current password' })} />
      <Field label="New password" type={type} autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={errors.newPassword && errors.newPassword.message}
        {...register('newPassword', { required: 'Choose a new password', minLength: { value: 8, message: 'Password must be at least 8 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Password needs a letter and a number' })} />
      <Field label="Confirm new password" type={type} autoComplete="new-password" error={errors.confirm && errors.confirm.message}
        {...register('confirm', { required: 'Type the new password again', validate: (v) => v === getValues('newPassword') || 'The passwords do not match' })} />
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-5 w-5 accent-ketchup" /> Show passwords</label>
      <button type="submit" disabled={isSubmitting} className="btn-dark w-fit">{isSubmitting ? 'Changing...' : 'Change password'}</button>
    </form>
  );
}

export default function Profile() {
  useDocumentTitle('My profile');
  return (
    <div className="container-page max-w-4xl py-8">
      <h1 className="text-4xl sm:text-5xl">My profile</h1>
      <div className="mt-8">
        <Section title="Your details"><DetailsForm /></Section>
        <Addresses />
        <Section title="Password"><PasswordForm /></Section>
      </div>
    </div>
  );
}
