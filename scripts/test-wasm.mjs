// Headless sanity check for the compiled engine: npm run wasm:test
//
// Guards against the failure mode where the module loads and returns
// well-formed JSON that is quietly wrong - every game a draw, a bot winning
// 100%, seat swapping not actually swapping.

import createModule from '../public/wasm/catan.js';

const mod = await createModule();
const run = (a, b, n, seed, swap) =>
  JSON.parse(
    mod.ccall(
      'catan_run',
      'string',
      ['string', 'string', 'number', 'number', 'number'],
      [a, b, n, seed, swap],
    ),
  );

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ' - ' + detail : ''}`);
  if (!ok) failures++;
};

// --- roster ---
const bots = JSON.parse(mod.ccall('catan_bots', 'string', [], []));
check('bot roster parses', Array.isArray(bots) && bots.length === 11, `${bots.length} bots`);

// --- a real match completes ---
const t0 = performance.now();
const r = run('it5', 'rp', 60, 1, 1);
const ms = performance.now() - t0;
check('games all accounted for', r.winsA + r.winsB + r.draws === r.games, JSON.stringify(r));
check('games actually progress', r.turns / r.games > 5, `${(r.turns / r.games).toFixed(1)} turns/game`);
check('victory points are plausible', r.vpA / r.games > 1 && r.vpB / r.games > 1,
  `vpA=${(r.vpA / r.games).toFixed(1)} vpB=${(r.vpB / r.games).toFixed(1)}`);

// The headline claim: the tuned bot should beat random convincingly.
const it5Rate = r.winsA / r.games;
check('it5 beats random', it5Rate > 0.7, `it5 win rate ${(it5Rate * 100).toFixed(1)}%`);

// --- determinism ---
const again = run('it5', 'rp', 60, 1, 1);
check('same seed reproduces exactly', JSON.stringify(again) === JSON.stringify(r));
const other = run('it5', 'rp', 60, 999, 1);
check('different seed differs', JSON.stringify(other) !== JSON.stringify(r));

// --- symmetry: a bot against itself should be near 50/50 ---
const mirror = run('it5', 'it5', 120, 7, 1);
const skew = Math.abs(mirror.winsA - mirror.winsB) / mirror.games;
check('mirror match is roughly even', skew < 0.25,
  `${mirror.winsA}/${mirror.winsB} (skew ${(skew * 100).toFixed(0)}%)`);

// --- error handling ---
const bad = run('nope', 'rp', 10, 1, 1);
check('unknown bot rejected', typeof bad.error === 'string');

console.log(`\n${(60 / (ms / 1000)).toFixed(0)} games/sec (it5 vs rp, single thread)`);
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
