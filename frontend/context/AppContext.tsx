import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authFetch, AUTH_EXPIRED_EVENT } from '../utils/api';

// Dynamic API URL - works for both development and Docker
const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.port === '5173' 
    ? 'http://localhost:8000/api' 
    : '/api');

// Types
interface BilliardSession {
  id: number;
  table_identifier: string;
  client_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  price: number;
  is_paid: boolean;
  is_active: boolean;
  formatted_duration: string;
  formatted_price: string;
  current_price: number;
}

interface PS4Session {
  id: number;
  game_name: string;
  players: number;
  duration_minutes: number;
  price: number;
  date: string;
  is_paid: boolean;
  formatted_price: string;
}

interface PS4Game {
  id: number;
  name: string;
  icon: string;
  player_options: number[];
  time_options: {
    id: number;
    label: string;
    minutes: number;
    players: number;
    price: number;
  }[];
}

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  icon: string;
  formatted_price: string;
}

interface BarOrder {
  id: number;
  client_name: string;
  items: {
    item_id: number;
    name: string;
    price: number;
    quantity: number;
  }[];
  total_price: number;
  date: string;
  is_paid: boolean;
  formatted_price: string;
}

interface AppSettings {
  club_name: string;
  logo_url: string;
  theme_color: string;
  table_a_color: string;
  table_b_color: string;
  rate_base: number;
  rate_reduced: number;
  threshold_mins: number;
  floor_min: number;
  floor_mid: number;
  auto_restart_on_stop?: boolean;
}

interface User {
  username: string;
  role: string;
  can_manage_billiard?: boolean;
  can_manage_ps4?: boolean;
  can_manage_bar?: boolean;
  can_view_analytics?: boolean;
  can_view_agenda?: boolean;
  can_manage_clients?: boolean;
  can_manage_settings?: boolean;
  can_manage_users?: boolean;
}

interface Stats {
  billiard: {
    total_sessions: number;
    total_revenue: number;
    formatted_revenue: string;
    active_sessions: number;
  };
  ps4: {
    total_sessions: number;
    total_revenue: number;
    formatted_revenue: string;
  };
  bar: {
    total_orders: number;
    total_revenue: number;
    formatted_revenue: string;
  };
  today: {
    billiard_sessions: number;
    billiard_revenue: number;
    ps4_sessions: number;
    ps4_revenue: number;
    bar_orders: number;
    bar_revenue: number;
  };
  total_revenue: number;
  formatted_total: string;
}

interface AppContextType {
  // Data
  sessions: BilliardSession[];
  ps4Sessions: PS4Session[];
  ps4Games: PS4Game[];
  inventory: InventoryItem[];
  barOrders: BarOrder[];
  settings: AppSettings;
  stats: Stats | null;
  user: User | null;
  loading: boolean;
  
  // Setters
  setUser: (user: User | null) => void;
  
  // Actions
  fetchSessions: () => Promise<void>;
  fetchPS4Sessions: () => Promise<void>;
  fetchPS4Games: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchBarOrders: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchStats: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Billiard actions
  startSession: (tableIdentifier: string, clientName?: string) => Promise<BilliardSession>;
  stopSession: (sessionId: number, clientName?: string) => Promise<BilliardSession>;
  toggleSessionPayment: (sessionId: number) => Promise<void>;
  deleteSession: (sessionId: number) => Promise<void>;
  
  // PS4 actions
  createPS4Session: (gameId: number, players: number, timeOptionId: number) => Promise<PS4Session>;
  togglePS4Payment: (sessionId: number) => Promise<void>;
  
  // Bar actions
  createBarOrder: (clientName: string, items: { item_id: number; name: string; price: number; quantity: number }[]) => Promise<BarOrder>;
  toggleBarPayment: (orderId: number) => Promise<void>;
  
  // Settings
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<BilliardSession[]>([]);
  const [ps4Sessions, setPs4Sessions] = useState<PS4Session[]>([]);
  const [ps4Games, setPs4Games] = useState<PS4Game[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [barOrders, setBarOrders] = useState<BarOrder[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    club_name: 'B-CLUB',
    logo_url: '',
    theme_color: '#eab308',
    table_a_color: '#10b981',
    table_b_color: '#3b82f6',
    rate_base: 150,
    rate_reduced: 135,
    threshold_mins: 15,
    floor_min: 1000,
    floor_mid: 1500,
    auto_restart_on_stop: false,
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('billard_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const sessionsRef = useRef<BilliardSession[]>([]);

  // Fetch functions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/sessions/?recent=true`);
      if (res.ok) {
        const data = await res.json();
        sessionsRef.current = data;
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  }, []);

  const fetchPS4Sessions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/ps4-sessions/?recent=true`);
      if (res.ok) {
        const data = await res.json();
        setPs4Sessions(data);
      }
    } catch (error) {
      console.error('Error fetching PS4 sessions:', error);
    }
  }, []);

  const fetchPS4Games = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/ps4-games/`);
      if (res.ok) {
        const data = await res.json();
        setPs4Games(data);
      }
    } catch (error) {
      console.error('Error fetching PS4 games:', error);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/inventory/`);
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, []);

  const fetchBarOrders = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/bar-orders/?recent=true`);
      if (res.ok) {
        const data = await res.json();
        setBarOrders(data);
      }
    } catch (error) {
      console.error('Error fetching bar orders:', error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/settings/`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/stats/`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Expired/invalid session: back to the login screen
  useEffect(() => {
    const onAuthExpired = () => {
      localStorage.removeItem('billard_auth');
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  // Initial load (once logged in — the API requires authentication)
  const isLoggedIn = user !== null;
  useEffect(() => {
    if (!isLoggedIn) return;
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSettings(),
        fetchSessions(),
        fetchPS4Games(),
        fetchPS4Sessions(),
        fetchInventory(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [isLoggedIn, fetchSettings, fetchSessions, fetchPS4Games, fetchPS4Sessions, fetchInventory]);

  // Every 10 seconds, refresh only the active sessions (live price, and sessions
  // started/stopped from another device) instead of reloading the whole history.
  useEffect(() => {
    if (!isLoggedIn) return;

    const refreshActive = async () => {
      try {
        const res = await authFetch(`${API_URL}/sessions/active/`);
        if (!res.ok) return;
        const active: BilliardSession[] = await res.json();
        const activeById = new Map(active.map(s => [s.id, s]));
        const knownActiveIds = sessionsRef.current.filter(s => s.is_active).map(s => s.id);
        const changedElsewhere =
          knownActiveIds.length !== active.length || knownActiveIds.some(id => !activeById.has(id));

        if (changedElsewhere) {
          // A session was started/stopped from another device: reload the (small) recent list
          await fetchSessions();
        } else if (active.length > 0) {
          setSessions(prev => prev.map(s => (s.is_active ? activeById.get(s.id) ?? s : s)));
        }
      } catch (error) {
        console.error('Error refreshing active sessions:', error);
      }
    };

    const interval = setInterval(refreshActive, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchSessions]);

  // Billiard actions
  const startSession = useCallback(async (tableIdentifier: string, clientName = 'Anonyme'): Promise<BilliardSession> => {
    const res = await authFetch(`${API_URL}/sessions/start/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_identifier: tableIdentifier, client_name: clientName }),
    });
    if (!res.ok) throw new Error('Failed to start session');
    const data = await res.json();
    await fetchSessions();
    return data;
  }, [fetchSessions]);

  const stopSession = useCallback(async (sessionId: number, clientName?: string): Promise<BilliardSession> => {
    const res = await authFetch(`${API_URL}/sessions/${sessionId}/stop/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: clientName }),
    });
    if (!res.ok) throw new Error('Failed to stop session');
    const data = await res.json();
    await fetchSessions();
    await fetchStats();
    return data;
  }, [fetchSessions, fetchStats]);

  const toggleSessionPayment = useCallback(async (sessionId: number) => {
    const res = await authFetch(`${API_URL}/sessions/${sessionId}/toggle_payment/`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle payment');
    await fetchSessions();
  }, [fetchSessions]);

  const deleteSession = useCallback(async (sessionId: number) => {
    const res = await authFetch(`${API_URL}/sessions/${sessionId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
    await fetchSessions();
  }, [fetchSessions]);

  // PS4 actions
  const createPS4Session = useCallback(async (gameId: number, players: number, timeOptionId: number): Promise<PS4Session> => {
    const res = await authFetch(`${API_URL}/ps4-sessions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, players, time_option_id: timeOptionId }),
    });
    if (!res.ok) throw new Error('Failed to create PS4 session');
    const data = await res.json();
    await fetchPS4Sessions();
    await fetchStats();
    return data;
  }, [fetchPS4Sessions, fetchStats]);

  const togglePS4Payment = useCallback(async (sessionId: number) => {
    const res = await authFetch(`${API_URL}/ps4-sessions/${sessionId}/toggle_payment/`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle payment');
    await fetchPS4Sessions();
  }, [fetchPS4Sessions]);

  // Bar actions
  const createBarOrder = useCallback(async (clientName: string, items: { item_id: number; name: string; price: number; quantity: number }[]): Promise<BarOrder> => {
    const res = await authFetch(`${API_URL}/bar-orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: clientName, items }),
    });
    if (!res.ok) throw new Error('Failed to create bar order');
    const data = await res.json();
    await fetchBarOrders();
    await fetchStats();
    return data;
  }, [fetchBarOrders, fetchStats]);

  const toggleBarPayment = useCallback(async (orderId: number) => {
    const res = await authFetch(`${API_URL}/bar-orders/${orderId}/toggle_payment/`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle payment');
    await fetchBarOrders();
  }, [fetchBarOrders]);

  // Settings
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const res = await authFetch(`${API_URL}/settings/1/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    const data = await res.json();
    setSettings(data);
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchSettings(),
      fetchSessions(),
      fetchPS4Games(),
      fetchInventory(),
      fetchStats(),
    ]);
  }, [fetchSettings, fetchSessions, fetchPS4Games, fetchInventory, fetchStats]);

  return (
    <AppContext.Provider value={{
      sessions,
      ps4Sessions,
      ps4Games,
      inventory,
      barOrders,
      settings,
      stats,
      user,
      loading,
      setUser,
      fetchSessions,
      fetchPS4Sessions,
      fetchPS4Games,
      fetchInventory,
      fetchBarOrders,
      fetchSettings,
      fetchStats,
      refreshData,
      startSession,
      stopSession,
      toggleSessionPayment,
      deleteSession,
      createPS4Session,
      togglePS4Payment,
      createBarOrder,
      toggleBarPayment,
      updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
