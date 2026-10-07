import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import Field from '../../components/Field';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { applyServerErrors } from '../../utils/forms';

export default function AdminLogin() {
  useDocumentTitle('Admin login');
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || '/admin';
  const [show, setShow] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });

  if (user && user.role === 'admin') return <Navigate to={from} replace />;

  const onSubmit = async ({ email, password }) => {
    try {
      const u = await login(email.trim(), password);
      if (u.role !== 'admin') { // a customer account must not stay signed in through the admin door
        await logout();
        setError('root.server', { type: 'server', message: 'This account does not have admin access.' });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) { applyServerErrors(err, setError); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <Logo />
        <h1 className="mt-6 text-3xl">Admin login</h1>
        <p className="mt-1 text-muted">Staff only. Customers can log in from the main site.</p>
        {user && user.role !== 'admin' && <p role="alert" className="mt-4 rounded-lg bg-mustard-light px-4 py-3 font-medium">You are signed in as a customer. Log in with an admin account to continue.</p>}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
          {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{errors.root.server.message}</div>}
          <Field label="Email" type="email" autoComplete="username" error={errors.email && errors.email.message}
            {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
          <Field label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" inputClassName="pr-12" error={errors.password && errors.password.message}
            {...register('password', { required: 'Enter your password' })}>
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
          </Field>
          <button type="submit" disabled={isSubmitting} className="btn-dark w-full">{isSubmitting ? 'Checking...' : 'Log in to admin'}</button>
        </form>
      </div>
    </div>
  );
}
