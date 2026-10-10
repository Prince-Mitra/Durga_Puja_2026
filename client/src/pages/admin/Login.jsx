import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { Loading } from '../../components/States';

export default function Login() {
  const { admin, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <Loading />;
  if (admin) return <Navigate to={location.state?.from || '/admin'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(identifier.trim(), password);
      toast.success('Login successful');
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit} noValidate>
        <div className="login-logo" aria-hidden="true">🎮</div>
        <h1>Admin login</h1>
        <p className="hint center">Only the host needs to sign in. Players just open the link.</p>

        {error && <div className="form-error" role="alert">{error}</div>}

        <label className="label" htmlFor="identifier">Username or email</label>
        <input id="identifier" className="input" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />

        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy || !identifier || !password}>
          {busy ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
