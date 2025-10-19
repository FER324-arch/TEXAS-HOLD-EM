export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export type Stage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'roundEnd' | 'gameOver';

export interface PlayerState {
  id: string;
  name: string;
  chips: number;
  hand: Card[];
  folded: boolean;
  isHuman: boolean;
  currentBet: number;
  status: string;
  isAllIn: boolean;
  isOut: boolean;
}

export interface HandResult {
  category: HandCategory;
  rankValues: number[];
  score: number;
  description: string;
}

export enum HandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8
}

export interface GameState {
  players: PlayerState[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  stage: Stage;
  activePlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  minimumRaise: number;
  awaitingHumanAction: boolean;
  messageLog: string[];
  roundCount: number;
  winnerSummary?: string;
}

export type PlayerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call'; amount: number }
  | { type: 'raise'; amount: number };
