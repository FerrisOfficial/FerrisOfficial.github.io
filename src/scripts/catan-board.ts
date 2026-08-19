/**
 * Board geometry and SVG rendering for the Catan replay.
 *
 * The engine stores adjacency, not coordinates, so positions have to be
 * derived. This is a port of the layout in the project's own
 * utils/replay_viewer.py, including its four manual node swaps - those correct
 * cases where a corner is shared by hexes in an order that does not match the
 * engine's node numbering, and they are load-bearing.
 */

export const SIZE = 34; // hex radius in SVG units

// 19 hexes as radius-2 axial coordinates, ordered by row so the rows come out
// 3-4-5-4-3, matching the engine's hex indexing.
export const HEX_AXIAL: [number, number][] = [];
for (let r = -2; r <= 2; r++) {
  for (let q = Math.max(-2, -r - 2); q <= Math.min(2, -r + 2); q++) {
    HEX_AXIAL.push([q, r]);
  }
}

/** Pointy-top axial → pixel. */
export function axialToPixel(q: number, r: number): [number, number] {
  return [SIZE * Math.sqrt(3) * (q + r / 2), SIZE * 1.5 * r];
}

/** Six corners, starting at the top and going clockwise. */
export function hexCorners([cx, cy]: [number, number]): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    pts.push([cx + SIZE * Math.cos(a), cy + SIZE * Math.sin(a)]);
  }
  return pts;
}

export const HEX_CENTERS = HEX_AXIAL.map(([q, r]) => axialToPixel(q, r));

/**
 * Resolve node ids to positions by matching each node's adjacent-hex set
 * against the hexes meeting at each board corner.
 */
export function computeNodePositions(nodeHexes: number[][]): [number, number][] {
  // Collect unique corners, quantised so the three hexes meeting at one point
  // agree it is the same point.
  const key = (x: number, y: number) => `${Math.round(x * 10)}:${Math.round(y * 10)}`;
  const corners = new Map<string, { x: number; y: number; hexes: number[] }>();

  HEX_CENTERS.forEach((c, hexId) => {
    for (const [x, y] of hexCorners(c)) {
      const k = key(x, y);
      const existing = corners.get(k);
      if (existing) existing.hexes.push(hexId);
      else corners.set(k, { x, y, hexes: [hexId] });
    }
  });

  // Group corners by the sorted set of hexes touching them, preserving
  // discovery order so repeated keys are consumed in a stable sequence.
  const byPattern = new Map<string, { x: number; y: number }[]>();
  for (const c of corners.values()) {
    const k = [...c.hexes].sort((a, b) => a - b).join(',');
    if (!byPattern.has(k)) byPattern.set(k, []);
    byPattern.get(k)!.push({ x: c.x, y: c.y });
  }

  const remaining = new Map([...byPattern].map(([k, v]) => [k, [...v]]));
  const pos: [number, number][] = new Array(nodeHexes.length).fill(null as never);

  nodeHexes.forEach((hexes, nodeId) => {
    const k = hexes
      .filter((h) => h >= 0)
      .sort((a, b) => a - b)
      .join(',');
    const bucket = remaining.get(k);
    if (!bucket || !bucket.length) return;
    const p = bucket.shift()!;
    pos[nodeId] = [p.x, p.y];
  });

  // Corrections carried over from replay_viewer.py.
  for (const [a, b] of [
    [0, 1],
    [16, 27],
    [47, 48],
    [52, 53],
  ]) {
    if (pos[a] && pos[b]) {
      const t = pos[a];
      pos[a] = pos[b];
      pos[b] = t;
    }
  }

  return pos;
}

// Resource ids from the engine: Brick 0, Lumber 1, Wool 2, Grain 3, Ore 4, none 5.
export const RESOURCE = [
  { name: 'Brick', fill: '#b5563a' },
  { name: 'Lumber', fill: '#2f6b3d' },
  { name: 'Wool', fill: '#7bab54' },
  { name: 'Grain', fill: '#d6a83c' },
  { name: 'Ore', fill: '#6b7280' },
  { name: 'Desert', fill: '#c2b280' },
];

export const PORT_LABEL = ['3:1', 'B 2:1', 'L 2:1', 'W 2:1', 'G 2:1', 'O 2:1', ''];

export interface Replay {
  seed: number;
  winner: number;
  turns: number;
  hexes: [number, number][];
  nodes: [number[], number][];
  edges: [number, number][];
  /** [nodeA, nodeB, portType] - nine harbours, from the engine's constants. */
  ports: [number, number, number][];
  frames: {
    t: number;
    p: number;
    rb: number;
    vp: [number, number];
    a: string;
    ap: number;
    d?: number;
    dn: [number, number][];
    de: [number, number][];
  }[];
}

/** Cumulative board state at each frame, from the delta stream. */
export function materialise(replay: Replay) {
  const nodes: number[][] = [];
  const edges: number[][] = [];
  // NoStructure = 3, NoPlayer = 2 → an empty node cell is 3<<2 | 2.
  let node = new Array(replay.nodes.length).fill((3 << 2) | 2);
  let edge = new Array(replay.edges.length).fill(0);

  for (const f of replay.frames) {
    node = node.slice();
    edge = edge.slice();
    for (const [i, v] of f.dn) node[i] = v;
    for (const [i, v] of f.de) edge[i] = v;
    nodes.push(node);
    edges.push(edge);
  }
  return { nodes, edges };
}

export const structureOf = (cell: number) => cell >> 2; // 1 settlement, 2 city, 3 none
export const ownerOf = (cell: number) => cell & 3; // 0 p0, 1 p1, 2 none

/** Static board layer: hexes, numbers, ports. Drawn once per replay. */
export function renderBoardBase(replay: Replay, nodePos: [number, number][]): string {
  let svg = '';

  HEX_CENTERS.forEach(([cx, cy], i) => {
    const [res, num] = replay.hexes[i];
    const pts = hexCorners([cx, cy])
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');
    svg += `<polygon points="${pts}" fill="${RESOURCE[res]?.fill ?? '#888'}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>`;
    if (num > 0) {
      // 6 and 8 are the highest-probability numbers; Catan boards print them red.
      const hot = num === 6 || num === 8;
      svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="11" fill="#f5f0e4" opacity=".92"/>`;
      svg += `<text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="${hot ? '#b3261e' : '#2b2b2b'}">${num}</text>`;
    }
  });

  // Nine harbours, each straddling one coastal edge. The pairs come from the
  // engine so they cannot drift; the marker is drawn on the water side, offset
  // along the edge's outward normal, with a dock line to each of the two
  // intersections that can actually use it.
  for (const [a, b, type] of replay.ports ?? []) {
    if (!nodePos[a] || !nodePos[b]) continue;
    const [ax, ay] = nodePos[a];
    const [bx, by] = nodePos[b];
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;

    // Normal to the coastal edge, flipped to point away from the island
    // (the board is centred on the origin).
    let nx = -(by - ay);
    let ny = bx - ax;
    const nlen = Math.hypot(nx, ny) || 1;
    nx /= nlen;
    ny /= nlen;
    if (nx * mx + ny * my < 0) {
      nx = -nx;
      ny = -ny;
    }

    const px = mx + nx * 22;
    const py = my + ny * 22;

    svg += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="currentColor" stroke-width="1.2" opacity=".35"/>`;
    svg += `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="currentColor" stroke-width="1.2" opacity=".35"/>`;
    svg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="10.5" fill="var(--surface)" stroke="currentColor" stroke-width="1" opacity=".92"/>`;
    svg += `<text x="${px.toFixed(1)}" y="${(py + 3).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor">${PORT_LABEL[type]}</text>`;
  }

  return svg;
}

/** Everything that changes: roads, settlements, cities, robber. */
export function renderBoardState(
  replay: Replay,
  nodePos: [number, number][],
  nodeCells: number[],
  edgeCells: number[],
  robberHex: number,
  colours: [string, string],
): string {
  let svg = '';

  replay.edges.forEach(([a, b], id) => {
    const owner = edgeCells[id];
    if (!owner || !nodePos[a] || !nodePos[b]) return;
    const [x1, y1] = nodePos[a];
    const [x2, y2] = nodePos[b];
    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${colours[owner - 1]}" stroke-width="6" stroke-linecap="round"/>`;
  });

  nodeCells.forEach((cell, id) => {
    const st = structureOf(cell);
    const owner = ownerOf(cell);
    if ((st !== 1 && st !== 2) || owner > 1 || !nodePos[id]) return;
    const [x, y] = nodePos[id];
    const c = colours[owner];
    if (st === 1) {
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${c}" stroke="#0b0b0d" stroke-width="1.5"/>`;
    } else {
      svg += `<rect x="${(x - 8).toFixed(1)}" y="${(y - 8).toFixed(1)}" width="16" height="16" rx="3" fill="${c}" stroke="#0b0b0d" stroke-width="1.5"/>`;
    }
  });

  const [rx, ry] = HEX_CENTERS[robberHex] ?? [0, 0];
  svg += `<circle cx="${rx.toFixed(1)}" cy="${(ry - 1).toFixed(1)}" r="13" fill="#141418" opacity=".82" stroke="#f5f0e4" stroke-width="1.5"/>`;

  return svg;
}

/** viewBox that fits the whole board with a margin. */
export function viewBox(): string {
  const xs = HEX_CENTERS.map(([x]) => x);
  const ys = HEX_CENTERS.map(([, y]) => y);
  // Room for the hex itself plus the port labels that sit outside the coastline.
  const pad = SIZE + 40;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad;
  const h = Math.max(...ys) - minY + pad;
  return `${minX.toFixed(1)} ${minY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
}
