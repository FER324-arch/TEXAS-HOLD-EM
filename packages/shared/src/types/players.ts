export type PlayerRole = 'user' | 'admin';

export interface PlayerProfile {
  id: string;
  nickname: string;
  balance: number;
  role: PlayerRole;
}

export interface TableSeatState {
  playerId: string;
  stack: number;
  isConnected: boolean;
  hasActed: boolean;
  committedChips: number;
  holeCards: string[]; // stored as e.g. 'Ah'
}
