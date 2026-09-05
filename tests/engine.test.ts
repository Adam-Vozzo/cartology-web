import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTATIONS,
  BIOMES,
  BY_ID,
  CURE_LINKS,
  HEIGHT,
  LINKS,
  SPECIES,
  WIDTH,
} from '../src/game/content.ts';
import {
  act,
  createRegion,
  crossReference,
  deserialize,
  distance,
  endingReadiness,
  entry,
  hatch,
  has,
  localRate,
  merge,
  newGame,
  regionOf,
  serialize,
  sightLine,
  stage,
  threshold,
} from '../src/game/engine.ts';
import type { BiomeId } from '../src/game/content.ts';
import type { GameState, Point } from '../src/game/engine.ts';

function fixture(id: BiomeId = 'beach', seed = 42) {
  const s = newGame(seed);
  s.body.region = id;
  s.memory.visited.push(id);
  regionOf(s);
  return s;
}
function beside(s: GameState, id: string) {
  const e = regionOf(s).entities.find((e) => e.species === id)!;
  assert.ok(e, id);
  s.body.x = e.x - 1;
  s.body.y = e.y;
  regionOf(s).tiles[s.body.y][s.body.x] = '~';
  s.selected = e.uid;
  return e;
}
function sample(s: GameState, id: string, count = 2) {
  const e = beside(s, id);
  for (let i = 0; i < count; i++) act(s, { type: 'absorb', target: e.uid });
  return e;
}
function known(s: GameState, id: string, biomes: BiomeId[] = ['beach']) {
  s.memory.entries[id] = {
    seen: 3,
    chemical: 2,
    interactions: 1,
    biomes,
    lives: [1],
  };
}
function reachable(s: GameState, start: Point, all = false) {
  const r = regionOf(s),
    seen = new Set<string>(),
    queue = [start];
  while (queue.length) {
    const p = queue.shift()!;
    const k = `${p.x},${p.y}`;
    if (seen.has(k)) continue;
    const t = r.tiles[p.y]?.[p.x];
    if (!t || t === '#' || (!all && ['▒', '≡', 'ψ', '!', '≈', ' '].includes(t)))
      continue;
    seen.add(k);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (
        p.x + dx >= 0 &&
        p.x + dx < WIDTH &&
        p.y + dy >= 0 &&
        p.y + dy < HEIGHT
      )
        queue.push({ x: p.x + dx, y: p.y + dy });
  }
  return seen;
}

void test('world generation is deterministic within a life and changes between lives', () => {
  for (const biome of BIOMES) {
    assert.deepEqual(
      createRegion(biome.id, 23, 1),
      createRegion(biome.id, 23, 1),
    );
    assert.notDeepEqual(
      createRegion(biome.id, 23, 1).tiles,
      createRegion(biome.id, 23, 2).tiles,
    );
    assert.deepEqual(
      createRegion(biome.id, 23, 1).portals,
      createRegion(biome.id, 23, 2).portals,
    );
  }
});
void test('every source and passage is reachable in generated worlds with the necessary adaptations', () => {
  for (const seed of [1, 2, 3, 4, 101, 442, 731])
    for (const b of BIOMES) {
      const s = fixture(b.id, seed);
      const reached = reachable(s, { x: 30, y: 17 }, true);
      for (const e of regionOf(s).entities) {
        const adjacent = [
          { x: e.x, y: e.y },
          { x: e.x - 1, y: e.y },
          { x: e.x + 1, y: e.y },
          { x: e.x, y: e.y - 1 },
          { x: e.x, y: e.y + 1 },
        ];
        assert.ok(
          adjacent.some((p) => reached.has(`${p.x},${p.y}`)),
          `${seed}/${b.id}/${e.species} unreachable`,
        );
      }
      for (const p of regionOf(s).portals)
        assert.ok(
          reached.has(`${p.x},${p.y}`),
          `${seed}/${b.id}/${p.to} exit unreachable`,
        );
    }
});
void test('early mutation sources can be approached before mutations develop', () => {
  for (const [biome, id] of [
    ['coral', 'eel'],
    ['thermal', 'moss'],
    ['mycelium', 'wraith'],
    ['mycelium', 'beetle'],
    ['beach', 'crab'],
  ] as [BiomeId, string][]) {
    const s = fixture(biome),
      reached = reachable(s, { x: 30, y: 17 });
    const e = regionOf(s).entities.find((e) => e.species === id)!;
    assert.ok(
      [...reached].some((k) => {
        const [x, y] = k.split(',').map(Number);
        return distance({ x, y }, e) <= 2;
      }),
      `${id} requires itself to reach`,
    );
  }
});
void test('observation never advances time, chemistry, or contamination', () => {
  const s = fixture('coral');
  const e = beside(s, 'chalk');
  for (let i = 0; i < 50; i++) act(s, { type: 'observe', target: e.uid });
  assert.equal(s.turn, 0);
  assert.equal(s.body.contamination, 0);
  assert.equal(stage(s, 'chalk'), 1);
  assert.equal(entry(s, 'chalk').chemical, 0);
});
void test('absorption records chemistry at a metabolic cost; the Beach remains safe', () => {
  const s = fixture('coral');
  sample(s, 'chalk');
  assert.ok(s.body.contamination > 4);
  assert.ok(stage(s, 'chalk') >= 2);
  const beach = fixture();
  sample(beach, 'glowcap', 8);
  assert.equal(beach.body.contamination, 0);
});
void test('distant absorption cannot harvest knowledge remotely', () => {
  const s = fixture('coral');
  const e =
    regionOf(s).entities.find((e) => e.species === 'fern') ||
    regionOf(s).entities.find((e) => e.species === 'chamber')!;
  s.body.x = 2;
  s.body.y = 2;
  act(s, { type: 'absorb', target: e.uid });
  assert.equal(s.memory.entries[e.species]?.chemical || 0, 0);
  assert.equal(s.turn, 0);
});
void test('gills grow in accessible shallow water near eel chemistry', () => {
  const s = fixture('coral');
  const eel = beside(s, 'eel');
  eel.stun = 60;
  for (let i = 0; i < 20 && !has(s, 'gills'); i++) act(s, { type: 'rest' });
  assert.ok(has(s, 'gills'));
  assert.equal(s.status, 'playing');
});
void test('repeated digging develops claws and opens the actual tile', () => {
  const s = fixture();
  s.body.x = 25;
  s.body.y = 17;
  const r = regionOf(s);
  r.tiles[17][26] = '▒';
  for (let i = 0; i < 10 && !has(s, 'claws'); i++)
    act(s, { type: 'move', dx: 1, dy: 0 });
  assert.ok(has(s, 'claws'));
  assert.equal(r.tiles[17][26], '.');
  assert.equal(s.body.x, 26);
});
void test('death preserves knowledge and priming but a new body must adapt again', () => {
  const s = fixture('coral');
  sample(s, 'chalk');
  s.body.mutations = ['gills'];
  s.memory.priming.gills = 50;
  const prior = threshold(s, 'gills');
  const memory = structuredClone(s.memory.entries);
  merge(s, 'test contamination');
  hatch(s);
  for (const [id, data] of Object.entries(memory))
    assert.deepEqual(s.memory.entries[id], data);
  assert.equal(s.memory.life, 2);
  assert.equal(s.body.contamination, 0);
  assert.deepEqual(s.body.mutations, []);
  assert.equal(s.memory.priming.gills, 50);
  assert.equal(threshold(s, 'gills'), prior);
  assert.ok(s.memory.choir.length);
});
void test('gated descents reject unadapted bodies, then move to the connected biome', () => {
  const s = fixture('coral');
  const gate = regionOf(s).portals.find((p) => p.to === 'shelf')!;
  s.body.x = gate.x - 1;
  s.body.y = gate.y;
  act(s, { type: 'move', dx: 1, dy: 0 });
  assert.equal(s.body.region, 'coral');
  s.body.mutations.push('gills');
  act(s, { type: 'move', dx: 1, dy: 0 });
  assert.equal(s.body.region, 'shelf');
  assert.ok(s.memory.visited.includes('shelf'));
});
void test('thermal path to Deep Ocean requires both thermal regulation and gills', () => {
  const s = fixture('thermal');
  const gate = regionOf(s).portals.find((p) => p.to === 'deep')!;
  s.body.x = gate.x;
  s.body.y = gate.y - 1;
  s.body.mutations = ['thermal'];
  act(s, { type: 'move', dx: 0, dy: 1 });
  assert.equal(s.body.region, 'thermal');
  s.body.mutations.push('gills');
  act(s, { type: 'move', dx: 0, dy: 1 });
  assert.equal(s.body.region, 'deep');
});
void test('acid requires material knowledge and removes the faced barrier', () => {
  const s = fixture('coral');
  s.body.x = 29;
  s.body.y = 17;
  s.body.facing = { x: 1, y: 0 };
  s.body.mutations = ['acid'];
  regionOf(s).tiles[17][30] = '≡';
  act(s, { type: 'ability', ability: 'acid' });
  assert.equal(regionOf(s).tiles[17][30], '≡');
  known(s, 'calcite');
  act(s, { type: 'ability', ability: 'acid' });
  assert.equal(regionOf(s).tiles[17][30], '.');
});
void test('a placed light attracts a moth which opens a real calcified barrier', () => {
  const s = fixture('coral');
  const r = regionOf(s);
  s.body.x = 30;
  s.body.y = 17;
  s.body.facing = { x: 1, y: 0 };
  s.body.inventory.glowcap = 1;
  for (let y = 15; y <= 20; y++)
    for (let x = 28; x <= 35; x++) r.tiles[y][x] = '.';
  r.tiles[17][33] = '≡';
  const moth = r.entities.find((e) => e.species === 'moth')!;
  moth.x = 31;
  moth.y = 19;
  act(s, { type: 'place', item: 'glowcap' });
  for (let i = 0; i < 9; i++) act(s, { type: 'rest' });
  assert.equal(r.tiles[17][33], '.');
  assert.ok(entry(s, 'moth').interactions > 0);
});
void test('Vessel Slugs follow nutrients and reduce local exposure without reversing it', () => {
  const s = fixture('tideflats');
  const r = regionOf(s);
  s.body.x = 30;
  s.body.y = 17;
  s.body.facing = { x: 1, y: 0 };
  const slug = r.entities.find((e) => e.species === 'slug')!;
  slug.x = 32;
  slug.y = 17;
  r.tiles[17][31] = '.';
  s.body.contamination = 40;
  act(s, { type: 'place', item: 'nutrient' });
  for (let i = 0; i < 6; i++) act(s, { type: 'rest' });
  assert.ok(r.safe.length > 0);
  assert.ok(s.body.contamination >= 40);
});
void test('Sulphur Moss slows accumulation, while the Still stops it', () => {
  const s = fixture('thermal');
  s.body.x = 3;
  s.body.y = 3;
  const base = localRate(s);
  beside(s, 'moss');
  assert.ok(localRate(s) < base);
  const bog = fixture('bog');
  bog.body.x = 49;
  bog.body.y = 27;
  const before = bog.body.contamination;
  act(bog, { type: 'rest' });
  assert.equal(bog.body.contamination, before);
});
void test('cross references need every chemical source and regional breadth', () => {
  const s = fixture();
  for (const id of ['pixie', 'brack', 'fern', 'root']) known(s, id);
  crossReference(s);
  assert.ok(!s.memory.links.includes('gradient'));
  entry(s, 'pixie').biomes = ['beach', 'mycelium'];
  entry(s, 'fern').biomes = ['thermal'];
  crossReference(s);
  assert.ok(s.memory.links.includes('gradient'));
  assert.equal(stage(s, 'root'), 4);
});
void test('sealed specimens are unavailable until physical and knowledge prerequisites are met', () => {
  const s = fixture('coral');
  const chamber = beside(s, 'chamber');
  act(s, { type: 'absorb', target: chamber.uid });
  assert.equal(entry(s, 'chamber').chemical, 0);
  s.body.mutations = ['acid', 'thermal'];
  for (const id of ['calcite', 'slug', 'rot']) known(s, id);
  act(s, { type: 'interact', target: chamber.uid });
  assert.ok(chamber.opened);
  assert.ok(entry(s, 'chamber').chemical >= 2);
});
void test('underground spawning requires warmth, light, and nutrient understanding', () => {
  const s = fixture('underground');
  s.body.x = 30;
  s.body.y = 17;
  s.selected = null;
  act(s, { type: 'interact' });
  assert.equal(s.memory.pool, false);
  for (const id of ['glowcap', 'moss', 'root']) known(s, id);
  act(s, { type: 'interact' });
  assert.equal(s.memory.pool, true);
  merge(s, 'test');
  hatch(s, 'underground');
  assert.equal(s.body.region, 'underground');
  assert.equal(s.memory.spawn, 'underground');
});
void test('all three endings require knowledge and their actual world location', () => {
  const s = fixture();
  for (const d of SPECIES)
    known(
      s,
      d.id,
      BIOMES.map((b) => b.id),
    );
  s.memory.choir = [0, 1, 2, 3, 4];
  s.memory.visited = BIOMES.map((b) => b.id);
  crossReference(s);
  assert.ok(CURE_LINKS.every((x) => s.memory.links.includes(x)));
  assert.deepEqual(endingReadiness(s), {
    escape: true,
    cure: true,
    renewal: true,
    catalogued: 8,
  });
  act(s, { type: 'ending', ending: 'cure' });
  assert.equal(s.status, 'playing');
  for (const ending of ['cure', 'renewal', 'escape'] as const) {
    const run = structuredClone(s);
    if (ending === 'escape') {
      run.body.region = 'tideflats';
      const gate = regionOf(run).portals.find((p) => p.to === 'edge')!;
      run.body.x = gate.x;
      run.body.y = gate.y - 1;
    } else {
      run.body.region = 'deep';
      beside(run, 'hearth');
    }
    act(run, { type: 'ending', ending });
    assert.equal(run.status, 'ended');
    assert.equal(run.ending, ending);
    assert.ok(run.memory.endings.includes(ending));
  }
});
void test('predators are avoidable, and a spore veil protects a direct encounter', () => {
  const s = fixture('coral');
  const toad = beside(s, 'toad');
  s.body.x = toad.x;
  s.body.y = toad.y;
  s.body.mutations = ['veil'];
  act(s, { type: 'ability', ability: 'veil' });
  assert.equal(s.status, 'playing');
  s.body.veil = 0;
  act(s, { type: 'rest' });
  assert.equal(s.status, 'merged');
});
void test('mimicry freezes threats and echolocation expands the information layer', () => {
  const s = fixture('mycelium');
  const wraith = beside(s, 'wraith');
  s.body.mutations = ['mimicry', 'echo'];
  act(s, { type: 'ability', ability: 'mimicry' });
  assert.ok(wraith.stun > 0);
  act(s, { type: 'ability', ability: 'echo' });
  assert.ok(s.body.sonar > 0);
});
void test('light is occluded by opaque geometry', () => {
  const s = fixture(),
    r = regionOf(s);
  r.tiles[17][31] = '#';
  assert.equal(sightLine(r, { x: 30, y: 17 }, { x: 32, y: 17 }), false);
  r.tiles[17][31] = '.';
  assert.equal(sightLine(r, { x: 30, y: 17 }, { x: 32, y: 17 }), true);
});
void test('save round trips preserve a live run and malformed saves are rejected', () => {
  const s = fixture('coral');
  sample(s, 'chalk');
  s.body.inventory.glowcap = 2;
  assert.deepEqual(deserialize(serialize(s)), s);
  assert.equal(deserialize('{bad'), null);
  const broken = JSON.parse(serialize(s));
  broken.body.x = -1;
  assert.equal(deserialize(JSON.stringify(broken)), null);
  broken.body.x = 20;
  broken.memory.links = ['invented'];
  assert.equal(deserialize(JSON.stringify(broken)), null);
});
void test('invalid actions and post-death input never mutate the life', () => {
  const s = fixture(),
    before = serialize(s);
  act(s, { type: 'move', dx: 2, dy: 0 });
  assert.equal(serialize(s), before);
  merge(s, 'test');
  const dead = serialize(s);
  act(s, { type: 'move', dx: 1, dy: 0 });
  assert.equal(serialize(s), dead);
});
void test('all almanac dependencies refer to actual obtainable sources', () => {
  for (const link of LINKS)
    for (const id of link.needs) {
      assert.ok(BY_ID[id], id);
      assert.ok(BY_ID[id].biomes.length, id);
    }
  for (const d of SPECIES) {
    assert.ok(d.text.length > 0, `Missing vault text for ${d.name}`);
  }
  assert.equal(new Set(SPECIES.map((d) => d.id)).size, SPECIES.length);
  assert.equal(ADAPTATIONS.length, 8);
});
