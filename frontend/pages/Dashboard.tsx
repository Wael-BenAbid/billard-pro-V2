import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Swal from 'sweetalert2';

// ============================================
// COMPOSANT: LiveTimer
// ============================================
interface LiveTimerProps {
  startTime: string | null;
}

const LiveTimer: React.FC<LiveTimerProps> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateTimer = () => {
      if (!startTime) {
        setElapsed("00:00:00");
        return;
      }
      
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      
      setElapsed(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-mono text-6xl">{elapsed}</span>;
};

// ============================================
// COMPOSANT: TableCard
// ============================================
interface TableCardProps {
  tableIdentifier: string;
  tableName: string;
  color: string;
  activeSession: any;
  onStart: (tableIdentifier: string) => void;
  onStop: (tableIdentifier: string) => void;
  onCancel: (tableIdentifier: string) => void;
}

const TableCard: React.FC<TableCardProps> = ({
  tableIdentifier,
  tableName,
  color,
  activeSession,
  onStart,
  onStop,
  onCancel,
}) => {
  return (
    <div className="bg-zinc-900/50 rounded-[2.5rem] p-8 border-2 relative overflow-hidden"
      style={{ borderColor: activeSession ? color : 'rgba(255,255,255,0.1)' }}
    >
      {activeSession && (
        <div 
          className="absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full opacity-20"
          style={{ backgroundColor: color }}
        />
      )}

      <div className="flex justify-between items-center relative z-10">
        <div>
          <h3 className="text-4xl font-black italic uppercase tracking-tighter" style={{ color }}>
            {tableName}
          </h3>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            {activeSession ? 'EN COURS' : 'LIBRE'}
          </p>
        </div>

        <div className="flex gap-3">
          {activeSession && (
            <button
              onClick={() => onCancel(tableIdentifier)}
              className="px-6 py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition-all bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
            >
              ANNULER
            </button>
          )}
          <button
            onClick={() => activeSession ? onStop(tableIdentifier) : onStart(tableIdentifier)}
            className={`px-8 py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition-all ${
              activeSession
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'text-white hover:brightness-110'
            }`}
            style={{ backgroundColor: activeSession ? undefined : color }}
          >
            {activeSession ? 'ARRÊTER' : 'DÉMARRER'}
          </button>
        </div>
      </div>

      {activeSession && (
        <div className="mt-8 text-center relative z-10">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">COMPTEUR</p>
          <LiveTimer startTime={activeSession.start_time} />
        </div>
      )}

      {activeSession && (
        <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-black/30 rounded-2xl p-4 text-center">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">CLIENT</p>
            <p className="text-xl font-bold text-white">{activeSession.client_name || 'Anonyme'}</p>
          </div>
          <div className="bg-black/30 rounded-2xl p-4 text-center">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">PRIX</p>
            <p className="text-xl font-bold" style={{ color }}>
              {activeSession.formatted_price}
            </p>
          </div>
        </div>
      )}

      {!activeSession && (
        <div className="mt-8 h-32 bg-black/20 rounded-2xl flex items-center justify-center">
          <p className="text-zinc-600 font-black italic text-2xl">LIBRE</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPOSANT: SessionHistory
// ============================================
interface SessionHistoryProps {
  title: string;
  sessions: any[];
  color: string;
  tableIdentifier: string;
  onTogglePayment: (id: number) => void;
  onDelete: (id: number) => void;
  onAdd: (tableIdentifier: string) => void;
  isAdmin: boolean;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({
  title,
  sessions,
  color,
  tableIdentifier,
  onTogglePayment,
  onDelete,
  onAdd,
  isAdmin,
}) => {
  return (
    <div className="bg-zinc-900/30 rounded-[2rem] border border-white/5 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-black italic uppercase" style={{ color }}>
          {title}
        </h3>
        {isAdmin && (
          <button
            onClick={() => onAdd(tableIdentifier)}
            className="px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-all bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            + AJOUTER
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-zinc-500 font-bold uppercase tracking-widest border-b border-white/10">
              <th className="pb-3">CLIENT</th>
              <th className="pb-3">DURÉE</th>
              <th className="pb-3">PRIX</th>
              <th className="pb-3 text-center">PAYÉ</th>
              {isAdmin && <th className="pb-3 text-right">ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="py-6 text-center text-zinc-500">
                  Aucune session
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 font-bold text-white">{session.client_name || 'Anonyme'}</td>
                  <td className="py-3 text-zinc-400">
                    {session.formatted_duration}
                  </td>
                  <td className="py-3 font-bold" style={{ color }}>
                    {session.formatted_price}
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => onTogglePayment(session.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        session.is_paid
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                      }`}
                    >
                      {session.is_paid ? 'OUI' : 'NON'}
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onDelete(session.id)}
                        className="text-rose-500 hover:text-rose-400 text-xs font-bold uppercase tracking-wide"
                      >
                        SUPPRIMER
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT: ClientNameModal
// ============================================
interface ClientNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  clientNames: string[];
  themeColor: string;
}

const ClientNameModal: React.FC<ClientNameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  clientNames,
  themeColor,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredNames, setFilteredNames] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = clientNames.filter(name => 
        name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredNames(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setFilteredNames([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [inputValue, clientNames]);

  const handleConfirm = () => {
    const name = inputValue.trim() || 'Anonyme';
    onConfirm(name);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleSelectName = (name: string) => {
    setInputValue(name);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions && filteredNames.length > 0) {
        setSelectedIndex(prev => 
          prev < filteredNames.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions && filteredNames.length > 0) {
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredNames.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredNames[selectedIndex]) {
        handleSelectName(filteredNames[selectedIndex]);
      } else {
        handleConfirm();
      }
    } else if (e.key === 'Escape') {
      if (showSuggestions) {
        setShowSuggestions(false);
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl">
        <h2 className="text-2xl font-black italic text-white mb-2">
          🎱 Fin de Partie
        </h2>
        <p className="text-zinc-400 mb-6">Nom du perdant :</p>
        
        <div className="relative mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onFocus={() => inputValue.length > 0 && filteredNames.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Entrez le nom..."
            className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-white/30"
            autoFocus
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 rounded-2xl border border-white/10 max-h-60 overflow-y-auto z-10">
              {filteredNames.map((name, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectName(name)}
                  className={`w-full text-left px-6 py-3 text-white font-bold transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
                    index === selectedIndex 
                      ? 'bg-indigo-600' 
                      : 'hover:bg-zinc-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {clientNames.length > 0 && (
          <p className="text-zinc-500 text-xs mb-6">
            💡 Utilisez ↑↓ pour naviguer, Entrée pour valider
          </p>
        )}
        
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black text-sm uppercase text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-4 rounded-2xl font-black text-sm uppercase text-black hover:brightness-110 transition-all"
            style={{ backgroundColor: themeColor }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT: AddSessionModal
// ============================================
interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string | null) => void;
  tableIdentifier: string;
  themeColor: string;
}

const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tableIdentifier,
  themeColor,
}) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [focusedField, setFocusedField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      setStartTime(currentTime);
      setEndTime('');
      setFocusedField('start');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!startTime) {
      return;
    }
    
    onConfirm(startTime, endTime || null);
    setStartTime('');
    setEndTime('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      // Tab pour passer au champ suivant
      if (focusedField === 'start') {
        setFocusedField('end');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl">
        <h2 className="text-2xl font-black italic text-white mb-2">
          ➕ Ajouter une session
        </h2>
        <p className="text-zinc-400 mb-6">Table {tableIdentifier}</p>
        
        <div className="space-y-4 mb-6" onKeyDown={handleKeyDown}>
          <div>
            <label className="block text-zinc-400 text-sm mb-2">Heure de début *</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              onFocus={() => setFocusedField('start')}
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-white/30"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-zinc-400 text-sm mb-2">Heure de fin (optionnel)</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              onFocus={() => setFocusedField('end')}
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-white/30"
            />
            <p className="text-zinc-500 text-xs mt-2">
              💡 Laissez vide pour démarrer un compteur actif
            </p>
          </div>
        </div>
        
        <p className="text-zinc-500 text-xs mb-6">
          ⌨️ Tab pour changer de champ, Entrée pour valider
        </p>
        
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black text-sm uppercase text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!startTime}
            className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase transition-all ${
              startTime 
                ? 'text-black hover:brightness-110' 
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
            style={{ backgroundColor: startTime ? themeColor : undefined }}
          >
            {endTime ? 'Suivant' : 'Démarrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL: Dashboard
// ============================================
export const Dashboard: React.FC = () => {
  const {
    sessions,
    settings,
    startSession,
    stopSession,
    toggleSessionPayment,
    deleteSession,
    user,
  } = useAppContext();

  const isAdmin = user?.role === 'admin';

  // States pour les fenêtres modales
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [clientNames, setClientNames] = useState<string[]>([]);
  
  // State pour le workflow d'ajout
  const [pendingSession, setPendingSession] = useState<{
    tableIdentifier: string;
    startTime: string;
    endTime: string | null;
  } | null>(null);

  const activeSessionA = sessions.find(s => s.table_identifier === 'A' && s.is_active);
  const activeSessionB = sessions.find(s => s.table_identifier === 'B' && s.is_active);

  const historyA = useMemo(() =>
    sessions.filter(s => s.table_identifier === 'A' && !s.is_active),
    [sessions]
  );

  const historyB = useMemo(() =>
    sessions.filter(s => s.table_identifier === 'B' && !s.is_active),
    [sessions]
  );

  // Charger les noms des clients
  useEffect(() => {
    const loadClientNames = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/clients/');
        if (response.ok) {
          const clients = await response.json();
          setClientNames(clients.map((c: any) => c.name).filter((name: string) => name && name !== 'Anonyme'));
        }
      } catch (error) {
        console.error('Erreur récupération clients:', error);
      }
    };
    loadClientNames();
  }, []);

  const handleStart = useCallback(async (tableIdentifier: string) => {
    try {
      await startSession(tableIdentifier, 'Anonyme');
    } catch (error) {
      console.error('Erreur START:', error);
      Swal.fire({
        title: 'Erreur',
        text: 'Impossible de démarrer la partie',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
    }
  }, [startSession]);

  const handleStop = useCallback(async (tableIdentifier: string) => {
    const activeSession = sessions.find(s => s.table_identifier === tableIdentifier && s.is_active);
    if (!activeSession) return;
    
    setActiveTableId(tableIdentifier);
    setShowClientModal(true);
  }, [sessions]);

  const handleConfirmClientName = useCallback(async (name: string) => {
    if (!activeTableId) return;
    
    const activeSession = sessions.find(s => s.table_identifier === activeTableId && s.is_active);
    if (!activeSession) return;

    try {
      await stopSession(activeSession.id, name);
      setShowClientModal(false);
      setActiveTableId(null);
      Swal.fire({
        title: 'Enregistré !',
        text: 'La partie a été enregistrée',
        icon: 'success',
        background: '#09090b',
        color: '#fff',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Erreur STOP:', error);
      Swal.fire({
        title: 'Erreur',
        text: 'Impossible d\'arrêter la partie',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
    }
  }, [activeTableId, sessions, stopSession]);

  const handleCloseModal = () => {
    setShowClientModal(false);
    setActiveTableId(null);
  };

  const handleTogglePayment = useCallback(async (sessionId: number) => {
    try {
      await toggleSessionPayment(sessionId);
    } catch (error) {
      console.error('Erreur togglePayment:', error);
    }
  }, [toggleSessionPayment]);

  const handleDelete = useCallback(async (sessionId: number) => {
    const result = await Swal.fire({
      title: 'Supprimer',
      text: 'Voulez-vous vraiment supprimer cette session ?',
      icon: 'warning',
      background: '#09090b',
      color: '#fff',
      confirmButtonColor: '#6366f1',
      showCancelButton: true,
    });

    if (result.isConfirmed) {
      try {
        await deleteSession(sessionId);
        Swal.fire({
          title: 'Supprimé',
          text: 'La session a été supprimée',
          icon: 'success',
          background: '#09090b',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Erreur deleteSession:', error);
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de supprimer la session',
          icon: 'error',
          background: '#09090b',
          color: '#fff',
        });
      }
    }
  }, [deleteSession]);

  // Fonction pour annuler une session active (supprimer sans enregistrer)
  const handleCancel = useCallback(async (tableIdentifier: string) => {
    const activeSession = sessions.find(s => s.table_identifier === tableIdentifier && s.is_active);
    
    if (!activeSession) return;

    const result = await Swal.fire({
      title: 'Annuler la session',
      text: 'Voulez-vous vraiment annuler cette session ? Elle sera supprimée sans être enregistrée.',
      icon: 'warning',
      background: '#09090b',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'OUI, ANNULER',
      showCancelButton: true,
      cancelButtonText: 'Non',
    });

    if (result.isConfirmed) {
      try {
        await deleteSession(activeSession.id);
        Swal.fire({
          title: 'Annulée',
          text: 'La session a été annulée',
          icon: 'success',
          background: '#09090b',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Erreur cancel:', error);
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible d\'annuler la session',
          icon: 'error',
          background: '#09090b',
          color: '#fff',
        });
      }
    }
  }, [deleteSession, sessions]);

  // Fonction pour ouvrir la fenêtre d'ajout
  const handleAdd = useCallback((tableIdentifier: string) => {
    setActiveTableId(tableIdentifier);
    setShowAddModal(true);
  }, []);

  // Fonction pour confirmer l'ajout de session
  const handleConfirmAdd = useCallback(async (startTime: string, endTime: string | null) => {
    if (!activeTableId) return;

    // Si pas d'heure de fin, démarrer une session active
    if (!endTime) {
      try {
        // Créer une session active avec l'heure de début spécifiée
        const response = await fetch('http://localhost:8000/api/sessions/start_with_time/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_identifier: activeTableId,
            client_name: 'Anonyme',
            start_time: startTime,
          }),
        });

        if (!response.ok) throw new Error('Failed to start session');

        setShowAddModal(false);
        setActiveTableId(null);
        
        // Refresh
        window.location.reload();
      } catch (error) {
        console.error('Erreur add:', error);
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de démarrer la session',
          icon: 'error',
          background: '#09090b',
          color: '#fff',
        });
      }
    } else {
      // Si heure de fin fournie, stocker les infos et demander le nom
      setPendingSession({
        tableIdentifier: activeTableId,
        startTime,
        endTime,
      });
      setShowAddModal(false);
      setShowClientModal(true);
    }
  }, [activeTableId]);

  // Fonction pour confirmer le nom du client pour une session ajoutée manuellement
  const handleConfirmClientNameForAdd = useCallback(async (name: string) => {
    if (!pendingSession) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch('http://localhost:8000/api/sessions/add_manual/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_identifier: pendingSession.tableIdentifier,
          client_name: name,
          start_time: `${today}T${pendingSession.startTime}:00`,
          end_time: `${today}T${pendingSession.endTime}:00`,
        }),
      });

      if (!response.ok) throw new Error('Failed to add session');

      setShowClientModal(false);
      setPendingSession(null);
      setActiveTableId(null);
      
      Swal.fire({
        title: 'Ajouté !',
        text: 'La session a été ajoutée',
        icon: 'success',
        background: '#09090b',
        color: '#fff',
        timer: 1500,
        showConfirmButton: false,
      });
      
      // Refresh
      window.location.reload();
    } catch (error) {
      console.error('Erreur add:', error);
      Swal.fire({
        title: 'Erreur',
        text: 'Impossible d\'ajouter la session',
        icon: 'error',
        background: '#09090b',
        color: '#fff',
      });
    }
  }, [pendingSession]);

  // Modifier le handler du modal de nom pour gérer les deux cas
  const handleClientNameConfirm = useCallback((name: string) => {
    if (pendingSession) {
      handleConfirmClientNameForAdd(name);
    } else {
      handleConfirmClientName(name);
    }
  }, [pendingSession, handleConfirmClientNameForAdd, handleConfirmClientName]);

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    if (pendingSession) {
      setPendingSession(null);
    }
    setActiveTableId(null);
  };

  return (
    <div className="space-y-12">
      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TableCard
          tableIdentifier="A"
          tableName="TABLE A"
          color={settings.table_a_color}
          activeSession={activeSessionA}
          onStart={handleStart}
          onStop={handleStop}
          onCancel={handleCancel}
        />
        <TableCard
          tableIdentifier="B"
          tableName="TABLE B"
          color={settings.table_b_color}
          activeSession={activeSessionB}
          onStart={handleStart}
          onStop={handleStop}
          onCancel={handleCancel}
        />
      </div>

      {/* Historiques */}
      <div className="space-y-6">
        <SessionHistory
          title="HISTORIQUE TABLE A"
          sessions={historyA}
          color={settings.table_a_color}
          tableIdentifier="A"
          onTogglePayment={handleTogglePayment}
          onDelete={handleDelete}
          onAdd={handleAdd}
          isAdmin={isAdmin}
        />
        <SessionHistory
          title="HISTORIQUE TABLE B"
          sessions={historyB}
          color={settings.table_b_color}
          tableIdentifier="B"
          onTogglePayment={handleTogglePayment}
          onDelete={handleDelete}
          onAdd={handleAdd}
          isAdmin={isAdmin}
        />
      </div>

      {/* Modal pour le nom du client */}
      <ClientNameModal
        isOpen={showClientModal}
        onClose={handleCloseClientModal}
        onConfirm={handleClientNameConfirm}
        clientNames={clientNames}
        themeColor={settings.theme_color}
      />

      {/* Modal pour ajouter une session */}
      <AddSessionModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setActiveTableId(null);
        }}
        onConfirm={handleConfirmAdd}
        tableIdentifier={activeTableId || ''}
        themeColor={settings.theme_color}
      />
    </div>
  );
};
