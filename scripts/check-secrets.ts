// npm run check:secrets — pre-commit guard: .env.example must carry no values.
// Fails (exit 1) if any KEY= line has a non-empty value. Prints key names
// only, never values. Plain erasable TS so `node scripts/check-secrets.ts`
// runs it directly.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface SecretFinding {
  line: number;
  key: string;
}

// One finding per non-empty value. Blank lines and full-line comments are
// skipped; surrounding quotes and whitespace don't count as a value.
export function findNonEmptyValues(text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === '' || raw.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw);
    if (!m) continue; // not a KEY= line — not this check's business
    let value = m[2].trim();
    if (value.length >= 2) {
      const q = value[0];
      if ((q === '"' || q === "'") && value[value.length - 1] === q) value = value.slice(1, -1).trim();
    }
    if (value !== '') findings.push({ line: i + 1, key: m[1] });
  }
  return findings;
}

function main(): void {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const path = join(root, '.env.example');
  if (!existsSync(path)) {
    console.error('check:secrets FAIL — .env.example is missing');
    process.exit(1);
  }
  const findings = findNonEmptyValues(readFileSync(path, 'utf8'));
  if (findings.length > 0) {
    for (const f of findings) console.error(`check:secrets FAIL — ${f.key} has a value (line ${f.line})`);
    console.error('Scrub .env.example: every value must be empty. Real keys go ONLY in .env.local.');
    process.exit(1);
  }
  console.log('check:secrets OK — .env.example carries no values');
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
