import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { apiPost, handleApiError, getErrorMessage } from './utils';
import { Login } from './pages/Login';
import { Navbar } from './pages/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PS4Management } from './pages/PS4Management';
import { BarManagement } from './pages/BarManagement';
import { Admin } from './pages/Admin';
import { Analytics } from './pages/Analytics';
import { Agenda } from './pages/Agenda';

// ============================================
// COMPOSANT: Password Prompt Modal
// ============================================
const PasswordPrompt: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiPost('/auth/verify-admin-password/', { password });
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 p-8">
        <h2 className="text-xl font-black text-white mb-6 text-center">
          🔐 Authentification Admin Requise
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Mot de passe admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none mb-4"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 bg-zinc-800 text-white rounded-xl font-bold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-yellow-500 text-black rounded-xl font-black"
            >
              {loading ? '...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT: Protected Route
// ============================================
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  permission?: string;
}> = ({ children, permission }) => {
  const { user } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    // Check if user has permission
    if (user?.role === 'admin') {
      setAccessGranted(true);
      return;
    }

    if (!permission) {
      setAccessGranted(true);
      return;
    }

    const hasPermission = user?.[permission as keyof typeof user] === true;
    
    if (hasPermission) {
      setAccessGranted(true);
    } else {
      setShowPasswordPrompt(true);
    }
  }, [user, permission, location.pathname]);

  const handlePasswordSuccess = () => {
    setShowPasswordPrompt(false);
    setAccessGranted(true);
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
    navigate(-1);
  };

  if (!accessGranted && !showPasswordPrompt) {
    return null;
  }

  return (
    <>
      {showPasswordPrompt && (
        <PasswordPrompt onSuccess={handlePasswordSuccess} onCancel={handlePasswordCancel} />
      )}
      {accessGranted && children}
    </>
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
      <main className="p-8">
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
          <Routes>
            <Route path="/" element={<ProtectedRoute permission="can_manage_billiard"><Dashboard /></ProtectedRoute>} />
            <Route path="/ps4" element={<ProtectedRoute permission="can_manage_ps4"><PS4Management /></ProtectedRoute>} />
            <Route path="/bar" element={<ProtectedRoute permission="can_manage_bar"><BarManagement /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute permission="can_view_analytics"><Analytics /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute permission="can_view_agenda"><Agenda /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute permission="can_manage_settings"><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
