import create from 'zustand';
import { evaluateHand, Card } from '@neon/shared';

interface AiBotConfig {
  style: 'tight' | 'loose';
  aggression: number;
  bluff: number;
}

interface AiGameConfig {
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  bots: number;
}

interface AiGameState {
  config: AiGameConfig;
  bots: AiBotConfig[];
  history: string[];
  startGame: () => void;
  setConfig: (partial: Partial<AiGameConfig>) => void;
}

const defaultConfig: AiGameConfig = {
  buyIn: 1000,
  smallBlind: 5,
  bigBlind: 10,
  bots: 3
};

export const useAiGame = create<AiGameState>((set, get) => ({
  config: defaultConfig,
  bots: Array.from({ length: defaultConfig.bots }).map(() => ({ style: 'tight', aggression: 0.5, bluff: 0.1 })),
  history: [],
  startGame() {
    const deck: Card[] = [];
    const cards = ['A', 'K', 'Q', 'J', 'T', '9'];
    for (const rank of cards) {
      deck.push({ rank: rank as any, suit: 'spades' });
    }
    const result = evaluateHand([deck[0], deck[1]], deck.slice(2));
    set({ history: [`Hand evaluada: ${result.rank}`] });
  },
  setConfig(partial) {
    set((state) => ({
      config: { ...state.config, ...partial },
      bots: Array.from({ length: partial.bots ?? state.config.bots }).map(() => ({
        style: 'tight',
        aggression: 0.5,
        bluff: 0.1
      }))
    }));
  }
}));
