// Runs the CatanAPI GoogleTest suite under Node, via WebAssembly.
//
//   npm run engine:test                    all targets
//   npm run engine:test -- board_tests     one target
//
// There is no native C++ toolchain here, so `ctest` is not an option.
// Emscripten compiles the same sources and the same tests and Node runs them,
// which is the right safety net for changes whose whole point is to make the
// WASM build faster.
//
// The six targets mirror tests/CMakeLists.txt exactly. They cannot be merged
// into one binary: separate files declare the same suite name with both TEST
// and TEST_F, which GoogleTest rejects when they land in one executable.

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engine = join(root, '.engine', 'CatanAPI');
const gtestDir = join(root, '.engine', 'googletest');
const build = join(root, '.engine', 'build');
const objDir = join(build, 'obj');

const EMSDK = process.env.EMSDK || join(process.env.USERPROFILE || process.env.HOME || '', 'emsdk');
const tool = (name) =>
  [
    join(EMSDK, 'upstream', 'emscripten', process.platform === 'win32' ? `${name}.exe` : name),
    join(EMSDK, 'upstream', 'emscripten', `${name}.bat`),
  ].find(existsSync) || name;

const emxx = tool('em++');
const emar = tool('emar');

if (!existsSync(gtestDir)) {
  console.log('Fetching googletest v1.14.0…');
  execSync(`git clone --depth 1 --branch v1.14.0 https://github.com/google/googletest "${gtestDir}"`, {
    stdio: 'inherit',
  });
}

mkdirSync(objDir, { recursive: true });
// Emscripten emits CommonJS for a node target while this package is
// "type": "module"; scope the build dir back to CommonJS so Node agrees.
writeFileSync(join(build, 'package.json'), '{ "type": "commonjs" }\n');

const includes = [
  engine,
  join(engine, 'game_simulation'),
  join(engine, 'players'),
  join(engine, 'utils'),
  join(gtestDir, 'googletest', 'include'),
  join(gtestDir, 'googletest'),
  join(gtestDir, 'googlemock', 'include'),
  join(gtestDir, 'googlemock'),
].map((d) => `-I${d}`);

const COMMON = ['-std=c++20', '-O1', '-sDISABLE_EXCEPTION_CATCHING=0', ...includes];

/** Compile to an object file, skipping when the object is already newer. */
function compile(src, tag) {
  const obj = join(objDir, `${tag}.o`);
  if (existsSync(obj) && statSync(obj).mtimeMs > statSync(src).mtimeMs) return { obj, cached: true };
  execFileSync(emxx, [...COMMON, '-c', src, '-o', obj], { stdio: 'inherit' });
  return { obj, cached: false };
}

function archive(name, objects) {
  const lib = join(objDir, name);
  execFileSync(emar, ['rcs', lib, ...objects], { stdio: 'inherit' });
  return lib;
}

// --- engine + gtest, compiled once and reused by every target ---------------

const engineSrc = [
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
];

let rebuilt = 0;
const engineObjs = engineSrc.map((rel) => {
  const r = compile(join(engine, rel), rel.replace(/[\\/]/g, '_').replace(/\.cpp$/, ''));
  if (!r.cached) rebuilt++;
  return r.obj;
});
const libEngine = archive('libengine.a', engineObjs);

const gtestObjs = [
  ['googletest/src/gtest-all.cc', 'gtest_all'],
  ['googletest/src/gtest_main.cc', 'gtest_main'],
  ['googlemock/src/gmock-all.cc', 'gmock_all'],
].map(([rel, tag]) => compile(join(gtestDir, rel), tag).obj);
const libGtest = archive('libgtest.a', gtestObjs);

console.log(rebuilt ? `Recompiled ${rebuilt} engine source(s).` : 'Engine objects up to date.');

// --- test targets, mirroring tests/CMakeLists.txt ---------------------------

const targets = {
  player_tests: ['test_player.cpp'],
  utils_tests: ['test_random_device.cpp'],
  actions_tests: ['test_actions.cpp'],
  board_tests: [
    'test_board.cpp',
    'test_board_actions.cpp',
    'test_board_undo_actions.cpp',
    'test_generate_all_actions.cpp',
  ],
  game_tests: ['test_game.cpp'],
  bank_tests: ['test_bank.cpp'],
};

const known = readdirSync(join(engine, 'tests'));
for (const files of Object.values(targets)) {
  for (const f of files) {
    if (!known.includes(f)) {
      console.error(`Test file missing upstream: ${f}`);
      process.exit(1);
    }
  }
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const gtestArgs = process.argv.slice(2).filter((a) => a.startsWith('-'));
const selected = only.length ? only : Object.keys(targets);

let failed = [];
for (const name of selected) {
  const files = targets[name];
  if (!files) {
    console.error(`Unknown target '${name}'. One of: ${Object.keys(targets).join(', ')}`);
    process.exit(1);
  }

  const out = join(build, `${name}.js`);
  execFileSync(
    emxx,
    [
      ...COMMON,
      ...files.map((f) => join(engine, 'tests', f)),
      libEngine,
      libGtest,
      '-o', out,
      '-sENVIRONMENT=node',
      // MEMFS, not NODERAWFS: the latter leaves getcwd() empty, which
      // GoogleTest treats as a fatal error before any test runs.
      '-sFORCE_FILESYSTEM=1',
      '-sALLOW_MEMORY_GROWTH=1',
      '-sINITIAL_MEMORY=64MB',
      '-sEXIT_RUNTIME=1',
    ],
    { stdio: 'inherit' },
  );

  console.log(`\n──────── ${name} ────────`);
  try {
    execFileSync(process.execPath, [out, ...gtestArgs], { stdio: 'inherit', cwd: engine });
  } catch {
    failed.push(name);
  }
}

console.log(failed.length ? `\nFAILED: ${failed.join(', ')}` : '\nAll test targets passed.');
process.exit(failed.length ? 1 : 0);
