import {
  getImplementationType,
  getVersion,
  isNative,
  isWasm,
  Sona
} from 'ruvector';

import { isGnnAvailable } from 'ruvector/dist/core/gnn-wrapper.js';
import { isAttentionAvailable } from 'ruvector/dist/core/attention-fallbacks.js';

export type RuvectorCapabilities = {
  implementation: {
    type: 'native' | 'wasm';
    isNative: boolean;
    isWasm: boolean;
    version: string;
    implementationString: string;
  };
  modules: {
    gnnAvailable: boolean;
    attentionAvailable: boolean;
    sonaAvailable: boolean;
  };
};

export async function getRuvectorCapabilities(): Promise<RuvectorCapabilities> {
  const version = getVersion();

  return {
    implementation: {
      type: getImplementationType(),
      isNative: isNative(),
      isWasm: isWasm(),
      version: version.version,
      implementationString: version.implementation
    },
    modules: {
      gnnAvailable: isGnnAvailable(),
      attentionAvailable: isAttentionAvailable(),
      sonaAvailable: typeof Sona?.isAvailable === 'function' ? Sona.isAvailable() : false
    }
  };
}
