import { combinations } from './math';
import type { Card, HandResult } from './types';
import { HandCategory } from './types';

const categoryNames: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'Carta Alta',
  [HandCategory.OnePair]: 'Par',
  [HandCategory.TwoPair]: 'Doble Par',
  [HandCategory.ThreeOfAKind]: 'Trío',
  [HandCategory.Straight]: 'Escalera',
  [HandCategory.Flush]: 'Color',
  [HandCategory.FullHouse]: 'Full House',
  [HandCategory.FourOfAKind]: 'Póker',
  [HandCategory.StraightFlush]: 'Escalera de Color'
};

const rankValue = (card: Card) => card.value;

const sortDesc = (values: number[]): number[] => [...values].sort((a, b) => b - a);

const encodeScore = (category: HandCategory, ranks: number[]): number => {
  return category * 1_000_000_000 + ranks.reduce((acc, value, index) => acc + value * 10 ** (2 * (4 - index)), 0);
};

const isStraight = (values: number[]): { straight: boolean; high: number } => {
  const unique = Array.from(new Set(values)).sort((a, b) => b - a);
  if (unique.length < 5) {
    return { straight: false, high: 0 };
  }

  for (let i = 0; i <= unique.length - 5; i += 1) {
    const window = unique.slice(i, i + 5);
    if (window[0] - window[4] === 4) {
      return { straight: true, high: window[0] };
    }
  }

  const wheel = [14, 5, 4, 3, 2];
  if (wheel.every((value) => unique.includes(value))) {
    return { straight: true, high: 5 };
  }

  return { straight: false, high: 0 };
};

const describeRanks = (values: number[]): string =>
  values
    .map((value) => {
      if (value <= 10) return value.toString();
      if (value === 11) return 'J';
      if (value === 12) return 'Q';
      if (value === 13) return 'K';
      return 'A';
    })
    .join(' ');

export const evaluateFiveCards = (cards: Card[]): HandResult => {
  const values = cards.map(rankValue).sort((a, b) => b - a);
  const suits = cards.map((card) => card.suit);

  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  const groupedByCount = Array.from(counts.entries()).reduce<Record<number, number[]>>((acc, [value, count]) => {
    acc[count] = acc[count] ? [...acc[count], value] : [value];
    return acc;
  }, {});

  if (groupedByCount[1]) {
    groupedByCount[1].sort((a, b) => b - a);
  }
  if (groupedByCount[2]) {
    groupedByCount[2].sort((a, b) => b - a);
  }

  const flushSuit = suits.find((suit, index, array) => array.filter((item) => item === suit).length >= 5);
  const { straight, high: straightHigh } = isStraight(values);

  if (flushSuit && straight) {
    const flushCards = cards.filter((card) => card.suit === flushSuit).sort((a, b) => b.value - a.value);
    const flushValues = flushCards.map(rankValue);
    const { straight: flushStraight, high: flushStraightHigh } = isStraight(flushValues);
    if (flushStraight) {
      const rankValues = [flushStraightHigh, ...flushValues.filter((value) => value !== flushStraightHigh).slice(0, 4)];
      return {
        category: HandCategory.StraightFlush,
        rankValues,
        score: encodeScore(HandCategory.StraightFlush, rankValues),
        description: `Escalera de Color a ${describeRanks([flushStraightHigh])}`
      };
    }
  }

  if (groupedByCount[4]?.length) {
    const quad = groupedByCount[4][0];
    const kicker = groupedByCount[1]?.[0] ?? groupedByCount[2]?.[0] ?? 0;
    const rankValues = [quad, quad, quad, quad, kicker];
    return {
      category: HandCategory.FourOfAKind,
      rankValues,
      score: encodeScore(HandCategory.FourOfAKind, rankValues),
      description: `Póker de ${describeRanks([quad])}`
    };
  }

  if (groupedByCount[3]?.length && (groupedByCount[2]?.length || groupedByCount[3]?.length > 1)) {
    const trips = groupedByCount[3][0];
    const pair = groupedByCount[2]?.[0] ?? groupedByCount[3][1];
    const rankValues = [trips, trips, trips, pair, pair];
    return {
      category: HandCategory.FullHouse,
      rankValues,
      score: encodeScore(HandCategory.FullHouse, rankValues),
      description: `Full House ${describeRanks([trips])} sobre ${describeRanks([pair])}`
    };
  }

  if (flushSuit) {
    const flushValues = cards
      .filter((card) => card.suit === flushSuit)
      .map(rankValue)
      .sort((a, b) => b - a)
      .slice(0, 5);
    return {
      category: HandCategory.Flush,
      rankValues: flushValues,
      score: encodeScore(HandCategory.Flush, flushValues),
      description: `Color a ${describeRanks([flushValues[0]])}`
    };
  }

  if (straight) {
    const rankValues = [straightHigh, straightHigh - 1, straightHigh - 2, straightHigh - 3, straightHigh - 4].map((value) =>
      value === 1 ? 14 : value
    );
    return {
      category: HandCategory.Straight,
      rankValues,
      score: encodeScore(HandCategory.Straight, rankValues),
      description: `Escalera a ${describeRanks([straightHigh])}`
    };
  }

  if (groupedByCount[3]?.length) {
    const trips = groupedByCount[3][0];
    const kickers = groupedByCount[1]?.slice(0, 2) ?? [];
    const rankValues = [trips, trips, trips, ...kickers];
    return {
      category: HandCategory.ThreeOfAKind,
      rankValues,
      score: encodeScore(HandCategory.ThreeOfAKind, rankValues),
      description: `Trío de ${describeRanks([trips])}`
    };
  }

  if (groupedByCount[2]?.length) {
    if (groupedByCount[2].length >= 2) {
      const [highPair, lowPair] = groupedByCount[2];
      const kicker = groupedByCount[1]?.[0] ?? 0;
      const rankValues = [highPair, highPair, lowPair, lowPair, kicker];
      return {
        category: HandCategory.TwoPair,
        rankValues,
        score: encodeScore(HandCategory.TwoPair, rankValues),
        description: `Doble par ${describeRanks([highPair])} y ${describeRanks([lowPair])}`
      };
    }
    const pair = groupedByCount[2][0];
    const kickers = groupedByCount[1]?.slice(0, 3) ?? [];
    const rankValues = [pair, pair, ...kickers];
    return {
      category: HandCategory.OnePair,
      rankValues,
      score: encodeScore(HandCategory.OnePair, rankValues),
      description: `Par de ${describeRanks([pair])}`
    };
  }

  const rankValues = sortDesc(values).slice(0, 5);
  return {
    category: HandCategory.HighCard,
    rankValues,
    score: encodeScore(HandCategory.HighCard, rankValues),
    description: `Carta alta ${describeRanks([rankValues[0]])}`
  };
};

export const evaluateBestHand = (cards: Card[]): HandResult => {
  if (cards.length <= 5) {
    return evaluateFiveCards(cards);
  }
  const best = combinations(cards, 5)
    .map((combo) => evaluateFiveCards(combo))
    .sort((a, b) => b.score - a.score)[0];
  return best;
};

export const compareHands = (a: HandResult, b: HandResult): number => b.score - a.score;

export const describeHand = (hand: HandResult): string => categoryNames[hand.category];
