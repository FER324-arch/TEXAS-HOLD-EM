import { GamePhase } from '../types/sessions';

export type GameEvent =
  | { type: 'PLAYER_JOINED' }
  | { type: 'SEATS_READY' }
  | { type: 'START_HAND' }
  | { type: 'ROUND_COMPLETE' }
  | { type: 'SHOWDOWN_RESOLVED' }
  | { type: 'PAYOUT_COMPLETE' };

const transitions: Record<GamePhase, GamePhase> = {
  waiting: 'seating',
  seating: 'handStart',
  handStart: 'preflop',
  preflop: 'flop',
  flop: 'turn',
  turn: 'river',
  river: 'showdown',
  showdown: 'payout',
  payout: 'rotateDealer',
  rotateDealer: 'handStart'
};

export class GameStateMachine {
  #phase: GamePhase = 'waiting';

  get phase(): GamePhase {
    return this.#phase;
  }

  advance(event: GameEvent): GamePhase {
    switch (event.type) {
      case 'PLAYER_JOINED':
        if (this.#phase !== 'waiting') {
          throw new Error('Cannot join after game setup');
        }
        this.#phase = 'seating';
        break;
      case 'SEATS_READY':
        if (this.#phase !== 'seating') {
          throw new Error('Seats not ready in current phase');
        }
        this.#phase = 'handStart';
        break;
      case 'START_HAND':
      case 'ROUND_COMPLETE':
      case 'SHOWDOWN_RESOLVED':
      case 'PAYOUT_COMPLETE':
        this.#phase = transitions[this.#phase];
        break;
      default:
        throw new Error('Unknown event');
    }
    return this.#phase;
  }
}
