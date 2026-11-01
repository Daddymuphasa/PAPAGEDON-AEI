import raw from "./catalog.json";

export type ThemeDef = {
  id: string;
  name: string;
  palette: { primary: string; secondary: string; accent: string; background: string };
  glow?: number;
  bloom?: number;
  motion?: number;
  noise?: number;
  distortion?: number;
  transitionSpeed?: number;
  file: string;
};

export type ShaderDef = {
  id: string;
  name: string;
  /** Path under /papagedon-core/ (vendored verbatim from PAPAGEDON-CORE-). */
  file: string;
  /** Original path inside PAPAGEDON-CORE-. */
  source: string;
  energyLevel: string | null;
};

export type PackDef = {
  id: string;
  name: string;
  recommendedTheme: string | null;
  shaders: ShaderDef[];
};

export type Catalog = {
  coreRepo: string;
  coreCommit: string;
  themes: ThemeDef[];
  packs: PackDef[];
};

export const catalog = raw as unknown as Catalog;
export const allShaders: ShaderDef[] = catalog.packs.flatMap((p) => p.shaders);
export const ASSET_BASE = "/papagedon-core/";
