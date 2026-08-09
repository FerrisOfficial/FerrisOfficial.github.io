// Compiles the CatanAPI engine to WebAssembly for the in-page tournament demo.
//
//   npm run wasm
//
// The engine lives in its own repository, so this clones it into .engine/
// (gitignored) rather than vendoring a second copy of the source. The compiled
// artifacts ARE committed, under public/wasm/, so GitHub Pages can serve the
// site without Emscripten anywhere in the deploy path.
//
// Requires the Emscripten SDK. Point EMSDK at it if it is not in the default
// location, or put em++ on PATH.

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engineDir = join(root, '.engine', 'CatanAPI');
const outDir = join(root, 'public', 'wasm');

const REPO = 'https://github.com/FerrisOfficial/CatanAPI';
const EMSDK = process.env.EMSDK || join(process.env.USERPROFILE || process.env.HOME || '', 'emsdk');

function findEmxx() {
  const candidates = [
    join(EMSDK, 'upstream', 'emscripten', process.platform === 'win32' ? 'em++.exe' : 'em++'),
    join(EMSDK, 'upstream', 'emscripten', 'em++.bat'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return 'em++'; // fall back to PATH
}

// --- 1. Engine source -------------------------------------------------------

if (!existsSync(engineDir)) {
  console.log('Cloning engine…');
  mkdirSync(dirname(engineDir), { recursive: true });
  execSync(`git clone --depth 1 ${REPO} "${engineDir}"`, { stdio: 'inherit' });
} else {
  console.log('Updating engine…');
  try {
    execSync('git pull --ff-only', { cwd: engineDir, stdio: 'inherit' });
  } catch {
    console.warn('  (pull failed — building against the existing checkout)');
  }
}

// --- 2. Source list ---------------------------------------------------------
// Mirrors game_simulation/CMakeLists.txt and players/CMakeLists.txt. The
// parametric bots are excluded on purpose: they load tuned weights from disk,
// which cannot follow the binary into a browser.

const sources = [
  'game_simulation/game.cpp',
  'game_simulation/board.cpp',
  'game_simulation/board_generate_actions.cpp',
  'utils/dumper.cpp',
  'players/player.cpp',
  'players/playerHelpers.cpp',
  'players/randomPlayer.cpp',
  'players/roadPlayer.cpp',
  'players/itPlayers/it1Player.cpp',
  'players/itPlayers/it2Player.cpp',
  'players/itPlayers/it3Player.cpp',
  'players/itPlayers/it4Player.cpp',
  'players/itPlayers/it5Player.cpp',
  'players/oneTacticPlayers/devPlayer.cpp',
  'players/oneTacticPlayers/alphaBetaPlayer.cpp',
  'players/oneTacticPlayers/oneResourcePlayer.cpp',
  'players/oneTacticPlayers/cityRushPlayer.cpp',
].map((p) => join(engineDir, p));

const missing = sources.filter((s) => !existsSync(s));
if (missing.length) {
  console.error('Missing engine sources — has the layout changed upstream?');
  for (const m of missing) console.error('  ' + m);
  process.exit(1);
}

sources.push(join(root, 'wasm', 'catan_wasm.cpp'));

// --- 3. Compile -------------------------------------------------------------

mkdirSync(outDir, { recursive: true });

const args = [
  ...sources,
  '-o', join(outDir, 'catan.js'),
  '-std=c++20',
  '-O3',
  // The engine's per-callback "did the bot mutate the board?" guard costs a
  // full BoardState copy and deep compare every time. It is worth it while
  // developing bots; here the bots are fixed and already covered by the test
  // suite, which keeps the guard enabled.
  // Set CATAN_GUARD=1 to build with it on, for A/B measurement.
  ...(process.env.CATAN_GUARD === '1' ? [] : ['-DCATAN_VALIDATE_PLAYERS=0']),
  `-I${engineDir}`,
  `-I${join(engineDir, 'game_simulation')}`,
  `-I${join(engineDir, 'players')}`,
  `-I${join(engineDir, 'utils')}`,
  // Single self-contained ES module, loadable from a worker.
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  // node is included so the module can be exercised headlessly (see
  // scripts/test-wasm.mjs); the extra glue is a couple of guarded branches.
  '-sENVIRONMENT=worker,web,node',
  '-sEXPORTED_FUNCTIONS=_catan_run,_catan_bots,_catan_replay,_malloc,_free',
  '-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,UTF8ToString',
  // Batches allocate freely; let the heap grow instead of guessing a ceiling.
  '-sALLOW_MEMORY_GROWTH=1',
  '-sINITIAL_MEMORY=32MB',
  '-sFILESYSTEM=0',      // dumping is disabled, so no FS shim needed
  '-sDISABLE_EXCEPTION_CATCHING=1',
  '--closure', '0',
];

const emxx = findEmxx();
console.log(`Compiling ${sources.length} sources with ${emxx}…`);

try {
  execFileSync(emxx, args, { stdio: 'inherit' });
} catch (err) {
  console.error('\nBuild failed.');
  if (err.code === 'ENOENT') {
    console.error(`Could not find em++. Looked in ${EMSDK}. Set EMSDK or add em++ to PATH.`);
  }
  process.exit(1);
}

for (const f of readdirSync(outDir)) {
  console.log(`  ${f}  ${(statSync(join(outDir, f)).size / 1024).toFixed(1)} kB`);
}
console.log('Done.');
