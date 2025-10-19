import type { Card, Rank, Suit } from './types';

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankValues = new Map<Rank, number>(ranks.map((rank, index) => [rank, index + 2]));

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: rankValues.get(rank)! });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const drawCards = (deck: Card[], count: number): { cards: Card[]; deck: Card[] } => {
  const nextDeck = [...deck];
  const cards = nextDeck.splice(0, count);
  return { cards, deck: nextDeck };
};

export const formatCard = (card: Card): string => `${card.rank}${card.suit}`;

export const getRankLabel = (value: number): Rank => ranks[value - 2] ?? 'A';

export const toDisplayCard = (card: Card): { rank: string; suit: string; isRed: boolean } => ({
  rank: card.rank,
  suit: card.suit,
  isRed: card.suit === '♥' || card.suit === '♦'
});

export const getRanks = (): Rank[] => [...ranks];
