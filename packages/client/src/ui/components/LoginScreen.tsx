import React from 'react';
import { useAuthStore } from '../store/authStore';

type Props = {
  onNavigate: (route: any) => void;
};

export const LoginScreen: React.FC<Props> = ({ onNavigate }) => {
  const { login, register, fetchProfile } = useAuthStore();
  const [email, setEmail] = React.useState('user@demo');
  const [password, setPassword] = React.useState('user123');
  const [nickname, setNickname] = React.useState('');
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, nickname || 'NewPlayer');
      }
      await fetchProfile();
      onNavigate('/hub');
    } catch (err) {
      setError('Unable to authenticate.');
    }
  };

  return (
    <div className="card-panel" style={{ maxWidth: 480 }}>
      <h1>Neon Hold&apos;em Pro</h1>
      <p>Futuristic peer-to-peer Texas Hold&apos;em experience.</p>
      <form onSubmit={submit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {mode === 'register' && (
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname"
          />
        )}
        {error && <div style={{ color: '#ff2e8a', marginBottom: 12 }}>{error}</div>}
        <button type="submit">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
      </form>
      <button
        type="button"
        style={{ marginTop: 12, background: 'transparent', border: '1px solid #17e3ff', color: 'var(--text)' }}
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Necesito una cuenta' : 'Ya tengo cuenta'}
      </button>
    </div>
  );
};
