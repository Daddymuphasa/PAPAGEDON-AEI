// Central config: mock/live switch. Keys stay server-side. Meta AI only
// (https://api.meta.ai/v1) — no other providers, per the hackathon rules.
export const isLive = () => process.env.AEI_LIVE === 'true';

export const metaApiKey = () => process.env.MODEL_API_KEY ?? process.env.META_API_KEY ?? '';
