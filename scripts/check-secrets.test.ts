import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { findNonEmptyValues } from './check-secrets';

describe('findNonEmptyValues', () => {
  test('passes an all-empty template', () => {
    const text = '# comment\nAEI_LIVE=\nMODEL_API_KEY=\n\nMODAL_ANALYZE_TOKEN=\n';
    expect(findNonEmptyValues(text)).toEqual([]);
  });

  test('flags non-empty values with key and line', () => {
    const text = 'AEI_LIVE=\nMODEL_API_KEY=supersecret\nMETA_API_KEY=\n';
    expect(findNonEmptyValues(text)).toEqual([{ line: 2, key: 'MODEL_API_KEY' }]);
  });

  test('treats quoted-empty and whitespace-only as empty', () => {
    const text = 'A=""\nB=\'\'\nC=   \nD=  \n';
    expect(findNonEmptyValues(text)).toEqual([]);
  });

  test('flags padded values and tolerates CRLF', () => {
    const text = 'A=\r\nB=  x  \r\n';
    expect(findNonEmptyValues(text)).toEqual([{ line: 2, key: 'B' }]);
  });

  test('skips comments, blank lines, and non-assignment lines', () => {
    const text = '\n   # indented comment\njust some words\nEXPORT_ME=\n';
    expect(findNonEmptyValues(text)).toEqual([]);
  });

  test('the committed .env.example carries no values', () => {
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    const text = readFileSync(join(root, '.env.example'), 'utf8');
    expect(findNonEmptyValues(text)).toEqual([]);
  });
});
