import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const LINKS = [['/menu', 'Menu'], ['/offers', 'Offers'], ['/about', 'About'], ['/contact', 'Contact']];
const linkClass = ({ isActive }) => `rounded-md px-3 py-2 font-bold hover:bg-surface ${isActive ? 'underline decoration-ketchup decoration-[3px] underline-offset-8' : ''}`;

function SearchForm({ className = '', onDone }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/menu?q=${encodeURIComponent(term)}` : '/menu');
    setQ('');
    onDone && onDone();
  };
  return (
    <form onSubmit={submit} role="search" className={`relative ${className}`}>
      <label htmlFor={`search-${className.length}`} className="sr-only">Search the menu</label>
      <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input id={`search-${className.length}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search burgers, pizza..." className="input pl-10" />
    </form>
  );
}

function AccountMenu() {
  const { user, logout, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    try { await logout(); toast.info('You have been logged out'); navigate('/'); } catch { toast.error('Could not log out. Please try again.'); }
  };

  if (!user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Link to="/login" className="rounded-md px-3 py-2 font-bold hover:bg-surface">Log in</Link>
        <Link to="/register" className="btn-dark btn-sm">Sign up</Link>
      </div>
    );
  }
  const item = 'block w-full px-4 py-2.5 text-left font-medium hover:bg-surface';
  return (
    <div ref={ref} className="relative hidden lg:block">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 font-bold hover:bg-surface">
        <User size={18} aria-hidden="true" /> {user.name.split(' ')[0]}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-lg border-2 border-ink bg-white py-1" onClick={() => setOpen(false)}>
          <Link role="menuitem" to="/profile" className={item}>My profile</Link>
          <Link role="menuitem" to="/orders" className={item}>My orders</Link>
          {isAdmin && <Link role="menuitem" to="/admin" className={item}>Admin dashboard</Link>}
          <button role="menuitem" onClick={signOut} className={`${item} border-t border-line text-ketchup-dark`}>Log out</button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { count } = useCart();
  const { user, logout, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const signOut = async () => {
    setOpen(false);
    try { await logout(); toast.info('You have been logged out'); navigate('/'); } catch { toast.error('Could not log out. Please try again.'); }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <div className="container-page flex h-16 items-center gap-3">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map(([to, label]) => <NavLink key={to} to={to} className={linkClass}>{label}</NavLink>)}
        </nav>
        <SearchForm className="ml-auto hidden w-64 md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <AccountMenu />
          <Link to="/cart" className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-surface" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <ShoppingBag size={22} aria-hidden="true" />
            {count > 0 && <span className="absolute right-0.5 top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-mustard px-1 text-xs font-extrabold">{count}</span>}
          </Link>
          <button onClick={() => setOpen((o) => !o)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-surface lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-white lg:hidden">
          <div className="container-page space-y-4 py-4">
            <SearchForm className="md:hidden" onDone={() => setOpen(false)} />
            <nav className="grid gap-1" aria-label="Mobile">
              {LINKS.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `rounded-lg px-3 py-3 text-lg font-bold ${isActive ? 'bg-mustard-light' : 'hover:bg-surface'}`}>{label}</NavLink>)}
            </nav>
            <div className="grid gap-2 border-t border-line pt-4">
              {user ? (
                <>
                  <Link to="/profile" className="btn-ghost">My profile</Link>
                  <Link to="/orders" className="btn-ghost">My orders</Link>
                  {isAdmin && <Link to="/admin" className="btn-ghost">Admin dashboard</Link>}
                  <button onClick={signOut} className="btn-dark">Log out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost">Log in</Link>
                  <Link to="/register" className="btn-dark">Sign up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
