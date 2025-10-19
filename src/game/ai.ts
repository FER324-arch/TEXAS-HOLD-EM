import { evaluateBestHand } from './handEvaluator';
import type { Card, GameState, PlayerAction, PlayerState } from './types';
import { HandCategory } from './types';

const preflopMatrix: Record<string, number> = {
  AA: 0.95,
  KK: 0.9,
  QQ: 0.85,
  JJ: 0.8,
  TT: 0.75,
  '99': 0.7,
  '88': 0.65,
  '77': 0.6,
  '66': 0.55,
  '55': 0.5,
  '44': 0.45,
  '33': 0.42,
  '22': 0.4
};

const normalize = (value: number) => Math.min(0.99, Math.max(0.01, value));

const evaluatePreflop = (hand: Card[]): number => {
  const [first, second] = hand;
  const key = `${first.rank}${second.rank}`;
  const reverseKey = `${second.rank}${first.rank}`;
  const pairStrength = preflopMatrix[key as keyof typeof preflopMatrix] ?? preflopMatrix[reverseKey as keyof typeof preflopMatrix];
  if (pairStrength) {
    return pairStrength;
  }

  const suited = first.suit === second.suit;
  const highCard = Math.max(first.value, second.value);
  const gap = Math.abs(first.value - second.value);

  let strength = 0.35;
  strength += highCard / 30;
  strength += suited ? 0.08 : 0;
  strength -= gap * 0.015;
  if (gap === 0) strength += 0.05;
  if (gap === 1) strength += 0.03;
  return normalize(strength);
};

const evaluatePostFlop = (cards: Card[]): number => {
  const result = evaluateBestHand(cards);
  const categoryWeight = result.category / HandCategory.StraightFlush;
  const kickerWeight = result.rankValues.reduce((acc, value, index) => acc + value / 200 / (index + 1), 0);
  return normalize(0.25 + categoryWeight * 0.65 + kickerWeight);
};

export const decideAction = (state: GameState, player: PlayerState): PlayerAction => {
  const callAmount = state.currentBet - player.currentBet;
  const remainingChips = player.chips;
  const minimumRaise = Math.max(state.currentBet + state.minimumRaise, state.currentBet + state.bigBlind);

  let strength = 0.3;
  if (state.stage === 'preflop') {
    strength = evaluatePreflop(player.hand);
  } else {
    strength = evaluatePostFlop([...player.hand, ...state.communityCards]);
  }

  if (player.isAllIn) {
    return { type: 'check' };
  }

  if (callAmount === 0) {
    if (strength > 0.75 && remainingChips > state.minimumRaise) {
      const raiseTo = Math.min(player.currentBet + state.minimumRaise * (strength > 0.9 ? 3 : 2), player.currentBet + remainingChips);
      return { type: 'raise', amount: raiseTo };
    }
    return { type: 'check' };
  }

  if (strength < 0.25) {
    if (callAmount > remainingChips * 0.35 || callAmount > state.bigBlind * 2) {
      return { type: 'fold' };
    }
    return { type: 'call', amount: player.currentBet + Math.min(callAmount, remainingChips) };
  }

  if (strength < 0.55) {
    if (callAmount > remainingChips * 0.6) {
      return { type: 'fold' };
    }
    return { type: 'call', amount: player.currentBet + Math.min(callAmount, remainingChips) };
  }

  if (strength > 0.82 && remainingChips > callAmount + state.minimumRaise) {
    const aggression = strength > 0.92 ? 3 : 2;
    const raiseTo = Math.min(state.currentBet + state.minimumRaise * aggression, player.currentBet + remainingChips);
    return { type: 'raise', amount: raiseTo };
  }

  return { type: 'call', amount: player.currentBet + Math.min(callAmount, remainingChips) };
};
