// Fixed-seed benchmark for the WASM engine: npm run engine:bench
//
// Same matchups, same seeds, same counts every run, so two runs are directly
// comparable. Pass a label to tag the output, e.g.
//   npm run engine:bench -- baseline

import createModule from '../public/wasm/catan.js';

const label = process.argv[2] || 'run';

const mod = await createModule();
const run = (a, b, n, seed) =>
  JSON.parse(
    mod.ccall(
      'catan_run',
      'string',
      ['string', 'string', 'number', 'number', 'number'],
      [a, b, n, seed, 1],
    ),
  );

// Chosen to exercise different code paths: random flails for ~500 turns,
// the tuned bots end fast, alpha-beta hammers action generation recursively.
const cases = [
  { a: 'rp', b: 'rp', games: 300, seed: 11 },
  { a: 'it5', b: 'rp', games: 300, seed: 22 },
  { a: 'it5', b: 'cr', games: 300, seed: 33 },
  { a: 'it5', b: 'dev', games: 300, seed: 44 },
  { a: 'it4', b: 'it2', games: 300, seed: 55 },
  { a: 'ab', b: 'rp', games: 30, seed: 66 },
];

// One warm-up pass so JIT and heap growth do not land in the measurement.
run('it5', 'rp', 30, 1);

console.log(`\n=== ${label} ===`);
console.log('matchup        games     sec   games/s   winA%');

let totalGames = 0;
let totalSec = 0;

for (const c of cases) {
  const t0 = performance.now();
  const r = run(c.a, c.b, c.games, c.seed);
  const sec = (performance.now() - t0) / 1000;
  totalGames += c.games;
  totalSec += sec;
  console.log(
    `${(c.a + ' vs ' + c.b).padEnd(13)} ${String(c.games).padStart(5)} ${sec.toFixed(3).padStart(7)} ` +
      `${(c.games / sec).toFixed(1).padStart(9)} ${((r.winsA / r.games) * 100).toFixed(1).padStart(7)}`,
  );
}

console.log(`\nTOTAL ${totalGames} games in ${totalSec.toFixed(3)}s = ${(totalGames / totalSec).toFixed(1)} games/sec`);
