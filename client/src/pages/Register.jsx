import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { applyServerErrors } from '../utils/forms';

export default function Register() {
  useDocumentTitle('Create account');
  const { register: signUp, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '', confirm: '' },
  });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async ({ name, email, phone, password }) => {
    try {
      await signUp({ name: name.trim(), email: email.trim(), password, ...(phone.trim() ? { phone: phone.trim() } : {}) });
      toast.success('Your account is ready. Welcome!');
      navigate('/', { replace: true });
    } catch (err) {
      applyServerErrors(err, setError);
    }
  };

  const message = (e) => e && e.message;
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl">Create your account</h1>
        <p className="mt-2 text-muted">Already have one? <Link to="/login" className="font-bold text-ketchup-dark underline">Log in</Link>.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
          {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{errors.root.server.message}</div>}
          <Field label="Full name" autoComplete="name" error={message(errors.name)}
            {...register('name', { required: 'Enter your name', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} />
          <Field label="Email" type="email" autoComplete="email" error={message(errors.email)}
            {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
          <Field label="Phone (optional)" type="tel" autoComplete="tel" hint="Used only for delivery updates." error={message(errors.phone)}
            {...register('phone', { pattern: { value: /^[0-9+\-\s()]{7,15}$/, message: 'Enter a valid phone number' } })} />
          <Field label="Password" type={show ? 'text' : 'password'} autoComplete="new-password" inputClassName="pr-12" hint="At least 8 characters, with a letter and a number." error={message(errors.password)}
            {...register('password', {
              required: 'Choose a password',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
              validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Password needs a letter and a number',
            })}>
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink">
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </Field>
          <Field label="Confirm password" type={show ? 'text' : 'password'} autoComplete="new-password" error={message(errors.confirm)}
            {...register('confirm', { required: 'Type your password again', validate: (v) => v === getValues('password') || 'The passwords do not match' })} />
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Creating account...' : 'Create account'}</button>
        </form>
      </div>
    </div>
  );
}
