import { Sona } from 'ruvector';
import { embedOne } from './embedding.js';

export type SonaTrajectoryId = number;

type EngineEntry = {
  dims: number;
  engine: InstanceType<typeof Sona.Engine>;
};

const enginesByDims = new Map<number, EngineEntry>();

function getEngine(dims: number): InstanceType<typeof Sona.Engine> {
  if (typeof Sona?.isAvailable !== 'function' || !Sona.isAvailable()) {
    throw new Error('SONA is not available in this RuVector installation');
  }

  const existing = enginesByDims.get(dims);
  if (existing) return existing.engine;

  const engine = new Sona.Engine(dims);
  enginesByDims.set(dims, { dims, engine });
  return engine;
}

export async function sonaBeginFromText(params: {
  queryText: string;
  dims: number;
  route?: string;
  contextIds?: string[];
}): Promise<SonaTrajectoryId> {
  const engine = getEngine(params.dims);
  const queryEmbedding = await embedOne(params.queryText, params.dims);
  const trajectoryId = engine.beginTrajectory(queryEmbedding);

  if (params.route) {
    engine.setRoute(trajectoryId, params.route);
  }

  if (params.contextIds?.length) {
    for (const cid of params.contextIds) {
      engine.addContext(trajectoryId, cid);
    }
  }

  return trajectoryId;
}

export async function sonaAddTextStep(params: {
  trajectoryId: number;
  text: string;
  dims: number;
  reward: number;
}): Promise<void> {
  const engine = getEngine(params.dims);
  const vec = await embedOne(params.text, params.dims);

  // For a prototype, we use the same embedded vector for activations and attention weights.
  // This keeps the learning loop functional without requiring internal model tensors.
  engine.addStep(params.trajectoryId, vec, vec, params.reward);
}

export function sonaEnd(params: { trajectoryId: number; dims: number; quality: number }): void {
  const engine = getEngine(params.dims);
  engine.endTrajectory(params.trajectoryId, params.quality);
}

export function sonaTick(params: { dims: number }): string | null {
  const engine = getEngine(params.dims);
  return engine.tick();
}

export function sonaForceLearn(params: { dims: number }): string {
  const engine = getEngine(params.dims);
  return engine.forceLearn();
}

export function sonaStats(params: { dims: number }) {
  const engine = getEngine(params.dims);
  return engine.getStats();
}

export async function sonaFindPatternsFromText(params: { queryText: string; dims: number; k: number }) {
  const engine = getEngine(params.dims);
  const queryEmbedding = await embedOne(params.queryText, params.dims);
  return engine.findPatterns(queryEmbedding, params.k);
}
