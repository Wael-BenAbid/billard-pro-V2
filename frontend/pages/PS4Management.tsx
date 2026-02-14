import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Swal from 'sweetalert2';

export const PS4Management: React.FC = () => {
  const { 
    ps4Games, 
    ps4Sessions,
    settings, 
    createPS4Session,
    togglePS4Payment,
    fetchPS4Sessions,
  } = useAppContext();
  
  const [ps4Step, setPs4Step] = useState<'game' | 'players' | 'time'>('game');
  const [selectedPs4Game, setSelectedPs4Game] = useState<typeof ps4Games[0] | null>(null);
  const [selectedPs4Players, setSelectedPs4Players] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const formatPrice = (mil: number) => {
    if (mil < 10000) return `${Math.round(mil)} mil`;
    const dt = mil / 1000;
    return `${dt.toFixed(3)} DT`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddPS4Session = async (timeOpt: typeof ps4Games[0]['time_options'][0]) => {
    if (!selectedPs4Game || selectedPs4Players === null) return;
    
    try {
      await createPS4Session(selectedPs4Game.id, selectedPs4Players, timeOpt.id);
      // Reset selection
      setPs4Step('game');
      setSelectedPs4Game(null);
      setSelectedPs4Players(null);
    } catch (error) {
      console.error('Error creating PS4 session:', error);
    }
  };

  const handleTogglePayment = async (sessionId: number, currentStatus: boolean) => {
    try {
      await togglePS4Payment(sessionId);
      await fetchPS4Sessions();
      Swal.fire({
        icon: 'success',
        title: currentStatus ? 'Non payé' : 'Payé',
        text: `Le statut de paiement a été mis à jour`,
        timer: 1500,
        showConfirmButton: false,
        background: '#18181b',
        color: '#fff'
      });
    } catch (error) {
      console.error('Error toggling payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de mettre à jour le statut de paiement',
        background: '#18181b',
        color: '#fff'
      });
    }
  };

  // Ensure ps4Games is an array before mapping
  const games = Array.isArray(ps4Games) ? ps4Games : [];
  
  // Filter sessions to show today's sessions first, then sort by date descending
  const sortedSessions = Array.isArray(ps4Sessions) 
    ? [...ps4Sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // Calculate totals
  const totalRevenue = sortedSessions.reduce((sum, s) => sum + s.price, 0);
  const paidRevenue = sortedSessions.filter(s => s.is_paid).reduce((sum, s) => sum + s.price, 0);
  const unpaidRevenue = totalRevenue - paidRevenue;

  return (
    <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black italic text-white">PS4 - Sélectionnez un Jeu</h2>
        <button
          onClick={() => setShowHistory(true)}
          className="px-6 py-3 bg-blue-500/20 border border-blue-500/30 rounded-2xl text-blue-400 font-bold hover:bg-blue-500/30 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Historique
        </button>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg">Aucun jeu PS4 disponible</p>
          <p className="text-zinc-600 text-sm mt-2">Ajoutez des jeux via le panneau d'administration Django</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {games.map(game => (
            <div
              key={game.id}
              className="bg-black/40 p-8 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
            >
              <div className="text-6xl mb-6">{game.icon}</div>
              <h3 className="text-2xl font-black italic text-white mb-4">{game.name}</h3>
              <div className="flex gap-2 mb-6">
                {game.player_options.map(p => (
                  <span key={p} className="px-3 py-1 bg-zinc-800 rounded-lg text-[9px] font-black text-zinc-400">
                    {p}P
                  </span>
                ))}
              </div>
              <button
                onClick={() => {
                  setSelectedPs4Game(game);
                  setPs4Step('players');
                }}
                className="w-full py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest text-black hover:brightness-110 transition-all"
                style={{ backgroundColor: settings.theme_color }}
              >
                Jouer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Players Selection Modal */}
      {ps4Step === 'players' && selectedPs4Game && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black italic text-white">
                {selectedPs4Game.icon} {selectedPs4Game.name}
              </h2>
              <button onClick={() => setPs4Step('game')} className="text-zinc-500 hover:text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-6">
              Nombre de Joueurs
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {selectedPs4Game.player_options.map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedPs4Players(p);
                    setPs4Step('time');
                  }}
                  className="py-8 bg-zinc-800/50 rounded-[2rem] border border-white/5 hover:bg-white hover:text-black transition-all active:scale-95 group"
                >
                  <span className="text-4xl font-black italic block mb-2">{p}</span>
                  <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-black">Joueurs</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Selection Modal */}
      {ps4Step === 'time' && selectedPs4Game && selectedPs4Players !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black italic text-white">
                {selectedPs4Game.icon} {selectedPs4Game.name} - {selectedPs4Players}P
              </h2>
              <button onClick={() => setPs4Step('players')} className="text-zinc-500 hover:text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setPs4Step('players')}
                className="px-6 py-2 bg-zinc-800 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white"
              >
                Retour
              </button>
            </div>
            <h2 className="text-4xl font-black italic text-white text-center mt-6 mb-8">Durée de la Partie</h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Filter time options by selected number of players */}
              {selectedPs4Game.time_options
                .filter(opt => opt.players === selectedPs4Players)
                .map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleAddPS4Session(opt)}
                    style={{ backgroundColor: settings.theme_color }}
                    className="p-8 rounded-[2.5rem] border border-white/5 hover:bg-white hover:text-black transition-all group active:scale-95"
                  >
                    <p className="text-3xl font-black mb-2">{opt.minutes} min</p>
                    <p className="text-lg font-bold opacity-60">{formatPrice(opt.price)}</p>
                  </button>
                ))}
            </div>
            {/* Show message if no options available for this player count */}
            {selectedPs4Game.time_options.filter(opt => opt.players === selectedPs4Players).length === 0 && (
              <p className="text-center text-zinc-500 mt-8">
                Aucune option disponible pour {selectedPs4Players} joueurs
              </p>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-900 rounded-[3rem] border border-white/10 p-8 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black italic text-white flex items-center gap-3">
                <span className="text-4xl"> PlayStation 4</span>
                Historique des Sessions
              </h2>
              <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-center">
                <p className="text-xs text-blue-400 font-bold uppercase">Total Sessions</p>
                <p className="text-2xl font-black text-blue-400">{sortedSessions.length}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                <p className="text-xs text-emerald-400 font-bold uppercase">Revenus Payés</p>
                <p className="text-2xl font-black text-emerald-400">{formatPrice(paidRevenue)}</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center">
                <p className="text-xs text-rose-400 font-bold uppercase">Non Payés</p>
                <p className="text-2xl font-black text-rose-400">{formatPrice(unpaidRevenue)}</p>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="flex-1 overflow-y-auto">
              {sortedSessions.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-zinc-500 text-lg">Aucune session PS4 enregistrée</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="text-zinc-500 text-xs uppercase border-b border-white/5">
                      <th className="text-left py-3 px-2">Jeu</th>
                      <th className="text-center py-3 px-2">Joueurs</th>
                      <th className="text-center py-3 px-2">Durée</th>
                      <th className="text-right py-3 px-2">Prix</th>
                      <th className="text-center py-3 px-2">Date</th>
                      <th className="text-center py-3 px-2">Payé</th>
                      <th className="text-center py-3 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSessions.map(session => (
                      <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                        <td className="py-3 px-2 font-bold text-white">{session.game_name}</td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">
                            {session.players}P
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center text-zinc-400">{session.duration_minutes} min</td>
                        <td className={`py-3 px-2 text-right font-bold ${session.is_paid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {session.formatted_price}
                        </td>
                        <td className="py-3 px-2 text-center text-zinc-500 text-sm">{formatDate(session.date)}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            session.is_paid 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {session.is_paid ? 'Oui' : 'Non'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleTogglePayment(session.id, session.is_paid)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              session.is_paid
                                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                          >
                            {session.is_paid ? 'Marquer Non Payé' : 'Marquer Payé'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer with totals */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <div className="text-zinc-500">
                  <span className="font-bold">{sortedSessions.length}</span> sessions au total
                </div>
                <div className="flex gap-6">
                  <div className="text-zinc-400">
                    Total: <span className="font-bold text-white">{formatPrice(totalRevenue)}</span>
                  </div>
                  <div className="text-emerald-400">
                    Payé: <span className="font-bold">{formatPrice(paidRevenue)}</span>
                  </div>
                  <div className="text-rose-400">
                    Non payé: <span className="font-bold">{formatPrice(unpaidRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
