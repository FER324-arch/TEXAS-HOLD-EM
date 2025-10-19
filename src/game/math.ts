import type { Card } from './types';

export const combinations = (cards: Card[], choose: number): Card[][] => {
  const result: Card[][] = [];
  const pick: Card[] = [];

  const helper = (start: number, depth: number) => {
    if (depth === choose) {
      result.push([...pick]);
      return;
    }
    for (let i = start; i < cards.length; i += 1) {
      pick.push(cards[i]);
      helper(i + 1, depth + 1);
      pick.pop();
    }
  };

  helper(0, 0);
  return result;
};
