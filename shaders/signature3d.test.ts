import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from './catalog';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const core = join(root, 'public', 'papagedon-core');

const PACK = CATALOG.filter((c) => c.id.startsWith('Signature3DPack/'));

// Renderer uniforms (src/lib/papagedon/renderer.ts UNIFORMS): the only
// uniform names a pack shader may use.
const RENDERER_UNIFORMS = [
  'uTime', 'uResolution', 'uEnergy', 'uIntensity', 'uBass', 'uMid', 'uTreble', 'uBeat', 'uMood',
  'uPrimaryColour', 'uSecondaryColour', 'uAccentColour', 'uBackground', 'uGlow', 'uBloom', 'uMotion',
  'uNoise', 'uDistortion', 'uSaturationBase', 'uSaturationScale', 'uDetail', 'uMasterBrightness',
  'uMasterGlow', 'uMasterExposure', 'uEvolutionPhase', 'uSpectrum',
];

// Core audio set: every 3D visual must react to bands, beat and spectrum.
const CORE_AUDIO = ['uBass', 'uMid', 'uTreble', 'uBeat', 'uSpectrum'];

function sourceOf(id: string): string {
  const entry = PACK.find((c) => c.id === id);
  if (!entry) throw new Error(`missing pack entry: ${id}`);
  return readFileSync(join(core, entry.file), 'utf8');
}

function stripComments(src: string): string {
  return src
    .split('\n')
    .map((line) => {
      const cut = line.indexOf('//');
      return cut >= 0 ? line.slice(0, cut) : line;
    })
    .join('\n');
}

function stripUniformDecls(src: string): string {
  return src
    .split('\n')
    .filter((line) => !/^\s*uniform\s/.test(line))
    .join('\n');
}

describe('Signature3D pack static checks', () => {
  test('pack holds the 12 registered 3D visuals', () => {
    expect(PACK.map((c) => c.id).sort()).toEqual(
      [
        'Signature3DPack/01_nano_hex_genesis',
        'Signature3DPack/02_liquid_mirror',
        'Signature3DPack/03_particle_galaxy',
        'Signature3DPack/04_crystal_throne',
        'Signature3DPack/05_hex_reactor',
        'Signature3DPack/06_quartz_storm',
        'Signature3DPack/07_chrome_tide',
        'Signature3DPack/08_mercury_bloom',
        'Signature3DPack/09_glass_tsunami',
        'Signature3DPack/10_nebula_forge',
        'Signature3DPack/11_orbital_swarm',
        'Signature3DPack/12_supernova_choir',
      ].sort(),
    );
  });

  test('every used renderer uniform is declared', () => {
    for (const c of PACK) {
      const body = stripUniformDecls(stripComments(sourceOf(c.id)));
      const declared = new Set(
        [...sourceOf(c.id).matchAll(/^\s*uniform\s+\w+\s+(\w+)\s*;/gm)].map((m) => m[1]),
      );
      for (const name of RENDERER_UNIFORMS) {
        if (new RegExp(`\\b${name}\\b`).test(body)) {
          expect(declared.has(name), `${c.id}: uses ${name} without declaring it`).toBe(true);
        }
      }
    }
  });

  test('each visual uses the core audio set', () => {
    for (const c of PACK) {
      const body = stripUniformDecls(stripComments(sourceOf(c.id)));
      for (const name of CORE_AUDIO) {
        expect(new RegExp(`\\b${name}\\b`).test(body), `${c.id}: missing ${name}`).toBe(true);
      }
    }
  });

  test('uDetail feeds counts only, never the look', () => {
    for (const c of PACK) {
      const lines = stripUniformDecls(stripComments(sourceOf(c.id))).split('\n');
      for (const line of lines) {
        if (!line.includes('uDetail')) continue;
        expect(/int\s*\(\s*mix\(/.test(line), `${c.id}: uDetail outside a count: ${line.trim()}`).toBe(true);
      }
    }
  });

  test('no hard-white constants (beat swell stays in the theme palette)', () => {
    for (const c of PACK) {
      const body = stripComments(sourceOf(c.id));
      expect(/vec3\(\s*1(\.0+)?\s*\)/.test(body), `${c.id}: hard white vec3`).toBe(false);
      expect(/vec4\(\s*1(\.0+)?\s*\)/.test(body), `${c.id}: hard white vec4`).toBe(false);
    }
  });

  test('braces and parentheses balance', () => {
    for (const c of PACK) {
      const body = stripComments(sourceOf(c.id));
      const count = (ch: string) => body.split(ch).length - 1;
      expect(count('{') - count('}'), `${c.id}: unbalanced braces`).toBe(0);
      expect(count('(') - count(')'), `${c.id}: unbalanced parens`).toBe(0);
    }
  });
});
