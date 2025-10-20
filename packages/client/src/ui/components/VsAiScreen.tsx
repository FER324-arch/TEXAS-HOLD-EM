import React from 'react';
import { NeonTablePreview } from './common/NeonTablePreview';
import { useAiGame } from '../store/aiGameStore';

type Props = { onNavigate: (route: any) => void };

export const VsAiScreen: React.FC<Props> = ({ onNavigate }) => {
  const { startGame, config, setConfig } = useAiGame();

  const begin = () => {
    startGame();
    onNavigate(`/table/local-ai` as any);
  };

  return (
    <div className="card-panel">
      <h2>Modo IA</h2>
      <p>Configura la partida contra bots parametrizables.</p>
      <div className="table-layout">
        <div>
          <label>
            Buy-in
            <input
              type="number"
              value={config.buyIn}
              onChange={(e) => setConfig({ buyIn: Number(e.target.value) })}
            />
          </label>
          <label>
            Blinds (SB/BB)
            <input
              type="text"
              value={`${config.smallBlind}/${config.bigBlind}`}
              onChange={(e) => {
                const [sb, bb] = e.target.value.split('/').map(Number);
                if (!Number.isNaN(sb) && !Number.isNaN(bb)) {
                  setConfig({ smallBlind: sb, bigBlind: bb });
                }
              }}
            />
          </label>
          <label>
            Bots
            <input
              type="number"
              min={1}
              max={5}
              value={config.bots}
              onChange={(e) => setConfig({ bots: Number(e.target.value) })}
            />
          </label>
          <button onClick={begin}>Comenzar</button>
        </div>
        <NeonTablePreview />
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
