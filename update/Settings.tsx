import React from 'react';
import { AppSettings, InventoryItem, PS4Game } from '../../../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings = {} as AppSettings, onUpdateSettings }) => {
  const [activeSection, setActiveSection] = React.useState<'general' | 'billiard' | 'ps4'>('general');

  const updateInventory = (inventory: InventoryItem[]) => {
    onUpdateSettings({ ...settings, inventory });
  };

  const updatePs4Games = (games: PS4Game[]) => {
    onUpdateSettings({ ...settings, ps4Games: games });
  };

  return (
    <div className="space-y-8">
      {/* Section Tabs */}
      <div className="flex gap-4 mb-8">
        {(['general', 'billiard', 'ps4'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-wider transition-all ${
              activeSection === section
                ? 'text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            style={{
              backgroundColor: activeSection === section ? settings.themeColor : undefined,
            }}
          >
            {section === 'general' ? 'Général' : section === 'billiard' ? 'Billard' : 'PS4'}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeSection === 'general' && (
        <div className="bg-zinc-900/50 rounded-[2rem] p-8 border border-white/5 space-y-6">
          <h3 className="text-xl font-black italic text-white mb-6">PARAMÈTRES GÉNÉRAUX</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Nom du Club
              </label>
              <input
                type="text"
                value={settings.clubName}
                onChange={(e) => onUpdateSettings({ ...settings, clubName: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Couleur du Thème
              </label>
              <input
                type="color"
                value={settings.themeColor}
                onChange={(e) => onUpdateSettings({ ...settings, themeColor: e.target.value })}
                className="w-full h-14 bg-black/50 border border-white/10 rounded-2xl px-4 outline-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Couleur Table A
              </label>
              <input
                type="color"
                value={settings.tableAColor}
                onChange={(e) => onUpdateSettings({ ...settings, tableAColor: e.target.value })}
                className="w-full h-14 bg-black/50 border border-white/10 rounded-2xl px-4 outline-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Couleur Table B
              </label>
              <input
                type="color"
                value={settings.tableBColor}
                onChange={(e) => onUpdateSettings({ ...settings, tableBColor: e.target.value })}
                className="w-full h-14 bg-black/50 border border-white/10 rounded-2xl px-4 outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Billiard Settings */}
      {activeSection === 'billiard' && (
        <div className="bg-zinc-900/50 rounded-[2rem] p-8 border border-white/5 space-y-6">
          <h3 className="text-xl font-black italic text-white mb-6">PARAMÈTRES BILLARD</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Tarif Base (millimes/min)
              </label>
              <input
                type="number"
                value={settings.rateBase}
                onChange={(e) => onUpdateSettings({ ...settings, rateBase: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Tarif Réduit (millimes/min)
              </label>
              <input
                type="number"
                value={settings.rateReduced}
                onChange={(e) => onUpdateSettings({ ...settings, rateReduced: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Seuil Minutes
              </label>
              <input
                type="number"
                value={settings.thresholdMins}
                onChange={(e) => onUpdateSettings({ ...settings, thresholdMins: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Plancher Min (millimes)
              </label>
              <input
                type="number"
                value={settings.floorMin}
                onChange={(e) => onUpdateSettings({ ...settings, floorMin: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Plancher Mid (millimes)
              </label>
              <input
                type="number"
                value={settings.floorMid}
                onChange={(e) => onUpdateSettings({ ...settings, floorMid: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* PS4 Settings */}
      {activeSection === 'ps4' && (
        <div className="bg-zinc-900/50 rounded-[2rem] p-8 border border-white/5 space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black italic text-white">JEUX PS4</h3>
            <button
              onClick={() => {
                const newGame: PS4Game = {
                  id: `game_${Date.now()}`,
                  name: 'Nouveau Jeu',
                  icon: '🎮',
                  playerOptions: [1, 2, 3, 4],
                  timeOptions: [],
                };
                updatePs4Games([...settings.ps4Games, newGame]);
              }}
              className="px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider text-black hover:brightness-110"
              style={{ backgroundColor: settings.themeColor }}
            >
              + Ajouter
            </button>
          </div>
          
          <div className="space-y-4">
            {settings.ps4Games.map((game) => (
              <div key={game.id} className="bg-black/30 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="text"
                    value={game.name}
                    onChange={(e) => {
                      updatePs4Games(
                        settings.ps4Games.map((g) => (g.id === game.id ? { ...g, name: e.target.value } : g))
                      );
                    }}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none"
                  />
                  <input
                    type="text"
                    value={game.icon}
                    onChange={(e) => {
                      updatePs4Games(
                        settings.ps4Games.map((g) => (g.id === game.id ? { ...g, icon: e.target.value } : g))
                      );
                    }}
                    className="w-16 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-center text-xl outline-none"
                  />
                  <button
                    onClick={() => {
                      if (window.confirm('Supprimer ce jeu ?')) {
                        updatePs4Games(settings.ps4Games.filter((g) => g.id !== game.id));
                      }
                    }}
                    className="ml-auto px-4 py-2 rounded-xl font-bold text-sm uppercase bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  >
                    Supprimer
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {game.timeOptions.map((opt) => (
                    <div key={opt.id} className="bg-zinc-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                          {opt.players} joueur(s)
                        </span>
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                          {opt.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={opt.price}
                          onChange={(e) => {
                            updatePs4Games(
                              settings.ps4Games.map((g) =>
                                g.id === game.id
                                  ? {
                                      ...g,
                                      timeOptions: g.timeOptions.map((o) =>
                                        o.id === opt.id ? { ...o, price: Number(e.target.value) } : o
                                      ),
                                    }
                                  : g
                              )
                            );
                          }}
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none"
                        />
                        <span className="text-zinc-500 font-bold self-center">millimes</span>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const newOpt = {
                        id: `opt_${Date.now()}`,
                        label: 'Nouvel',
                        minutes: 15,
                        price: 2000,
                        players: 1,
                      };
                      updatePs4Games(
                        settings.ps4Games.map((g) =>
                          g.id === game.id ? { ...g, timeOptions: [...g.timeOptions, newOpt] } : g
                        )
                      );
                    }}
                    className="bg-zinc-700/50 rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-zinc-700/70 transition-colors"
                  >
                    <span className="text-zinc-400 font-bold">+ Option</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
