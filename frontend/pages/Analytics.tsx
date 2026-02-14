import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';

export const Analytics: React.FC = () => {
  const { sessions, ps4Sessions, settings, stats } = useAppContext();
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const formatPrice = (mil: number) => {
    if (!mil || mil < 10000) return `${Math.round(mil || 0)} mil`;
    const dt = mil / 1000;
    return `${dt.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} DT`;
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const date = s.start_time.split('T')[0];
      return date >= dateRange.start && date <= dateRange.end && !s.is_active;
    });
  }, [sessions, dateRange]);

  const filteredPs4Sessions = useMemo(() => {
    return ps4Sessions.filter(s => {
      return s.date >= dateRange.start && s.date <= dateRange.end;
    });
  }, [ps4Sessions, dateRange]);

  const totalBillard = filteredSessions.reduce((acc, s) => acc + (s.price || 0), 0);
  const totalPs4 = filteredPs4Sessions.reduce((acc, s) => acc + (s.price || 0), 0);
  const totalSessions = filteredSessions.length + filteredPs4Sessions.length;

  const chartData = useMemo(() => {
    return Array(7)
      .fill(0)
      .map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase();
        return {
          name: dayName,
          billard: filteredSessions
            .filter(s => s.start_time.split('T')[0] === dayStr)
            .reduce((acc, s) => acc + (s.price || 0), 0),
          ps4: filteredPs4Sessions
            .filter(s => s.date === dayStr)
            .reduce((acc, s) => acc + (s.price || 0), 0),
        };
      });
  }, [filteredSessions, filteredPs4Sessions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-black italic text-white">Statistiques</h2>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate('/agenda')}
              className="px-6 py-3 bg-yellow-500/20 text-yellow-500 rounded-xl font-black text-sm uppercase hover:bg-yellow-500/30 transition-all flex items-center gap-2"
            >
              📅 Agenda
            </button>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Revenus Billard</p>
            <p className="text-3xl font-black text-white">{formatPrice(totalBillard)}</p>
          </div>
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Revenus PS4</p>
            <p className="text-3xl font-black text-white">{formatPrice(totalPs4)}</p>
          </div>
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Total Sessions</p>
            <p className="text-3xl font-black text-white">{totalSessions}</p>
          </div>
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Revenus Totaux</p>
            <p className="text-3xl font-black" style={{ color: settings.theme_color }}>
              {formatPrice(totalBillard + totalPs4)}
            </p>
          </div>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBillard" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={settings.table_a_color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={settings.table_a_color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPs4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={settings.theme_color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={settings.theme_color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                stroke="#666"
                tick={{ fill: '#666', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#666"
                tick={{ fill: '#666', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1rem',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="billard"
                stroke={settings.table_a_color}
                fillOpacity={1}
                fill="url(#colorBillard)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ps4"
                stroke={settings.theme_color}
                fillOpacity={1}
                fill="url(#colorPs4)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl overflow-hidden">
        <h2 className="text-4xl font-black italic text-white mb-8">Historique Complet</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-zinc-600 uppercase border-b border-white/5 bg-zinc-900/50">
                <th className="p-6">Date</th>
                <th className="p-6">Table</th>
                <th className="p-6">Client</th>
                <th className="p-6">Durée</th>
                <th className="p-6">Total</th>
                <th className="p-6">Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-500">
                    Aucune session trouvée
                  </td>
                </tr>
              ) : (
                filteredSessions.map(s => (
                  <tr key={s.id} className="hover:bg-white/5 transition-all">
                    <td className="p-6 text-zinc-500 font-mono text-xs">
                      {s.start_time.split('T')[0]}
                    </td>
                    <td className="p-6">
                      <span
                        style={{ color: s.table_identifier === 'A' ? settings.table_a_color : settings.table_b_color }}
                        className="font-black text-lg italic"
                      >
                        T-{s.table_identifier}
                      </span>
                    </td>
                    <td className="p-6 font-bold text-white">
                      {s.client_name || 'Client Anonyme'}
                    </td>
                    <td className="p-6 font-bold text-white">{s.formatted_duration}</td>
                    <td className="p-6 font-black text-xl text-white">{s.formatted_price}</td>
                    <td className="p-6">
                      <span
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${
                          s.is_paid
                            ? 'bg-emerald-500 border-emerald-400 text-black'
                            : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}
                      >
                        {s.is_paid ? 'Payé' : 'Non payé'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stats Summary */}
      {stats && (
        <section className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10 shadow-2xl">
          <h2 className="text-4xl font-black italic text-white mb-8">Aujourd'hui</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Sessions Billard</p>
              <p className="text-3xl font-black text-white">{stats.today.billiard_sessions}</p>
              <p className="text-sm text-zinc-500">{formatPrice(stats.today.billiard_revenue)}</p>
            </div>
            <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Sessions PS4</p>
              <p className="text-3xl font-black text-white">{stats.today.ps4_sessions}</p>
              <p className="text-sm text-zinc-500">{formatPrice(stats.today.ps4_revenue)}</p>
            </div>
            <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Commandes Bar</p>
              <p className="text-3xl font-black text-white">{stats.today.bar_orders}</p>
              <p className="text-sm text-zinc-500">{formatPrice(stats.today.bar_revenue)}</p>
            </div>
            <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Total Aujourd'hui</p>
              <p className="text-3xl font-black" style={{ color: settings.theme_color }}>
                {formatPrice(stats.today.billiard_revenue + stats.today.ps4_revenue + stats.today.bar_revenue)}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
