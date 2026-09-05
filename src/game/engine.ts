import {
  ADAPTATIONS,
  BIOME,
  BIOMES,
  BY_ID,
  CHOIR,
  CURE_LINKS,
  HEIGHT,
  LINKS,
  SPECIES,
  WIDTH,
} from './content.ts';
import type { BiomeId, Item, Mutation } from './content.ts';

export type Point = { x: number; y: number };
export type Tile =
  | '.'
  | '~'
  | '≈'
  | '#'
  | '▒'
  | '≡'
  | 'ψ'
  | '!'
  | ' '
  | '%'
  | ','
  | '_';
export interface Entry {
  seen: number;
  chemical: number;
  interactions: number;
  biomes: BiomeId[];
  lives: number[];
}
export interface Memory {
  seed: number;
  life: number;
  entries: Record<string, Entry>;
  visited: BiomeId[];
  priming: Record<Mutation, number>;
  links: string[];
  choir: number[];
  pool: boolean;
  spawn: 'beach' | 'underground';
  endings: string[];
  restorations: string[];
}
export interface Entity extends Point {
  uid: string;
  species: string;
  stun: number;
  harvested: boolean;
  opened: boolean;
}
export interface Portal extends Point {
  to: BiomeId | 'edge';
  require: Mutation[];
  label: string;
}
export interface Drop extends Point {
  item: Item;
  ttl: number;
}
export interface Region {
  id: BiomeId;
  tiles: Tile[][];
  entities: Entity[];
  portals: Portal[];
  seen: string[];
  drops: Drop[];
  safe: { x: number; y: number; ttl: number }[];
}
export interface Body extends Point {
  region: BiomeId;
  contamination: number;
  health: number;
  energy: number;
  calcium: number;
  mutations: Mutation[];
  exposure: Record<Mutation, number>;
  inventory: Record<Item, number>;
  veil: number;
  flash: number;
  sonar: number;
  facing: Point;
}
export interface GameState {
  version: 1;
  memory: Memory;
  body: Body;
  regions: Partial<Record<BiomeId, Region>>;
  turn: number;
  status: 'playing' | 'merged' | 'ended';
  ending: 'escape' | 'cure' | 'renewal' | null;
  log: string[];
  lastDeath: string;
  lifeStartEntries: number;
  selected: string | null;
}
export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'observe' | 'absorb' | 'interact'; target?: string }
  | { type: 'rest' }
  | { type: 'place'; item: Item }
  | { type: 'ability'; ability: 'veil' | 'mimicry' | 'echo' | 'acid' }
  | { type: 'hatch'; spawn?: 'beach' | 'underground' }
  | { type: 'ending'; ending: 'escape' | 'cure' | 'renewal' };
export const distance = (a: Point, b: Point) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const pointKey = (p: Point) => `${p.x},${p.y}`;
export const emptyExposure = (): Record<Mutation, number> => ({
  gills: 0,
  claws: 0,
  mimicry: 0,
  veil: 0,
  thermal: 0,
  echo: 0,
  pads: 0,
  acid: 0,
});
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function log(s: GameState, message: string) {
  if (s.log.at(-1) !== message) s.log = [...s.log.slice(-19), message];
}
const edges: {
  from: BiomeId;
  to: BiomeId;
  slot: string;
  back: string;
  need?: Mutation[];
}[] = [
  { from: 'beach', to: 'coral', slot: 'E', back: 'W' },
  { from: 'beach', to: 'kelp', slot: 'W', back: 'E' },
  { from: 'beach', to: 'mycelium', slot: 'N', back: 'S' },
  { from: 'beach', to: 'tideflats', slot: 'S', back: 'N' },
  { from: 'mycelium', to: 'bog', slot: 'W', back: 'E' },
  { from: 'kelp', to: 'bog', slot: 'N', back: 'S' },
  { from: 'mycelium', to: 'thermal', slot: 'N', back: 'S' },
  { from: 'bog', to: 'bloom', slot: 'N', back: 'S' },
  { from: 'thermal', to: 'bloom', slot: 'W', back: 'E' },
  { from: 'coral', to: 'shelf', slot: 'E', back: 'W', need: ['gills'] },
  { from: 'coral', to: 'canopy', slot: 'U', back: 'D', need: ['pads'] },
  { from: 'kelp', to: 'canopy', slot: 'U', back: 'W', need: ['pads'] },
  { from: 'shelf', to: 'deep', slot: 'D', back: 'E', need: ['gills'] },
  {
    from: 'thermal',
    to: 'deep',
    slot: 'D',
    back: 'W',
    need: ['thermal', 'gills'],
  },
  { from: 'beach', to: 'underground', slot: 'D', back: 'U', need: ['claws'] },
  {
    from: 'underground',
    to: 'mycelium',
    slot: 'N',
    back: 'D',
    need: ['claws'],
  },
  { from: 'underground', to: 'thermal', slot: 'E', back: 'U', need: ['claws'] },
];
export const WORLD_EDGES = edges;
function slotPoint(slot: string, rotation: number): Point {
  let dir = ['N', 'E', 'S', 'W'].indexOf(slot);
  if (dir >= 0) dir = (dir + rotation) % 4;
  return dir === 0
    ? { x: 30, y: 1 }
    : dir === 1
      ? { x: 59, y: 17 }
      : dir === 2
        ? { x: 30, y: 33 }
        : dir === 3
          ? { x: 1, y: 17 }
          : slot === 'U'
            ? { x: 40, y: 10 }
            : { x: 21, y: 25 };
}
function portals(id: BiomeId, seed: number): Portal[] {
  const result: Portal[] = [];
  for (const e of edges) {
    if (e.from !== id && e.to !== id) continue;
    const forward = e.from === id,
      to = forward ? e.to : e.from,
      slot = forward ? e.slot : e.back;
    result.push({
      ...slotPoint(slot, seed % 4),
      to,
      require: forward ? e.need || [] : [],
      label: slot === 'U' ? 'Climb' : slot === 'D' ? 'Descend' : 'Passage',
    });
  }
  if (id === 'tideflats')
    result.push({
      ...slotPoint('S', seed % 4),
      to: 'edge',
      require: [],
      label: 'Beyond the tide',
    });
  return result;
}
export function createRegion(id: BiomeId, seed: number, life: number): Region {
  const random = rng(
    seed + BIOMES.findIndex((b) => b.id === id) * 65537 + life * 7919,
  );
  const tiles: Tile[][] = Array.from({ length: HEIGHT }, (_, y) =>
    Array.from({ length: WIDTH }, (_, x) => {
      if (x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1) return '#';
      const n =
        Math.sin(x * 0.26 + random() * 0.5) +
        Math.cos(y * 0.4) +
        Math.sin((x + y) * 0.19 + life);
      if (id === 'canopy') return n < -0.9 ? ' ' : n < -0.5 ? '#' : '.';
      if (n > 1.3) return random() < 0.35 ? '▒' : '#';
      if (id === 'thermal' && n < -0.6) return '!';
      if (id === 'kelp' && n > 0.45) return 'ψ';
      if (id === 'bog') return n < 0.1 ? '~' : ',';
      if (id === 'shelf') return n < 0 ? '≈' : '%';
      if (id === 'deep') return n < 0.7 ? '≈' : '.';
      if (id === 'coral') return n < -0.9 ? '≈' : n < 0.4 ? '~' : '.';
      if (id === 'bloom') return n < 0 ? '≈' : ',';
      return n < 0.3 ? '~' : '.';
    }),
  );
  const region: Region = {
    id,
    tiles,
    entities: [],
    portals: portals(id, seed),
    seen: [],
    drops: [],
    safe: [],
  };
  const carve = (from: Point, to: Point) => {
    let x = from.x,
      y = from.y;
    let limit = WIDTH + HEIGHT;
    while ((x !== to.x || y !== to.y) && limit-- > 0) {
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++) {
          if (x + a > 0 && x + a < WIDTH - 1 && y + b > 0 && y + b < HEIGHT - 1)
            tiles[y + b][x + a] = id === 'bog' ? ',' : '.';
        }
      if (x !== to.x && (random() < 0.6 || y === to.y))
        x += Math.sign(to.x - x);
      else y += Math.sign(to.y - y);
    }
    tiles[to.y][to.x] = '.';
  };
  for (const p of region.portals) carve({ x: 30, y: 17 }, p);
  const species = SPECIES.filter((s) => s.biomes.includes(id));
  for (const [i, speciesDef] of species.entries()) {
    const angle = (i / species.length) * Math.PI * 2;
    let x = Math.round(30 + Math.cos(angle) * (9 + random() * 13)),
      y = Math.round(17 + Math.sin(angle) * (6 + random() * 6));
    if (id === 'beach' && speciesDef.id === 'glowcap') {
      x = 32;
      y = 17;
    }
    if (id === 'beach' && speciesDef.id === 'substrate') {
      x = 26;
      y = 17;
    }
    if (id === 'deep' && speciesDef.id === 'hearth') {
      x = 30;
      y = 17;
    }
    if (id === 'bloom' && speciesDef.id === 'core') {
      x = 30;
      y = 17;
    }
    if (id === 'coral' && speciesDef.id === 'eel') {
      x = 18;
      y = 16;
    }
    if (id === 'coral' && speciesDef.id === 'calcite') {
      x = 38;
      y = 22;
    }
    if (id === 'coral' && speciesDef.id === 'chamber') {
      x = 47;
      y = 24;
    }
    while (
      region.entities.some((e) => e.x === x && e.y === y) ||
      region.portals.some((p) => distance(p, { x, y }) < 2)
    ) {
      x = Math.max(5, Math.min(55, x + (random() > 0.5 ? 2 : -2)));
      y = Math.max(4, Math.min(30, y + (random() > 0.5 ? 2 : -2)));
    }
    carve({ x: 30, y: 17 }, { x, y });
    region.entities.push({
      uid: `${id}-${speciesDef.id}`,
      species: speciesDef.id,
      x,
      y,
      stun: 0,
      harvested: false,
      opened: false,
    });
    if (speciesDef.id === 'eel')
      for (let a = -3; a <= 3; a++)
        for (let b = -3; b <= 3; b++)
          if (tiles[y + b]?.[x + a] && tiles[y + b][x + a] !== '#')
            tiles[y + b][x + a] = '~';
    if (speciesDef.id === 'glowcap' && id !== 'bog')
      for (let j = 0; j < 5; j++) {
        const px = 5 + Math.floor(random() * 51),
          py = 4 + Math.floor(random() * 27);
        if (tiles[py][px] !== '#')
          region.entities.push({
            uid: `${id}-glowcap-${j}`,
            species: 'glowcap',
            x: px,
            y: py,
            stun: 0,
            harvested: false,
            opened: false,
          });
      }
  }
  // A reachable experiment: the chamber is enclosed by calcite, with a visible front seal.
  if (id === 'coral') {
    const chamber = region.entities.find((e) => e.species === 'chamber')!;
    for (let y = chamber.y - 2; y <= chamber.y + 2; y++)
      for (let x = chamber.x - 2; x <= chamber.x + 2; x++) {
        tiles[y][x] =
          Math.abs(x - chamber.x) === 2 || Math.abs(y - chamber.y) === 2
            ? '≡'
            : '.';
      }
    const barrier = region.entities.find((e) => e.species === 'calcite')!;
    barrier.x = chamber.x - 2;
    barrier.y = chamber.y;
    carve({ x: 30, y: 17 }, { x: barrier.x - 1, y: barrier.y });
    tiles[barrier.y][barrier.x] = '≡';
  }
  // Two small, reliable quiet spaces; their positions remain consistent across lives.
  if (id === 'bog')
    for (let y = 25; y < 30; y++)
      for (let x = 46; x < 54; x++) tiles[y][x] = '_';
  if (id === 'beach' || id === 'underground')
    for (let y = 15; y <= 19; y++)
      for (let x = 28; x <= 32; x++) tiles[y][x] = '~';
  for (const e of region.entities)
    if (e.species === 'substrate') tiles[e.y][e.x] = '▒';
  for (const p of region.portals) tiles[p.y][p.x] = '.';
  return region;
}
function freshBody(region: 'beach' | 'underground'): Body {
  return {
    x: 30,
    y: 18,
    region,
    contamination: 0,
    health: 100,
    energy: 100,
    calcium: 0,
    mutations: [],
    exposure: emptyExposure(),
    inventory: { glowcap: 0, veilmoss: 0, nutrient: 2, nectar: 0 },
    veil: 0,
    flash: 0,
    sonar: 0,
    facing: { x: 1, y: 0 },
  };
}
export function newGame(
  seed = Math.floor(Math.random() * 0x7fffffff),
): GameState {
  const state: GameState = {
    version: 1,
    memory: {
      seed: seed >>> 0,
      life: 1,
      entries: {},
      visited: ['beach'],
      priming: emptyExposure(),
      links: [],
      choir: [],
      pool: false,
      spawn: 'beach',
      endings: [],
      restorations: [],
    },
    body: freshBody('beach'),
    regions: {},
    turn: 0,
    status: 'playing',
    ending: null,
    log: ['Warm water. Amber light. A first breath.'],
    lastDeath: '',
    lifeStartEntries: 0,
    selected: null,
  };
  regionOf(state);
  reveal(state);
  return state;
}
export function regionOf(s: GameState): Region {
  return (
    s.regions[s.body.region] ??
    (s.regions[s.body.region] = createRegion(
      s.body.region,
      s.memory.seed,
      s.memory.life,
    ))
  );
}
export function has(s: GameState, m: Mutation) {
  return s.body.mutations.includes(m);
}
export function entry(s: GameState, id: string): Entry {
  return (
    s.memory.entries[id] ??
    (s.memory.entries[id] = {
      seen: 0,
      chemical: 0,
      interactions: 0,
      biomes: [],
      lives: [],
    })
  );
}
function record(
  s: GameState,
  id: string,
  mode: 'seen' | 'chemical' | 'interactions',
  amount = 1,
) {
  const e = entry(s, id);
  e[mode] = Math.min(
    mode === 'seen' ? 3 : mode === 'chemical' ? 3 : 10,
    e[mode] + amount,
  );
  if (!e.biomes.includes(s.body.region)) e.biomes.push(s.body.region);
  if (!e.lives.includes(s.memory.life)) e.lives.push(s.memory.life);
}
export function stage(s: GameState, id: string) {
  const e = s.memory.entries[id];
  if (!e || !e.seen) return 0;
  if (
    s.memory.links.some((l) =>
      LINKS.find((x) => x.id === l)?.needs.includes(id),
    ) &&
    e.chemical >= 2
  )
    return 4;
  if (
    e.chemical >= 2 &&
    (e.interactions > 0 || e.biomes.length >= 2 || e.seen >= 3)
  )
    return 3;
  if (e.chemical > 0) return 2;
  return 1;
}
export const STAGES = [
  'Unknown',
  'Observed',
  'Catalogued',
  'Analysed',
  'Understood',
];
export function sightLine(r: Region, a: Point, b: Point) {
  let x = a.x,
    y = a.y;
  const dx = Math.abs(b.x - x),
    dy = Math.abs(b.y - y),
    sx = Math.sign(b.x - x),
    sy = Math.sign(b.y - y);
  let err = dx - dy;
  for (let n = 0; n < WIDTH + HEIGHT; n++) {
    if (x === b.x && y === b.y) return true;
    if (
      (x !== a.x || y !== a.y) &&
      ['#', '▒', '≡', 'ψ'].includes(r.tiles[y]?.[x])
    )
      return false;
    const e = 2 * err;
    if (e > -dy) {
      err -= dy;
      x += sx;
    }
    if (e < dx) {
      err += dx;
      y += sy;
    }
  }
  return false;
}
export function visibility(s: GameState, p: Point): number {
  const r = regionOf(s),
    b = BIOME[r.id],
    d = distance(s.body, p);
  let radius = b.fog ? 4 : 7;
  if (s.body.sonar > 0) radius = 15;
  if (s.body.veil > 0 && r.id === 'mycelium') radius = 7;
  const clear = r.entities.some(
    (e) => e.species === 'chimerum' && distance(e, p) <= 3,
  );
  if (clear) radius += 3;
  return d <= radius && sightLine(r, s.body, p)
    ? Math.max(0.18, 1 - d / (radius + 1))
    : s.body.sonar > 0 && d <= radius
      ? 0.26
      : 0;
}
export function nearby(s: GameState, range = 1): Entity[] {
  return regionOf(s)
    .entities.filter((e) => distance(s.body, e) <= range)
    .sort((a, b) => distance(s.body, a) - distance(s.body, b));
}
export function visibleEntities(s: GameState) {
  return regionOf(s).entities.filter((e) => visibility(s, e) > 0);
}
export function reveal(s: GameState) {
  const r = regionOf(s),
    known = new Set(r.seen);
  for (
    let y = Math.max(0, s.body.y - 15);
    y <= Math.min(HEIGHT - 1, s.body.y + 15);
    y++
  )
    for (
      let x = Math.max(0, s.body.x - 15);
      x <= Math.min(WIDTH - 1, s.body.x + 15);
      x++
    )
      if (visibility(s, { x, y }) > 0) known.add(`${x},${y}`);
  r.seen = [...known];
  for (const e of visibleEntities(s))
    if (!s.memory.entries[e.species]?.seen) record(s, e.species, 'seen');
}
export function threshold(s: GameState, m: Mutation) {
  const base = ADAPTATIONS.find((a) => a.id === m)!.threshold;
  return Math.max(
    3,
    Math.ceil(base / (1 + s.memory.priming[m] / (base * 1.7))),
  );
}
function expose(s: GameState, m: Mutation, amount = 1) {
  s.memory.priming[m] = Math.min(10000, s.memory.priming[m] + amount);
  if (has(s, m)) return;
  s.body.exposure[m] += amount;
  if (s.body.exposure[m] >= threshold(s, m)) {
    s.body.mutations.push(m);
    log(s, `Your body adapts: ${ADAPTATIONS.find((a) => a.id === m)!.name}.`);
  }
}
export function crossReference(s: GameState) {
  for (const l of LINKS) {
    if (s.memory.links.includes(l.id)) continue;
    if (!l.needs.every((id) => (s.memory.entries[id]?.chemical || 0) >= 2))
      continue;
    if (l.requireBiomes) {
      const biomes = new Set(
        l.needs.flatMap((id) => s.memory.entries[id]?.biomes || []),
      );
      if (biomes.size < l.requireBiomes) continue;
    }
    if (l.id === 'rootsinger' && s.memory.choir.length < 2) continue;
    s.memory.links.push(l.id);
    log(s, `The almanac connects a thread: ${l.name}.`);
  }
}
export function endingReadiness(s: GameState) {
  const surface = [
    'beach',
    'coral',
    'mycelium',
    'bog',
    'kelp',
    'thermal',
    'tideflats',
    'bloom',
  ];
  const catalogued = surface.filter(
    (b) =>
      Object.values(s.memory.entries).filter(
        (e) => e.chemical > 0 && e.biomes.includes(b as BiomeId),
      ).length >= 2,
  ).length;
  return {
    escape: catalogued >= 6,
    cure:
      CURE_LINKS.every((id) => s.memory.links.includes(id)) &&
      s.memory.choir.length >= 2,
    renewal:
      CURE_LINKS.every((id) => s.memory.links.includes(id)) &&
      s.memory.links.includes('lifecycle') &&
      s.memory.choir.length >= 5 &&
      s.memory.visited.includes('bog') &&
      s.memory.visited.includes('canopy'),
    catalogued,
  };
}
export function merge(s: GameState, reason: string) {
  if (s.status !== 'playing') return;
  s.status = 'merged';
  s.lastDeath = reason;
  const count =
    s.body.region === 'mycelium' ||
    s.body.region === 'deep' ||
    s.body.region === 'underground'
      ? 2
      : 1;
  for (let i = 0; i < count; i++) {
    const next = CHOIR.findIndex((_, index) => !s.memory.choir.includes(index));
    if (next >= 0) s.memory.choir.push(next);
  }
  crossReference(s);
  log(s, 'Your body loosens. What you learned enters the network.');
}
export function hatch(s: GameState, spawn?: 'beach' | 'underground') {
  if (s.status !== 'merged' && s.status !== 'ended') return;
  if (spawn === 'underground' && s.memory.pool) s.memory.spawn = spawn;
  else if (spawn === 'beach') s.memory.spawn = 'beach';
  s.memory.life++;
  s.body = freshBody(s.memory.spawn);
  s.regions = {};
  s.turn = 0;
  s.status = 'playing';
  s.ending = null;
  s.selected = null;
  s.lifeStartEntries = Object.keys(s.memory.entries).length;
  log(s, 'Another body. The same memory.');
  regionOf(s);
  reveal(s);
}
export function localRate(s: GameState) {
  const r = regionOf(s);
  if (r.tiles[s.body.y][s.body.x] === '_') return 0;
  let rate = BIOME[r.id].toxicity;
  if (s.memory.spawn === 'underground') rate *= 1.2;
  if (nearby(s, 2).some((e) => e.species === 'moss' || e.species === 'ember'))
    rate *= 0.24;
  if (r.safe.some((p) => distance(p, s.body) <= 3)) rate *= 0.4;
  if (nearby(s, 2).some((e) => e.species === 'root' || e.species === 'hearth'))
    rate *= 1.6;
  return rate;
}
function isPassable(s: GameState, p: Point) {
  const t = regionOf(s).tiles[p.y]?.[p.x];
  return (
    t &&
    t !== '#' &&
    t !== '▒' &&
    t !== '≡' &&
    (t !== 'ψ' || has(s, 'pads')) &&
    (t !== '≈' || has(s, 'gills')) &&
    (t !== '!' || has(s, 'thermal')) &&
    (t !== ' ' || has(s, 'pads'))
  );
}
function organismStep(s: GameState) {
  const r = regionOf(s),
    random = rng(s.memory.seed + s.turn * 719 + s.memory.life * 65537);
  for (const e of r.entities) {
    const d = BY_ID[e.species];
    if (e.stun > 0) {
      e.stun--;
      continue;
    }
    if (!d.mobile || s.turn % 3 !== 0) continue;
    let target: Point | undefined;
    if (e.species === 'moth')
      target =
        r.drops
          .filter((x) => x.item === 'glowcap')
          .sort((a, b) => distance(e, a) - distance(e, b))[0] ||
        r.entities.find((x) => x.species === 'glowcap');
    if (['slug', 'rot', 'sweeper'].includes(e.species))
      target = r.drops
        .filter((x) => x.item === 'nutrient')
        .sort((a, b) => distance(e, a) - distance(e, b))[0];
    if (e.species === 'architect')
      target = r.drops.find((x) => x.item === 'nectar');
    if (e.species === 'grazer') {
      const moss =
        r.drops.find((x) => x.item === 'veilmoss' && distance(x, e) < 5) ||
        r.entities.find((x) => x.species === 'veilmoss' && distance(x, e) < 3);
      if (moss)
        target = {
          x: e.x + Math.sign(e.x - moss.x) * 4,
          y: e.y + Math.sign(e.y - moss.y) * 4,
        };
      else if (
        r.id !== 'beach' &&
        distance(e, s.body) <= 3 &&
        s.body.veil === 0
      )
        target = s.body;
    }
    if (e.species === 'eel' && distance(e, s.body) <= 3 && s.body.veil === 0)
      target = s.body;
    const dx = target
        ? Math.sign(target.x - e.x)
        : Math.floor(random() * 3) - 1,
      dy = target ? Math.sign(target.y - e.y) : Math.floor(random() * 3) - 1;
    const p = { x: e.x + dx, y: e.y + dy };
    if (
      p.x > 2 &&
      p.x < WIDTH - 3 &&
      p.y > 2 &&
      p.y < HEIGHT - 3 &&
      distance(p, s.body) > 0 &&
      !r.portals.some((g) => distance(g, p) < 2) &&
      (e.species === 'wraith' ||
        !['#', '▒', '≡', 'ψ', '!', ' '].includes(r.tiles[p.y][p.x]))
    ) {
      e.x = p.x;
      e.y = p.y;
    }
    if (
      e.species === 'moth' &&
      target &&
      distance(e, target) <= 1 &&
      r.drops.some((d) => d.item === 'glowcap' && distance(d, e) <= 1)
    ) {
      let changed = false;
      for (let y = e.y - 2; y <= e.y + 2; y++)
        for (let x = e.x - 2; x <= e.x + 2; x++)
          if (r.tiles[y]?.[x] === '≡') {
            r.tiles[y][x] = '.';
            changed = true;
          }
      if (changed) {
        for (const id of ['glowcap', 'moth', 'calcite'])
          record(s, id, 'interactions');
        log(s, 'A moth lands. Spores flare. The calcified barrier softens.');
      }
    }
    if (
      ['slug', 'sweeper', 'rot'].includes(e.species) &&
      target &&
      distance(e, target) <= 1
    ) {
      r.safe.push({ ...e, ttl: 24 });
      if (!s.memory.restorations.includes(`${r.id}-${e.species}`)) {
        s.memory.restorations.push(`${r.id}-${e.species}`);
        record(s, e.species, 'interactions');
        log(
          s,
          e.species === 'slug'
            ? 'The slug follows your nutrients. Its bacteria leave a gentler pool.'
            : 'A small current carries nutrients back into the cycle.',
        );
      }
    }
    if (e.species === 'architect' && target && distance(e, target) <= 1) {
      r.safe.push({ ...e, ttl: 30 });
      r.tiles[e.y][e.x] = '.';
      record(s, 'architect', 'interactions');
      record(s, 'tidebloom', 'interactions');
      if (!s.memory.restorations.includes('architect')) {
        s.memory.restorations.push('architect');
        log(
          s,
          'The builders gather at the nectar and reinforce a sheltered pool.',
        );
      }
    }
    if (e.species === 'worm')
      for (const d of [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ])
        if (['▒', '≡'].includes(r.tiles[e.y]?.[e.x + d.x]))
          r.tiles[e.y][e.x + d.x] = '.';
  }
}
function tick(s: GameState, factor = 1) {
  if (s.status !== 'playing') return;
  const r = regionOf(s),
    body = s.body;
  s.turn++;
  body.contamination = Math.min(
    100,
    body.contamination + localRate(s) * factor * (body.calcium > 70 ? 1.4 : 1),
  );
  body.energy = Math.max(0, body.energy - 0.15 * factor);
  body.veil = Math.max(0, body.veil - 1);
  body.flash = Math.max(0, body.flash - 1);
  body.sonar = Math.max(0, body.sonar - 1);
  for (const p of nearby(s, 3)) {
    const d = BY_ID[p.species];
    if (d.mutation === 'gills') {
      if (['~', '≈'].includes(r.tiles[body.y][body.x])) expose(s, 'gills');
    } else if (d.mutation && d.mutation !== 'acid' && d.mutation !== 'claws')
      expose(s, d.mutation);
  }
  if (
    r.id === 'mycelium' &&
    s.memory.choir.length >= 2 &&
    (s.memory.entries.eel?.chemical || 0) > 0
  )
    expose(s, 'mimicry');
  if (r.id === 'coral' || r.id === 'shelf') {
    body.calcium = Math.min(100, body.calcium + 0.22);
  }
  if (['beach', 'tideflats', 'canopy'].includes(r.id)) {
    body.energy = Math.min(100, body.energy + 0.55);
    body.health = Math.min(100, body.health + 0.15);
  }
  if (r.id === 'tideflats') {
    const shade =
      ['~', '≈'].includes(r.tiles[body.y][body.x]) ||
      nearby(s, 2).some((e) => ['veilmoss', 'lattice'].includes(e.species));
    if (!shade && s.turn % 3 === 0) body.health -= 2;
    if (s.turn % 24 === 20)
      log(s, 'A wide shadow crosses the flats. Water offers shelter.');
    if (s.turn % 24 === 0 && !shade) {
      body.health -= 30;
      log(s, 'The bird sweeps low. You scramble away, shaken.');
    }
    if (s.turn % 32 === 0) {
      for (let y = 2; y < HEIGHT - 2; y++)
        for (let x = 2; x < WIDTH - 2; x++)
          if ((x + y) % 7 === 0 && r.tiles[y][x] === '.') r.tiles[y][x] = '~';
      log(s, 'The tide arrives out of rhythm. Pools reconnect.');
    }
  }
  if (body.energy <= 0) body.health -= 0.5;
  organismStep(s);
  for (const e of nearby(s, 1)) {
    const d = BY_ID[e.species];
    if (
      !d.threat ||
      e.stun > 0 ||
      body.veil > 0 ||
      body.flash > 0 ||
      r.id === 'beach'
    )
      continue;
    if (
      e.species === 'grazer' &&
      r.drops.some((p) => p.item === 'veilmoss' && distance(p, body) <= 3)
    )
      continue;
    if (e.species === 'toad' && distance(e, body) === 0) {
      merge(s, 'A Gulper Toad’s stillness hid a sudden, engulfing lunge.');
      return;
    }
    if (e.species === 'wraith') {
      body.contamination += 2.5;
      log(
        s,
        'Dense Chimerum floods your senses. Your fungal tissue begins to respond.',
      );
    } else if (e.species !== 'toad' && s.turn % 3 === 0) {
      body.health -= d.threat;
      log(
        s,
        `${d.name} presses too close. Space, shelter, or a signal will help.`,
      );
    }
  }
  const lure = r.entities.find(
    (e) => e.species === 'anemone' && distance(e, body) <= 3,
  );
  if (
    lure &&
    s.body.veil === 0 &&
    stage(s, 'anemone') < 2 &&
    s.turn % 4 === 0
  ) {
    const p = {
      x: body.x + Math.sign(lure.x - body.x),
      y: body.y + Math.sign(lure.y - body.y),
    };
    if (isPassable(s, p)) {
      body.x = p.x;
      body.y = p.y;
      log(s, 'A scent like clean water pulls at your body.');
    }
  }
  r.drops = r.drops
    .map((p) => ({ ...p, ttl: p.ttl - 1 }))
    .filter((p) => p.ttl > 0);
  r.safe = r.safe
    .map((p) => ({ ...p, ttl: p.ttl - 1 }))
    .filter((p) => p.ttl > 0);
  crossReference(s);
  reveal(s);
  if (body.contamination >= 100) {
    body.contamination = 100;
    merge(
      s,
      'Your chemistry reaches its limit. The network receives you gently.',
    );
  } else if (body.health <= 0) {
    body.health = 0;
    merge(s, 'Your small body can go no further. The memory remains.');
  }
}
function targetEntity(s: GameState, target?: string) {
  const e = regionOf(s).entities.find((e) => e.uid === (target || s.selected));
  if (e) return e;
  return nearby(s, 1)[0];
}
function enter(s: GameState, p: Portal) {
  if (p.to === 'edge') {
    if (endingReadiness(s).escape)
      log(
        s,
        'The water beyond the last signal is clean. Interact here to choose the outward path.',
      );
    else
      log(
        s,
        'The edge is unmapped. Catalogue two organisms in six surface biomes to understand an outward route.',
      );
    return;
  }
  const missing = p.require.filter((m) => !has(s, m));
  if (missing.length) {
    log(
      s,
      `This ${p.label.toLowerCase()} needs ${missing.map((m) => ADAPTATIONS.find((a) => a.id === m)!.name.toLowerCase()).join(' and ')}. The almanac records how bodies adapt.`,
    );
    return;
  }
  const from = s.body.region;
  s.body.region = p.to;
  const r = regionOf(s),
    back = r.portals.find((p) => p.to === from);
  const arrival = back ?? { x: 30, y: 17 };
  s.body.x = arrival.x === 1 ? 2 : arrival.x === 59 ? 58 : arrival.x;
  s.body.y = arrival.y === 1 ? 2 : arrival.y === 33 ? 32 : arrival.y + 1;
  if (!isPassable(s, s.body)) {
    r.tiles[s.body.y][s.body.x] = '.';
  }
  s.selected = null;
  if (!s.memory.visited.includes(p.to)) s.memory.visited.push(p.to);
  log(s, BIOME[p.to].description);
  tick(s);
}
export function act(s: GameState, a: Action): GameState {
  if (a.type === 'hatch') {
    hatch(s, a.spawn);
    return s;
  }
  if (s.status !== 'playing') return s;
  const r = regionOf(s),
    body = s.body;
  if (a.type === 'move') {
    if (
      !Number.isInteger(a.dx) ||
      !Number.isInteger(a.dy) ||
      Math.abs(a.dx) + Math.abs(a.dy) !== 1
    )
      return s;
    body.facing = { x: a.dx, y: a.dy };
    const p = { x: body.x + a.dx, y: body.y + a.dy };
    const portal = r.portals.find((g) => g.x === p.x && g.y === p.y);
    if (portal) {
      enter(s, portal);
      return s;
    }
    const t = r.tiles[p.y]?.[p.x];
    if (t === '▒') {
      record(s, 'substrate', 'seen');
      expose(s, 'claws', 2);
      if (has(s, 'claws')) {
        r.tiles[p.y][p.x] = '.';
        body.x = p.x;
        body.y = p.y;
        log(s, 'Your hardened forelimbs part the substrate.');
      } else
        log(
          s,
          'Soft substrate yields a little. Repeated pressure is shaping your forelimbs.',
        );
      tick(s);
      return s;
    }
    if (t === ' ' && !has(s, 'pads') && r.id === 'canopy') {
      body.health -= 12;
      body.region = 'coral';
      body.x = 30;
      body.y = 17;
      log(
        s,
        'The edge gives way. You land in the Shallows, bruised but alive.',
      );
      tick(s);
      return s;
    }
    if (!isPassable(s, p)) {
      const reason =
        t === '≈'
          ? 'Deep water. Your body needs gills.'
          : t === '!'
            ? 'Superheated steam. Sulphur Moss may hold a way through.'
            : t === '≡'
              ? 'A calcified seal. Identify it, then experiment with light or chemistry.'
              : t === 'ψ'
                ? 'Dense kelp. Climb with adhesive pads or use corrosive secretion.'
                : 'Solid stone. Follow a passage, or search for softer substrate.';
      log(s, reason);
      if (t === '≡') record(s, 'calcite', 'seen');
      return s;
    }
    body.x = p.x;
    body.y = p.y;
    s.selected = null;
    tick(s);
    return s;
  }
  if (a.type === 'rest') {
    body.energy = Math.min(100, body.energy + 7);
    body.health = Math.min(100, body.health + 4);
    log(
      s,
      r.tiles[body.y][body.x] === '_'
        ? 'The Still. Nothing enters. Nothing changes.'
        : 'You rest, listening to the world around you.',
    );
    tick(s, 0.3);
    return s;
  }
  if (a.type === 'place') {
    if (
      !['glowcap', 'veilmoss', 'nutrient', 'nectar'].includes(a.item) ||
      body.inventory[a.item] <= 0
    ) {
      log(s, 'Nothing of that kind is carried. Touch a source to collect it.');
      return s;
    }
    const p = { x: body.x + body.facing.x, y: body.y + body.facing.y };
    if (!isPassable(s, p)) {
      log(s, 'Place it on open ground beside the barrier.');
      return s;
    }
    body.inventory[a.item]--;
    r.drops.push({ ...p, item: a.item, ttl: 80 });
    log(
      s,
      `You leave ${a.item === 'glowcap' ? 'a living light fragment' : a.item === 'veilmoss' ? 'a strip of Veilmoss' : a.item === 'nectar' ? 'a drop of nectar' : 'a nutrient trail'} on the ground.`,
    );
    tick(s);
    return s;
  }
  if (a.type === 'ability') {
    const mutation: Mutation =
      a.ability === 'mimicry'
        ? 'mimicry'
        : a.ability === 'echo'
          ? 'echo'
          : a.ability === 'acid'
            ? 'acid'
            : 'veil';
    if (!has(s, mutation)) {
      log(
        s,
        'This body has not developed that adaptation yet. Open the almanac to see its exposure sources.',
      );
      return s;
    }
    if (body.energy < 8) {
      log(s, 'Your body needs a little rest before doing that.');
      return s;
    }
    if (a.ability === 'veil') {
      body.veil = 13;
      log(s, 'Your spores conceal your chemical signature.');
    }
    if (a.ability === 'mimicry') {
      body.flash = 9;
      r.entities
        .filter(
          (e) => distance(e, body) <= 7 && BY_ID[e.species].kind !== 'flora',
        )
        .forEach((e) => {
          e.stun = 9;
        });
      log(
        s,
        'A larger creature’s light moves across your skin. Nearby fauna holds still.',
      );
    }
    if (a.ability === 'echo') {
      body.sonar = 13;
      log(s, 'A pulse travels through the stone. Hidden spaces answer.');
    }
    if (a.ability === 'acid') {
      const p = { x: body.x + body.facing.x, y: body.y + body.facing.y },
        tile = r.tiles[p.y]?.[p.x];
      const target = targetEntity(s);
      const thicket =
        target?.species === 'thicket' &&
        distance(target, body) <= 1 &&
        !target.opened;
      if (thicket) {
        if (stage(s, 'thicket') < 2) {
          log(
            s,
            'The shell’s composition is still unknown. Absorb a surface sample first.',
          );
          return s;
        }
        target.opened = true;
        record(s, 'thicket', 'interactions');
        log(
          s,
          'The shell parts. The sealed organism cannot survive exposure. Its history enters the almanac.',
        );
      } else if (tile === '≡' || tile === 'ψ') {
        const id = tile === '≡' ? 'calcite' : 'kelp';
        if (stage(s, id) < 2) {
          log(
            s,
            'Your almanac must identify this material before the secretion can target it.',
          );
          return s;
        }
        r.tiles[p.y][p.x] = '.';
        record(s, id, 'interactions');
        log(s, 'The known chemistry responds. A passage opens.');
      } else {
        log(
          s,
          'Face a calcified barrier or kelp frond, or select a nearby Shell Thicket.',
        );
        return s;
      }
      body.contamination += 1;
    }
    body.energy -= 8;
    tick(s);
    return s;
  }
  if (a.type === 'ending') {
    const readiness = endingReadiness(s);
    const atRoot =
      r.id === 'deep' && nearby(s, 2).some((e) => e.species === 'hearth');
    const atEdge =
      r.id === 'tideflats' &&
      r.portals.some((p) => p.to === 'edge' && distance(body, p) <= 1);
    if (!readiness[a.ending] || (a.ending === 'escape' ? !atEdge : !atRoot)) {
      log(
        s,
        'The place or the understanding is not yet here. Follow the almanac’s unfinished threads.',
      );
      return s;
    }
    s.status = 'ended';
    s.ending = a.ending;
    if (!s.memory.endings.includes(a.ending)) s.memory.endings.push(a.ending);
    return s;
  }
  if (
    a.type === 'interact' &&
    r.id === 'underground' &&
    distance(body, { x: 30, y: 17 }) <= 2 &&
    !a.target
  ) {
    if (['glowcap', 'moss', 'root'].every((id) => stage(s, id) >= 2)) {
      s.memory.pool = true;
      log(
        s,
        'Heat, living light, and nutrients converge. The underground pool takes root; future lives can begin here.',
      );
    } else
      log(
        s,
        'A warm basin waits. Catalogue Glowcaps, Sulphur Moss, and Marrow Root to understand what this pool needs.',
      );
    return s;
  }
  const target = targetEntity(s, a.target);
  if (!target) {
    if (a.type === 'observe') {
      log(s, BIOME[r.id].description);
      reveal(s);
    } else log(s, 'Move beside an organism, select it, and try again.');
    return s;
  }
  const definition = BY_ID[target.species];
  if (a.type === 'observe') {
    if (visibility(s, target) <= 0) {
      log(s, 'That organism is beyond your senses.');
      return s;
    }
    record(s, target.species, 'seen');
    s.selected = target.uid;
    log(s, definition.hint);
    return s;
  }
  if (distance(body, target) > 1) {
    log(s, 'Move beside the selected organism to touch or absorb it.');
    return s;
  }
  if (a.type === 'absorb') {
    if (target.species === 'chamber' && !target.opened) {
      record(s, 'chamber', 'seen');
      log(
        s,
        'The living specimens are sealed inside. Study the seal and develop heat-resistant, corrosive chemistry before opening it.',
      );
      return s;
    }
    record(s, target.species, 'seen');
    record(
      s,
      target.species,
      'chemical',
      s.memory.spawn === 'underground' ? 2 : 1,
    );
    body.contamination +=
      r.id === 'beach'
        ? 0
        : target.species === 'root' || target.species === 'hearth'
          ? 5
          : 2.2;
    body.energy = Math.min(100, body.energy + 9);
    if (definition.mutation && definition.mutation !== 'acid')
      expose(s, definition.mutation, 3);
    if (
      ['chalk', 'core', 'calcite', 'kelp'].includes(target.species) &&
      stage(s, 'chalk') >= 2 &&
      (r.id === 'coral' || r.id === 'bloom' || stage(s, 'core') >= 2)
    )
      expose(s, 'acid', 5);
    log(
      s,
      `${definition.name}: a chemical layer enters the almanac.${r.id === 'beach' ? ' The water is clean.' : ' Your body carries the cost.'}`,
    );
    tick(s);
    return s;
  }
  if (a.type === 'interact') {
    if (target.species === 'chamber') {
      if (target.opened) {
        log(
          s,
          'The chamber is open. Absorb beside it to record the surviving Weft descendants.',
        );
        return s;
      }
      if (
        !has(s, 'thermal') ||
        !has(s, 'acid') ||
        stage(s, 'calcite') < 2 ||
        stage(s, 'slug') < 2 ||
        stage(s, 'rot') < 2
      ) {
        log(
          s,
          'The sealed world needs thermal regulation, corrosive secretion, an identified calcium seal, and knowledge of Vessel Slug and Rot Eel symbionts.',
        );
        return s;
      }
      target.opened = true;
      record(s, 'chamber', 'chemical', 2);
      record(s, 'chamber', 'interactions');
      log(
        s,
        'The chamber opens. You record living descendants of the Weft before their ancient equilibrium fades.',
      );
      tick(s);
      return s;
    }
    if (definition.item) {
      if (target.harvested) {
        log(s, 'You have taken what this organism can spare in this life.');
        return s;
      }
      body.inventory[definition.item] = Math.min(
        6,
        body.inventory[definition.item] + 2,
      );
      target.harvested = true;
      log(
        s,
        `You carry ${definition.item === 'glowcap' ? 'two living light fragments' : definition.item === 'veilmoss' ? 'two strips of Veilmoss' : definition.item === 'nectar' ? 'two drops of nectar' : 'decayed nutrients'}. Place them with the carry menu.`,
      );
    } else if (target.species === 'runner' || target.species === 'kelp') {
      if (!has(s, 'gills')) {
        log(s, 'Gills would let you ride this current.');
        return s;
      }
      for (let i = 0; i < 6; i++) {
        const p = { x: body.x + body.facing.x, y: body.y + body.facing.y };
        if (!isPassable(s, p) || r.portals.some((g) => distance(g, p) <= 1))
          break;
        body.x = p.x;
        body.y = p.y;
      }
      log(s, 'The current carries you quickly through the living passage.');
    } else if (target.species === 'vine') {
      r.safe.push({ ...target, ttl: 45 });
      log(
        s,
        'The strand resonates. A small pocket of coherence opens around you.',
      );
    } else if (target.species === 'weaver') {
      const obstructed = r.tiles
        .slice(Math.max(0, target.y - 2), target.y + 3)
        .some((row) =>
          row.slice(Math.max(0, target.x - 2), target.x + 3).includes('ψ'),
        );
      if (obstructed) {
        log(
          s,
          'Kelp presses against the colony. Dissolve the nearby fronds, then touch the fibres.',
        );
        return s;
      }
      r.safe.push({ ...target, ttl: 80 });
      s.memory.restorations.push('weaver');
      log(
        s,
        'The colony reinforces its cleared chamber. A little of the old order returns.',
      );
    } else if (target.species === 'hearth') {
      log(
        s,
        'The root awaits a language your almanac may one day speak. Its unfinished threads hold the possible futures.',
      );
      return s;
    } else {
      log(s, definition.hint);
      if (definition.mutation) expose(s, definition.mutation, 4);
      if (['mire', 'rot', 'sweeper', 'slug', 'worm'].includes(target.species))
        body.inventory.nutrient = Math.min(6, body.inventory.nutrient + 1);
    }
    record(s, target.species, 'seen');
    record(s, target.species, 'interactions');
    tick(s);
    return s;
  }
  return s;
}
export function stateSummary(s: GameState) {
  return {
    status: s.status,
    biome: BIOME[s.body.region].name,
    position: { x: s.body.x, y: s.body.y },
    life: s.memory.life,
    condition: condition(s),
    mutations: s.body.mutations,
    nearby: visibleEntities(s).map((e) => ({
      id: e.uid,
      name: BY_ID[e.species].name,
      x: e.x,
      y: e.y,
      adjacent: distance(s.body, e) <= 1,
    })),
    passages: regionOf(s)
      .portals.filter((p) => visibility(s, p) > 0)
      .map((p) => ({
        ...p,
        to:
          p.to === 'edge'
            ? 'edge'
            : s.memory.visited.includes(p.to)
              ? p.to
              : 'unknown',
      })),
    lastMessage: s.log.at(-1),
  };
}
export function condition(s: GameState) {
  return s.body.contamination < 25
    ? 'Clear'
    : s.body.contamination < 50
      ? 'Changing'
      : s.body.contamination < 75
        ? 'Clouded'
        : s.body.contamination < 90
          ? 'Fading'
          : 'Near the merge';
}
export const SAVE_KEY = 'cartology.save.v1';
export function serialize(s: GameState) {
  return JSON.stringify(s);
}
// Saves are device-local. Reject malformed or future data rather than crashing the game.
export function deserialize(raw: string): GameState | null {
  try {
    if (raw.length > 5_000_000) return null;
    const s = JSON.parse(raw) as GameState;
    const finite = (n: unknown, min = 0, max = 10000) =>
      typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
    const point = (p: Point) =>
      p &&
      Number.isInteger(p.x) &&
      Number.isInteger(p.y) &&
      finite(p.x, 0, WIDTH - 1) &&
      finite(p.y, 0, HEIGHT - 1);
    if (
      s.version !== 1 ||
      !s.memory ||
      !s.body ||
      !s.regions ||
      !['playing', 'merged', 'ended'].includes(s.status) ||
      !finite(s.turn, 0, 1e9) ||
      !point(s.body) ||
      !BIOME[s.body.region]
    )
      return null;
    if (
      !finite(s.memory.seed, 0, 0xffffffff) ||
      !finite(s.memory.life, 1, 1e9) ||
      !['beach', 'underground'].includes(s.memory.spawn) ||
      typeof s.memory.pool !== 'boolean'
    )
      return null;
    for (const v of ['contamination', 'health', 'energy', 'calcium'] as const)
      if (!finite(s.body[v], 0, 100)) return null;
    for (const a of ADAPTATIONS)
      if (
        !finite(s.body.exposure?.[a.id], 0, 1e9) ||
        !finite(s.memory.priming?.[a.id], 0, 1e9)
      )
        return null;
    if (
      !Array.isArray(s.body.mutations) ||
      !s.body.mutations.every((m) => ADAPTATIONS.some((a) => a.id === m)) ||
      !s.body.facing ||
      Math.abs(s.body.facing.x) + Math.abs(s.body.facing.y) !== 1
    )
      return null;
    for (const item of ['glowcap', 'veilmoss', 'nutrient', 'nectar'] as Item[])
      if (!finite(s.body.inventory?.[item], 0, 6)) return null;
    for (const key of ['veil', 'flash', 'sonar'] as const)
      if (!finite(s.body[key], 0, 100)) return null;
    if (
      !Array.isArray(s.memory.visited) ||
      !s.memory.visited.every((b) => BIOME[b]) ||
      !Array.isArray(s.memory.links) ||
      !s.memory.links.every((id) => LINKS.some((l) => l.id === id)) ||
      !Array.isArray(s.memory.choir) ||
      !s.memory.choir.every(
        (id) => Number.isInteger(id) && id >= 0 && id < CHOIR.length,
      )
    )
      return null;
    if (
      !Array.isArray(s.memory.restorations) ||
      !s.memory.restorations.every((x) => typeof x === 'string') ||
      !Array.isArray(s.memory.endings) ||
      !s.memory.endings.every((x) => ['escape', 'cure', 'renewal'].includes(x))
    )
      return null;
    if (!s.memory.entries || typeof s.memory.entries !== 'object') return null;
    for (const [id, e] of Object.entries(s.memory.entries)) {
      if (
        !BY_ID[id] ||
        !finite(e.seen, 0, 3) ||
        !finite(e.chemical, 0, 3) ||
        !finite(e.interactions, 0, 10) ||
        !Array.isArray(e.biomes) ||
        !e.biomes.every((b) => BIOME[b]) ||
        !Array.isArray(e.lives) ||
        !e.lives.every((l) => finite(l, 1, 1e9))
      )
        return null;
    }
    if (
      !Array.isArray(s.log) ||
      !s.log.every((t) => typeof t === 'string') ||
      typeof s.lastDeath !== 'string' ||
      !finite(s.lifeStartEntries, 0, SPECIES.length) ||
      !(s.selected === null || typeof s.selected === 'string')
    )
      return null;
    if (
      !(
        s.ending === null || ['escape', 'cure', 'renewal'].includes(s.ending)
      ) ||
      (s.status === 'ended' && !s.ending)
    )
      return null;
    for (const [id, r] of Object.entries(s.regions)) {
      if (
        !BIOME[id as BiomeId] ||
        r.id !== id ||
        r.tiles?.length !== HEIGHT ||
        !r.tiles.every(
          (row) =>
            row.length === WIDTH &&
            row.every((t) =>
              [
                '.',
                '~',
                '≈',
                '#',
                '▒',
                '≡',
                'ψ',
                '!',
                ' ',
                '%',
                ',',
                '_',
              ].includes(t),
            ),
        )
      )
        return null;
      if (
        !Array.isArray(r.entities) ||
        !r.entities.every(
          (e) =>
            point(e) &&
            BY_ID[e.species] &&
            typeof e.uid === 'string' &&
            finite(e.stun, 0, 100) &&
            typeof e.harvested === 'boolean' &&
            typeof e.opened === 'boolean',
        )
      )
        return null;
      if (
        !Array.isArray(r.portals) ||
        !r.portals.every(
          (p) =>
            point(p) &&
            (p.to === 'edge' || BIOME[p.to]) &&
            Array.isArray(p.require) &&
            p.require.every((m) => ADAPTATIONS.some((a) => a.id === m)) &&
            typeof p.label === 'string',
        )
      )
        return null;
      if (
        !Array.isArray(r.seen) ||
        !r.seen.every(
          (k) => typeof k === 'string' && /^\d{1,2},\d{1,2}$/.test(k),
        ) ||
        !Array.isArray(r.drops) ||
        !r.drops.every(
          (p) =>
            point(p) &&
            ['glowcap', 'veilmoss', 'nectar', 'nutrient'].includes(p.item) &&
            finite(p.ttl, 0, 100),
        ) ||
        !Array.isArray(r.safe) ||
        !r.safe.every((p) => point(p) && finite(p.ttl, 0, 100))
      )
        return null;
    }
    return s;
  } catch {
    return null;
  }
}
