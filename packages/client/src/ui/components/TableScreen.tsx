import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from '../../phaser/scenes/Boot';
import { TableScene } from '../../phaser/scenes/Table';
import { useAiGame } from '../store/aiGameStore';

type Props = {
  roomId: string;
  onNavigate: (route: any) => void;
};

export const TableScreen: React.FC<Props> = ({ roomId, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { history } = useAiGame();

  useEffect(() => {
    if (!containerRef.current) return;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 960,
      height: 540,
      parent: containerRef.current,
      backgroundColor: '#05070d',
      scene: [BootScene, TableScene]
    };
    gameRef.current = new Phaser.Game(config);
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="card-panel" style={{ maxWidth: 1024 }}>
      <h2>Mesa {roomId}</h2>
      <div style={{ display: 'flex', gap: 24 }}>
        <div ref={containerRef} style={{ flex: 1 }} />
        <div className="list-panel" style={{ width: 260 }}>
          <h3>Controles</h3>
          <button style={{ width: '100%', marginBottom: 8 }}>Check / Call</button>
          <button style={{ width: '100%', marginBottom: 8 }}>Bet 1/2 Pot</button>
          <button style={{ width: '100%', marginBottom: 8 }}>All-in</button>
          <button
            style={{ width: '100%', background: 'transparent', border: '1px solid #17e3ff', color: 'var(--text)' }}
            onClick={() => onNavigate('/hub')}
          >
            Abandonar mesa
          </button>
          <h3>Historial</h3>
          <ul>
            {history.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
