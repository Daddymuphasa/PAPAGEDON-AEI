import { describe, expect, test } from 'vitest';
import { CATALOG } from '../../shaders/catalog';
import { ENGINE_DEFS, ENGINE_PARAMS, engineDef } from './engineDefs';

describe('engine defs', () => {
  test('one def per catalog entry with the shared engine params', () => {
    expect(ENGINE_DEFS.length).toBe(CATALOG.length);
    expect(ENGINE_DEFS.length).toBe(86);
    for (const d of ENGINE_DEFS) {
      expect(d.params?.length).toBe(3);
      for (const [i, p] of (d.params ?? []).entries()) {
        expect(p.key).toBe(ENGINE_PARAMS[i].key);
        expect(p.min).toBe(ENGINE_PARAMS[i].min);
        expect(p.max).toBe(ENGINE_PARAMS[i].max);
        expect(p.def).toBeGreaterThanOrEqual(p.min);
        expect(p.def).toBeLessThanOrEqual(p.max);
      }
      expect(d.meta).toBeDefined();
      expect(d.meta?.energyRange.length).toBe(2);
    }
  });

  test('engineDef looks up by id', () => {
    expect(engineDef('SignaturePack/01_aurora')?.name).toBe('Aurora');
    expect(engineDef('nope')).toBeUndefined();
  });
});
