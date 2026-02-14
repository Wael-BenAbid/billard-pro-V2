import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const PS4Management: React.FC = () => {
  const { 
    ps4Games, 
    settings, 
    createPS4Session,
  } = useAppContext();
  
  const [ps4Step, setPs4Step] = useState<'game' | 'players' | 'time'>('game');
  const [selectedPs4Game, setSelectedPs4Game] = useState<typeof ps4Games[0] | null>(null);
  const [selectedPs4Players, setSelectedPs4Players] = useState<number | null>(null);

  const formatPrice = (mil: number) => {
    if (mil < 10000) return `${Math.round(mil)} mil`;
    const dt = mil / 1000;
    return `${dt.toFixed(3)} DT`;
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

  // Ensure ps4Games is an array before mapping
  const games = Array.isArray(ps4Games) ? ps4Games : [];

  return (
    <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black italic text-white">PS4 - Sélectionnez un Jeu</h2>
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
    </section>
  );
};
