// Central config: mock/live switch + director provider. Keys stay server-side.
export const isLive = () => process.env.AEI_LIVE === 'true';

export type DirectorProvider = 'muse-spark' | 'muse-spark-open';
export const directorProvider = (): DirectorProvider =>
  process.env.AEI_DIRECTOR_PROVIDER === 'muse-spark-open' ? 'muse-spark-open' : 'muse-spark';

export const MUSE_SPARK_OPEN_MODEL_ID = 'meta-models/muse-spark-open-1026';

export const metaApiKey = () => process.env.META_API_KEY ?? '';
export const basetenApiKey = () => process.env.BASETEN_API_KEY ?? '';
