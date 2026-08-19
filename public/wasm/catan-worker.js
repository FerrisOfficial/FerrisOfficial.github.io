// Runs the Catan engine off the main thread.
//
// A tournament is thousands of full games of C++; on the main thread the page
// would simply freeze. The worker also lets the run be chunked, so the win
// rate can be watched converging instead of appearing at the end.

import createModule from './catan.js';

let mod = null;
let cancelled = false;

/** Target milliseconds of work per chunk - small enough to stay responsive to
 *  stop requests, large enough that call overhead stays irrelevant. */
const CHUNK_TARGET_MS = 120;

const call = (name, argTypes, args) => mod.ccall(name, 'string', argTypes, args);

const runBatch = (a, b, games, seed, swap) =>
  JSON.parse(
    call('catan_run', ['string', 'string', 'number', 'number', 'number'], [a, b, games, seed, swap]),
  );

async function boot() {
  mod = await createModule();
  postMessage({ type: 'ready', bots: JSON.parse(call('catan_bots', [], [])) });
}

async function tournament({ a, b, games, seed, swap }) {
  cancelled = false;

  const totals = { games: 0, winsA: 0, winsB: 0, draws: 0, turns: 0, vpA: 0, vpB: 0 };
  // Seat swapping alternates on odd/even game index within a batch, so keeping
  // chunks even preserves an exact 50/50 seat split across the whole run.
  let chunk = 10;
  const started = performance.now();

  while (totals.games < games && !cancelled) {
    const size = Math.min(chunk, games - totals.games);
    const t0 = performance.now();

    let r;
    try {
      r = runBatch(a, b, size, seed + totals.games, swap ? 1 : 0);
    } catch (err) {
      postMessage({ type: 'error', message: String(err?.message || err) });
      return;
    }
    if (r.error) {
      postMessage({ type: 'error', message: r.error });
      return;
    }

    const elapsed = performance.now() - t0;

    totals.games += r.games;
    totals.winsA += r.winsA;
    totals.winsB += r.winsB;
    totals.draws += r.draws;
    totals.turns += r.turns;
    totals.vpA += r.vpA;
    totals.vpB += r.vpB;

    // Re-size the next chunk from measured throughput. Alpha-beta is ~25x
    // slower than the heuristic bots, so a fixed chunk is either sluggish to
    // cancel or needlessly chatty depending on the matchup.
    const perGame = elapsed / Math.max(1, r.games);
    chunk = Math.max(2, Math.min(400, Math.round(CHUNK_TARGET_MS / Math.max(perGame, 0.05) / 2) * 2));

    postMessage({
      type: 'progress',
      totals,
      gamesPerSecond: totals.games / ((performance.now() - started) / 1000),
    });

    // Yield so a 'stop' message can be delivered between chunks.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  postMessage({
    type: 'done',
    totals,
    cancelled,
    // Carried through so the finished panel can keep showing throughput
    // rather than blanking the most interesting number on the run.
    gamesPerSecond: totals.games / ((performance.now() - started) / 1000),
  });
}

onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === 'run') {
    if (!mod) await boot();
    await tournament(msg);
  } else if (msg.type === 'stop') {
    cancelled = true;
  } else if (msg.type === 'replay') {
    // catan_run seeds game i with seedBase + i, so seedBase + 1 reproduces
    // exactly the first game of the tournament that just ran.
    if (!mod) await boot();
    try {
      const raw = call('catan_replay', ['string', 'string', 'number'], [msg.a, msg.b, msg.seed]);
      const parsed = JSON.parse(raw);
      if (parsed.error) postMessage({ type: 'error', message: parsed.error });
      else postMessage({ type: 'replay', replay: parsed });
    } catch (err) {
      postMessage({ type: 'error', message: String(err?.message || err) });
    }
  }
};

boot().catch((err) => postMessage({ type: 'error', message: String(err?.message || err) }));
