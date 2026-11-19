// VICE FRAME 2 — entry program for the gta6-cover-art-01 bounty.
//
// The app itself is the static site in app/ (open app/index.html in a
// desktop browser; it runs entirely offline). This program is the hand-in:
// it copies app/ and screenshots/ into the output directory and writes
// dossier.json there with make.fun's vendored library, so the scorer can
// read exactly what was submitted.
//
//   node main.ts                                  (writes to /output)
//   MAKEFUN_OUTPUT_DIR=out node main.ts           (writes to ./out)
//
// Try the app locally with:  node serve.ts        (then open the page)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps: at most 4 screenshots of 256 KiB each, at most 993
// entries and 48 MiB under app/, paths under app/ at most 1000 bytes, and
// 160 KiB of source text in the dossier.
const dossierBytes = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossierBytes);

console.log(`VICE FRAME 2 handed in: app/ + screenshots/ copied to ${out}, dossier.json ${dossierBytes.length} bytes`);
