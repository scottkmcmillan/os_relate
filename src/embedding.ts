import {
  createEmbeddingService,
  LocalNGramProvider,
  type EmbeddingService
} from 'ruvector';

const servicesByDims = new Map<number, EmbeddingService>();

function getService(dimensions: number): EmbeddingService {
  const existing = servicesByDims.get(dimensions);
  if (existing) return existing;

  const service = createEmbeddingService({
    batchSize: 32,
    maxCacheSize: 10_000
  });

  // Use RuVector's built-in local fallback provider by default.
  // This keeps the whole pipeline self-contained (no API keys).
  service.registerProvider(new LocalNGramProvider(dimensions));

  servicesByDims.set(dimensions, service);
  return service;
}

export async function embedOne(text: string, dimensions: number): Promise<Float32Array> {
  const service = getService(dimensions);
  const vec = await service.embedOne(text);
  return new Float32Array(vec);
}

export async function embedMany(texts: string[], dimensions: number): Promise<Float32Array[]> {
  const service = getService(dimensions);
  const vecs = await service.embed(texts);
  return vecs.map((v) => new Float32Array(v));
}
