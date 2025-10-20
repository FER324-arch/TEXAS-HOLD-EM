export interface SessionConfig {
  roomId: string;
  hostUserId: string;
  smallBlind: number;
  bigBlind: number;
  buyInMin: number;
  buyInMax: number;
  seatMax: number;
  rakePct: number;
  passwordRequired: boolean;
}

export type GamePhase =
  | 'waiting'
  | 'seating'
  | 'handStart'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'payout'
  | 'rotateDealer';

export interface PotState {
  id: string;
  total: number;
  eligiblePlayerIds: string[];
}
