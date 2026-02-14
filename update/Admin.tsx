import React, { useState } from 'react';
import { AppSettings, PS4Game, PS4TimeOption, InventoryItem } from '../../../types';

interface AdminProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onAddGame: (game: PS4Game) => void;
  onUpdateGame: (game: PS4Game) => void;
  onDeleteGame: (gameId: string) => void;
  onRemoveItem: (itemId: string) => void;
}

export const Admin: React.FC<AdminProps> = ({
  settings = {} as AppSettings,
  onUpdateSettings,
  onAddGame,
  onUpdateGame,
  onDeleteGame,
  onRemoveItem,
}) => {
  const [activeTab, setActiveTab] = React.useState<'general' | 'bar' | 'ps4'>('general');

  // Game editing state
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [editingGame, setEditingGame] = useState<PS4Game | null>(null);

  // New item state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(0);
  const [newItemIcon, setNewItemIcon] = useState('📦');

  // Editing item state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const formatPrice = (mil: number) => {
    if (mil < 10000) return `${Math.round(mil)} mil`;
    const dt = mil / 1000;
    return `${dt.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} DT`;
  };

  const handleUpdateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const openEditGame = (game: PS4Game | null) => {
    if (game) {
      setEditingGame(game);
    } else {
      setEditingGame({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        icon: '🎮',
        playerOptions: [1, 2, 3, 4],
        timeOptions: [],
      });
    }
    setIsEditingGame(true);
  };

  const saveEditedGame = () => {
    if (!editingGame || !editingGame.name) return;
    const exists = settings.ps4Games.find(g => g.id === editingGame.id);
    if (exists) {
      onUpdateGame(editingGame);
    } else {
      onAddGame(editingGame);
    }
    setIsEditingGame(false);
    setEditingGame(null);
  };

  const deleteGame = (id: string) => {
    if (window.confirm('Supprimer ce jeu ?')) {
      onDeleteGame(id);
    }
  };

  const handleAddNewItem = () => {
    if (!newItemName || newItemPrice < 0) return;
    const item: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      price: newItemPrice,
      icon: newItemIcon,
    };
    onUpdateSettings({ ...settings, inventory: [...settings.inventory, item] });
    setNewItemName('');
    setNewItemPrice(0);
    setNewItemIcon('📦');
  };

  const handleUpdateItem = (itemId: string, field: 'name' | 'price' | 'icon', value: string | number) => {
    const newInventory = settings.inventory.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onUpdateSettings({ ...settings, inventory: newInventory });
  };

  const startEditItem = (item: InventoryItem) => {
    setEditingItem(item);
  };

  const saveEditItem = () => {
    if (editingItem) {
      handleUpdateItem(editingItem.id, 'name', editingItem.name);
      handleUpdateItem(editingItem.id, 'price', editingItem.price);
      handleUpdateItem(editingItem.id, 'icon', editingItem.icon);
      setEditingItem(null);
    }
  };

  const cancelEditItem = () => {
    setEditingItem(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex bg-zinc-900/30 p-2 rounded-2xl border border-white/5 gap-2 mb-8">
        {[
          { id: 'general', label: 'Général' },
          { id: 'bar', label: 'Bar' },
          { id: 'ps4', label: 'PS4' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
                value={settings.clubName}
                onChange={e => handleUpdateSetting('clubName', e.target.value)}
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
                  value={settings.themeColor}
                  onChange={e => handleUpdateSetting('themeColor', e.target.value)}
                  className="w-14 h-14 rounded-2xl border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.themeColor}
                  onChange={e => handleUpdateSetting('themeColor', e.target.value)}
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
                  value={settings.tableAColor}
                  onChange={e => handleUpdateSetting('tableAColor', e.target.value)}
                  className="w-14 h-14 rounded-2xl border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.tableAColor}
                  onChange={e => handleUpdateSetting('tableAColor', e.target.value)}
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
                  value={settings.tableBColor}
                  onChange={e => handleUpdateSetting('tableBColor', e.target.value)}
                  className="w-14 h-14 rounded-2xl border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.tableBColor}
                  onChange={e => handleUpdateSetting('tableBColor', e.target.value)}
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
                value={settings.rateBase}
                onChange={e => handleUpdateSetting('rateBase', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Tarif Réduit (mil/min)
              </label>
              <input
                type="number"
                value={settings.rateReduced}
                onChange={e => handleUpdateSetting('rateReduced', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Seuil (minutes)
              </label>
              <input
                type="number"
                value={settings.thresholdMins}
                onChange={e => handleUpdateSetting('thresholdMins', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Plancher Minimum (mil)
              </label>
              <input
                type="number"
                value={settings.floorMin}
                onChange={e => handleUpdateSetting('floorMin', parseInt(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
              />
            </div>
          </div>
        </section>
      )}

      {/* Bar Settings */}
      {activeTab === 'bar' && (
        <div className="space-y-8">
          {/* Add New Item */}
          <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl">
            <h2 className="text-4xl font-black italic text-white mb-8">Ajouter un Article</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Nom</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold"
                />
              </div>
              <div className="w-48">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Prix (mil)</label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold"
                />
              </div>
              <div className="w-32">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Icône</label>
                <input
                  type="text"
                  value={newItemIcon}
                  onChange={e => setNewItemIcon(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-center text-2xl"
                />
              </div>
              <button
                onClick={handleAddNewItem}
                style={{ backgroundColor: settings.themeColor }}
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase text-black hover:brightness-110"
              >
                Ajouter
              </button>
            </div>
          </section>

          {/* Inventory List */}
          <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl space-y-8">
            <h2 className="text-4xl font-black italic text-white">Gestion du Bar</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {settings.inventory.map(item => (
                <div key={item.id} className="bg-black/40 p-6 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <input
                      type="text"
                      value={item.icon}
                      onChange={e => handleUpdateItem(item.id, 'icon', e.target.value)}
                      className="w-12 h-12 bg-black/50 border border-white/10 rounded-xl text-center text-2xl"
                    />
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white font-bold mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.price}
                      onChange={e => handleUpdateItem(item.id, 'price', parseInt(e.target.value))}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white font-bold"
                    />
                    <span className="text-zinc-500 text-sm">mil</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* PS4 Settings */}
      {activeTab === 'ps4' && (
        <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-black italic text-white">Configuration PS4</h2>
            <button
              onClick={() => openEditGame(null)}
              style={{ backgroundColor: settings.themeColor }}
              className="px-6 py-3 rounded-xl font-black text-sm uppercase text-black hover:brightness-110"
            >
              + Nouveau Jeu
            </button>
          </div>

          {settings.ps4Games.map(game => (
            <div key={game.id} className="bg-black/40 p-8 rounded-3xl border border-white/5">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{game.icon}</span>
                  <div>
                    <h3 className="text-2xl font-black italic text-white">{game.name}</h3>
                    <div className="flex gap-2 mt-2">
                      {game.playerOptions.map(p => (
                        <span
                          key={p}
                          className="px-3 py-1 bg-zinc-800 rounded-lg text-[9px] font-black text-zinc-400"
                        >
                          {p}P
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditGame(game)}
                    className="px-4 py-2 bg-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:text-white"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => deleteGame(game.id)}
                    className="px-4 py-2 bg-red-500/10 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/20"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-4">
                {game.timeOptions.map(opt => (
                  <div
                    key={opt.id}
                    className="bg-zinc-900/50 p-3 rounded-xl text-center"
                  >
                    <p className="text-[10px] font-black text-zinc-500">{opt.players}P</p>
                    <p className="text-sm font-bold text-white">{opt.label}</p>
                    <p className="text-[10px] font-black" style={{ color: settings.themeColor }}>
                      {formatPrice(opt.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Edit Game Modal */}
      {isEditingGame && editingGame && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-zinc-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-black italic text-white">Configuration du Jeu</h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  Nom du Jeu
                </label>
                <input
                  type="text"
                  value={editingGame.name}
                  onChange={e => setEditingGame({ ...editingGame, name: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    Icône
                  </label>
                  <input
                    type="text"
                    value={editingGame.icon}
                    onChange={e => setEditingGame({ ...editingGame, icon: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mt-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    Options Joueurs
                  </label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          const opts = editingGame.playerOptions.includes(p)
                            ? editingGame.playerOptions.filter(o => o !== p)
                            : [...editingGame.playerOptions, p].sort();
                          setEditingGame({ ...editingGame, playerOptions: opts });
                        }}
                        className={`flex-1 py-3 rounded-xl font-black text-sm ${
                          editingGame.playerOptions.includes(p)
                            ? 'bg-zinc-700 text-white'
                            : 'bg-black/30 text-zinc-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black italic text-white mb-4">Options de Temps et Prix</h3>
              {editingGame.playerOptions.map(players => (
                <div key={players} className="mb-6 bg-black/30 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-4">
                    {players} Joueur(s)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[10, 15, 20, 30, 45, 60].map(mins => {
                      const existing = editingGame.timeOptions.find(
                        o => o.minutes === mins && o.players === players
                      );
                      return (
                        <div key={mins} className="bg-black/50 rounded-xl p-3">
                          <label className="text-[8px] font-black text-zinc-600 uppercase">
                            {mins} min
                          </label>
                          <input
                            type="number"
                            placeholder="Prix"
                            value={existing?.price || ''}
                            onChange={e => {
                              const price = parseInt(e.target.value) || 0;
                              const newOpts = existing
                                ? editingGame.timeOptions.map(o =>
                                    o.id === existing.id ? { ...o, price } : o
                                  )
                                : [
                                    ...editingGame.timeOptions,
                                    {
                                      id: `${editingGame.id}p${players}m${mins}`,
                                      label: `${mins} min`,
                                      minutes: mins,
                                      price,
                                      players,
                                    },
                                  ];
                              setEditingGame({ ...editingGame, timeOptions: newOpts });
                            }}
                            className="w-full bg-transparent border-b border-white/10 text-white font-bold py-2 mt-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={saveEditedGame}
                style={{ backgroundColor: settings.themeColor }}
                className="flex-1 py-4 rounded-2xl font-black text-sm uppercase text-black hover:brightness-110"
              >
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setIsEditingGame(false);
                  setEditingGame(null);
                }}
                className="px-8 py-4 bg-zinc-800 rounded-2xl font-black text-sm uppercase text-zinc-400 hover:bg-zinc-700"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
