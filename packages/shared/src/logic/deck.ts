import { Card, RANK_ORDER, SUITS } from '../types/cards';
import { sha256 } from '../utils/hash';
import { xorBuffers } from '../utils/xor';

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANK_ORDER) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

const fisherYates = (deck: Card[], seed: Uint8Array): Card[] => {
  const shuffled = [...deck];
  let pointer = 0;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const data = new Uint8Array(seed.length + 4);
    data.set(seed);
    data.set(new Uint8Array(new Uint32Array([pointer]).buffer), seed.length);
    const hash = sha256(data);
    pointer += 1;
    const rand = new DataView(hash.buffer).getUint32(0, false);
    const j = rand % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const shuffleFromSeeds = (seeds: Uint8Array[]): Card[] => {
  if (seeds.length === 0) {
    throw new Error('At least one seed required');
  }
  const deck = generateDeck();
  let combined = seeds[0];
  for (let i = 1; i < seeds.length; i++) {
    combined = xorBuffers(combined, seeds[i]);
  }
  return fisherYates(deck, combined);
};
