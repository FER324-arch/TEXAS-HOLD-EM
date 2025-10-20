import { Card, Rank, SUITS, rankToValue } from '../types/cards';

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush';

export interface EvaluatedHand {
  rank: HandRank;
  tiebreakers: number[];
}

const rankCounts = (cards: Card[]): Map<Rank, number> => {
  const map = new Map<Rank, number>();
  for (const card of cards) {
    map.set(card.rank, (map.get(card.rank) ?? 0) + 1);
  }
  return map;
};

const suitCounts = (cards: Card[]): Map<string, Card[]> => {
  const map = new Map<string, Card[]>();
  for (const card of cards) {
    const list = map.get(card.suit) ?? [];
    list.push(card);
    map.set(card.suit, list);
  }
  return map;
};

const sortByRankDesc = (cards: Card[]): Card[] =>
  [...cards].sort((a, b) => rankToValue(b.rank) - rankToValue(a.rank));

const isStraight = (ranks: Rank[]): { isStraight: boolean; highest: number } => {
  const deduped = Array.from(new Set(ranks.map(rankToValue))).sort((a, b) => b - a);
  if (deduped.includes(rankToValue('A'))) {
    deduped.push(-1);
  }
  for (let i = 0; i <= deduped.length - 5; i++) {
    let current = deduped[i];
    let streak = 1;
    for (let j = i + 1; j < deduped.length && streak < 5; j++) {
      if (deduped[j] === current - 1) {
        streak += 1;
        current = deduped[j];
      } else if (deduped[j] === current) {
        continue;
      } else {
        break;
      }
    }
    if (streak === 5) {
      return { isStraight: true, highest: current === -1 ? rankToValue('5') : deduped[i] };
    }
  }
  return { isStraight: false, highest: -1 };
};

export const evaluateHand = (hole: Card[], board: Card[]): EvaluatedHand => {
  if (hole.length !== 2) {
    throw new Error('Hole cards must be exactly two');
  }
  const cards = [...hole, ...board];
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('Hand evaluation requires between 5 and 7 cards');
  }
  const sorted = sortByRankDesc(cards);
  const ranks = sorted.map((card) => card.rank);
  const counts = rankCounts(cards);
  const suits = suitCounts(cards);

  let flushCards: Card[] | undefined;
  for (const suit of SUITS) {
    const list = suits.get(suit);
    if (list && list.length >= 5) {
      flushCards = sortByRankDesc(list);
      break;
    }
  }

  const straightInfo = isStraight(ranks);
  let straightFlush: { isStraight: boolean; highest: number } | null = null;
  if (flushCards) {
    const info = isStraight(flushCards.map((card) => card.rank));
    if (info.isStraight) {
      straightFlush = info;
    }
  }

  if (straightFlush?.isStraight) {
    return { rank: 'straight-flush', tiebreakers: [straightFlush.highest] };
  }

  const fourRank = Array.from(counts.entries()).find(([, count]) => count === 4)?.[0];
  if (fourRank) {
    const kicker = ranks.find((rank) => rank !== fourRank)!;
    return { rank: 'four-of-a-kind', tiebreakers: [rankToValue(fourRank), rankToValue(kicker)] };
  }

  const trips = Array.from(counts.entries())
    .filter(([, count]) => count === 3)
    .map(([rank]) => rank)
    .sort((a, b) => rankToValue(b) - rankToValue(a));
  const pairs = Array.from(counts.entries())
    .filter(([, count]) => count === 2)
    .map(([rank]) => rank)
    .sort((a, b) => rankToValue(b) - rankToValue(a));
  if (trips.length >= 1 && (pairs.length >= 1 || trips.length >= 2)) {
    const bestTrip = trips[0];
    const bestPair = pairs[0] ?? trips[1];
    return {
      rank: 'full-house',
      tiebreakers: [rankToValue(bestTrip), rankToValue(bestPair)]
    };
  }

  if (flushCards) {
    return {
      rank: 'flush',
      tiebreakers: flushCards.slice(0, 5).map((card) => rankToValue(card.rank))
    };
  }

  if (straightInfo.isStraight) {
    return { rank: 'straight', tiebreakers: [straightInfo.highest] };
  }

  if (trips.length >= 1) {
    const kickerRanks = ranks.filter((rank) => rank !== trips[0]).slice(0, 2);
    return {
      rank: 'three-of-a-kind',
      tiebreakers: [rankToValue(trips[0]), ...kickerRanks.map((r) => rankToValue(r))]
    };
  }

  if (pairs.length >= 2) {
    const [highPair, lowPair] = pairs;
    const kicker = ranks.find((rank) => rank !== highPair && rank !== lowPair)!;
    return {
      rank: 'two-pair',
      tiebreakers: [rankToValue(highPair), rankToValue(lowPair), rankToValue(kicker)]
    };
  }

  if (pairs.length === 1) {
    const pair = pairs[0];
    const kickers = ranks.filter((rank) => rank !== pair).slice(0, 3);
    return {
      rank: 'pair',
      tiebreakers: [rankToValue(pair), ...kickers.map((r) => rankToValue(r))]
    };
  }

  return {
    rank: 'high-card',
    tiebreakers: ranks.slice(0, 5).map((rank) => rankToValue(rank))
  };
};
