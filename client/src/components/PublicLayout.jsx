import { NavLink, Outlet, Link } from 'react-router-dom';
import PlayerBadge from './PlayerBadge';

const LINKS = [
  { to: '/', label: 'Games', icon: '🎮', end: true },
  { to: '/live', label: 'Live', icon: '🔴' },
  { to: '/results', label: 'Results', icon: '📊' },
];

/** Public shell: top bar (desktop nav) + bottom tab bar (phones). No admin links anywhere. */
export default function PublicLayout() {
  return (
    <div className="public-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="PartyPlay home">
          <span aria-hidden="true">🎮</span> PartyPlay
        </Link>
        <nav className="topnav" aria-label="Main">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <PlayerBadge />
      </header>

      <main id="main" className="container">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}>
            <span aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
