// PAPAGEDON AEI visual catalog: every playable visual as plain data.
// One registry of truth for theme verification, the Muse Spark prompts,
// the mock scorer and the opening-scene fallback. Import-safe by design:
// no .glsl imports, so client pages, server routes and vitest all share it.
// When a visual's id, name, tags or energy change, update this file AND the
// definition; catalog.test.ts fails loudly if they drift apart.
export interface CatalogEntry {
  id: string;
  name: string;
  themeTags: string[];
  energyRange: [number, number];
  moods: string[];
  /** True for three.js geometry scenes, false for fragment shaders. */
  is3D: boolean;
  /** Definition file, repo-relative, for the sync test. */
  file: string;
}

function v(
  id: string,
  name: string,
  themeTags: string[],
  energyRange: [number, number],
  moods: string[],
  file: string,
  is3D = false,
): CatalogEntry {
  return { id, name, themeTags, energyRange, moods, is3D, file };
}

// Order matches the page DEFS arrays (m3 flagships first, 3D scenes last)
// so index-0 fallbacks agree everywhere.
export const CATALOG: CatalogEntry[] = [
  v('hex-core', 'Hex Core', ['geometric', 'core', 'neon'], [0.3, 0.9], ['focused', 'driving', 'bright'], 'shaders/m3/hex-core.ts'),
  v('aegis-scales', 'Aegis Scales', ['armor', 'metallic', 'dark'], [0.2, 0.7], ['strong', 'dark', 'sleek'], 'shaders/m3/aegis-scales.ts'),
  v('circuit-veins', 'Circuit Veins', ['tech', 'circuit', 'neon'], [0.3, 0.8], ['electric', 'restless', 'sharp'], 'shaders/m3/circuit-veins.ts'),
  v('warp-tunnel', 'Warp Tunnel', ['tunnel', 'fast', 'cosmic'], [0.5, 1.0], ['rushing', 'vast', 'intense'], 'shaders/m3/warp-tunnel.ts'),
  v('prism-burst', 'Prism Burst', ['prism', 'burst', 'colorful'], [0.5, 1.0], ['explosive', 'joyful', 'bright'], 'shaders/m3/prism-burst.ts'),
  v('nano-hex', 'Nano Hex', ['geometric', 'neon', 'minimal'], [0.2, 0.8], ['precise', 'electric', 'hypnotic'], 'shaders/batch0/nano-hex.ts'),
  v('particle-galaxy', 'Particle Galaxy', ['cosmic', 'vast', 'dreamy'], [0.1, 0.9], ['wonder', 'euphoric', 'vast'], 'shaders/batch0/particle-galaxy.ts'),
  v('liquid-mirror', 'Liquid Mirror', ['fluid', 'chrome', 'luxe'], [0.2, 0.7], ['smooth', 'liquid', 'premium'], 'shaders/batch0/liquid-mirror.ts'),
  v('ember-field', 'Ember Field', ['fire', 'night', 'organic'], [0.1, 0.8], ['warm', 'wild', 'alive'], 'shaders/batch0/ember-field.ts'),
  v('final-ascension', 'Final Ascension', ['portal', 'finale', 'light'], [0.5, 1.0], ['triumphant', 'transcendent', 'euphoric'], 'shaders/batch0/final-ascension.ts'),
  v('kinetic-colonnade', 'Kinetic Colonnade', ['architecture', 'monumental', '3d'], [0.4, 1.0], ['powerful', 'monumental', 'driving'], 'shaders/batch0/kinetic-colonnade.ts'),
  v('molten-dunes', 'Molten Dunes', ['lava', 'desert', 'slow'], [0.1, 0.6], ['ancient', 'hot', 'heavy'], 'shaders/batch0/molten-dunes.ts'),
  v('bass-portal', 'Bass Portal', ['portal', 'bass', 'hypnotic'], [0.4, 1.0], ['deep', 'heavy', 'hypnotic'], 'shaders/batch0/bass-portal.ts'),
  v('log-drum-waves', 'Log Drum Waves', ['amapiano', 'terrain', 'bass'], [0.4, 1.0], ['deep', 'rolling', 'heavy'], 'shaders/batch1/log-drum-waves.ts'),
  v('uli-lines', 'Uli Lines', ['igbo', 'line-art', 'minimal'], [0.1, 0.6], ['elegant', 'flowing', 'calm'], 'shaders/batch1/uli-lines.ts'),
  v('adire-indigo', 'Adire Indigo', ['yoruba', 'textile', 'indigo'], [0.2, 0.7], ['dreamy', 'organic', 'warm'], 'shaders/batch1/adire-indigo.ts'),
  v('ankara-kaleido', 'Ankara Kaleido', ['wax-print', 'bold', 'celebration'], [0.5, 1.0], ['festive', 'vivid', 'driving'], 'shaders/batch1/ankara-kaleido.ts'),
  v('lagos-night-drive', 'Lagos Night Drive', ['city', 'neon', 'night'], [0.3, 0.9], ['fast', 'electric', 'urban'], 'shaders/batch1/lagos-night-drive.ts'),
  v('talking-drum-rings', 'Talking Drum Rings', ['yoruba', 'drums', 'rings'], [0.3, 0.8], ['vocal', 'elastic', 'playful'], 'shaders/batch1/talking-drum-rings.ts'),
  v('gold-dust-highlife', 'Gold Dust Highlife', ['highlife', 'gold', 'celebration'], [0.2, 0.8], ['joyful', 'shimmering', 'warm'], 'shaders/batch1/gold-dust-highlife.ts'),
  v('shekere-beads', 'Shekere Beads', ['percussion', 'beads', 'rattle'], [0.5, 1.0], ['shaking', 'bright', 'restless'], 'shaders/batch1/shekere-beads.ts'),
  v('savanna-sunset-pulse', 'Savanna Sunset Pulse', ['sunset', 'savanna', 'calm'], [0.1, 0.5], ['peaceful', 'golden', 'open'], 'shaders/batch1/savanna-sunset-pulse.ts'),
  v('masquerade-spirit', 'Masquerade Spirit', ['masquerade', 'spirit', 'symmetric'], [0.4, 0.9], ['mystical', 'powerful', 'shifting'], 'shaders/batch1/masquerade-spirit.ts'),
  v('strobe-lattice', 'Strobe Lattice', ['laser', 'techno', 'strobe'], [0.6, 1.0], ['snapping', 'hard', 'electric'], 'shaders/batch2/strobe-lattice.ts'),
  v('laser-cathedral', 'Laser Cathedral', ['laser', 'volumetric', 'anthem'], [0.4, 0.9], ['soaring', 'vast', 'sacred'], 'shaders/batch2/laser-cathedral.ts'),
  v('acid-fold', 'Acid Fold', ['acid', '303', 'trippy'], [0.5, 1.0], ['melting', 'wild', 'squelchy'], 'shaders/batch2/acid-fold.ts'),
  v('trance-horizon', 'Trance Horizon', ['trance', 'horizon', 'euphoric'], [0.4, 1.0], ['uplifting', 'endless', 'glowing'], 'shaders/batch2/trance-horizon.ts'),
  v('infinite-corridor', 'Infinite Corridor', ['tunnel', 'mirror', 'rush'], [0.4, 0.9], ['rushing', 'deep', 'propulsive'], 'shaders/batch2/infinite-corridor.ts'),
  v('glitch-grid', 'Glitch Grid', ['glitch', 'digital', 'snare'], [0.5, 1.0], ['broken', 'sharp', 'chaotic'], 'shaders/batch2/glitch-grid.ts'),
  v('warehouse-fog', 'Warehouse Fog', ['fog', 'warehouse', 'moody'], [0.2, 0.7], ['dark', 'heavy', 'patient'], 'shaders/batch2/warehouse-fog.ts'),
  v('hypno-spiral', 'Hypno Spiral', ['spiral', 'hypnotic', 'bpm'], [0.3, 0.8], ['dizzy', 'looping', 'deep'], 'shaders/batch2/hypno-spiral.ts'),
  v('bass-fracture', 'Bass Fracture', ['drop', 'shards', 'impact'], [0.6, 1.0], ['shattering', 'huge', 'violent'], 'shaders/batch2/bass-fracture.ts'),
  v('euphoria-rays', 'Euphoria Rays', ['god-rays', 'peak', 'euphoric'], [0.5, 1.0], ['bursting', 'holy', 'peak'], 'shaders/batch2/euphoria-rays.ts'),
  v('heavenly-light', 'Heavenly Light', ['gospel', 'light', 'choir'], [0.2, 0.7], ['soft', 'lifting', 'holy'], 'shaders/batch3/heavenly-light.ts'),
  v('stained-glass-bloom', 'Stained Glass Bloom', ['church', 'glass', 'bloom'], [0.2, 0.6], ['slow', 'glowing', 'still'], 'shaders/batch3/stained-glass-bloom.ts'),
  v('rising-doves', 'Rising Doves', ['doves', 'peace', 'wedding'], [0.1, 0.5], ['gentle', 'rising', 'pure'], 'shaders/batch3/rising-doves.ts'),
  v('glory-clouds', 'Glory Clouds', ['gospel', 'clouds', 'gold'], [0.3, 0.8], ['parting', 'bright', 'hopeful'], 'shaders/batch3/glory-clouds.ts'),
  v('candle-field', 'Candle Field', ['candles', 'vigil', 'warm'], [0.1, 0.5], ['quiet', 'flickering', 'tender'], 'shaders/batch3/candle-field.ts'),
  v('rose-petal-fall', 'Rose Petal Fall', ['wedding', 'petals', 'romance'], [0.2, 0.6], ['soft', 'falling', 'sweet'], 'shaders/batch3/rose-petal-fall.ts'),
  v('gold-ring-halo', 'Gold Ring Halo', ['wedding', 'rings', 'gold'], [0.3, 0.8], ['joining', 'shining', 'eternal'], 'shaders/batch3/gold-ring-halo.ts'),
  v('silk-ribbon-dance', 'Silk Ribbon Dance', ['silk', 'dance', 'flowing'], [0.2, 0.7], ['graceful', 'waving', 'soft'], 'shaders/batch3/silk-ribbon-dance.ts'),
  v('crystal-chandelier', 'Crystal Chandelier', ['crystal', 'chandelier', 'sparkle'], [0.3, 0.8], ['glittering', 'grand', 'bright'], 'shaders/batch3/crystal-chandelier.ts'),
  v('dawn-breaks', 'Dawn Breaks', ['dawn', 'sunrise', 'worship'], [0.2, 0.8], ['breaking', 'fresh', 'rising'], 'shaders/batch3/dawn-breaks.ts'),
  v('nebula-breath', 'Nebula Breath', ['cosmic', 'nebula', 'vast'], [0.2, 0.7], ['breathing', 'deep', 'endless'], 'shaders/batch4/nebula-breath.ts'),
  v('aurora-curtain', 'Aurora Curtain', ['aurora', 'night-sky', 'polar'], [0.2, 0.7], ['flowing', 'cold', 'magic'], 'shaders/batch4/aurora-curtain.ts'),
  v('black-hole-lens', 'Black Hole Lens', ['cosmic', 'gravity', 'dark'], [0.4, 0.9], ['pulling', 'heavy', 'void'], 'shaders/batch4/black-hole-lens.ts'),
  v('starfield-warp', 'Starfield Warp', ['cosmic', 'hyperspace', 'drop'], [0.5, 1.0], ['rushing', 'fast', 'warping'], 'shaders/batch4/starfield-warp.ts'),
  v('planet-rings', 'Planet Rings', ['cosmic', 'planet', 'orbit'], [0.2, 0.6], ['floating', 'calm', 'round'], 'shaders/batch4/planet-rings.ts'),
  v('ocean-swell', 'Ocean Swell', ['ocean', 'waves', 'water'], [0.3, 0.8], ['rolling', 'wide', 'breathing'], 'shaders/batch4/ocean-swell.ts'),
  v('rainforest-canopy', 'Rainforest Canopy', ['forest', 'leaves', 'shade'], [0.2, 0.6], ['dappled', 'humid', 'alive'], 'shaders/batch4/rainforest-canopy.ts'),
  v('lightning-storm', 'Lightning Storm', ['storm', 'lightning', 'strike'], [0.5, 1.0], ['cracking', 'sudden', 'electric'], 'shaders/batch4/lightning-storm.ts'),
  v('lava-flow', 'Lava Flow', ['lava', 'volcano', 'heat'], [0.4, 0.9], ['molten', 'slow', 'burning'], 'shaders/batch4/lava-flow.ts'),
  v('fireflies-night', 'Fireflies Night', ['night', 'fireflies', 'meadow'], [0.1, 0.5], ['twinkling', 'quiet', 'soft'], 'shaders/batch4/fireflies-night.ts'),
  v('synthwave-sun', 'Synthwave Sun', ['retro', 'synthwave', '80s'], [0.3, 0.8], ['driving', 'neon', 'nostalgic'], 'shaders/batch5/synthwave-sun.ts'),
  v('vhs-glitch', 'VHS Glitch', ['retro', 'vhs', 'lofi'], [0.2, 0.7], ['gritty', 'worn', 'analog'], 'shaders/batch5/vhs-glitch.ts'),
  v('arcade-pixels', 'Arcade Pixels', ['retro', 'arcade', 'pixel'], [0.4, 0.9], ['playful', 'chunky', 'fun'], 'shaders/batch5/arcade-pixels.ts'),
  v('boombox-bars', 'Boombox Bars', ['hip-hop', 'eq', 'boombox'], [0.4, 1.0], ['pumping', 'bold', 'loud'], 'shaders/batch5/boombox-bars.ts'),
  v('graffiti-drip', 'Graffiti Drip', ['hip-hop', 'graffiti', 'street'], [0.4, 0.9], ['raw', 'dripping', 'bold'], 'shaders/batch5/graffiti-drip.ts'),
  v('vinyl-spin', 'Vinyl Spin', ['hip-hop', 'vinyl', 'dj'], [0.3, 0.8], ['spinning', 'smooth', 'classic'], 'shaders/batch5/vinyl-spin.ts'),
  v('festival-lasers', 'Festival Lasers', ['festival', 'lasers', 'crowd'], [0.5, 1.0], ['massive', 'sweeping', 'hot'], 'shaders/batch5/festival-lasers.ts'),
  v('confetti-burst', 'Confetti Burst', ['festival', 'confetti', 'party'], [0.5, 1.0], ['exploding', 'joyful', 'loud'], 'shaders/batch5/confetti-burst.ts'),
  v('firework-bloom', 'Firework Bloom', ['festival', 'fireworks', 'finale'], [0.5, 1.0], ['blooming', 'grand', 'peak'], 'shaders/batch5/firework-bloom.ts'),
  v('main-stage-wall', 'Main Stage Wall', ['festival', 'led-wall', 'mainstage'], [0.5, 1.0], ['flashing', 'huge', 'driving'], 'shaders/batch5/main-stage-wall.ts'),
  v('planet-rings-3d', 'Planet Rings 3D', ['cosmic', 'planet', 'orbit'], [0.2, 0.7], ['floating', 'vast', 'slow'], 'scenes/pack3d/planet-rings-3d.ts', true),
  v('neon-tunnel-3d', 'Neon Tunnel 3D', ['tunnel', 'neon', 'rush'], [0.4, 1.0], ['rushing', 'deep', 'fast'], 'scenes/pack3d/neon-tunnel-3d.ts', true),
];

/** Every playable visual id, for theme verification and model prompts. */
export const CATALOG_IDS: string[] = CATALOG.map((c) => c.id);

export function catalogById(id: string): CatalogEntry | null {
  return CATALOG.find((c) => c.id === id) ?? null;
}
