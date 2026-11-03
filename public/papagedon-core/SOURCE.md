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

## Signature3DPack originals

`shaders/Signature3DPack/` is the exception: 12 original shaders written
for this repo. Nano Hex Genesis, Liquid Mirror and Particle Galaxy 3D were
rebuilt from descriptions after a full search of PAPAGEDON-META found no
originals (absence re-verified by a second full META search plus a full
read-only search of the PAPAGEDON-CORE- engine repo on 2026-11-02: no
matching names, files, three.js scenes or components in either); the other 9 are
new. Their manifest `source` paths start with `originals/`, and the catalog
sync test covers them like converted shaders. All 12 follow the /app audio
contract exactly (house beat pump, palette swell, house grading tail, no
hard white) — see `shaders/signature3d.test.ts`.

## Rewritten Aurora

`shaders/SignaturePack/01_aurora.frag` is the second exception: the
converted body was replaced with a rewritten original (aurora storm: triple
curtains, pillars, meteor, mountains). Its manifest `source` also starts
with `originals/`. Everything else in the six packs stays verbatim.
