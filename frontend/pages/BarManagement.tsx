import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  icon: string;
}

interface BarItem {
  id: number;
  client_name: string;
  items: { item_id: number; name: string; price: number; quantity: number }[];
  total_price: number;
  date: string;
  is_paid: boolean;
}

// Dynamic API URL - works for both development and Docker
const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.port === '5173' 
    ? 'http://localhost:8000/api' 
    : '/api');

export const BarManagement: React.FC = () => {
  const { settings, inventory, createBarOrder, toggleBarPayment } = useAppContext();
  const [barItems, setBarItems] = useState<BarItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<{ name: string; items: { item_id: number; name: string; price: number; quantity: number }[] } | null>(null);
  const [showClientPrompt, setShowClientPrompt] = useState(false);
  const [pendingItem, setPendingItem] = useState<InventoryItem | null>(null);
  const [clientInput, setClientInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarItems();
  }, []);

  const loadBarItems = async () => {
    try {
      const res = await fetch(`${API_URL}/bar-orders/`);
      if (res.ok) {
        const data = await res.json();
        setBarItems(data);
      }
    } catch (error) {
      console.error('Error loading bar items:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (mil: number) => {
    if (mil < 10000) return `${Math.round(mil)} mil`;
    const dt = mil / 1000;
    return `${dt.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} DT`;
  };

  // Default inventory items if none loaded
  const defaultInventory: InventoryItem[] = [
    { id: 1, name: 'Café', price: 1000, icon: '☕' },
    { id: 2, name: 'Thé', price: 800, icon: '🍵' },
    { id: 3, name: 'Soda', price: 2000, icon: '🥤' },
    { id: 4, name: 'Eau', price: 1000, icon: '💧' },
    { id: 5, name: 'Chicha', price: 5000, icon: '💨' },
  ];

  const getInventory = (): InventoryItem[] => {
    if (inventory && inventory.length > 0) {
      return inventory.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        icon: item.icon
      }));
    }
    return defaultInventory;
  };

  const handleItemClick = (item: InventoryItem) => {
    setPendingItem(item);
    setClientInput('');
    setShowClientPrompt(true);
  };

  const handleConfirmClient = () => {
    if (!pendingItem) return;
    const name = clientInput.trim() || 'Unknown';
    
    setCurrentOrder(prev => {
      if (prev && prev.name === name) {
        const existing = prev.items.find(i => i.item_id === pendingItem.id);
        let newItems;
        if (existing) {
          newItems = prev.items.map(i =>
            i.item_id === pendingItem.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          newItems = [
            ...prev.items,
            {
              item_id: pendingItem.id,
              name: pendingItem.name,
              price: pendingItem.price,
              quantity: 1,
            },
          ];
        }
        return { ...prev, items: newItems };
      } else {
        return {
          name,
          items: [
            {
              item_id: pendingItem.id,
              name: pendingItem.name,
              price: pendingItem.price,
              quantity: 1,
            },
          ],
        };
      }
    });
    
    setShowClientPrompt(false);
    setPendingItem(null);
    setClientInput('');
  };

  const handleFinalizeOrder = async () => {
    if (!currentOrder || currentOrder.items.length === 0) return;
    
    try {
      await createBarOrder(currentOrder.name, currentOrder.items);
      setCurrentOrder(null);
      loadBarItems(); // Refresh the list
    } catch (error) {
      console.error('Error creating bar order:', error);
    }
  };

  const handleTogglePayment = async (orderId: number) => {
    try {
      await toggleBarPayment(orderId);
      loadBarItems(); // Refresh the list
    } catch (error) {
      console.error('Error toggling payment:', error);
    }
  };

  const inventoryItems = getInventory();

  return (
    <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black italic text-white">Bar - Commandes</h2>
      </div>

      {/* Inventory Items Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
        {inventoryItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="bg-black/40 p-6 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all text-center"
          >
            <div className="text-4xl mb-2">{item.icon}</div>
            <div className="text-white font-bold">{item.name}</div>
            <div className="text-zinc-500 text-sm">{formatPrice(item.price)}</div>
          </button>
        ))}
      </div>

      {/* Current Order */}
      {currentOrder && currentOrder.items.length > 0 && (
        <div className="bg-black/40 rounded-[2rem] p-6 mb-10">
          <h3 className="text-xl font-bold text-white mb-4">
            Commande: {currentOrder.name}
          </h3>
          <div className="space-y-2 mb-4">
            {currentOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-zinc-400">
                <span>{item.name} x{item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center border-t border-white/10 pt-4">
            <span className="text-white font-bold">Total:</span>
            <span className="text-white font-bold">
              {formatPrice(currentOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0))}
            </span>
          </div>
          <button
            onClick={handleFinalizeOrder}
            className="w-full mt-4 py-4 rounded-[1.5rem] font-black text-sm uppercase text-black hover:brightness-110 transition-all"
            style={{ backgroundColor: settings.theme_color }}
          >
            Valider la commande
          </button>
        </div>
      )}

      {/* Bar Orders History */}
      {loading ? (
        <p className="text-zinc-500 text-center">Chargement...</p>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Historique des commandes</h3>
          {barItems.length === 0 ? (
            <p className="text-zinc-500 text-center">Aucune commande</p>
          ) : (
            barItems.map(item => (
              <div key={item.id} className="bg-black/40 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold">{item.client_name}</div>
                  <div className="text-zinc-500 text-sm">
                    {item.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-bold">{formatPrice(item.total_price)}</span>
                  <button
                    onClick={() => handleTogglePayment(item.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      item.is_paid 
                        ? 'bg-green-500/20 text-green-500' 
                        : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {item.is_paid ? 'Payé' : 'Non payé'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Client Prompt Modal */}
      {showClientPrompt && pendingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl">
            <h2 className="text-2xl font-black italic text-white mb-6">
              {pendingItem.icon} {pendingItem.name}
            </h2>
            <input
              type="text"
              value={clientInput}
              onChange={e => setClientInput(e.target.value)}
              placeholder="Nom du client"
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold mb-6"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowClientPrompt(false)}
                className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black text-sm uppercase text-zinc-400"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmClient}
                className="flex-1 py-4 rounded-2xl font-black text-sm uppercase text-black"
                style={{ backgroundColor: settings.theme_color }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
