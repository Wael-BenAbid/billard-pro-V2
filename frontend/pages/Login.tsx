import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const API_URL = 'http://localhost:8000/api';

export const Login: React.FC = () => {
  const { settings, setUser } = useAppContext();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const user = {
          username: data.username,
          role: data.role || 'user',
          can_manage_billiard: data.can_manage_billiard || false,
          can_manage_ps4: data.can_manage_ps4 || false,
          can_manage_bar: data.can_manage_bar || false,
          can_view_analytics: data.can_view_analytics || false,
          can_view_agenda: data.can_view_agenda || false,
          can_manage_clients: data.can_manage_clients || false,
          can_manage_settings: data.can_manage_settings || false,
          can_manage_users: data.can_manage_users || false,
        };
        setUser(user);
        localStorage.setItem('billard_auth', JSON.stringify(user));
        localStorage.setItem('billard_token', data.token || '');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Identifiants incorrects');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900/50 rounded-[3rem] border border-white/5 p-12 shadow-2xl backdrop-blur-xl text-center">
        <h1
          style={{ color: settings.theme_color || settings.themeColor }}
          className="text-5xl font-black italic tracking-tighter mb-2"
        >
          {settings.club_name || settings.clubName || 'B-CLUB'}
        </h1>
        <form onSubmit={handleLogin} className="space-y-6 mt-10">
          <input
            type="text"
            placeholder="Admin ID"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-white font-bold outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-white font-bold outline-none"
            required
          />
          {error && (
            <p className="text-red-500 text-sm font-bold">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: settings.theme_color || settings.themeColor || '#eab308' }}
            className="w-full text-black font-black py-5 rounded-2xl hover:brightness-110 uppercase text-sm tracking-widest disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Entrer'}
          </button>
        </form>
      </div>
    </div>
  );
};
