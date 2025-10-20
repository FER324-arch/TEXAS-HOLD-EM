export type TurnPhase = 'idle' | 'awaiting' | 'action-taken';

export interface TurnEvent {
  type: 'REQUEST_ACTION' | 'ACTION_SUBMITTED' | 'ADVANCE';
  playerId?: string;
}

export class TurnStateMachine {
  #phase: TurnPhase = 'idle';
  #activePlayerId: string | null = null;

  get phase(): TurnPhase {
    return this.#phase;
  }

  get activePlayerId(): string | null {
    return this.#activePlayerId;
  }

  advance(event: TurnEvent): void {
    switch (event.type) {
      case 'REQUEST_ACTION':
        if (!event.playerId) {
          throw new Error('playerId required');
        }
        this.#phase = 'awaiting';
        this.#activePlayerId = event.playerId;
        break;
      case 'ACTION_SUBMITTED':
        if (this.#phase !== 'awaiting') {
          throw new Error('Action cannot be submitted now');
        }
        this.#phase = 'action-taken';
        break;
      case 'ADVANCE':
        this.#phase = 'idle';
        this.#activePlayerId = null;
        break;
      default:
        throw new Error('Unknown event type');
    }
  }
}
