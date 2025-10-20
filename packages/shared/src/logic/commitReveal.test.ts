import { describe, expect, it } from 'vitest';
import { webcrypto } from 'crypto';
import { commitmentFromSeed, deriveDeckSeed, verifyCommitment } from './commitReveal';

const crypto = webcrypto;
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

describe('commitReveal', () => {
  it('verifies commitment', () => {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const commitment = commitmentFromSeed(seed);
    expect(verifyCommitment(toHex(seed), commitment)).toBe(true);
  });

  it('derives deterministic deck seed', () => {
    const seeds = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2)];
    const deckSeed = deriveDeckSeed(seeds);
    const deckSeed2 = deriveDeckSeed(seeds);
    expect(toHex(deckSeed)).toBe(toHex(deckSeed2));
  });
});
