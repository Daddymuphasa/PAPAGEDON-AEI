import { describe, expect, test } from 'vitest';
import { BASE_PATH, withBasePath } from './basePath';

describe('withBasePath', () => {
  test('prefixes root-absolute paths with the deploy base path', () => {
    expect(withBasePath('/gallery')).toBe(`${BASE_PATH}/gallery`);
    expect(withBasePath('/api/theme')).toBe(`${BASE_PATH}/api/theme`);
  });

  test('adds a missing leading slash', () => {
    expect(withBasePath('gallery')).toBe(`${BASE_PATH}/gallery`);
  });

  test('base path matches the /meta mount', () => {
    expect(BASE_PATH).toBe('/meta');
  });
});
