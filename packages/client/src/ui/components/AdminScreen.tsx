import React, { useEffect } from 'react';
import axios from 'axios';

interface AccountRow {
  id: string;
  balance: number;
  isLocked: boolean;
  user?: { email: string };
}

type Props = { onNavigate: (route: any) => void };

export const AdminScreen: React.FC<Props> = ({ onNavigate }) => {
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [mintAmount, setMintAmount] = React.useState(1000);
  const [selectedAccount, setSelectedAccount] = React.useState<string>('');

  useEffect(() => {
    axios.get('/admin/accounts').then((res) => setAccounts(res.data));
  }, []);

  const mint = async () => {
    if (!selectedAccount) return;
    await axios.post('/admin/mint', { accountId: selectedAccount, amount: mintAmount });
    const refreshed = await axios.get('/admin/accounts');
    setAccounts(refreshed.data);
  };

  return (
    <div className="card-panel">
      <h2>Panel de Administración</h2>
      <div className="list-panel">
        <h3>Suministro total</h3>
        <p>Selecciona cuenta para mint/burn:</p>
        <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
          <option value="">Selecciona</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.user?.email ?? 'Cuenta'} – {account.balance}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={mintAmount}
          onChange={(e) => setMintAmount(Number(e.target.value))}
        />
        <button onClick={mint}>Mint</button>
      </div>
      <button
        style={{ marginTop: 24, background: 'transparent', border: '1px solid #17e3ff', color: 'var(--text)' }}
        onClick={() => onNavigate('/hub')}
      >
        Volver al hub
      </button>
    </div>
  );
};
