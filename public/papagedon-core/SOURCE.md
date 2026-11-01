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
originals; the other 9 are new. Their manifest `source` paths start with
`originals/`, and the catalog sync test covers them like converted shaders.
