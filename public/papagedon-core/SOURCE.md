# Vendored from PAPAGEDON-CORE-

Copied verbatim by `scripts/sync-papagedon-core.mjs`.

- Repo: https://github.com/Daddymuphasa/PAPAGEDON-CORE-
- Commit: `4551dc4f244cc2cabbe6577471419c8d6e35eeed`
- Shaders: `engine/rendering/shaders/`
- Themes: `themes/`

Do not edit these files here. Change them in PAPAGEDON-CORE- and re-run the sync script.

## AEI conversion

The `shaders/` tree here holds the web-converted pack shaders: each core
`.frag` with its desktop `#version` line swapped for the WebGL2 ES 3.00
header (the same transform as `toWebGL2` in
`src/lib/papagedon/shaders.ts`, applied at conversion time so the runtime
adapter is a no-op safety net). Bodies are otherwise verbatim. The desktop
originals live in `core-shaders/` in the PAPAGEDON-META source folder
(outside this repo); only converted shaders ship here.

## Removed: Signature3DPack (2026-11-03)

`shaders/Signature3DPack/` (12 lookalike shaders) was deleted: the real
originals were found on PORTFOLIO- `origin/main` and ported as three.js
scenes under `src/vision3d/` instead (see the Originals BUILD_LOG row).
Kept in git history.

## Rewritten Aurora

`shaders/SignaturePack/01_aurora.frag` is the second exception: the
converted body was replaced with a rewritten original (aurora storm: triple
curtains, pillars, meteor, mountains). Its manifest `source` also starts
with `originals/`. Everything else in the six packs stays verbatim.
