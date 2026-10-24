import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Boxes, ClipboardList, ExternalLink, LayoutDashboard, LogOut, Menu, Package, Tags, Ticket, Users, X } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const NAV = [
  ['/admin', 'Dashboard', LayoutDashboard, true], ['/admin/orders', 'Orders', ClipboardList], ['/admin/products', 'Products', Package],
  ['/admin/categories', 'Categories', Tags], ['/admin/inventory', 'Inventory', Boxes], ['/admin/coupons', 'Coupons', Ticket], ['/admin/users', 'Users', Users],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const signOut = async () => {
    try { await logout(); navigate('/admin/login'); } catch { toast.error('Could not log out. Please try again.'); }
  };
  const link = ({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-lg px-3 font-bold ${isActive ? 'bg-mustard text-ink' : 'text-white/85 hover:bg-white/10'}`;

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[250px_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 text-white lg:hidden">
        <Logo className="[&_span]:text-white [&_span]:text-xl" />
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-nav" aria-label={open ? 'Close menu' : 'Open menu'} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10">{open ? <X /> : <Menu />}</button>
      </div>

      <aside id="admin-nav" className={`${open ? 'block' : 'hidden'} bg-ink px-3 pb-6 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:pt-6`}>
        <div className="mb-6 hidden px-3 lg:block"><Logo className="[&_span]:text-white" /><p className="mt-1 text-xs font-bold text-mustard">ADMIN</p></div>
        <nav aria-label="Admin" className="grid gap-1">
          {NAV.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end} className={link}><Icon size={20} aria-hidden="true" />{label}</NavLink>)}
        </nav>
        <div className="mt-6 grid gap-1 border-t border-white/15 pt-4">
          <Link to="/" className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-white/85 hover:bg-white/10"><ExternalLink size={20} aria-hidden="true" />View website</Link>
          <button onClick={signOut} className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-left text-white/85 hover:bg-white/10"><LogOut size={20} aria-hidden="true" />Log out</button>
          <p className="mt-2 truncate px-3 text-sm text-white/60">{user && user.email}</p>
        </div>
      </aside>

      <main id="admin-main" className="min-w-0 p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  );
}
