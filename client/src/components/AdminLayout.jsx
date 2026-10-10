import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: '📈', end: true },
  { to: '/admin/create', label: 'Create Game', icon: '➕' },
  { to: '/admin/games', label: 'Manage Games', icon: '🗂️' },
  { to: '/admin/live', label: 'Live Control', icon: '🔴' },
];

/** Admin shell: fixed sidebar on desktop, slide-in drawer on phones. */
export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          ☰
        </button>
        <span className="brand"><span aria-hidden="true">🎮</span> বাগমারা যুবগোষ্ঠী ক্লাব <small>Admin</small></span>
      </header>

      {open && <div className="drawer-scrim" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar-brand brand"><span aria-hidden="true">🎮</span> বাগমারা যুবগোষ্ঠী ক্লাব <small>Admin</small></div>
        <nav>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              <span aria-hidden="true">{link.icon}</span> {link.label}
            </NavLink>
          ))}
          <a href="/" target="_blank" rel="noreferrer"><span aria-hidden="true">🌐</span> View site ↗</a>
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-user">Signed in as <b>{admin?.username}</b></span>
          <button type="button" className="btn btn-ghost btn-block" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="admin-main" id="main">
        <Outlet />
      </main>
    </div>
  );
}
