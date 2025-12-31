import crypto from 'node:crypto';

export function embedTextDeterministic(text: string, dimensions: number): Float32Array {
  const vec = new Float32Array(dimensions);

  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (normalized.length === 0) return vec;

  for (const token of normalized) {
    const hash = crypto.createHash('sha256').update(token).digest();

    for (let i = 0; i < dimensions; i++) {
      const b = hash[i % hash.length]!;
      vec[i] += (b / 255) * 2 - 1;
    }
  }

  let norm = 0;
  for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;

  for (let i = 0; i < dimensions; i++) vec[i] /= norm;

  return vec;
}
