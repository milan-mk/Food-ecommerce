import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { applyServerErrors } from '../utils/forms';

export default function Login() {
  useDocumentTitle('Log in');
  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || '/';
  const [show, setShow] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async ({ email, password }) => {
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      navigate(from, { replace: true });
    } catch (err) {
      applyServerErrors(err, setError);
    }
  };

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl">Log in</h1>
        <p className="mt-2 text-muted">Pick up where you left off, or <Link to="/register" className="font-bold text-ketchup-dark underline">create an account</Link>.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
          {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{errors.root.server.message}</div>}
          <Field label="Email" type="email" autoComplete="email" error={errors.email && errors.email.message}
            {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
          <Field label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" inputClassName="pr-12" error={errors.password && errors.password.message}
            {...register('password', { required: 'Enter your password' })}>
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink">
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </Field>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Logging in...' : 'Log in'}</button>
        </form>
      </div>
    </div>
  );
}
