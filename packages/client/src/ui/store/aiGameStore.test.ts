import { describe, expect, it } from 'vitest';
import { useAiGame } from './aiGameStore';

describe('aiGameStore', () => {
  it('updates config and history', () => {
    const { startGame, history, setConfig } = useAiGame.getState();
    setConfig({ bots: 4 });
    startGame();
    expect(useAiGame.getState().bots).toHaveLength(4);
    expect(useAiGame.getState().history.length).toBeGreaterThan(0);
  });
});
