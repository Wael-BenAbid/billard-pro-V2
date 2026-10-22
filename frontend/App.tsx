import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { clearAuthTokens } from './utils';
import { Login } from './pages/Login';
import { Navbar } from './pages/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PS4Management } from './pages/PS4Management';
import { BarManagement } from './pages/BarManagement';

// Heavy pages (charts, PDF/Word export) are loaded on demand
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Agenda = lazy(() => import('./pages/Agenda').then(m => ({ default: m.Agenda })));

// ============================================
// COMPOSANT: Protected Route
// ============================================
type PermissionKey =
  | 'can_manage_billiard' | 'can_manage_ps4' | 'can_manage_bar'
  | 'can_view_analytics' | 'can_view_agenda' | 'can_manage_settings';

// Pages in fallback order: a user without access to a page is sent to the first one allowed
const PAGE_PERMISSIONS: { path: string; permission: PermissionKey }[] = [
  { path: '/', permission: 'can_manage_billiard' },
  { path: '/ps4', permission: 'can_manage_ps4' },
  { path: '/bar', permission: 'can_manage_bar' },
  { path: '/analytics', permission: 'can_view_analytics' },
  { path: '/agenda', permission: 'can_view_agenda' },
  { path: '/admin', permission: 'can_manage_settings' },
];

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  permission: PermissionKey;
}> = ({ children, permission }) => {
  const { user } = useAppContext();

  const isAllowed = (perm: PermissionKey) => user?.role === 'admin' || user?.[perm] === true;

  if (isAllowed(permission)) {
    return <>{children}</>;
  }

  // No permission (also enforced by the server): go to the first allowed page
  const fallback = PAGE_PERMISSIONS.find(page => isAllowed(page.permission));
  if (fallback) {
    return <Navigate to={fallback.path} replace />;
  }

  return (
    <div className="text-center py-20">
      <p className="text-2xl font-black text-white mb-2">🔒 Accès refusé</p>
      <p className="text-zinc-500">Votre compte n'a accès à aucune page. Contactez un administrateur.</p>
    </div>
  );
};

// ============================================
// COMPOSANT: Layout
// ============================================
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, user, setUser } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('billard_auth');
    clearAuthTokens();
  };

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        clubName={settings.club_name}
        themeColor={settings.theme_color}
        onLogout={handleLogout}
        currentTime={currentTime}
      />
      <main className="p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL: App
// ============================================
const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<div className="text-center py-20 text-zinc-500">Chargement...</div>}>
          <Routes>
            <Route path="/" element={<ProtectedRoute permission="can_manage_billiard"><Dashboard /></ProtectedRoute>} />
            <Route path="/ps4" element={<ProtectedRoute permission="can_manage_ps4"><PS4Management /></ProtectedRoute>} />
            <Route path="/bar" element={<ProtectedRoute permission="can_manage_bar"><BarManagement /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute permission="can_view_analytics"><Analytics /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute permission="can_view_agenda"><Agenda /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute permission="can_manage_settings"><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
