// Genuine fixtures: payloads encoded by @meta-sam/parser's own codec,
// parsed back by the real decoder. Never hand-written mask bytes.
import { describe, expect, test } from 'vitest';
import { parseSamOutput } from './samParse';

const MASK_4X4 = "!!!!!'uJrc07V"; // 4x4 border ring
const BLOB_8X8 = "!!!!!-L9pf2mn=[J=`s"; // 8x8 centered blob
const BLOB_16X12 = "!!!!!3Ib8-(Y3:n4LEF&GLc))s"; // 16x12 blob

const TWO_OBJECTS =
  '<0f>0<|box;x1=64;y1=48;x2=127;y2=95;w=640;h=480|>' +
  '<|mask;x=0;y=0;data=4,4,' +
  MASK_4X4 +
  '|>,' +
  '1<|box;x1=0;y1=400;x2=639;y2=479;w=640;h=480;c=0.9|>' +
  '<|mask;x=0;y=0;data=8,8,' +
  BLOB_8X8 +
  '|>\n';

describe('parseSamOutput', () => {
  test('empty output is a valid zero-match result', async () => {
    expect(await parseSamOutput('', 640, 480)).toEqual({ objects: [], count: 0, diagnostics: [] });
    expect(await parseSamOutput('  \n ', 640, 480)).toEqual({ objects: [], count: 0, diagnostics: [] });
  });

  test('parses boxes normalized to the frame', async () => {
    const r = await parseSamOutput(TWO_OBJECTS, 640, 480);
    expect(r.count).toBe(2);
    expect(r.diagnostics).toEqual([]);
    expect(r.objects[0].box).toMatchObject({ x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 });
    expect(r.objects[1].box).toMatchObject({ x0: 0, x1: 1 });
    expect(r.objects[1].box.y0).toBeCloseTo(400 / 480, 6);
    expect(r.objects[1].box.y1).toBe(1);
    expect(r.objects[1].confidence).toBe(0.9);
  });

  test('decodes genuine mask payloads', async () => {
    const r = await parseSamOutput(TWO_OBJECTS, 640, 480);
    expect(r.objects[0].mask?.w).toBe(4);
    expect(r.objects[0].mask?.h).toBe(4);
    expect(Array.from(r.objects[0].mask?.raster ?? []).join('')).toBe('1111100110011111');
    expect(r.objects[1].mask?.w).toBe(8);
    expect(r.objects[1].mask?.h).toBe(8);
  });

  test('parses without a trailing newline', async () => {
    const r = await parseSamOutput(TWO_OBJECTS.trimEnd(), 640, 480);
    expect(r.count).toBe(2);
  });

  test('out-of-range boxes are dropped with a diagnostic', async () => {
    const bad =
      '<0f>0<|box;x1=0;y1=0;x2=999;y2=10;w=640;h=480|>' +
      '<|mask;x=0;y=0;data=16,12,' +
      BLOB_16X12 +
      '|>\n';
    const r = await parseSamOutput(bad, 640, 480);
    expect(r.count).toBe(0);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });

  test('a corrupt mask keeps the box and reports', async () => {
    const bad =
      '<0f>0<|box;x1=64;y1=48;x2=127;y2=95;w=640;h=480|>' + '<|mask;x=0;y=0;data=4,4,!!!!!zzzz|>\n';
    const r = await parseSamOutput(bad, 640, 480);
    expect(r.count).toBe(1);
    expect(r.objects[0].mask).toBeNull();
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });

  test('non-segmentation text is zero matches, not a crash', async () => {
    const r = await parseSamOutput('hello world', 640, 480);
    expect(r.count).toBe(0);
    expect(r.objects).toEqual([]);
  });
});
