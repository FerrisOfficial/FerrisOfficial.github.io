// Regenerates public/og.png - the social preview card.
// Run with: npm run og
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="spine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0"/>
      <stop offset="18%" stop-color="#2dd4bf" stop-opacity="1"/>
      <stop offset="78%" stop-color="#8b7bf7" stop-opacity="1"/>
      <stop offset="100%" stop-color="#8b7bf7" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.12" r="0.75">
      <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#08080a"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- timeline spine motif -->
  <rect x="96" y="70" width="3" height="490" rx="1.5" fill="url(#spine)"/>
  <circle cx="97.5" cy="188" r="8" fill="#08080a" stroke="#2dd4bf" stroke-width="3"/>
  <circle cx="97.5" cy="300" r="11" fill="#2dd4bf"/>
  <circle cx="97.5" cy="404" r="8" fill="#08080a" stroke="#8b7bf7" stroke-width="3"/>
  <circle cx="97.5" cy="486" r="5" fill="#8b7bf7" opacity="0.55"/>

  <text x="152" y="200" font-family="Consolas, 'Courier New', monospace" font-size="21"
        letter-spacing="3" fill="#8d8d9b">C++ · PYTHON · BACKEND · ML</text>

  <text x="150" y="300" font-family="'Segoe UI Semibold', 'Segoe UI', Arial, sans-serif"
        font-size="82" font-weight="600" letter-spacing="-2" fill="#f1f1f3">Maciej Stempniak</text>

  <text x="152" y="362" font-family="Consolas, 'Courier New', monospace" font-size="30"
        fill="#2dd4bf">Backend &amp; Systems Engineer</text>

  <text x="152" y="437" font-family="'Segoe UI', Arial, sans-serif" font-size="25" fill="#9d9daa">
    5G RAN energy efficiency at Nokia · production backend
  </text>
  <text x="152" y="474" font-family="'Segoe UI', Arial, sans-serif" font-size="25" fill="#9d9daa">
    systems · machine learning for medical imaging
  </text>

  <text x="152" y="546" font-family="Consolas, 'Courier New', monospace" font-size="21" fill="#6b6b78">
    github.com/FerrisOfficial
  </text>
</svg>`;

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');
const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(out, png);
console.log(`wrote ${out} (${(png.length / 1024).toFixed(1)} kB)`);
