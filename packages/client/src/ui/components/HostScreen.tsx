import React from 'react';
import axios from 'axios';
import { NeonTablePreview } from './common/NeonTablePreview';

type Props = { onNavigate: (route: any) => void };

export const HostScreen: React.FC<Props> = ({ onNavigate }) => {
  const [form, setForm] = React.useState({
    tableName: 'Mesa Neon',
    password: '',
    smallBlind: 5,
    bigBlind: 10,
    buyInMin: 100,
    buyInMax: 1000,
    seatsMax: 6,
    rakePct: 2
  });
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [hostToken, setHostToken] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await axios.post('/session/create', form);
    setRoomId(response.data.roomId);
    setHostToken(response.data.hostToken);
  };

  return (
    <div className="card-panel">
      <h2>Hostear sesión p2p</h2>
      <div className="table-layout">
        <form onSubmit={submit}>
          <input
            value={form.tableName}
            onChange={(e) => setForm({ ...form, tableName: e.target.value })}
            placeholder="Nombre de mesa"
          />
          <input
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Contraseña (opcional)"
          />
          <input
            type="number"
            value={form.smallBlind}
            onChange={(e) => setForm({ ...form, smallBlind: Number(e.target.value) })}
            placeholder="Small blind"
          />
          <input
            type="number"
            value={form.bigBlind}
            onChange={(e) => setForm({ ...form, bigBlind: Number(e.target.value) })}
            placeholder="Big blind"
          />
          <input
            type="number"
            value={form.buyInMin}
            onChange={(e) => setForm({ ...form, buyInMin: Number(e.target.value) })}
            placeholder="Buy-in mínimo"
          />
          <input
            type="number"
            value={form.buyInMax}
            onChange={(e) => setForm({ ...form, buyInMax: Number(e.target.value) })}
            placeholder="Buy-in máximo"
          />
          <input
            type="number"
            value={form.seatsMax}
            onChange={(e) => setForm({ ...form, seatsMax: Number(e.target.value) })}
            placeholder="Asientos"
          />
          <input
            type="number"
            value={form.rakePct}
            onChange={(e) => setForm({ ...form, rakePct: Number(e.target.value) })}
            placeholder="Rake %"
          />
          <button type="submit">Crear mesa</button>
        </form>
        <NeonTablePreview />
      </div>
      {roomId && (
        <div className="list-panel" style={{ marginTop: 16 }}>
          <p>Comparte este Room ID:</p>
          <code>{roomId}</code>
          <p>Token de host: {hostToken}</p>
          <button onClick={() => onNavigate(`/table/${roomId}` as any)}>Ir a la mesa</button>
        </div>
      )}
      <button
        style={{ marginTop: 24, background: 'transparent', border: '1px solid #17e3ff', color: 'var(--text)' }}
        onClick={() => onNavigate('/hub')}
      >
        Volver al hub
      </button>
    </div>
  );
};
