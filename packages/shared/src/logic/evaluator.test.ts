import { describe, expect, it } from 'vitest';
import { Card } from '../types/cards';
import { evaluateHand } from './evaluator';

const card = (rank: string, suit: string): Card => ({ rank: rank as any, suit: suit as any });

describe('evaluateHand', () => {
  it('detects royal flush', () => {
    const hole = [card('A', 'spades'), card('K', 'spades')];
    const board = [card('Q', 'spades'), card('J', 'spades'), card('T', 'spades'), card('2', 'hearts'), card('3', 'clubs')];
    const result = evaluateHand(hole, board);
    expect(result.rank).toBe('straight-flush');
  });

  it('detects wheel straight', () => {
    const hole = [card('A', 'hearts'), card('2', 'clubs')];
    const board = [card('3', 'diamonds'), card('4', 'spades'), card('5', 'hearts'), card('K', 'clubs'), card('Q', 'hearts')];
    const result = evaluateHand(hole, board);
    expect(result.rank).toBe('straight');
    expect(result.tiebreakers[0]).toBeGreaterThan(0);
  });

  it('handles full house tie breakers', () => {
    const hole = [card('K', 'hearts'), card('K', 'clubs')];
    const board = [card('K', 'spades'), card('3', 'hearts'), card('3', 'diamonds'), card('9', 'clubs'), card('2', 'spades')];
    const result = evaluateHand(hole, board);
    expect(result.rank).toBe('full-house');
    expect(result.tiebreakers[0]).toBeGreaterThan(result.tiebreakers[1]);
  });
});
