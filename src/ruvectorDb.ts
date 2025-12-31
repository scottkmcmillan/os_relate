import { VectorDB } from 'ruvector';

export const DEFAULT_DIMENSIONS = 384;

export function openDb(storagePath = './ruvector.db', dimensions = DEFAULT_DIMENSIONS) {
  const options: {
    dimensions: number;
    storagePath?: string;
    distanceMetric?: string;
    hnswConfig?: unknown;
  } = {
    dimensions,
    distanceMetric: 'Cosine',
    storagePath
  };

  return new VectorDB(options);
}
