import React from 'react';

type Props = { onNavigate: (route: any) => void };

export const JoinScreen: React.FC<Props> = ({ onNavigate }) => {
  const [roomId, setRoomId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [buyIn, setBuyIn] = React.useState(200);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(`/table/${roomId}` as any);
  };

  return (
    <div className="card-panel">
      <h2>Unirse a sesión p2p</h2>
      <form onSubmit={join}>
        <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room ID" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        <input type="number" value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} />
        <button type="submit">Conectar</button>
      </form>
      <button
        style={{ marginTop: 24, background: 'transparent', border: '1px solid #17e3ff', color: 'var(--text)' }}
        onClick={() => onNavigate('/hub')}
      >
        Volver al hub
      </button>
    </div>
  );
};
