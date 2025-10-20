import React, { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

type Props = {
  onNavigate: (route: any) => void;
};

interface LedgerEntryView {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
}

export const HubScreen: React.FC<Props> = ({ onNavigate }) => {
  const { profile, fetchProfile } = useAuthStore();
  const [history, setHistory] = React.useState<LedgerEntryView[]>([]);
  const [pnl, setPnl] = React.useState<{ date: string; pnl: number }[]>([]);

  useEffect(() => {
    fetchProfile();
    (async () => {
      const response = await axios.get('/history/pnl?days=30');
      setPnl(response.data);
      const ledger = await axios.get('/history/ledger');
      setHistory(ledger.data);
    })().catch(() => undefined);
  }, [fetchProfile]);

  return (
    <div className="card-panel">
      <h2>Bienvenido, {profile?.nickname}</h2>
      <div className="table-layout">
        <div>
          <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
            <button onClick={() => onNavigate('/vs-ai')}>Jugar contra IA</button>
            <button onClick={() => onNavigate('/host')}>Hostear sesión p2p</button>
            <button onClick={() => onNavigate('/join')}>Unirse a sesión p2p</button>
            {profile?.role === 'admin' && (
              <button onClick={() => onNavigate('/admin')}>Panel Devs</button>
            )}
          </div>
          <div className="list-panel">
            <h3>Últimas partidas</h3>
            <p>Logs de partidas aparecerán aquí cuando juegues.</p>
          </div>
        </div>
        <div>
          <div className="list-panel" style={{ marginBottom: 16 }}>
            <h3>Cartera</h3>
            <p>Saldo: {profile?.balance ?? 0}</p>
            <button onClick={() => axios.post('/wallet/deposit', { amount: 500 })}>Depositar 500</button>
          </div>
          <div className="list-panel" style={{ marginBottom: 16 }}>
            <h3>P&amp;L últimos 30 días</h3>
            <ul>
              {pnl.map((point) => (
                <li key={point.date}>
                  {point.date}: {point.pnl}
                </li>
              ))}
            </ul>
          </div>
          <div className="list-panel">
            <h3>Eventos recientes</h3>
            <ul>
              {history.map((entry) => (
                <li key={entry.id}>
                  {entry.type}: {entry.amount} ({new Date(entry.createdAt).toLocaleString()})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
