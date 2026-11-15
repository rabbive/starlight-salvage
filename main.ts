// Starlight Salvage — entrypoint for the make.fun dossier build.
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json from them, using the kit's buildDossier (vendor/makefun-game.ts).
// Node standard library only; run with: node main.ts

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function main(): void {
  // Start from a clean output directory so stale files never leak in.
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outputDir, caps);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);

  console.log(`Wrote ${join(outputDir, 'dossier.json')} (${dossier.length} bytes)`);
}

main();
