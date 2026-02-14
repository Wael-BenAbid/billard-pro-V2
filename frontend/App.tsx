import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { Login } from './pages/Login';
import { Navbar } from './pages/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PS4Management } from './pages/PS4Management';
import { BarManagement } from './pages/BarManagement';
import { Admin } from './pages/Admin';
import { Analytics } from './pages/Analytics';
import { Agenda } from './pages/Agenda';

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/ps4" element={<PS4Management />} />
            <Route path="/bar" element={<BarManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
