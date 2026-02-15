import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Swal from 'sweetalert2';

interface Client {
  name: string;
  billiard_sessions: number;
  billiard_total: number;
  bar_orders: number;
  bar_total: number;
  total_visits: number;
  total_spent: number;
  total_unpaid: number;
  unpaid_count: number;
  has_unpaid: boolean;
}

interface ClientHistory {
  client_name: string;
  billiard_sessions: any[];
  bar_orders: any[];
  all_history: any[];
  stats: {
    total_billiard_sessions: number;
    total_bar_orders: number;
    total_billiard_spent: number;
    total_bar_spent: number;
    total_spent: number;
    total_unpaid: number;
    unpaid_count: number;
  };
}

interface PS4TimeOption {
  id: number;
  game: number;
  label: string;
  minutes: number;
  players: number;
  price: number;
  formatted_price?: string;
}

interface PS4Game {
  id: number;
  name: string;
  icon: string;
  player_options: number[];
  time_options: PS4TimeOption[];
  is_active: boolean;
}

interface RegisteredClient {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
  is_active: boolean;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  can_manage_billiard: boolean;
  can_manage_ps4: boolean;
  can_manage_bar: boolean;
  can_view_analytics: boolean;
  can_view_agenda: boolean;
  can_manage_clients: boolean;
  can_manage_settings: boolean;
  can_manage_users: boolean;
}

// Dynamic API URL - works for both development and Docker
const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.port === '5173' 
    ? 'http://localhost:8000/api' 
    : '/api');

export const Admin: React.FC = () => {
  const { 
    settings, 
    updateSettings,
    ps4Games: contextPs4Games,
    inventory,
    refreshData,
    user: currentUser,
  } = useAppContext();
  
  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState<'general' | 'clients' | 'bar' | 'ps4' | 'users'>('general');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pending settings for General tab
  const [pendingSettings, setPendingSettings] = useState<Partial<typeof settings>>({});
  const [settingsHasChanges, setSettingsHasChanges] = useState(false);
  
  // PS4 Management State
  const [ps4Games, setPs4Games] = useState<PS4Game[]>([]);
  const [editingGame, setEditingGame] = useState<PS4Game | null>(null);
  const [editingTimeOption, setEditingTimeOption] = useState<PS4TimeOption | null>(null);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [isAddingTimeOption, setIsAddingTimeOption] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', icon: '🎮', player_options: [1, 2] as number[] });
  const [newTimeOption, setNewTimeOption] = useState({ game_id: 0, label: '', minutes: 0, players: 1, price: 0 });

  // Bar Management State
  const [barItems, setBarItems] = useState<any[]>([]);
  const [editingBarItem, setEditingBarItem] = useState<any | null>(null);
  const [isAddingBarItem, setIsAddingBarItem] = useState(false);
  const [newBarItem, setNewBarItem] = useState({ name: '', price: 0, icon: '🍹' });

  // Registered Clients State
  const [registeredClients, setRegisteredClients] = useState<RegisteredClient[]>([]);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newRegisteredClient, setNewRegisteredClient] = useState({ name: '', phone: '', email: '', notes: '' });

  // Users Management State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'user' });
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Pending user permissions for Users tab
  const [pendingUserPermissions, setPendingUserPermissions] = useState<Record<number, Partial<UserProfile>>>({});
  const [usersHasChanges, setUsersHasChanges] = useState(false);

  useEffect(() => {
    if (activeTab === 'clients') {
      fetchClients();
      fetchRegisteredClients();
    }
    if (activeTab === 'ps4') {
      fetchPS4Games();
    }
    if (activeTab === 'bar') {
      fetchBarItems();
    }
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchPS4Games = async () => {
    try {
      const res = await fetch(`${API_URL}/ps4-games/`);
      if (res.ok) {
        const data = await res.json();
        setPs4Games(data);
      }
    } catch (error) {
      console.error('Error fetching PS4 games:', error);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients/`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredClients = async () => {
    try {
      const res = await fetch(`${API_URL}/registered-clients/`);
      if (res.ok) {
        const data = await res.json();
        setRegisteredClients(data);
      }
    } catch (error) {
      console.error('Error fetching registered clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users/`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addRegisteredClient = async () => {
    if (!newRegisteredClient.name.trim()) {
      Swal.fire({
        title: 'Erreur',
        text: 'Le nom du client est requis',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/registered-clients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRegisteredClient),
      });
      if (res.ok) {
        await fetchRegisteredClients();
        setIsAddingClient(false);
        setNewRegisteredClient({ name: '', phone: '', email: '', notes: '' });
        Swal.fire({
          title: 'Succès',
          text: 'Client ajouté',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      } else {
        const error = await res.json();
        Swal.fire({
          title: 'Erreur',
          text: error.name || 'Erreur lors de l\'ajout',
          icon: 'error',
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const addUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      Swal.fire({
        title: 'Erreur',
        text: 'Le nom d\'utilisateur et le mot de passe sont requis',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        await fetchUsers();
        setIsAddingUser(false);
        setNewUser({ username: '', password: '', email: '', role: 'user' });
        Swal.fire({
          title: 'Succès',
          text: 'Utilisateur ajouté',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      } else {
        const error = await res.json();
        Swal.fire({
          title: 'Erreur',
          text: error.error || 'Erreur lors de l\'ajout',
          icon: 'error',
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const updateUserPermissions = async (userId: number, permissions: Partial<UserProfile>) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/update_permissions/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      });
      if (res.ok) {
        await fetchUsers();
        Swal.fire({
          title: 'Succès',
          text: 'Permissions mises à jour',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    const result = await Swal.fire({
      title: 'Supprimer l\'utilisateur ?',
      text: `Voulez-vous vraiment supprimer "${username}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      background: '#09090b',
      color: '#fff',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/users/${userId}/`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await fetchUsers();
          Swal.fire({
            title: 'Supprimé',
            text: 'Utilisateur supprimé',
            icon: 'success',
            timer: 1500,
            background: '#09090b',
            color: '#fff',
          });
        } else {
          const error = await res.json();
          Swal.fire({
            title: 'Erreur',
            text: error.error || 'Erreur lors de la suppression',
            icon: 'error',
            background: '#09090b',
            color: '#fff',
          });
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const fetchClientHistory = async (clientName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients/${encodeURIComponent(clientName)}/history/`);
      if (res.ok) {
        const data = await res.json();
        setSelectedClient(data);
      }
    } catch (error) {
      console.error('Error fetching client history:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePayment = async (itemType: string, itemId: number) => {
    if (!selectedClient) return;
    
    try {
      const res = await fetch(
        `${API_URL}/clients/${encodeURIComponent(selectedClient.client_name)}/toggle-payment/${itemType}/${itemId}/`,
        { method: 'POST' }
      );
      if (res.ok) {
        // Refresh history
        await fetchClientHistory(selectedClient.client_name);
      }
    } catch (error) {
      console.error('Error toggling payment:', error);
    }
  };

  const payAll = async () => {
    if (!selectedClient) return;
    
    const result = await Swal.fire({
      title: 'Payer tout',
      text: `Marquer tous les éléments impayés de ${selectedClient.client_name} comme payés ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Oui, tout payer',
      cancelButtonText: 'Annuler',
      background: '#09090b',
      color: '#fff',
    });
    
    if (result.isConfirmed) {
      try {
        const res = await fetch(
          `${API_URL}/clients/${encodeURIComponent(selectedClient.client_name)}/pay-all/`,
          { method: 'POST' }
        );
        if (res.ok) {
          await fetchClientHistory(selectedClient.client_name);
          Swal.fire({
            title: 'Succès',
            text: 'Tous les éléments ont été marqués comme payés',
            icon: 'success',
            timer: 2000,
            background: '#09090b',
            color: '#fff',
          });
        }
      } catch (error) {
        console.error('Error paying all:', error);
      }
    }
  };

  const deletePaid = async () => {
    if (!selectedClient) return;
    
    const result = await Swal.fire({
      title: 'Supprimer les payés',
      text: `Supprimer tous les éléments payés de ${selectedClient.client_name} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      background: '#09090b',
      color: '#fff',
    });
    
    if (result.isConfirmed) {
      try {
        const res = await fetch(
          `${API_URL}/clients/${encodeURIComponent(selectedClient.client_name)}/delete-paid/`,
          { method: 'DELETE' }
        );
        if (res.ok) {
          await fetchClientHistory(selectedClient.client_name);
          Swal.fire({
            title: 'Succès',
            text: 'Tous les éléments payés ont été supprimés',
            icon: 'success',
            timer: 2000,
            background: '#09090b',
            color: '#fff',
          });
        }
      } catch (error) {
        console.error('Error deleting paid:', error);
      }
    }
  };

  const formatPrice = (mil: number) => {
    if (!mil || mil < 10000) return `${Math.round(mil || 0)} mil`;
    const dt = mil / 1000;
    return `${dt.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} DT`;
  };

  const handleUpdateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setPendingSettings(prev => ({ ...prev, [key]: value }));
    setSettingsHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings/1/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingSettings),
      });
      if (res.ok) {
        const data = await res.json();
        updateSettings(data);
        setPendingSettings({});
        setSettingsHasChanges(false);
        Swal.fire({
          title: 'Succès',
          text: 'Paramètres enregistrés',
          icon: 'success',
          timer: 2000,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Swal.fire({
        title: 'Erreur',
        text: 'Erreur lors de l\'enregistrement',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
    }
  };

  // Helper to get merged user data for display
  const getDisplayUser = (user: UserProfile) => ({
    ...user,
    role: user.role || 'user',
    can_manage_billiard: user.can_manage_billiard ?? false,
    can_manage_ps4: user.can_manage_ps4 ?? false,
    can_manage_bar: user.can_manage_bar ?? false,
    can_view_analytics: user.can_view_analytics ?? false,
    can_view_agenda: user.can_view_agenda ?? false,
    can_manage_clients: user.can_manage_clients ?? false,
    can_manage_settings: user.can_manage_settings ?? false,
    can_manage_users: user.can_manage_users ?? false,
    ...(pendingUserPermissions[user.id] || {}),
  });

  // Handle permission change - update pending state
  const handlePermissionChange = (userId: number, permission: keyof UserProfile, value: any) => {
    setPendingUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [permission]: value,
      },
    }));
    setUsersHasChanges(true);
  };

  // Save all pending user permissions
  const saveUserPermissions = async () => {
    const userIds = Object.keys(pendingUserPermissions);
    if (userIds.length === 0) return;

    try {
      // Save each user's pending permissions
      for (const userId of userIds) {
        const permissions = pendingUserPermissions[parseInt(userId)];
        if (Object.keys(permissions).length > 0) {
          const res = await fetch(`${API_URL}/users/${userId}/update_permissions/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(permissions),
          });
          if (!res.ok) {
            throw new Error('Failed to update permissions');
          }
        }
      }

      // Clear pending changes and refresh users
      setPendingUserPermissions({});
      setUsersHasChanges(false);
      await fetchUsers();

      Swal.fire({
        title: 'Succès',
        text: 'Permissions enregistrées',
        icon: 'success',
        timer: 2000,
        background: '#09090b',
        color: '#fff',
      });
    } catch (error) {
      console.error('Error saving user permissions:', error);
      Swal.fire({
        title: 'Erreur',
        text: 'Erreur lors de l\'enregistrement des permissions',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get merged settings for display (pending + actual)
  const displaySettings = { ...settings, ...pendingSettings };

  // Bar Item Management Functions
  const fetchBarItems = async () => {
    try {
      const res = await fetch(`${API_URL}/inventory/`);
      if (res.ok) {
        const data = await res.json();
        setBarItems(data);
      }
    } catch (error) {
      console.error('Error fetching bar items:', error);
    }
  };

  const createBarItem = async () => {
    if (!newBarItem.name.trim()) {
      Swal.fire({
        title: 'Erreur',
        text: 'Le nom du produit est requis',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/inventory/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBarItem),
      });
      if (res.ok) {
        await fetchBarItems();
        if (refreshData) refreshData();
        setIsAddingBarItem(false);
        setNewBarItem({ name: '', price: 0, icon: '🍹' });
        Swal.fire({
          title: 'Succès',
          text: 'Produit créé',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error creating bar item:', error);
    }
  };

  const updateBarItem = async (itemId: number, data: any) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${itemId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchBarItems();
        if (refreshData) refreshData();
        setEditingBarItem(null);
        Swal.fire({
          title: 'Succès',
          text: 'Produit mis à jour',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error updating bar item:', error);
    }
  };

  const deleteBarItem = async (itemId: number, itemName: string) => {
    const result = await Swal.fire({
      title: 'Supprimer le produit ?',
      text: `Voulez-vous vraiment supprimer "${itemName}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      background: '#09090b',
      color: '#fff',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/inventory/${itemId}/`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await fetchBarItems();
          if (refreshData) refreshData();
          Swal.fire({
            title: 'Supprimé',
            text: 'Produit supprimé',
            icon: 'success',
            timer: 1500,
            background: '#09090b',
            color: '#fff',
          });
        }
      } catch (error) {
        console.error('Error deleting bar item:', error);
      }
    }
  };

  // PS4 Game Management Functions
  const updateGame = async (gameId: number, data: Partial<PS4Game>) => {
    try {
      const res = await fetch(`${API_URL}/ps4-games/${gameId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchPS4Games();
        if (refreshData) refreshData();
        Swal.fire({
          title: 'Succès',
          text: 'Jeu mis à jour',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error updating game:', error);
    }
  };

  const deleteGame = async (gameId: number) => {
    const result = await Swal.fire({
      title: 'Supprimer le jeu',
      text: 'Êtes-vous sûr de vouloir supprimer ce jeu ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      background: '#09090b',
      color: '#fff',
    });
    
    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/ps4-games/${gameId}/`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await fetchPS4Games();
          if (refreshData) refreshData();
          Swal.fire({
            title: 'Succès',
            text: 'Jeu supprimé',
            icon: 'success',
            timer: 1500,
            background: '#09090b',
            color: '#fff',
          });
        }
      } catch (error) {
        console.error('Error deleting game:', error);
      }
    }
  };

  const createGame = async () => {
    if (!newGame.name.trim()) {
      Swal.fire({
        title: 'Erreur',
        text: 'Le nom du jeu est requis',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/ps4-games/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGame),
      });
      if (res.ok) {
        await fetchPS4Games();
        if (refreshData) refreshData();
        setIsAddingGame(false);
        setNewGame({ name: '', icon: '🎮', player_options: [1, 2] });
        Swal.fire({
          title: 'Succès',
          text: 'Jeu créé',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const updateTimeOption = async (optionId: number, data: Partial<PS4TimeOption>) => {
    try {
      const res = await fetch(`${API_URL}/ps4-time-options/${optionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchPS4Games();
        if (refreshData) refreshData();
        Swal.fire({
          title: 'Succès',
          text: 'Option mise à jour',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error updating time option:', error);
    }
  };

  const deleteTimeOption = async (optionId: number) => {
    const result = await Swal.fire({
      title: 'Supprimer l\'option',
      text: 'Êtes-vous sûr de vouloir supprimer cette option ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      background: '#09090b',
      color: '#fff',
    });
    
    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/ps4-time-options/${optionId}/`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await fetchPS4Games();
          if (refreshData) refreshData();
          Swal.fire({
            title: 'Succès',
            text: 'Option supprimée',
            icon: 'success',
            timer: 1500,
            background: '#09090b',
            color: '#fff',
          });
        }
      } catch (error) {
        console.error('Error deleting time option:', error);
      }
    }
  };

  const createTimeOption = async () => {
    if (newTimeOption.minutes <= 0 || newTimeOption.price <= 0) {
      Swal.fire({
        title: 'Erreur',
        text: 'Tous les champs sont requis',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
      return;
    }
    
    try {
      // Generate label automatically from minutes
      const label = `${newTimeOption.minutes} min`;
      const res = await fetch(`${API_URL}/ps4-time-options/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: newTimeOption.game_id,
          label: label,
          minutes: newTimeOption.minutes,
          players: newTimeOption.players,
          price: newTimeOption.price,
        }),
      });
      if (res.ok) {
        await fetchPS4Games();
        if (refreshData) refreshData();
        setIsAddingTimeOption(false);
        setNewTimeOption({ game_id: 0, label: '', minutes: 0, players: 1, price: 0 });
        Swal.fire({
          title: 'Succès',
          text: 'Prix créé',
          icon: 'success',
          timer: 1500,
          background: '#09090b',
          color: '#fff',
        });
      }
    } catch (error) {
      console.error('Error creating time option:', error);
    }
  };

  const togglePlayerOption = (game: PS4Game, playerCount: number) => {
    const currentOptions = game.player_options;
    let newOptions: number[];
    
    if (currentOptions.includes(playerCount)) {
      newOptions = currentOptions.filter(p => p !== playerCount);
    } else {
      newOptions = [...currentOptions, playerCount].sort();
    }
    
    updateGame(game.id, { player_options: newOptions });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex bg-zinc-900/30 p-2 rounded-2xl border border-white/5 gap-2 mb-8">
        {[
          { id: 'general', label: 'Général' },
          { id: 'clients', label: 'Clients' },
          { id: 'bar', label: 'Bar' },
          { id: 'ps4', label: 'PS4' },
          { id: 'users', label: 'Utilisateurs' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'general' | 'clients' | 'bar' | 'ps4' | 'users')}
            className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white shadow-xl'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl space-y-8">
          <h2 className="text-4xl font-black italic text-white">Paramètres Généraux</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Nom du Club
              </label>
              <input
                type="text"
                value={displaySettings.club_name}
                onChange={e => handleUpdateSetting('club_name', e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Couleur Thème
              </label>
              <div className="flex gap-4 mt-2">
                <input
                  type="color"
                  value={displaySettings.theme_color}
                  onChange={e => handleUpdateSetting('theme_color', e.target.value)}
                  className="w-14 h-14 rounded-2xl border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={displaySettings.theme_color}
                  onChange={e => handleUpdateSetting('theme_color', e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Couleur Table A
              </label>
              <div className="flex gap-4 mt-2">
                <input
                  type="color"
                  value={displaySettings.table_a_color}
                  onChange={e => handleUpdateSetting('table_a_color', e.target.value)}
                  className="w-14 h-14 rounded-2xl border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={displaySettings.table_a_color}
                  onChange={e => handleUpdateSetting('table_a_color', e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Couleur Table B
              </label>
              <div className="flex gap-4 mt-2">
                <input
                  type="color"
                  value={displaySettings.table_b_color}
                  onChange={e => handleUpdateSetting('table_b_color', e.target.value)}
                  className="w-14 h-14 rounded-2xl border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={displaySettings.table_b_color}
                  onChange={e => handleUpdateSetting('table_b_color', e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Tarif de Base (mil/min)
              </label>
              <input
                type="number"
                value={displaySettings.rate_base}
                onChange={e => handleUpdateSetting('rate_base', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Tarif Réduit (mil/min)
              </label>
              <input
                type="number"
                value={displaySettings.rate_reduced}
                onChange={e => handleUpdateSetting('rate_reduced', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Seuil (minutes)
              </label>
              <p className="text-[10px] text-zinc-500 mt-1">Durée avant d'appliquer le tarif réduit</p>
              <input
                type="number"
                value={displaySettings.threshold_mins}
                onChange={e => handleUpdateSetting('threshold_mins', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Plancher Minimum (mil)
              </label>
              <p className="text-[10px] text-zinc-500 mt-1">Prix minimum pour les sessions courtes</p>
              <input
                type="number"
                value={displaySettings.floor_min}
                onChange={e => handleUpdateSetting('floor_min', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Plancher Moyen (mil)
              </label>
              <p className="text-[10px] text-zinc-500 mt-1">Prix minimum pour les sessions longues</p>
              <input
                type="number"
                value={displaySettings.floor_mid}
                onChange={e => handleUpdateSetting('floor_mid', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
          </div>
          
          {/* Explication de la formule de calcul */}
          <div className="bg-black/30 rounded-2xl p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Formule de Calcul du Prix</h3>
            <div className="text-sm text-zinc-400 space-y-3">
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-yellow-500 font-bold mb-2">📊 Tarification :</p>
                <p>• De 0 à {displaySettings.threshold_mins} min : <span className="text-white font-bold">{displaySettings.rate_base} mil/min</span></p>
                <p>• Après {displaySettings.threshold_mins} min : <span className="text-white font-bold">{displaySettings.rate_reduced} mil/min</span> (pour les minutes supplémentaires)</p>
              </div>
              
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-emerald-500 font-bold mb-2">💰 Conditions de plancher :</p>
                <p>• Si prix &lt; {displaySettings.floor_min} mil → <span className="text-white font-bold">{displaySettings.floor_min} mil ({displaySettings.floor_min / 1000} DT)</span></p>
                <p>• Si {displaySettings.floor_min} mil &lt; prix &lt; {displaySettings.floor_mid} mil → <span className="text-white font-bold">{displaySettings.floor_mid} mil ({displaySettings.floor_mid / 1000} DT)</span></p>
                <p>• Si prix ≥ {displaySettings.floor_mid} mil → <span className="text-white font-bold">prix calculé</span></p>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-blue-500 font-bold mb-2">📝 Exemples :</p>
                <p>• 5 min = 5 × {displaySettings.rate_base} = {5 * displaySettings.rate_base} mil → <span className="text-white font-bold">{displaySettings.floor_min} mil (plancher)</span></p>
                <p>• 10 min = 10 × {displaySettings.rate_base} = {10 * displaySettings.rate_base} mil → <span className="text-white font-bold">{displaySettings.floor_mid} mil (plancher)</span></p>
                <p>• 20 min = ({displaySettings.threshold_mins} × {displaySettings.rate_base}) + (5 × {displaySettings.rate_reduced}) = {displaySettings.threshold_mins * displaySettings.rate_base + 5 * displaySettings.rate_reduced} mil</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {settingsHasChanges && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSettings}
                className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black rounded-2xl font-black uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Enregistrer
              </button>
            </div>
          )}
        </section>
      )}

      {/* Clients Management */}
      {activeTab === 'clients' && (
        <div className="space-y-8">
          {/* Client List */}
          {!selectedClient && (
            <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-4xl font-black italic text-white">Gestion des Clients</h2>
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold w-64"
                />
              </div>

              {loading ? (
                <p className="text-zinc-500 text-center py-10">Chargement...</p>
              ) : filteredClients.length === 0 ? (
                <p className="text-zinc-500 text-center py-10">Aucun client trouvé</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-zinc-600 uppercase border-b border-white/5">
                        <th className="p-4">Client</th>
                        <th className="p-4">Sessions Billard</th>
                        <th className="p-4">Commandes Bar</th>
                        <th className="p-4">Total Visites</th>
                        <th className="p-4">Total Dépensé</th>
                        <th className="p-4">Non Payé</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredClients.map(client => (
                        <tr 
                          key={client.name} 
                          className={`hover:bg-white/5 transition-all ${
                            client.has_unpaid 
                              ? 'bg-red-500/10 border-l-4 border-l-red-500' 
                              : 'bg-emerald-500/5 border-l-4 border-l-emerald-500'
                          }`}
                        >
                          <td className="p-4 font-bold text-white">{client.name}</td>
                          <td className="p-4 text-zinc-400">{client.billiard_sessions}</td>
                          <td className="p-4 text-zinc-400">{client.bar_orders}</td>
                          <td className="p-4 text-zinc-400">{client.total_visits}</td>
                          <td className="p-4 font-bold" style={{ color: settings.theme_color }}>
                            {formatPrice(client.total_spent)}
                          </td>
                          <td className="p-4">
                            {client.has_unpaid ? (
                              <span className="text-red-400 font-bold">
                                {formatPrice(client.total_unpaid)}
                                <span className="text-xs ml-1">({client.unpaid_count})</span>
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-bold">0 DT</span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => fetchClientHistory(client.name)}
                              className="px-4 py-2 bg-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:text-white hover:bg-zinc-700"
                            >
                              Voir Historique
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Client History */}
          {selectedClient && (
            <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-4xl font-black italic text-white">
                  Historique: {selectedClient.client_name}
                </h2>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="px-6 py-3 bg-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:text-white"
                >
                  Retour
                </button>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Sessions Billard</p>
                  <p className="text-3xl font-black text-white">{selectedClient.stats.total_billiard_sessions}</p>
                  <p className="text-sm text-zinc-500">{formatPrice(selectedClient.stats.total_billiard_spent)}</p>
                </div>
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Commandes Bar</p>
                  <p className="text-3xl font-black text-white">{selectedClient.stats.total_bar_orders}</p>
                  <p className="text-sm text-zinc-500">{formatPrice(selectedClient.stats.total_bar_spent)}</p>
                </div>
                <div className="bg-black/40 p-6 rounded-2xl border border-red-500/30">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Total Non Payé</p>
                  <p className="text-3xl font-black text-red-400">
                    {formatPrice(selectedClient.stats.total_unpaid)}
                  </p>
                  <p className="text-sm text-red-400/70">{selectedClient.stats.unpaid_count} éléments</p>
                </div>
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Total Dépensé</p>
                  <p className="text-3xl font-black" style={{ color: settings.theme_color }}>
                    {formatPrice(selectedClient.stats.total_spent)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={payAll}
                  disabled={selectedClient.stats.unpaid_count === 0}
                  className={`px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${
                    selectedClient.stats.unpaid_count > 0
                      ? 'bg-green-500 text-black hover:bg-green-400'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  💰 Payer Tout ({selectedClient.stats.unpaid_count} éléments)
                </button>
                <button
                  onClick={deletePaid}
                  className="px-6 py-4 bg-red-500/20 text-red-400 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-red-500/30 transition-all"
                >
                  🗑️ Supprimer les Payés
                </button>
              </div>

              {/* History Table */}
              <h3 className="text-xl font-black italic text-white mb-4">Historique Complet</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-zinc-600 uppercase border-b border-white/5">
                      <th className="p-4">Type</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Heure</th>
                      <th className="p-4">Détails</th>
                      <th className="p-4">Montant</th>
                      <th className="p-4">Paiement</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedClient.all_history.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-white/5 transition-all ${!item.is_paid ? 'bg-red-500/5' : ''}`}>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                            item.type === 'billiard' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {item.type === 'billiard' ? 'Billard' : 'Bar'}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400">{item.date}</td>
                        <td className="p-4 text-zinc-400">{item.time}</td>
                        <td className="p-4 text-white">
                          {item.type === 'billiard' 
                            ? `Table ${item.table} - ${item.duration}`
                            : `${item.items?.length || 0} articles`
                          }
                        </td>
                        <td className="p-4 font-bold text-white">{item.formatted_price}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                            item.is_paid 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {item.is_paid ? 'Payé' : 'Non payé'}
                          </span>
                        </td>
                        <td className="p-4">
                          {!item.is_paid && (
                            <button
                              onClick={() => togglePayment(item.type, item.id)}
                              className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-[10px] font-black uppercase hover:bg-green-500/30"
                            >
                              Payer
                            </button>
                          )}
                          {item.is_paid && (
                            <button
                              onClick={() => togglePayment(item.type, item.id)}
                              className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase hover:bg-zinc-700"
                            >
                              Annuler
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Bar Settings */}
      {activeTab === 'bar' && (
        <div className="space-y-8">
          {/* Add Product Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-black italic text-white">Gestion du Bar</h2>
            <button
              onClick={() => setIsAddingBarItem(true)}
              className="px-6 py-3 bg-green-500 text-black rounded-xl font-black text-sm uppercase hover:bg-green-400 transition-all"
            >
              + Nouveau Produit
            </button>
          </div>

          {/* Add Product Modal */}
          {isAddingBarItem && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-white/10">
                <h3 className="text-2xl font-black text-white mb-6">Nouveau Produit</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Nom du Produit
                    </label>
                    <input
                      type="text"
                      value={newBarItem.name}
                      onChange={e => setNewBarItem({ ...newBarItem, name: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="Ex: Coca-Cola"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Prix (mil)
                    </label>
                    <input
                      type="number"
                      value={newBarItem.price || ''}
                      onChange={e => setNewBarItem({ ...newBarItem, price: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="Ex: 2000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Icône (Emoji)
                    </label>
                    <input
                      type="text"
                      value={newBarItem.icon}
                      onChange={e => setNewBarItem({ ...newBarItem, icon: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2 text-2xl text-center"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setIsAddingBarItem(false)}
                    className="flex-1 px-6 py-4 bg-zinc-800 text-zinc-400 rounded-xl font-black uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createBarItem}
                    className="flex-1 px-6 py-4 bg-green-500 text-black rounded-xl font-black uppercase"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Modal */}
          {editingBarItem && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-white/10">
                <h3 className="text-2xl font-black text-white mb-6">Modifier Produit</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Nom du Produit
                    </label>
                    <input
                      type="text"
                      value={editingBarItem.name}
                      onChange={e => setEditingBarItem({ ...editingBarItem, name: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Prix (mil)
                    </label>
                    <input
                      type="number"
                      value={editingBarItem.price || ''}
                      onChange={e => setEditingBarItem({ ...editingBarItem, price: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Icône (Emoji)
                    </label>
                    <input
                      type="text"
                      value={editingBarItem.icon}
                      onChange={e => setEditingBarItem({ ...editingBarItem, icon: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2 text-2xl text-center"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setEditingBarItem(null)}
                    className="flex-1 px-6 py-4 bg-zinc-800 text-zinc-400 rounded-xl font-black uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => updateBarItem(editingBarItem.id, editingBarItem)}
                    className="flex-1 px-6 py-4 bg-yellow-500 text-black rounded-xl font-black uppercase"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {barItems.map(item => (
              <div key={item.id} className="bg-black/40 p-6 rounded-2xl border border-white/5 relative group">
                <div className="text-4xl mb-4 text-center">{item.icon}</div>
                <div className="text-white font-bold text-center mb-2">{item.name}</div>
                <div className="text-center text-zinc-400 mb-4">{formatPrice(item.price)}</div>
                <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingBarItem(item)}
                    className="px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-xl font-bold text-sm hover:bg-yellow-500/30"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => deleteBarItem(item.id, item.name)}
                    className="px-4 py-2 bg-red-500/20 text-red-500 rounded-xl font-bold text-sm hover:bg-red-500/30"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {barItems.length === 0 && (
            <p className="text-zinc-500 text-center py-10">Aucun produit. Cliquez sur "Nouveau Produit" pour ajouter.</p>
          )}
        </div>
      )}

      {/* PS4 Settings */}
      {activeTab === 'ps4' && (
        <div className="space-y-8">
          {/* Add Game Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-black italic text-white">Configuration PS4</h2>
            <button
              onClick={() => setIsAddingGame(true)}
              className="px-6 py-3 bg-green-500 text-black rounded-xl font-black text-sm uppercase hover:bg-green-400 transition-all"
            >
              + Nouveau Jeu
            </button>
          </div>

          {/* Add Game Modal */}
          {isAddingGame && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-white/10">
                <h3 className="text-2xl font-black text-white mb-6">Nouveau Jeu PS4</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Nom du Jeu
                    </label>
                    <input
                      type="text"
                      value={newGame.name}
                      onChange={e => setNewGame({ ...newGame, name: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="Ex: FIFA 24"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Icône (Emoji)
                    </label>
                    <input
                      type="text"
                      value={newGame.icon}
                      onChange={e => setNewGame({ ...newGame, icon: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2 text-2xl text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">
                      Options Joueurs
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            const opts = newGame.player_options.includes(p)
                              ? newGame.player_options.filter(x => x !== p)
                              : [...newGame.player_options, p].sort();
                            setNewGame({ ...newGame, player_options: opts });
                          }}
                          className={`px-4 py-2 rounded-xl font-black text-sm ${
                            newGame.player_options.includes(p)
                              ? 'bg-green-500 text-black'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {p}P
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setIsAddingGame(false)}
                    className="flex-1 px-6 py-4 bg-zinc-800 text-zinc-400 rounded-xl font-black uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createGame}
                    className="flex-1 px-6 py-4 bg-green-500 text-black rounded-xl font-black uppercase"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Time Option Modal */}
          {isAddingTimeOption && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-white/10">
                <h3 className="text-2xl font-black text-white mb-6">Nouvelle Option de Prix</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Durée (minutes)
                    </label>
                    <input
                      type="number"
                      value={newTimeOption.minutes || ''}
                      onChange={e => setNewTimeOption({ ...newTimeOption, minutes: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">
                      Nombre de Joueurs
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(p => (
                        <button
                          key={p}
                          onClick={() => setNewTimeOption({ ...newTimeOption, players: p })}
                          className={`flex-1 px-4 py-3 rounded-xl font-black text-sm ${
                            newTimeOption.players === p
                              ? 'bg-green-500 text-black'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {p}P
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Prix (millimes)
                    </label>
                    <input
                      type="number"
                      value={newTimeOption.price || ''}
                      onChange={e => setNewTimeOption({ ...newTimeOption, price: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="1500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setIsAddingTimeOption(false)}
                    className="flex-1 px-6 py-4 bg-zinc-800 text-zinc-400 rounded-xl font-black uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createTimeOption}
                    className="flex-1 px-6 py-4 bg-green-500 text-black rounded-xl font-black uppercase"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Games List */}
          {ps4Games.map(game => (
            <div key={game.id} className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-8 shadow-2xl">
              {/* Game Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {editingGame?.id === game.id ? (
                    <input
                      type="text"
                      value={editingGame.icon}
                      onChange={e => setEditingGame({ ...editingGame, icon: e.target.value })}
                      className="w-16 h-16 bg-black/50 border border-white/10 rounded-2xl text-2xl text-center"
                    />
                  ) : (
                    <span className="text-4xl">{game.icon}</span>
                  )}
                  {editingGame?.id === game.id ? (
                    <input
                      type="text"
                      value={editingGame.name}
                      onChange={e => setEditingGame({ ...editingGame, name: e.target.value })}
                      className="bg-black/50 border border-white/10 rounded-2xl px-4 py-2 text-xl font-black text-white"
                    />
                  ) : (
                    <h3 className="text-2xl font-black italic text-white">{game.name}</h3>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingGame?.id === game.id ? (
                    <>
                      <button
                        onClick={() => {
                          updateGame(game.id, { name: editingGame.name, icon: editingGame.icon });
                          setEditingGame(null);
                        }}
                        className="px-4 py-2 bg-green-500 text-black rounded-xl font-black text-sm"
                      >
                        ✓ Sauver
                      </button>
                      <button
                        onClick={() => setEditingGame(null)}
                        className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl font-black text-sm"
                      >
                        ✕ Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingGame(game)}
                        className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl font-black text-sm hover:text-white"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => deleteGame(game.id)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-black text-sm hover:bg-red-500/30"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Player Options */}
              <div className="mb-6">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                  Options Joueurs
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlayerOption(game, p)}
                      className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${
                        game.player_options.includes(p)
                          ? 'bg-green-500 text-black'
                          : 'bg-zinc-800 text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      {p}P
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Matrix - Duration × Players */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    Matrice de Prix (Durée × Joueurs)
                  </p>
                  <button
                    onClick={() => {
                      setNewTimeOption({ game_id: game.id, label: '', minutes: 0, players: 1, price: 0 });
                      setIsAddingTimeOption(true);
                    }}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-[10px] font-black uppercase"
                  >
                    + Ajouter Prix
                  </button>
                </div>
                
                {/* Get unique durations and players for this game */}
                {(() => {
                  const durations = [...new Set(game.time_options.map(opt => opt.minutes))].sort((a: number, b: number) => a - b) as number[];
                  const players = [...game.player_options].sort((a: number, b: number) => a - b) as number[];
                  
                  // Function to get price for specific duration and players
                  const getPrice = (minutes: number, playerCount: number) => {
                    return game.time_options.find(opt => opt.minutes === minutes && opt.players === playerCount);
                  };
                  
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-black text-zinc-600 uppercase">
                            <th className="p-3 border border-white/10 bg-black/40">Durée</th>
                            {players.map(p => (
                              <th key={p} className="p-3 border border-white/10 bg-black/40 text-center">
                                {p}P
                              </th>
                            ))}
                            <th className="p-3 border border-white/10 bg-black/40"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {durations.map(minutes => (
                            <tr key={minutes} className="hover:bg-white/5">
                              <td className="p-3 border border-white/10 font-bold text-white bg-black/20">
                                {minutes} min
                              </td>
                              {players.map(p => {
                                const opt = getPrice(minutes, p);
                                return (
                                  <td key={p} className="p-2 border border-white/10 text-center">
                                    {opt && editingTimeOption?.id === opt.id ? (
                                      <div className="space-y-1">
                                        <input
                                          type="number"
                                          value={editingTimeOption.price || ''}
                                          onChange={e => setEditingTimeOption({ ...editingTimeOption, price: parseInt(e.target.value) || 0 })}
                                          className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-white text-sm text-center"
                                          placeholder="Prix"
                                        />
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => {
                                              if (opt) {
                                                updateTimeOption(opt.id, { price: editingTimeOption.price });
                                                setEditingTimeOption(null);
                                              }
                                            }}
                                            className="flex-1 px-2 py-1 bg-green-500 text-black rounded text-[10px] font-black"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={() => setEditingTimeOption(null)}
                                            className="flex-1 px-2 py-1 bg-zinc-700 text-zinc-400 rounded text-[10px] font-black"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    ) : opt ? (
                                      <div
                                        className="cursor-pointer hover:bg-zinc-800 p-2 rounded-lg transition-all"
                                        onClick={() => setEditingTimeOption(opt)}
                                      >
                                        <p className="font-black" style={{ color: settings.theme_color }}>
                                          {formatPrice(opt.price)}
                                        </p>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTimeOption(opt.id);
                                          }}
                                          className="text-zinc-600 hover:text-red-400 text-[10px] mt-1"
                                        >
                                          ✕ supprimer
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setNewTimeOption({ 
                                            game_id: game.id, 
                                            label: `${minutes} min`, 
                                            minutes: minutes, 
                                            players: p, 
                                            price: 0 
                                          });
                                          setIsAddingTimeOption(true);
                                        }}
                                        className="text-zinc-600 hover:text-green-400 text-[10px] p-2"
                                      >
                                        + ajouter
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-2 border border-white/10">
                                <button
                                  onClick={() => {
                                    // Delete all options for this duration
                                    const optsToDelete = game.time_options.filter(opt => opt.minutes === minutes);
                                    optsToDelete.forEach(opt => {
                                      fetch(`${API_URL}/ps4-time-options/${opt.id}/`, { method: 'DELETE' });
                                    });
                                    setTimeout(() => fetchPS4Games(), 300);
                                  }}
                                  className="text-zinc-600 hover:text-red-400 text-[10px]"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                          {/* Add new duration row */}
                          <tr>
                            <td colSpan={players.length + 2} className="p-2 border border-white/10">
                              <button
                                onClick={() => {
                                  const newMinutes = durations.length > 0 ? Math.max(...durations as number[]) + 5 : 8;
                                  setNewTimeOption({ 
                                    game_id: game.id, 
                                    label: `${newMinutes} min`, 
                                    minutes: newMinutes, 
                                    players: players[0] || 1, 
                                    price: 0 
                                  });
                                  setIsAddingTimeOption(true);
                                }}
                                className="w-full py-2 bg-zinc-800/50 text-zinc-500 hover:text-green-400 rounded-lg text-[10px] font-black uppercase"
                              >
                                + Ajouter une durée
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {ps4Games.length === 0 && (
            <div className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 text-center">
              <p className="text-zinc-500">Aucun jeu PS4 configuré</p>
              <button
                onClick={() => setIsAddingGame(true)}
                className="mt-4 px-6 py-3 bg-green-500 text-black rounded-xl font-black text-sm uppercase"
              >
                + Ajouter un jeu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Users Management */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-black italic text-white">Gestion des Utilisateurs</h2>
            <button
              onClick={() => setIsAddingUser(true)}
              style={{ backgroundColor: settings.theme_color || '#eab308' }}
              className="px-6 py-3 text-black rounded-xl font-black text-sm uppercase"
            >
              + Ajouter un utilisateur
            </button>
          </div>

          {/* Add User Modal */}
          {isAddingUser && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 rounded-[3rem] border border-white/10 p-8 w-full max-w-md">
                <h3 className="text-2xl font-black text-white mb-6">Nouvel Utilisateur</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Nom d'utilisateur *
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      Rôle
                    </label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                    >
                      <option value="admin">Administrateur</option>
                      <option value="user">Utilisateur</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => {
                      setIsAddingUser(false);
                      setNewUser({ username: '', password: '', email: '', role: 'user' });
                    }}
                    className="flex-1 py-4 bg-zinc-800 text-white rounded-xl font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={addUser}
                    style={{ backgroundColor: settings.theme_color || '#eab308' }}
                    className="flex-1 py-4 text-black rounded-xl font-black"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="bg-zinc-900/30 rounded-[3rem] border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Utilisateur</th>
                  <th className="text-left p-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Rôle</th>
                  <th className="text-left p-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Permissions</th>
                  <th className="text-right p-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const displayUser = getDisplayUser(user);
                  return (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="text-white font-bold">{user.username}</div>
                        <div className="text-zinc-500 text-sm">{user.email || '-'}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={displayUser.role || 'user'}
                          onChange={e => handlePermissionChange(user.id, 'role', e.target.value)}
                          className="bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                        >
                          <option value="admin">Administrateur</option>
                          <option value="user">Utilisateur</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={displayUser.can_manage_billiard}
                              onChange={e => handlePermissionChange(user.id, 'can_manage_billiard', e.target.checked)}
                              className="rounded"
                            />
                            Billard
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={displayUser.can_manage_ps4}
                              onChange={e => handlePermissionChange(user.id, 'can_manage_ps4', e.target.checked)}
                              className="rounded"
                            />
                            PS4
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={displayUser.can_manage_bar}
                              onChange={e => handlePermissionChange(user.id, 'can_manage_bar', e.target.checked)}
                              className="rounded"
                            />
                            Bar
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={displayUser.can_view_analytics}
                              onChange={e => handlePermissionChange(user.id, 'can_view_analytics', e.target.checked)}
                              className="rounded"
                            />
                            Stats
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={displayUser.can_manage_settings}
                              onChange={e => handlePermissionChange(user.id, 'can_manage_settings', e.target.checked)}
                              className="rounded"
                            />
                            Paramètres
                          </label>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        🗑️ Supprimer
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-10 text-center text-zinc-500">
                Aucun utilisateur configuré
              </div>
            )}

            {/* Save Button for Users */}
            {usersHasChanges && (
              <div className="p-6 flex justify-end">
                <button
                  onClick={saveUserPermissions}
                  className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black rounded-2xl font-black uppercase tracking-wider flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Client Button in Clients Tab */}
      {activeTab === 'clients' && (
        <div className="mb-4">
          <button
            onClick={() => setIsAddingClient(true)}
            style={{ backgroundColor: settings.theme_color || '#eab308' }}
            className="px-6 py-3 text-black rounded-xl font-black text-sm uppercase"
          >
            + Ajouter un client
          </button>
        </div>
      )}

      {/* Add Client Modal */}
      {isAddingClient && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-[3rem] border border-white/10 p-8 w-full max-w-md">
            <h3 className="text-2xl font-black text-white mb-6">Nouveau Client</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newRegisteredClient.name}
                  onChange={e => setNewRegisteredClient({ ...newRegisteredClient, name: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                  placeholder="Nom du client"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={newRegisteredClient.phone}
                  onChange={e => setNewRegisteredClient({ ...newRegisteredClient, phone: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                  placeholder="+216 XX XXX XXX"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  Email
                </label>
                <input
                  type="email"
                  value={newRegisteredClient.email}
                  onChange={e => setNewRegisteredClient({ ...newRegisteredClient, email: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  Notes
                </label>
                <textarea
                  value={newRegisteredClient.notes}
                  onChange={e => setNewRegisteredClient({ ...newRegisteredClient, notes: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                  placeholder="Notes sur le client..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setIsAddingClient(false);
                  setNewRegisteredClient({ name: '', phone: '', email: '', notes: '' });
                }}
                className="flex-1 py-4 bg-zinc-800 text-white rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                onClick={addRegisteredClient}
                style={{ backgroundColor: settings.theme_color || '#eab308' }}
                className="flex-1 py-4 text-black rounded-xl font-black"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


