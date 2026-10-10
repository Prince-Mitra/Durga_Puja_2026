import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { Loading } from './components/States';

import Home from './pages/Home';

// Route-level code splitting: players on phones never download the admin bundle.
const Game = lazy(() => import('./pages/Game'));
const Live = lazy(() => import('./pages/Live'));
const Results = lazy(() => import('./pages/Results'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/admin/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const CreateGame = lazy(() => import('./pages/admin/CreateGame'));
const ManageGames = lazy(() => import('./pages/admin/ManageGames'));
const GameResults = lazy(() => import('./pages/admin/GameResults'));
const LiveControl = lazy(() => import('./pages/admin/LiveControl'));

const PublicRoot = () => (
  <PlayerProvider>
    <PublicLayout />
  </PlayerProvider>
);

// The admin session is only looked up when someone actually visits /admin/*.
const AdminRoot = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

export default function App() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<PublicRoot />}>
            <Route index element={<Home />} />
            <Route path="live" element={<Live />} />
            <Route path="game/:id" element={<Game />} />
            <Route path="results" element={<Results />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="admin" element={<AdminRoot />}>
            <Route path="login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="create" element={<CreateGame />} />
                <Route path="edit/:id" element={<CreateGame />} />
                <Route path="games" element={<ManageGames />} />
                <Route path="games/:id/results" element={<GameResults />} />
                <Route path="live" element={<LiveControl />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: { background: '#1a2140', color: '#f2f4ff', border: '1px solid #2c3566', borderRadius: '14px', fontSize: '15px' },
        }}
      />
    </>
  );
}
