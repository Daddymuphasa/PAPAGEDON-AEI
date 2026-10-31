import { describe, expect, test } from 'vitest';
import { mockTheme } from '../meta/mock';
import { MOCK_ART_H, MOCK_ART_W, mockArtSvg, mockImageDataUrl } from './mockArt';

describe('mockArt', () => {
  test('returns a decodable SVG data URL', () => {
    const url = mockImageDataUrl(mockTheme.palette, 'peak');
    expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const svg = atob(url.split(',')[1]);
    expect(svg).toContain('<svg');
    expect(svg).toContain(`width="${MOCK_ART_W}"`);
    expect(svg).toContain(`height="${MOCK_ART_H}"`);
  });

  test('artwork is built from the theme palette', () => {
    const svg = mockArtSvg(mockTheme.palette, 'build');
    for (const c of mockTheme.palette.slice(0, 2)) expect(svg).toContain(c);
  });

  test('is deterministic per tag and distinct across tags', () => {
    expect(mockImageDataUrl(mockTheme.palette, 'calm')).toBe(mockImageDataUrl(mockTheme.palette, 'calm'));
    const urls = (['calm', 'build', 'peak', 'drop'] as const).map((t) =>
      mockImageDataUrl(mockTheme.palette, t),
    );
    expect(new Set(urls).size).toBe(4);
  });

  test('survives a junk palette', () => {
    const url = mockImageDataUrl(['red', ''], 'drop');
    expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });
});
