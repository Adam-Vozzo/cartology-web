'use client';
/* oxlint-disable react/react-compiler -- This canvas game intentionally uses an imperative engine shared with animation and keyboard handlers; React Compiler is not enabled. */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  Volume2,
  VolumeX,
  HelpCircle,
  Maximize,
  Eye,
  Droplets,
  Hand,
  Pause,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Backpack,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ADAPTATIONS,
  BIOME,
  BIOMES,
  BY_ID,
  CHOIR,
  ENDINGS,
  LINKS,
  SPECIES,
} from '@/src/game/content';
import type { BiomeId, Item } from '@/src/game/content';
import {
  act,
  condition,
  deserialize,
  distance,
  endingReadiness,
  has,
  nearby,
  newGame,
  regionOf,
  SAVE_KEY,
  serialize,
  stage,
  stateSummary,
  STAGES,
  threshold,
  visibility,
  visibleEntities,
  WORLD_EDGES,
} from '@/src/game/engine';
import type { Action, GameState } from '@/src/game/engine';
import { canvasPoint, createRenderer } from '@/src/game/renderer';
import { Ambience } from '@/src/game/audio';
import './game.css';

const ITEM_NAMES: Record<Item, string> = {
  glowcap: 'Glowcap fragments',
  veilmoss: 'Veilmoss strips',
  nutrient: 'Decayed nutrients',
  nectar: 'Tidebloom nectar',
};
const ITEM_HINTS: Record<Item, string> = {
  glowcap: 'A living light. Moths follow it. Place beside a calcified seal.',
  veilmoss: 'Its scent repels hungry grazers. Lay it along a narrow passage.',
  nutrient: 'Slugs, Rot Eels, and Tidesweepers follow nutrient gradients.',
  nectar: 'Tidepool Architects gather where the nectar falls.',
};
const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  w: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
};
const ABILITIES = [
  { key: '1', id: 'veil', name: 'Spore veil' },
  { key: '2', id: 'mimicry', name: 'Mimic light' },
  { key: '3', id: 'echo', name: 'Echo pulse' },
  { key: '4', id: 'acid', name: 'Dissolve' },
] as const;

function Atlas({ state }: { state: GameState }) {
  const known = BIOMES.filter((b) => state.memory.visited.includes(b.id));
  const positions: Record<BiomeId, [number, number]> = {
    beach: [300, 220],
    coral: [444, 220],
    kelp: [158, 220],
    mycelium: [300, 115],
    tideflats: [300, 325],
    bog: [155, 110],
    thermal: [305, 35],
    bloom: [130, 30],
    canopy: [480, 92],
    shelf: [570, 255],
    deep: [490, 344],
    underground: [197, 308],
  };
  const rotation = ((state.memory.seed % 4) * Math.PI) / 2;
  for (const id of Object.keys(positions) as BiomeId[]) {
    const [x, y] = positions[id];
    const dx = x - 300,
      dy = (y - 220) * 1.3;
    positions[id] = [
      300 + dx * Math.cos(rotation) - dy * Math.sin(rotation),
      220 + (dx * Math.sin(rotation) + dy * Math.cos(rotation)) / 1.3,
    ];
  }
  return (
    <div className="atlas">
      <svg
        viewBox="0 -45 680 500"
        aria-label="Discovered biome relationships. Depth is shown beside each region."
      >
        <title>Discovered biome relationships</title>
        {WORLD_EDGES.filter(
          (edge) =>
            state.memory.visited.includes(edge.from) &&
            state.memory.visited.includes(edge.to),
        ).map((edge) => (
          <path
            key={`${edge.from}-${edge.to}`}
            d={`M ${positions[edge.from][0]} ${positions[edge.from][1]} L ${positions[edge.to][0]} ${positions[edge.to][1]}`}
            stroke="#455f56"
            fill="none"
            strokeDasharray={edge.need?.length ? '3 5' : undefined}
          />
        ))}
        {known.map((b) => {
          const [x, y] = positions[b.id];
          return (
            <g key={b.id}>
              <circle
                cx={x}
                cy={y}
                r={b.id === state.body.region ? 9 : 5}
                fill={b.color}
              />
              <circle
                cx={x}
                cy={y}
                r={b.id === state.body.region ? 17 : 11}
                stroke={b.color}
                fill="none"
                opacity=".3"
              />
              <text
                x={x}
                y={y + 30}
                textAnchor="middle"
                fill={b.color}
                fontSize="13"
              >
                {b.name
                  .replace('The ', '')
                  .replace('Bioluminescent Beach', 'Beach')
                  .replace('Enshrouded Mycelium', 'Mycelium')}
              </text>
              {b.depth !== 0 && (
                <text
                  x={x}
                  y={y + 46}
                  textAnchor="middle"
                  fill="#81978d"
                  fontSize="11"
                >
                  {b.depth > 0 ? 'ABOVE' : 'BELOW'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="muted">
        The network remembers relationships. Terrain changes with each life.
      </p>
      <div className="atlas-places">
        {known.map((b) => (
          <article key={b.id}>
            <span style={{ color: b.color }}>●</span>
            <div>
              <h3>{b.name}</h3>
              <p>{b.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Game() {
  const state = useRef<GameState>(newGame(130913));
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<Ambience | null>(null);
  const startedRef = useRef(false);
  const dialogRef = useRef<string | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, setRevision] = useState(0);
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Saved on this device');
  const [dialog, setDialog] = useState<'almanac' | 'help' | 'carry' | null>(
    null,
  );
  const [tab, setTab] = useState('entries');
  const [entryId, setEntryId] = useState('glowcap');
  const [search, setSearch] = useState('');
  const [sound, setSound] = useState(false);
  const [finish, setFinish] = useState<'escape' | 'cure' | 'renewal' | null>(
    null,
  );
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  const save = useCallback(() => {
    try {
      localStorage.setItem(SAVE_KEY, serialize(state.current));
      setSaveMessage('Saved on this device');
    } catch {
      setSaveMessage('Storage unavailable · keep this tab open');
    }
  }, []);
  const execute = useCallback(
    (action: Action) => {
      act(state.current, action);
      save();
      refresh();
    },
    [refresh, save],
  );
  const open = useCallback((next: typeof dialog, whichTab?: string) => {
    if (whichTab) setTab(whichTab);
    dialogRef.current = next;
    setDialog(next);
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const restored = deserialize(raw);
        if (restored) {
          state.current = restored;
          setHasSave(true);
        } else {
          setSaveMessage('An older or damaged save could not be loaded');
          state.current = newGame(
            crypto.getRandomValues(new Uint32Array(1))[0],
          );
        }
      } else
        state.current = newGame(crypto.getRandomValues(new Uint32Array(1))[0]);
    } catch {
      setSaveMessage('Storage unavailable · keep this tab open');
    }
    setLoaded(true);
    refresh();
    const stop = createRenderer(canvas.current!, () => state.current);
    return () => {
      stop();
      audio.current?.dispose();
    };
  }, [refresh]);
  const begin = useCallback(() => {
    startedRef.current = true;
    setStarted(true);
    save();
    canvas.current?.focus();
  }, [save]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          ['INPUT', 'TEXTAREA'].includes(event.target.tagName))
      )
        return;
      if (dialogRef.current || finish) return;
      if (!startedRef.current) {
        if (event.key === 'Enter') {
          event.preventDefault();
          begin();
        }
        return;
      }
      const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (MOVES[k]) {
        event.preventDefault();
        execute({ type: 'move', dx: MOVES[k][0], dy: MOVES[k][1] });
      } else if (
        [
          'o',
          'e',
          'f',
          '.',
          ' ',
          'j',
          'm',
          'i',
          '?',
          '1',
          '2',
          '3',
          '4',
        ].includes(k)
      ) {
        event.preventDefault();
        if (k === 'j') open('almanac', 'entries');
        else if (k === 'm') open('almanac', 'map');
        else if (k === 'i') open('carry');
        else if (k === '?') open('help');
        else if (k === 'o') execute({ type: 'observe' });
        else if (k === 'e') execute({ type: 'absorb' });
        else if (k === 'f') execute({ type: 'interact' });
        else if (k === '.' || k === ' ') execute({ type: 'rest' });
        else {
          const a = ABILITIES.find((a) => a.key === k);
          if (a) execute({ type: 'ability', ability: a.id });
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // State is read from refs so movement never uses an old run.
  }, [execute, open, finish, begin]);
  useEffect(() => {
    const stop = () => {
      if (repeat.current) {
        clearInterval(repeat.current);
        repeat.current = null;
      }
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('blur', stop);
    return () => {
      stop();
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('blur', stop);
    };
  }, []);
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const tools: Tool[] = [
      {
        name: 'read_cartology',
        description:
          'Read the current life, visible organisms, nearby passages, and last observation.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => stateSummary(state.current),
      },
      {
        name: 'play_cartology',
        description:
          'Perform up to 12 normal game actions. Movement, absorption, interaction, rest, and adaptations advance the life. This uses the same rules as keyboard play. Does not choose endings.',
        inputSchema: {
          type: 'object',
          properties: {
            actions: {
              type: 'array',
              maxItems: 12,
              items: {
                type: 'object',
                properties: {
                  type: {
                    enum: [
                      'move',
                      'observe',
                      'absorb',
                      'interact',
                      'rest',
                      'ability',
                      'place',
                    ],
                  },
                  dx: { type: 'integer', minimum: -1, maximum: 1 },
                  dy: { type: 'integer', minimum: -1, maximum: 1 },
                  target: { type: 'string' },
                  ability: { enum: ['veil', 'mimicry', 'echo', 'acid'] },
                  item: { enum: ['glowcap', 'veilmoss', 'nutrient', 'nectar'] },
                },
                required: ['type'],
                additionalProperties: false,
              },
            },
          },
          required: ['actions'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const list = (input as { actions?: unknown[] })?.actions;
          if (!Array.isArray(list) || !list.length || list.length > 12)
            throw Error('Provide one to twelve actions.');
          for (const raw of list) {
            const a = raw as Record<string, unknown>;
            if (
              !a ||
              ![
                'move',
                'observe',
                'absorb',
                'interact',
                'rest',
                'ability',
                'place',
              ].includes(String(a.type))
            )
              throw Error('Unknown action.');
            if (
              a.type === 'move' &&
              (!Number.isInteger(a.dx) ||
                !Number.isInteger(a.dy) ||
                Math.abs(Number(a.dx)) + Math.abs(Number(a.dy)) !== 1)
            )
              throw Error('Move one cardinal tile.');
            if (
              a.type === 'ability' &&
              !ABILITIES.some((x) => x.id === a.ability)
            )
              throw Error('Unknown adaptation.');
            if (
              a.type === 'place' &&
              !Object.keys(ITEM_NAMES).includes(String(a.item))
            )
              throw Error('Unknown carried item.');
            if (a.target !== undefined && typeof a.target !== 'string')
              throw Error('Target must be an organism id.');
          }
          if (dialogRef.current || finish)
            throw Error(
              'Close the open field guide before advancing the world.',
            );
          if (!startedRef.current) {
            startedRef.current = true;
            setStarted(true);
          }
          for (const action of list) act(state.current, action as Action);
          save();
          refresh();
          return stateSummary(state.current);
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {
        /* Experimental registry is optional. */
      }
    }
    return () => life.abort();
  }, [save, refresh, finish]);
  const s = state.current,
    b = BIOME[s.body.region],
    r = regionOf(s),
    local = nearby(s, 1),
    selected = r.entities.find((e) => e.uid === s.selected) || local[0],
    readiness = endingReadiness(s);
  const discovered = SPECIES.filter((d) => s.memory.entries[d.id]?.seen);
  const matches = discovered.filter((d) =>
    `${d.name} ${d.kind}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedEntry = BY_ID[entryId],
    entryStage = stage(s, entryId);
  const rootHere =
    s.body.region === 'deep' &&
    nearby(s, 2).some((e) => e.species === 'hearth');
  const edgeHere =
    s.body.region === 'tideflats' &&
    r.portals.some((p) => p.to === 'edge' && distance(p, s.body) <= 1);
  const choose = (id: string) => {
    s.selected = id;
    execute({ type: 'observe', target: id });
  };
  const handleCanvas = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!started || s.status !== 'playing') return;
    const p = canvasPoint(s, event.currentTarget, event.clientX, event.clientY);
    const entity = r.entities.find(
      (e) => e.x === p.x && e.y === p.y && visibility(s, e) > 0,
    );
    if (entity) choose(entity.uid);
    else if (
      distance(p, s.body) === 1 &&
      (p.x === s.body.x || p.y === s.body.y)
    )
      execute({ type: 'move', dx: p.x - s.body.x, dy: p.y - s.body.y });
    else {
      s.log = [
        ...s.log.slice(-19),
        'Use the movement keys or direction pad to approach. Tap a visible organism to observe it.',
      ];
      refresh();
    }
    event.currentTarget.focus();
  };
  const holdMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    dx: number,
    dy: number,
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (repeat.current) clearInterval(repeat.current);
    execute({ type: 'move', dx, dy });
    repeat.current = setInterval(() => {
      if (!dialogRef.current) execute({ type: 'move', dx, dy });
    }, 160);
  };
  const endHold = () => {
    if (repeat.current) {
      clearInterval(repeat.current);
      repeat.current = null;
    }
  };
  return (
    <main className="game-shell">
      <header className="masthead">
        <div className="wordmark">
          CART<span className="egg">O</span>LOGY
        </div>
        <nav aria-label="Game controls">
          <button
            className="quiet-button"
            onClick={() => open('almanac', 'entries')}
            aria-label="Open almanac, J"
          >
            <BookOpen />
            <span className="nav-label">
              Almanac <kbd>J</kbd>
            </span>
          </button>
          <button
            className="quiet-button"
            onClick={() => open('almanac', 'map')}
            aria-label="Open atlas, M"
          >
            <Compass />
            <span className="nav-label">
              Atlas <kbd>M</kbd>
            </span>
          </button>
          <button
            className="quiet-button"
            aria-label={sound ? 'Mute ambience' : 'Enable ambience'}
            onClick={async () => {
              try {
                if (sound) {
                  audio.current?.stop();
                  setSound(false);
                } else {
                  audio.current ??= new Ambience();
                  await audio.current.start();
                  setSound(true);
                }
              } catch {
                setSound(false);
              }
            }}
          >
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            className="quiet-button"
            aria-label="How to play"
            onClick={() => open('help')}
          >
            <HelpCircle />
          </button>
          <button
            className="quiet-button fullscreen-button"
            aria-label="Toggle fullscreen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void document.documentElement
                  .requestFullscreen()
                  .catch(() => {});
            }}
          >
            <Maximize />
          </button>
        </nav>
      </header>
      <section className="location-row">
        <div>
          <p className="eyebrow">{b.subtitle}</p>
          <h1>{b.name}</h1>
        </div>
        <div className="life-mark">
          <span
            className="life-light"
            style={{
              background: s.body.contamination > 70 ? '#b092a3' : b.color,
            }}
          />{' '}
          LIFE {String(s.memory.life).padStart(2, '0')}
          <span className="condition-word">
            {' '}
            · {condition(s).toUpperCase()}
          </span>
        </div>
      </section>
      <div className="world-wrap">
        <canvas
          className="world-canvas"
          ref={canvas}
          tabIndex={0}
          aria-label={`${b.name}. You are @. Use arrows or WASD to move; O to observe, E to absorb, F to interact.`}
          onPointerDown={handleCanvas}
        />
        <div className="world-border" />
        {started && s.status === 'playing' && (
          <>
            <span className="world-caption">
              {s.body.region === 'bog'
                ? '∅  NO NETWORK SIGNAL'
                : s.body.region === 'mycelium' && !has(s, 'echo')
                  ? '⌁  SIGNAL SCATTERED'
                  : `◇  ${s.memory.visited.length} ${s.memory.visited.length === 1 ? 'PLACE' : 'PLACES'} REMEMBERED`}
            </span>
            <span className="world-life">
              {s.body.health < 40
                ? 'Your body needs shelter.'
                : s.body.veil > 0
                  ? 'A veil of your own spores.'
                  : s.body.sonar > 0
                    ? 'Stone answers your pulse.'
                    : s.body.calcium > 70
                      ? 'Calcium weighs on your limbs.'
                      : 'The world moves when you do.'}
            </span>
          </>
        )}
        {!started && (
          <div className="opening">
            <p className="eyebrow">FUNGI · ALGAE · CORAL</p>
            <h2>
              CART<span className="egg">O</span>LOGY
            </h2>
            <p>
              You are small. The world is fading.
              <br />
              Something remembers.
            </p>
            <button
              className="primary-button"
              disabled={!loaded}
              onClick={begin}
            >
              {hasSave ? 'Return to the network' : 'Hatch into the shallows'}{' '}
              <span aria-hidden="true">↗</span>
            </button>
            <span className="quiet-line">Every life leaves a trace.</span>
          </div>
        )}
        {started && s.status === 'merged' && (
          <div className="opening merge-screen">
            <p className="eyebrow">
              LIFE {String(s.memory.life).padStart(2, '0')} RETURNS TO THE
              NETWORK
            </p>
            <h2>Nothing learned is lost.</h2>
            <p>{s.lastDeath}</p>
            <blockquote>{CHOIR[s.memory.choir.at(-1) ?? 0]}</blockquote>
            <span className="quiet-line">
              {Object.keys(s.memory.entries).length} entries ·{' '}
              {s.memory.links.length} connections · {s.memory.choir.length}{' '}
              Choir fragments
            </span>
            <div className="rebirth-buttons">
              <button
                className="primary-button"
                onClick={() => execute({ type: 'hatch', spawn: 'beach' })}
              >
                Hatch at the Beach ↗
              </button>
              {s.memory.pool && (
                <button
                  className="action-button"
                  onClick={() =>
                    execute({ type: 'hatch', spawn: 'underground' })
                  }
                >
                  Hatch underground
                </button>
              )}
            </div>
            <button
              className="quiet-button"
              onClick={() => open('almanac', 'echoes')}
            >
              Read what the network remembers
            </button>
          </div>
        )}
        {started && s.status === 'ended' && s.ending && (
          <div className="opening ending-screen">
            <p className="eyebrow">{s.ending.toUpperCase()}</p>
            <h2>{ENDINGS[s.ending].title}</h2>
            <p>{ENDINGS[s.ending].text}</p>
            <span className="quiet-line">
              {s.memory.life} lives · {discovered.length} entries · one living
              memory
            </span>
            <button
              className="primary-button"
              onClick={() => execute({ type: 'hatch', spawn: 'beach' })}
            >
              Return to the memory ↗
            </button>
            <span className="quiet-line">
              Revisit the world before this choice. Your ending remains
              recorded.
            </span>
          </div>
        )}
      </div>
      <div className="field-strip">
        <div className="field-observation">
          <span
            className="field-glyph"
            style={{
              color: selected ? BY_ID[selected.species].color : b.color,
            }}
          >
            {selected ? BY_ID[selected.species].glyph : '@'}
          </span>
          <div>
            <span className="field-name">
              {selected ? BY_ID[selected.species].name : 'Lichen symbiont'}{' '}
              <small>
                {selected
                  ? STAGES[stage(s, selected.species)]
                  : 'Fungi · algae · coral'}
              </small>
            </span>
            <output className="journal-line" aria-live="polite">
              {s.log.at(-1)}
            </output>
          </div>
        </div>
        <div className="nearby-list" aria-label="Visible organisms">
          {visibleEntities(s)
            .filter((e) => distance(e, s.body) <= 4)
            .slice(0, 5)
            .map((e) => (
              <button
                key={e.uid}
                title={BY_ID[e.species].name}
                aria-label={`Observe ${BY_ID[e.species].name}`}
                className={selected?.uid === e.uid ? 'selected' : ''}
                onClick={() => choose(e.uid)}
                style={{ color: BY_ID[e.species].color }}
              >
                {BY_ID[e.species].glyph}
              </button>
            ))}
        </div>
      </div>
      <div className="bottom-bar">
        <div className="action-bar">
          <button
            className="action-button"
            disabled={!started || s.status !== 'playing'}
            onClick={() => execute({ type: 'observe' })}
          >
            <Eye />
            <span>Observe</span>
            <kbd className="keycap">O</kbd>
          </button>
          <button
            className="action-button"
            disabled={!started || s.status !== 'playing'}
            onClick={() => execute({ type: 'absorb' })}
          >
            <Droplets />
            <span>Absorb</span>
            <kbd className="keycap">E</kbd>
          </button>
          <button
            className="action-button"
            disabled={!started || s.status !== 'playing'}
            onClick={() => execute({ type: 'interact' })}
          >
            <Hand />
            <span>Touch</span>
            <kbd className="keycap">F</kbd>
          </button>
          <button
            className="action-button"
            disabled={!started || s.status !== 'playing'}
            onClick={() => execute({ type: 'rest' })}
          >
            <Pause />
            <span>Rest</span>
            <kbd className="keycap">␣</kbd>
          </button>
          <button
            className="action-button"
            onClick={() => open('carry')}
            aria-label="Open carried items, I"
          >
            <Backpack />
            <span>Carry</span>
            <kbd className="keycap">I</kbd>
          </button>
        </div>
        <div className="direction-controls" aria-label="Move one tile">
          {[
            { dx: -1, dy: 0, label: 'Move left', Icon: ArrowLeft },
            { dx: 0, dy: -1, label: 'Move up', Icon: ArrowUp },
            { dx: 0, dy: 1, label: 'Move down', Icon: ArrowDown },
            { dx: 1, dy: 0, label: 'Move right', Icon: ArrowRight },
          ].map(({ dx, dy, label, Icon }) => (
            <button
              key={label}
              disabled={!started || s.status !== 'playing'}
              className="direction-button"
              aria-label={label}
              onPointerDown={(e) => holdMove(e, dx, dy)}
              onPointerUp={endHold}
              onPointerCancel={endHold}
              onLostPointerCapture={endHold}
              onClick={(e) => {
                if (e.detail === 0) execute({ type: 'move', dx, dy });
              }}
            >
              <Icon />
            </button>
          ))}
        </div>
      </div>
      {s.body.mutations.length > 0 && (
        <div className="adaptation-strip">
          <span className="eyebrow">THIS BODY</span>
          {ADAPTATIONS.filter((a) => has(s, a.id)).map((a) => {
            const ability = ABILITIES.find((x) => x.id === a.id);
            return ability ? (
              <button
                key={a.id}
                className="quiet-button"
                disabled={s.status !== 'playing'}
                onClick={() =>
                  execute({ type: 'ability', ability: ability.id })
                }
              >
                {a.glyph} {ability.name} <kbd>{ability.key}</kbd>
              </button>
            ) : (
              <span className="passive-adaptation" key={a.id}>
                {a.glyph} {a.name}
              </span>
            );
          })}
        </div>
      )}
      {started && s.status === 'playing' && (rootHere || edgeHere) && (
        <div className="future-choices">
          <p>
            {rootHere
              ? 'You stand beside the world’s oldest living tissue.'
              : 'Beyond this tide, the signal fades.'}
          </p>
          {edgeHere && readiness.escape && (
            <button
              className="primary-button"
              onClick={() => setFinish('escape')}
            >
              Leave the network
            </button>
          )}
          {rootHere && readiness.cure && (
            <button
              className="primary-button"
              onClick={() => setFinish('cure')}
            >
              Introduce the reconstructed Weft
            </button>
          )}
          {rootHere && readiness.renewal && (
            <button
              className="action-button"
              onClick={() => setFinish('renewal')}
            >
              Complete the cycle
            </button>
          )}
          {((rootHere && !readiness.cure) ||
            (edgeHere && !readiness.escape)) && (
            <button
              className="quiet-button"
              onClick={() => open('almanac', 'threads')}
            >
              Read the unfinished connections
            </button>
          )}
        </div>
      )}
      <footer className="footer">
        <span>WASD / arrows to move · Tap a glyph to observe</span>
        <span>{saveMessage}</span>
      </footer>
      <Dialog
        open={dialog === 'almanac'}
        onOpenChange={(value) => {
          if (!value) open(null);
        }}
      >
        <DialogContent className="almanac-dialog">
          <div className="book-heading">
            <p className="eyebrow">THE HIVEMIND’S FIELD GUIDE</p>
            <DialogTitle className="book-title">The Almanac</DialogTitle>
            <DialogDescription>
              What the world has taught us, across{' '}
              {s.memory.life === 1 ? 'one life' : `${s.memory.life} lives`}.
            </DialogDescription>
          </div>
          <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
            <TabsList className="book-tabs" variant="line">
              <TabsTrigger value="entries">
                Entries <span>{discovered.length}</span>
              </TabsTrigger>
              <TabsTrigger value="threads">
                Connections <span>{s.memory.links.length}</span>
              </TabsTrigger>
              <TabsTrigger value="map">Atlas</TabsTrigger>
              <TabsTrigger value="body">Adaptations</TabsTrigger>
              <TabsTrigger value="echoes">Echoes</TabsTrigger>
            </TabsList>
            <TabsContent value="entries">
              <div className="entry-layout">
                <aside className="entry-index">
                  <label className="sr-only" htmlFor="search-entries">
                    Find an entry
                  </label>
                  <input
                    id="search-entries"
                    type="search"
                    placeholder="Find an entry…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="index-scroll">
                    {matches.map((d) => (
                      <button
                        key={d.id}
                        className={`index-entry ${entryId === d.id ? 'active' : ''}`}
                        onClick={() => setEntryId(d.id)}
                      >
                        <span style={{ color: d.color }}>{d.glyph}</span>
                        <div>
                          {d.name}
                          <small>{STAGES[stage(s, d.id)]}</small>
                        </div>
                        <i>{'·'.repeat(stage(s, d.id))}</i>
                      </button>
                    ))}
                    {!matches.length && (
                      <p className="muted">No recorded entry matches.</p>
                    )}
                  </div>
                  <p className="index-foot">
                    {SPECIES.length - discovered.length} forms still unknown
                  </p>
                </aside>
                <article className="entry-page">
                  <div
                    className="specimen-mark"
                    style={{ color: selectedEntry.color }}
                  >
                    {selectedEntry.glyph}
                  </div>
                  <p className="eyebrow">
                    {selectedEntry.kind} · {STAGES[entryStage]}
                  </p>
                  <h2>{selectedEntry.name}</h2>
                  {entryStage > 0 ? (
                    <>
                      <p className="entry-lead">
                        {selectedEntry.text[0] || selectedEntry.hint}
                      </p>
                      <div className="field-note">
                        <span className="eyebrow">FIELD OBSERVATION</span>
                        <p>{selectedEntry.hint}</p>
                      </div>
                      {entryStage >= 2 ? (
                        <>
                          <h3>Chemical record</h3>
                          <p>{selectedEntry.text[1] || selectedEntry.hint}</p>
                        </>
                      ) : (
                        <div className="knowledge-gap">
                          Chemical composition unrecorded. Absorb beside a
                          living source.
                        </div>
                      )}
                      {entryStage >= 3 ? (
                        <>
                          <h3>Ecological relationships</h3>
                          {selectedEntry.text.slice(2, 4).map((t, i) => (
                            <p key={i}>{t}</p>
                          ))}
                        </>
                      ) : (
                        <div className="knowledge-gap">
                          Relationships unresolved. Watch, sample again, and
                          experiment.
                        </div>
                      )}
                      {entryStage >= 4 && (
                        <>
                          <h3>A deeper understanding</h3>
                          {selectedEntry.text.slice(4).map((t, i) => (
                            <p key={i}>{t}</p>
                          ))}
                        </>
                      )}
                      <div className="entry-connections">
                        {LINKS.filter(
                          (l) =>
                            s.memory.links.includes(l.id) &&
                            l.needs.includes(entryId),
                        ).map((l) => (
                          <div key={l.id}>
                            <h3>↗ {l.name}</h3>
                            <p>{l.text}</p>
                            <div>
                              {l.needs
                                .filter((id) => id !== entryId)
                                .map((id) => (
                                  <button
                                    key={id}
                                    className="text-link"
                                    onClick={() => setEntryId(id)}
                                  >
                                    {BY_ID[id].name} ↗
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="entry-location">
                        Recorded in{' '}
                        {(s.memory.entries[entryId]?.biomes || [])
                          .map((id) => BIOME[id].name.replace('The ', ''))
                          .join(' · ')}
                      </p>
                    </>
                  ) : (
                    <div className="knowledge-gap">
                      This form has not yet been observed.
                    </div>
                  )}
                </article>
              </div>
            </TabsContent>
            <TabsContent value="threads">
              <div className="thread-page">
                <p className="book-intro">
                  Separate observations begin to agree. Chemical samples from
                  different lives can become a single explanation.
                </p>
                {LINKS.filter((l) =>
                  l.needs.some((id) => stage(s, id) > 0),
                ).map((l) => {
                  const complete = s.memory.links.includes(l.id);
                  return (
                    <article
                      className={`connection ${complete ? 'complete' : ''}`}
                      key={l.id}
                    >
                      <span className="connection-symbol">
                        {complete ? '✧' : '⋯'}
                      </span>
                      <div>
                        <p className="eyebrow">
                          {complete
                            ? 'CROSS-REFERENCE'
                            : 'AN UNFINISHED THREAD'}
                        </p>
                        <h3>{l.name}</h3>
                        {complete && <p>{l.text}</p>}
                        <div className="connection-sources">
                          {l.needs.map((id) => (
                            <button
                              key={id}
                              disabled={!stage(s, id)}
                              className={
                                (s.memory.entries[id]?.chemical || 0) >= 2
                                  ? 'recorded'
                                  : ''
                              }
                              onClick={() => {
                                setEntryId(id);
                                setTab('entries');
                              }}
                            >
                              {stage(s, id) ? BY_ID[id].name : 'Unknown source'}{' '}
                              <small>
                                {(s.memory.entries[id]?.chemical || 0) >= 2
                                  ? '✓'
                                  : '…'}
                              </small>
                            </button>
                          ))}
                        </div>
                        {!complete && (
                          <p className="missing-note">
                            {l.id === 'rootsinger' && s.memory.choir.length < 2
                              ? 'A memory of the Choir is missing. '
                              : ''}
                            Two chemical readings from each source may reveal
                            the connection.
                            {l.requireBiomes
                              ? ` Compare evidence across ${l.requireBiomes} biomes.`
                              : ''}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
                <div className="field-note">
                  <p>
                    The map’s edge becomes legible after two forms are
                    catalogued in six surface biomes. Deeper futures require a
                    connected understanding of the world.
                  </p>
                  {readiness.escape && (
                    <p>
                      ↗ An outward path is known. Seek the far side of the
                      Tideflats.
                    </p>
                  )}
                  {readiness.cure && (
                    <p>
                      ✧ The reconstructed Weft can be delivered at the
                      Hearthroot.
                    </p>
                  )}
                  {readiness.renewal && (
                    <p>
                      ◌ The complete lifecycle is understood. The Hearthroot can
                      return to the cycle.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="map">
              <Atlas state={s} />
            </TabsContent>
            <TabsContent value="body">
              <div className="body-page">
                <div className="body-condition">
                  <div>
                    <p className="eyebrow">THIS LIFE</p>
                    <h3>{condition(s)}</h3>
                    <p>
                      Contamination accumulates. Shelter slows it; only a new
                      body clears it.
                    </p>
                  </div>
                  <div className="body-measures">
                    <span>
                      Vitality <b>{Math.ceil(s.body.health)}%</b>
                    </span>
                    <span>
                      Energy <b>{Math.ceil(s.body.energy)}%</b>
                    </span>
                    <span>
                      Calcium{' '}
                      <b>
                        {s.body.calcium < 35
                          ? 'Flexible'
                          : s.body.calcium < 70
                            ? 'Thickening'
                            : 'Heavy'}
                      </b>
                    </span>
                  </div>
                </div>
                <div className="adaptation-grid">
                  {ADAPTATIONS.map((a) => (
                    <article
                      key={a.id}
                      className={has(s, a.id) ? 'developed' : ''}
                    >
                      <div className="adaptation-title">
                        <span>{a.glyph}</span>
                        <h3>{a.name}</h3>
                      </div>
                      <p>{a.source}</p>
                      <Progress
                        aria-label={`${a.name} exposure`}
                        value={
                          has(s, a.id)
                            ? 100
                            : Math.min(
                                100,
                                (s.body.exposure[a.id] / threshold(s, a.id)) *
                                  100,
                              )
                        }
                      />
                      <div className="progress-caption">
                        {has(s, a.id)
                          ? 'Developed in this body'
                          : `${s.body.exposure[a.id]} / ${threshold(s, a.id)} exposure`}
                        {s.memory.priming[a.id] > 0 && (
                          <span>Priming remembered</span>
                        )}
                      </div>
                      <p className="adaptation-effect">{a.effect}</p>
                    </article>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="echoes">
              <div className="echo-page">
                <p className="book-intro">
                  Not words. Impressions of those who chose to become the
                  network.
                </p>
                {!s.memory.choir.length && (
                  <div className="knowledge-gap">
                    The Choir is quiet. A memory may surface when this life
                    returns to the roots.
                  </div>
                )}
                {s.memory.choir.map((id, i) => (
                  <blockquote key={id}>
                    <span className="eyebrow">
                      FRAGMENT {String(i + 1).padStart(2, '0')}
                    </span>
                    <p>{CHOIR[id]}</p>
                  </blockquote>
                ))}
                {s.memory.endings.length > 0 && (
                  <>
                    <h3>Futures remembered</h3>
                    {s.memory.endings.map((id) => (
                      <article className="field-note" key={id}>
                        <h3>{ENDINGS[id as keyof typeof ENDINGS].title}</h3>
                        <p>{ENDINGS[id as keyof typeof ENDINGS].text}</p>
                      </article>
                    ))}
                  </>
                )}
                <details className="life-log">
                  <summary>This life’s recent impressions</summary>
                  {s.log.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </details>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialog === 'carry'}
        onOpenChange={(v) => {
          if (!v) open(null);
        }}
      >
        <DialogContent className="carry-dialog">
          <DialogTitle className="book-title">What you carry</DialogTitle>
          <DialogDescription>
            Place an offering one tile in the direction you last moved. Then
            watch what follows.
          </DialogDescription>
          <div className="carry-list">
            {(Object.keys(ITEM_NAMES) as Item[]).map((item) => (
              <article key={item}>
                <span className="carry-count">{s.body.inventory[item]}</span>
                <div>
                  <h3>{ITEM_NAMES[item]}</h3>
                  <p>{ITEM_HINTS[item]}</p>
                </div>
                <button
                  className="action-button"
                  disabled={
                    !started ||
                    s.status !== 'playing' ||
                    s.body.inventory[item] === 0
                  }
                  onClick={() => {
                    execute({ type: 'place', item });
                    open(null);
                  }}
                >
                  Place
                </button>
              </article>
            ))}
          </div>
          <p className="muted">
            Touch Glowcaps, Veilmoss, or Tideblooms to harvest small amounts.
            Living slugs follow trails; they cannot be carried.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialog === 'help'}
        onOpenChange={(v) => {
          if (!v) open(null);
        }}
      >
        <DialogContent className="help-dialog">
          <p className="eyebrow">A FEW WAYS TO TOUCH THE WORLD</p>
          <DialogTitle className="book-title">Learn by living.</DialogTitle>
          <DialogDescription>
            You are a lichen symbiont. The almanac carries your discoveries into
            each new life. There is no combat to win.
          </DialogDescription>
          <div className="help-grid">
            <div>
              <h3>
                <kbd>WASD / ↑↓←→</kbd> Move
              </h3>
              <p>
                One tile at a time. Walk into an arrow to leave a region. Some
                passages need adaptations.
              </p>
            </div>
            <div>
              <h3>
                <kbd>O / tap a glyph</kbd> Observe
              </h3>
              <p>
                Read the world for free. Select a visible organism, then move
                beside it for closer contact.
              </p>
            </div>
            <div>
              <h3>
                <kbd>E</kbd> Absorb
              </h3>
              <p>
                Record chemistry and regain energy. Outside the Beach, every
                sample adds contamination.
              </p>
            </div>
            <div>
              <h3>
                <kbd>F</kbd> Touch
              </h3>
              <p>
                Harvest light and moss, contact colonies, ride currents, or open
                a known sealed chamber.
              </p>
            </div>
            <div>
              <h3>
                <kbd>I</kbd> Carry
              </h3>
              <p>
                Place light, moss, nutrients, or nectar. Other organisms
                respond; the world is your tool.
              </p>
            </div>
            <div>
              <h3>
                <kbd>Space / .</kbd> Rest
              </h3>
              <p>
                Recover vitality and energy. Exposure still advances; time
                pauses when you stop acting.
              </p>
            </div>
            <div>
              <h3>
                <kbd>J / M</kbd> Remember
              </h3>
              <p>
                Read the almanac or atlas. Gaps suggest the next experiment;
                connections form automatically.
              </p>
            </div>
            <div>
              <h3>
                <kbd>1 · 2 · 3 · 4</kbd> Adapt
              </h3>
              <p>
                Once developed: release a veil, mimic light, send an echo, or
                dissolve an identified barrier.
              </p>
            </div>
          </div>
          <div className="field-note">
            <p>
              <b>@</b> is you. <b>*</b> is a Glowcap. <b>▓</b> is stone.{' '}
              <b>▒</b> is diggable soil. <b>≡</b> is a calcified barrier.{' '}
              <b>≈</b> is deep water. <b>!</b> is steam. Bright capitals often
              mean danger.
            </p>
            <p>
              Knowledge, compass discoveries, and mutation priming persist. Each
              body must adapt again. Progress is saved in this browser on this
              device.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={finish !== null}
        onOpenChange={(v) => {
          if (!v) setFinish(null);
        }}
      >
        <DialogContent className="help-dialog ending-choice">
          <p className="eyebrow">A FUTURE, CHOSEN</p>
          <DialogTitle className="book-title">
            {finish === 'escape'
              ? 'Leave the network?'
              : finish === 'cure'
                ? 'Return a language to the roots?'
                : 'Let the cycle complete?'}
          </DialogTitle>
          <DialogDescription>
            {finish === 'escape'
              ? 'Carry your life beyond the last signal. The world behind you will continue without your body.'
              : finish === 'cure'
                ? 'Deliver the reconstructed Weft through your Rootsinger biology. Begin a recovery you will not live to see complete.'
                : 'Allow the Hearthroot to decompose fully. Its chemistry will feed whatever can grow next.'}
          </DialogDescription>
          <button
            className="primary-button"
            onClick={() => {
              if (finish) execute({ type: 'ending', ending: finish });
              setFinish(null);
            }}
          >
            Choose this future
          </button>
          <button className="quiet-button" onClick={() => setFinish(null)}>
            Keep listening
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
