import { hmacSha256, sha256 } from '../utils/hash';

export interface CommitMessage {
  playerId: string;
  commitment: string; // hex
}

export interface RevealMessage {
  playerId: string;
  seedHex: string;
}

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

export const commitmentFromSeed = (seed: Uint8Array): string => toHex(sha256(seed));

export const commitmentFromSeedAsync = async (seed: Uint8Array): Promise<string> => {
  return toHex(sha256(seed));
};

export const verifyCommitment = (seedHex: string, commitment: string): boolean => {
  const seed = fromHex(seedHex);
  return commitment === commitmentFromSeed(seed);
};

export const deriveDeckSeed = (seeds: Uint8Array[]): Uint8Array => {
  if (!seeds.length) {
    throw new Error('No seeds provided');
  }
  let combined = seeds[0];
  for (let i = 1; i < seeds.length; i++) {
    combined = hmacSha256(combined, seeds[i]);
  }
  return combined;
};
