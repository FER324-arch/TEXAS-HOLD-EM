import { describe, expect, it } from 'vitest';
import { calculateSidePots } from './pots';

describe('calculateSidePots', () => {
  it('splits pots correctly', () => {
    const pots = calculateSidePots([
      { playerId: 'a', amount: 100 },
      { playerId: 'b', amount: 200 },
      { playerId: 'c', amount: 300 }
    ]);
    expect(pots).toHaveLength(3);
    expect(pots[0]).toEqual({ potAmount: 300, eligiblePlayers: ['a', 'b', 'c'] });
  });
});
