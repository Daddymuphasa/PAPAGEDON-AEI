// PAPAGEDON AEI visual catalog: the converted engine shader packs as data.
// One registry of truth for theme verification, the Muse Spark prompts,
// the mock scorer and the opening-scene fallback. Import-safe by design:
// plain data only, so client pages, server routes and vitest all share it.
// Moods for Badman/Trance entries are verbatim from each shader's
// core-shaders metadata JSON; catalog.test.ts fails loudly if they drift.
// When a visual's id, name, tags or energy change, update this file AND the
// converted shader; the sync test fails loudly if they drift apart.
export interface CatalogEntry {
  id: string;
  name: string;
  themeTags: string[];
  energyRange: [number, number];
  moods: string[];
  /** Manifest-relative shader path, e.g. 'shaders/SignaturePack/01_aurora.frag'. */
  file: string;
}

function v(
  id: string,
  name: string,
  themeTags: string[],
  energyRange: [number, number],
  moods: string[],
  file: string,
): CatalogEntry {
  return { id, name, themeTags, energyRange, moods, file };
}

export const CATALOG: CatalogEntry[] = [
  v('BadmanExperiencePack/01_hellsmoke', 'Hellsmoke', ['badman', 'smoke', 'volumetric', 'ember'], [0.25, 0.75], ['dark', 'atmospheric', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/01_hellsmoke.frag'),
  v('BadmanExperiencePack/02_red_chapel', 'Red Chapel', ['badman', 'chapel', 'red', 'gothic'], [0.25, 0.75], ['cinematic', 'atmospheric', 'premium'], 'shaders/BadmanExperiencePack/shaders/02_red_chapel.frag'),
  v('BadmanExperiencePack/03_inferno_lasers', 'Inferno Lasers', ['badman', 'lasers', 'fire', 'inferno'], [0.5, 1], ['aggressive', 'premium', 'dark'], 'shaders/BadmanExperiencePack/shaders/03_inferno_lasers.frag'),
  v('BadmanExperiencePack/04_obsidian_tunnel', 'Obsidian Tunnel', ['badman', 'tunnel', 'obsidian', 'black'], [0.5, 1], ['hypnotic', 'dark', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/04_obsidian_tunnel.frag'),
  v('BadmanExperiencePack/05_blood_pulse', 'Blood Pulse', ['badman', 'pulse', 'blood', 'red'], [0.25, 0.75], ['atmospheric', 'aggressive', 'minimal'], 'shaders/BadmanExperiencePack/shaders/05_blood_pulse.frag'),
  v('BadmanExperiencePack/06_ember_field', 'Ember Field', ['badman', 'embers', 'fire', 'field'], [0, 0.45], ['atmospheric', 'premium', 'minimal'], 'shaders/BadmanExperiencePack/shaders/06_ember_field.frag'),
  v('BadmanExperiencePack/07_liquid_crimson', 'Liquid Crimson', ['badman', 'liquid', 'crimson', 'fluid'], [0.25, 0.75], ['atmospheric', 'luxury', 'cinematic'], 'shaders/BadmanExperiencePack/shaders/07_liquid_crimson.frag'),
  v('BadmanExperiencePack/08_black_sun', 'Black Sun', ['badman', 'sun', 'eclipse', 'black'], [0.5, 1], ['cinematic', 'aggressive', 'premium'], 'shaders/BadmanExperiencePack/shaders/08_black_sun.frag'),
  v('BadmanExperiencePack/09_rave_grid', 'Rave Grid', ['badman', 'grid', 'rave', 'geometric'], [0.5, 1], ['minimal', 'aggressive', 'dark'], 'shaders/BadmanExperiencePack/shaders/09_rave_grid.frag'),
  v('BadmanExperiencePack/10_void_temple', 'Void Temple', ['badman', 'temple', 'void', 'sacred'], [0, 0.45], ['luxury', 'cinematic', 'atmospheric'], 'shaders/BadmanExperiencePack/shaders/10_void_temple.frag'),
  v('BadmanExperiencePack/11_phantom_crowd', 'Phantom Crowd', ['badman', 'crowd', 'phantom', 'ghost'], [0.25, 0.75], ['atmospheric', 'dark', 'premium'], 'shaders/BadmanExperiencePack/shaders/11_phantom_crowd.frag'),
  v('BadmanExperiencePack/12_final_ascension', 'Final Ascension', ['badman', 'ascension', 'finale', 'light'], [0.7, 1], ['aggressive', 'immersive', 'hypnotic'], 'shaders/BadmanExperiencePack/shaders/12_final_ascension.frag'),
  v('BadmanExperiencePack/13_kinetic_colonnade', 'Kinetic Colonnade', ['badman', 'columns', 'kinetic', 'monumental'], [0.5, 1], ['hypnotic', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/13_kinetic_colonnade.frag'),
  v('BadmanExperiencePack/14_prism_vault', 'Prism Vault', ['badman', 'prism', 'vault', 'crystal'], [0.7, 1], ['hypnotic', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/14_prism_vault.frag'),
  v('BadmanExperiencePack/15_neon_skyline', 'Neon Skyline', ['badman', 'skyline', 'city', 'neon'], [0.5, 1], ['hypnotic', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/15_neon_skyline.frag'),
  v('BadmanExperiencePack/16_laser_canopy', 'Laser Canopy', ['badman', 'lasers', 'canopy', 'beams'], [0.7, 1], ['hypnotic', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/16_laser_canopy.frag'),
  v('BadmanExperiencePack/17_molten_dunes', 'Molten Dunes', ['badman', 'lava', 'dunes', 'desert'], [0.5, 1], ['hypnotic', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/17_molten_dunes.frag'),
  v('BadmanExperiencePack/18_bass_portals', 'Bass Portals', ['badman', 'portal', 'bass', 'vortex'], [0.7, 1], ['hypnotic', 'aggressive'], 'shaders/BadmanExperiencePack/shaders/18_bass_portals.frag'),
  v('FestivalPack/01_stage_lights', 'Stage Lights', ['festival', 'stage', 'lights', 'concert'], [0.5, 1], ['festive', 'bright', 'live'], 'shaders/FestivalPack/01_stage_lights.frag'),
  v('FestivalPack/02_crimson_haze', 'Crimson Haze', ['festival', 'haze', 'crimson', 'fog'], [0.25, 0.75], ['hazy', 'warm', 'atmospheric'], 'shaders/FestivalPack/02_crimson_haze.frag'),
  v('FestivalPack/03_festival_eq', 'Festival Eq', ['festival', 'equalizer', 'spectrum', 'live'], [0.5, 1], ['driving', 'rhythmic', 'loud'], 'shaders/FestivalPack/03_festival_eq.frag'),
  v('FestivalPack/04_jog_wheels', 'Jog Wheels', ['festival', 'decks', 'dj', 'vinyl'], [0.25, 0.75], ['playful', 'tactile', 'grooving'], 'shaders/FestivalPack/04_jog_wheels.frag'),
  v('FestivalPack/05_gold_ribbon', 'Gold Ribbon', ['festival', 'ribbon', 'gold', 'silk'], [0.25, 0.75], ['elegant', 'flowing', 'golden'], 'shaders/FestivalPack/05_gold_ribbon.frag'),
  v('FestivalPack/06_badman_emblem', 'Badman Emblem', ['festival', 'emblem', 'badman', 'sigil'], [0.5, 1], ['bold', 'dark', 'premium'], 'shaders/FestivalPack/06_badman_emblem.frag'),
  v('HypnoticPack/01_kaleido_tunnel', 'Kaleido Tunnel', ['hypnotic', 'kaleidoscope', 'tunnel', 'symmetry'], [0.5, 1], ['hypnotic', 'spinning', 'vivid'], 'shaders/HypnoticPack/01_kaleido_tunnel.frag'),
  v('HypnoticPack/02_apollonian', 'Apollonian', ['hypnotic', 'sun', 'radial', 'apollo'], [0.25, 0.75], ['radiant', 'balanced', 'solar'], 'shaders/HypnoticPack/02_apollonian.frag'),
  v('HypnoticPack/03_gyroid_lattice', 'Gyroid Lattice', ['hypnotic', 'lattice', 'gyroid', 'flow'], [0.25, 0.75], ['mathematical', 'flowing', 'deep'], 'shaders/HypnoticPack/03_gyroid_lattice.frag'),
  v('HypnoticPack/04_liquid_gold', 'Liquid Gold', ['hypnotic', 'liquid', 'gold', 'fluid'], [0.25, 0.75], ['liquid', 'rich', 'warm'], 'shaders/HypnoticPack/04_liquid_gold.frag'),
  v('HypnoticPack/05_hypno_spiral', 'Hypno Spiral', ['hypnotic', 'spiral', 'hypnosis', 'swirl'], [0.5, 1], ['hypnotic', 'dizzy', 'pulsing'], 'shaders/HypnoticPack/05_hypno_spiral.frag'),
  v('HypnoticPack/06_sacred_mandala', 'Sacred Mandala', ['hypnotic', 'mandala', 'sacred', 'symmetry'], [0, 0.45], ['calm', 'sacred', 'breathing'], 'shaders/HypnoticPack/06_sacred_mandala.frag'),
  v('PulsePack/01_kick_pump', 'Kick Pump', ['pulse', 'kick', 'pump', 'bass'], [0.7, 1], ['pounding', 'physical', 'relentless'], 'shaders/PulsePack/01_kick_pump.frag'),
  v('PulsePack/02_shock_rings', 'Shock Rings', ['pulse', 'rings', 'shockwave', 'blast'], [0.5, 1], ['explosive', 'expanding', 'sharp'], 'shaders/PulsePack/02_shock_rings.frag'),
  v('PulsePack/03_bass_heave', 'Bass Heave', ['pulse', 'bass', 'heave', 'sub'], [0.5, 1], ['heavy', 'rolling', 'deep'], 'shaders/PulsePack/03_bass_heave.frag'),
  v('PulsePack/04_tunnel_rush', 'Tunnel Rush', ['pulse', 'tunnel', 'rush', 'speed'], [0.5, 1], ['rushing', 'fast', 'vast'], 'shaders/PulsePack/04_tunnel_rush.frag'),
  v('PulsePack/05_prism_bloom', 'Prism Bloom', ['pulse', 'prism', 'bloom', 'glow'], [0.25, 0.75], ['blooming', 'colorful', 'soft'], 'shaders/PulsePack/05_prism_bloom.frag'),
  v('PulsePack/06_deep_void', 'Deep Void', ['pulse', 'void', 'deep', 'black'], [0, 0.45], ['dark', 'still', 'endless'], 'shaders/PulsePack/06_deep_void.frag'),
  v('SignaturePack/01_aurora', 'Aurora', ['signature', 'aurora', 'northern', 'lights'], [0.25, 0.75], ['flowing', 'polar', 'serene'], 'shaders/SignaturePack/01_aurora.frag'),
  v('SignaturePack/02_nebula', 'Nebula', ['signature', 'nebula', 'space', 'stars'], [0, 0.45], ['cosmic', 'drifting', 'vast'], 'shaders/SignaturePack/02_nebula.frag'),
  v('SignaturePack/03_matrix', 'Matrix', ['signature', 'matrix', 'code', 'rain'], [0.25, 0.75], ['digital', 'coded', 'restless'], 'shaders/SignaturePack/03_matrix.frag'),
  v('SignaturePack/04_liquid', 'Liquid', ['signature', 'liquid', 'fluid', 'chrome'], [0.25, 0.75], ['fluid', 'smooth', 'molten'], 'shaders/SignaturePack/04_liquid.frag'),
  v('SignaturePack/05_tunnel', 'Tunnel', ['signature', 'tunnel', 'warp', 'vortex'], [0.5, 1], ['rushing', 'deep', 'hypnotic'], 'shaders/SignaturePack/05_tunnel.frag'),
  v('SignaturePack/06_pulse', 'Pulse', ['signature', 'pulse', 'beat', 'heart'], [0.5, 1], ['beating', 'alive', 'rhythmic'], 'shaders/SignaturePack/06_pulse.frag'),
  v('SignaturePack/07_vortex', 'Vortex', ['signature', 'vortex', 'spiral', 'whirl'], [0.5, 1], ['spinning', 'sucking', 'wild'], 'shaders/SignaturePack/07_vortex.frag'),
  v('SignaturePack/08_laser_fan', 'Laser Fan', ['signature', 'lasers', 'fan', 'beams'], [0.7, 1], ['sharp', 'sweeping', 'electric'], 'shaders/SignaturePack/08_laser_fan.frag'),
  v('SignaturePack/09_mandala', 'Mandala', ['signature', 'mandala', 'symmetry', 'sacred'], [0, 0.45], ['meditative', 'symmetric', 'calm'], 'shaders/SignaturePack/09_mandala.frag'),
  v('SignaturePack/10_neon_lattice', 'Neon Lattice', ['signature', 'lattice', 'neon', 'grid'], [0.5, 1], ['electric', 'geometric', 'buzzing'], 'shaders/SignaturePack/10_neon_lattice.frag'),
  v('SignaturePack/11_bass_shockwave', 'Bass Shockwave', ['signature', 'shockwave', 'bass', 'blast'], [0.7, 1], ['seismic', 'heavy', 'shaking'], 'shaders/SignaturePack/11_bass_shockwave.frag'),
  v('SignaturePack/12_spectrum_ring', 'Spectrum Ring', ['signature', 'spectrum', 'ring', 'analyzer'], [0.25, 0.75], ['circular', 'musical', 'glowing'], 'shaders/SignaturePack/12_spectrum_ring.frag'),
  v('TranceExperiencePack/01_moonlit_velvet', 'Moonlit Velvet', ['trance', 'moon', 'velvet', 'night'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/01_moonlit_velvet.frag'),
  v('TranceExperiencePack/02_champagne_stars', 'Champagne Stars', ['trance', 'champagne', 'stars', 'bubbles'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/02_champagne_stars.frag'),
  v('TranceExperiencePack/03_cobalt_silk', 'Cobalt Silk', ['trance', 'cobalt', 'silk', 'blue'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/03_cobalt_silk.frag'),
  v('TranceExperiencePack/04_garden_mist', 'Garden Mist', ['trance', 'garden', 'mist', 'fog'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/04_garden_mist.frag'),
  v('TranceExperiencePack/05_slow_dance_rings', 'Slow Dance Rings', ['trance', 'dance', 'rings', 'slow'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/05_slow_dance_rings.frag'),
  v('TranceExperiencePack/06_crystal_goblet', 'Crystal Goblet', ['trance', 'crystal', 'goblet', 'glass'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/06_crystal_goblet.frag'),
  v('TranceExperiencePack/07_midnight_petals', 'Midnight Petals', ['trance', 'midnight', 'petals', 'flowers'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/07_midnight_petals.frag'),
  v('TranceExperiencePack/08_satin_lagoon', 'Satin Lagoon', ['trance', 'satin', 'lagoon', 'water'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/08_satin_lagoon.frag'),
  v('TranceExperiencePack/09_afterglow_balcony', 'Afterglow Balcony', ['trance', 'afterglow', 'balcony', 'dusk'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/09_afterglow_balcony.frag'),
  v('TranceExperiencePack/10_velour_orbit', 'Velour Orbit', ['trance', 'velour', 'orbit', 'satin'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/10_velour_orbit.frag'),
  v('TranceExperiencePack/11_blue_hour_smoke', 'Blue Hour Smoke', ['trance', 'smoke', 'dusk', 'blue'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/11_blue_hour_smoke.frag'),
  v('TranceExperiencePack/12_rose_gold_moon', 'Rose Gold Moon', ['trance', 'moon', 'rose', 'gold'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/12_rose_gold_moon.frag'),
  v('TranceExperiencePack/13_glass_rain', 'Glass Rain', ['trance', 'rain', 'glass', 'drops'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/13_glass_rain.frag'),
  v('TranceExperiencePack/14_dream_current', 'Dream Current', ['trance', 'dream', 'current', 'drift'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/14_dream_current.frag'),
  v('TranceExperiencePack/15_lounge_constellation', 'Lounge Constellation', ['trance', 'lounge', 'stars', 'constellation'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/15_lounge_constellation.frag'),
  v('TranceExperiencePack/16_violet_candlelight', 'Violet Candlelight', ['trance', 'candle', 'violet', 'flame'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/16_violet_candlelight.frag'),
  v('TranceExperiencePack/17_plum_horizon', 'Plum Horizon', ['trance', 'horizon', 'plum', 'dusk'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/17_plum_horizon.frag'),
  v('TranceExperiencePack/18_sapphire_breath', 'Sapphire Breath', ['trance', 'sapphire', 'breath', 'blue'], [0, 0.45], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/18_sapphire_breath.frag'),
  v('TranceExperiencePack/19_slow_bloom', 'Slow Bloom', ['trance', 'bloom', 'slow', 'flower'], [0.25, 0.75], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/19_slow_bloom.frag'),
  v('TranceExperiencePack/20_trance_ascension', 'TRANCE Ascension', ['trance', 'ascension', 'finale', 'anthem'], [0.7, 1], ['night', 'dreamy', 'classy', 'rnb', 'cocktail', 'outdoor', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/20_trance_ascension.frag'),
  v('TranceExperiencePack/21_pearl_tides', 'Pearl Tides', ['trance', 'pearl', 'tides', 'ocean'], [0, 0.45], ['dreamy', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/21_pearl_tides.frag'),
  v('TranceExperiencePack/22_lantern_drift', 'Lantern Drift', ['trance', 'lantern', 'drift', 'float'], [0, 0.45], ['dreamy', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/22_lantern_drift.frag'),
  v('TranceExperiencePack/23_silk_aurora', 'Silk Aurora', ['trance', 'silk', 'aurora', 'lights'], [0.25, 0.75], ['dreamy', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/23_silk_aurora.frag'),
  v('TranceExperiencePack/24_glass_garden', 'Glass Garden', ['trance', 'glass', 'garden', 'crystal'], [0.25, 0.75], ['dreamy', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/24_glass_garden.frag'),
  v('TranceExperiencePack/25_velvet_horizon', 'Velvet Horizon', ['trance', 'velvet', 'horizon', 'dusk'], [0, 0.45], ['dreamy', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/25_velvet_horizon.frag'),
  v('TranceExperiencePack/26_starlight_weave', 'Starlight Weave', ['trance', 'stars', 'weave', 'night'], [0.25, 0.75], ['dreamy', 'atmospheric'], 'shaders/TranceExperiencePack/shaders/26_starlight_weave.frag'),
  v('Signature3DPack/01_nano_hex_genesis', 'Nano Hex Genesis', ['3d-signature', 'hex', 'crystal', 'raymarch'], [0.7, 1], ['peak', 'drop', 'monumental'], 'shaders/Signature3DPack/01_nano_hex_genesis.frag'),
  v('Signature3DPack/02_liquid_mirror', 'Liquid Mirror', ['3d-signature', 'liquid', 'chrome', 'mirror'], [0.5, 1], ['flowing', 'luxury', 'peak'], 'shaders/Signature3DPack/02_liquid_mirror.frag'),
  v('Signature3DPack/03_particle_galaxy', 'Particle Galaxy 3D', ['3d-signature', 'particle', 'galaxy', 'spiral'], [0.7, 1], ['cosmic', 'peak', 'drop'], 'shaders/Signature3DPack/03_particle_galaxy.frag'),
  v('Signature3DPack/04_crystal_throne', 'Crystal Throne', ['3d-signature', 'crystal', 'throne', 'raymarch'], [0.5, 1], ['monumental', 'luxury', 'peak'], 'shaders/Signature3DPack/04_crystal_throne.frag'),
  v('Signature3DPack/05_hex_reactor', 'Hex Reactor Core', ['3d-signature', 'hex', 'reactor', 'energy'], [0.7, 1], ['driving', 'peak', 'drop'], 'shaders/Signature3DPack/05_hex_reactor.frag'),
  v('Signature3DPack/06_quartz_storm', 'Quartz Storm', ['3d-signature', 'crystal', 'storm', 'shards'], [0.5, 1], ['wild', 'bright', 'peak'], 'shaders/Signature3DPack/06_quartz_storm.frag'),
  v('Signature3DPack/07_chrome_tide', 'Chrome Tide', ['3d-signature', 'liquid', 'chrome', 'ocean'], [0.5, 1], ['flowing', 'vast', 'peak'], 'shaders/Signature3DPack/07_chrome_tide.frag'),
  v('Signature3DPack/08_mercury_bloom', 'Mercury Bloom', ['3d-signature', 'liquid', 'bloom', 'chrome'], [0.5, 1], ['elegant', 'unfolding', 'peak'], 'shaders/Signature3DPack/08_mercury_bloom.frag'),
  v('Signature3DPack/09_glass_tsunami', 'Glass Tsunami', ['3d-signature', 'liquid', 'wave', 'glass'], [0.7, 1], ['massive', 'peak', 'drop'], 'shaders/Signature3DPack/09_glass_tsunami.frag'),
  v('Signature3DPack/10_nebula_forge', 'Nebula Forge', ['3d-signature', 'particle', 'nebula', 'forge'], [0.5, 1], ['cosmic', 'forging', 'peak'], 'shaders/Signature3DPack/10_nebula_forge.frag'),
  v('Signature3DPack/11_orbital_swarm', 'Orbital Swarm', ['3d-signature', 'particle', 'orbital', 'swarm'], [0.7, 1], ['kinetic', 'peak', 'drop'], 'shaders/Signature3DPack/11_orbital_swarm.frag'),
  v('Signature3DPack/12_supernova_choir', 'Supernova Choir', ['3d-signature', 'particle', 'supernova', 'finale'], [0.7, 1], ['finale', 'peak', 'drop'], 'shaders/Signature3DPack/12_supernova_choir.frag'),
];

export const CATALOG_IDS: string[] = CATALOG.map((c) => c.id);

export function catalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.id === id);
}
