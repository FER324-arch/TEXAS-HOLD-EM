export const xorBuffers = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const max = Math.max(a.length, b.length);
  const out = new Uint8Array(max);
  for (let i = 0; i < max; i++) {
    const av = a[i % a.length];
    const bv = b[i % b.length];
    out[i] = av ^ bv;
  }
  return out;
};
