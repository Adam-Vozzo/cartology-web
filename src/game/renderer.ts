import { BIOME, BY_ID, HEIGHT, WIDTH } from './content.ts';
import {
  distance,
  pointKey,
  regionOf,
  sightLine,
  visibility,
} from './engine.ts';
import type { GameState, Point } from './engine.ts';

export interface Viewport {
  left: number;
  top: number;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  width: number;
  height: number;
}
export function viewport(s: GameState, w: number, h: number): Viewport {
  const cols = w < 600 ? 31 : WIDTH,
    rows = w < 600 ? 27 : HEIGHT;
  return {
    left: Math.max(0, Math.min(WIDTH - cols, s.body.x - Math.floor(cols / 2))),
    top: Math.max(0, Math.min(HEIGHT - rows, s.body.y - Math.floor(rows / 2))),
    cols,
    rows,
    cellW: w / cols,
    cellH: h / rows,
    width: w,
    height: h,
  };
}
export function canvasPoint(
  s: GameState,
  c: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point {
  const rect = c.getBoundingClientRect(),
    v = viewport(s, rect.width, rect.height);
  return {
    x: Math.floor((clientX - rect.left) / v.cellW) + v.left,
    y: Math.floor((clientY - rect.top) / v.cellH) + v.top,
  };
}
const rgb = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const blend = (base: string, light: number[], strength: number) => {
  const a = rgb(base);
  return `rgb(${a.map((c, i) => Math.round(Math.min(255, c * strength + light[i] * 0.45))).join(',')})`;
};
export function createRenderer(
  c: HTMLCanvasElement,
  getState: () => GameState,
) {
  const ctx = c.getContext('2d');
  if (!ctx) return () => {};
  let frame = 0,
    last = 0;
  let cacheKey = '';
  let illumination: number[][] = [];
  let visible: number[][] = [];
  let time = 0;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const draw = (stamp: number) => {
    frame = requestAnimationFrame(draw);
    if (document.hidden || stamp - last < (media.matches ? 180 : 33)) return;
    last = stamp;
    time = media.matches ? 0 : stamp;
    const s = getState(),
      r = regionOf(s),
      b = BIOME[r.id],
      w = c.clientWidth,
      h = c.clientHeight,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#071014';
    ctx.fillRect(0, 0, w, h);
    const v = viewport(s, w, h),
      cw = v.cellW,
      ch = v.cellH;
    const key = `${s.memory.life}-${s.body.region}-${s.turn}-${s.body.x}-${s.body.y}-${s.body.sonar}`;
    if (key !== cacheKey) {
      cacheKey = key;
      const sources = [
        ...r.entities
          .filter((e) => BY_ID[e.species].light)
          .map((e) => ({
            ...e,
            radius: BY_ID[e.species].light!,
            color: rgb(BY_ID[e.species].color),
          })),
        ...r.drops
          .filter((d) => d.item === 'glowcap')
          .map((d) => ({ ...d, radius: 7, color: rgb('#edc677') })),
        { ...s.body, radius: s.body.flash > 0 ? 12 : 6, color: rgb('#e8d49c') },
      ];
      illumination = [];
      visible = [];
      for (let y = 0; y < HEIGHT; y++) {
        visible[y] = [];
        for (let x = 0; x < WIDTH; x++) {
          const p = { x, y },
            light = [0, 0, 0];
          for (const source of sources) {
            const dist = Math.hypot(x - source.x, y - source.y);
            if (dist < source.radius && sightLine(r, source, p)) {
              const f = Math.pow(1 - dist / source.radius, 1.65);
              for (let i = 0; i < 3; i++) light[i] += source.color[i] * f;
            }
          }
          illumination[y * WIDTH + x] = light;
          visible[y][x] = visibility(s, p);
        }
      }
    }
    const seen = new Set(r.seen);
    const fontSize = Math.min(cw * 1.12, ch * 0.83);
    ctx.font = `${fontSize}px Consolas,'Segoe UI Symbol',monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = v.top; y < v.top + v.rows; y++)
      for (let x = v.left; x < v.left + v.cols; x++) {
        const px = (x - v.left + 0.5) * cw,
          py = (y - v.top + 0.5) * ch,
          tile = r.tiles[y][x],
          vis = visible[y][x],
          light = illumination[y * WIDTH + x],
          known = seen.has(`${x},${y}`);
        const glyph: string =
          tile === '.'
            ? '·'
            : tile === '~'
              ? '~'
              : tile === '#'
                ? '▓'
                : tile === '_'
                  ? '·'
                  : tile;
        let color =
          tile === '~' || tile === '≈'
            ? b.water
            : ['#', '▒', '≡'].includes(tile)
              ? b.wall
              : b.floor;
        if (tile === '!') color = '#f39e74';
        if (tile === 'ψ') color = '#80bc72';
        const base =
          vis > 0 ? 0.28 + b.ambient + vis * 0.22 : known ? 0.17 : 0.065;
        ctx.fillStyle = blend(color, light, base);
        ctx.globalAlpha = 1;
        if (vis > 0) {
          const glow = (light[0] + light[1] + light[2]) / 900;
          ctx.fillStyle = `rgba(${light.map((i) => Math.min(255, Math.round(i))).join(',')},${Math.min(0.2, glow * 0.17)})`;
          ctx.fillRect(px - cw / 2, py - ch / 2, cw + 0.5, ch + 0.5);
          ctx.fillStyle = blend(color, light, base);
        }
        if (s.body.sonar > 0 && vis > 0 && !sightLine(r, s.body, { x, y })) {
          ctx.fillStyle = '#87a7b9';
          ctx.globalAlpha =
            0.35 + 0.3 * Math.sin(time * 0.004 - distance(s.body, { x, y }));
        }
        ctx.fillText(
          glyph,
          px,
          py +
            (tile === '~'
              ? Math.sin(time * 0.001 + x * 0.25 + y * 0.4) * 1.1
              : 0),
        );
      }
    ctx.globalAlpha = 1;
    const drawGlyph = (
      p: Point,
      glyph: string,
      color: string,
      glow = 0,
      scale = 1,
    ) => {
      if (
        p.x < v.left ||
        p.x >= v.left + v.cols ||
        p.y < v.top ||
        p.y >= v.top + v.rows
      )
        return;
      ctx.font = `${scale > 1 ? 'bold ' : ''}${fontSize * scale}px Consolas,'Segoe UI Symbol',monospace`;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      ctx.fillText(glyph, (p.x - v.left + 0.5) * cw, (p.y - v.top + 0.5) * ch);
      ctx.shadowBlur = 0;
    };
    for (const p of r.portals) {
      if (!seen.has(pointKey(p)) && visible[p.y][p.x] <= 0) continue;
      const locked = p.require.some((m) => !s.body.mutations.includes(m));
      drawGlyph(
        p,
        p.label === 'Climb'
          ? '↑'
          : p.label === 'Descend'
            ? '↓'
            : p.x < 3
              ? '←'
              : p.x > 57
                ? '→'
                : p.y < 3
                  ? '↑'
                  : '↓',
        locked ? '#839995' : '#e8d69e',
        8,
        1.2,
      );
    }
    for (const p of r.drops)
      if (visible[p.y][p.x] > 0)
        drawGlyph(
          p,
          p.item === 'glowcap'
            ? '*'
            : p.item === 'veilmoss'
              ? '"'
              : p.item === 'nectar'
                ? '°'
                : ';',
          p.item === 'glowcap'
            ? '#f9d083'
            : p.item === 'veilmoss'
              ? '#aac699'
              : '#d0b98f',
          p.item === 'glowcap' ? 12 : 0,
        );
    for (const e of r.entities) {
      const vis = visible[e.y]?.[e.x];
      if (!vis) continue;
      const d = BY_ID[e.species];
      if (e.species === 'chamber' && e.opened) drawGlyph(e, '□', '#a49e91');
      else {
        ctx.globalAlpha = Math.max(0.48, vis);
        drawGlyph(
          e,
          e.species === 'grazer' && r.id !== 'beach' ? 'g' : d.glyph,
          d.color,
          d.light ? 10 + Math.sin(time * 0.002) * 3 : 0,
          d.threat ? 1.06 : 1,
        );
        ctx.globalAlpha = 1;
      }
      if (e.uid === s.selected) {
        ctx.strokeStyle = '#e4d2a1';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          (e.x - v.left) * cw + 1,
          (e.y - v.top) * ch + 1,
          cw - 2,
          ch - 2,
        );
      }
      if (d.threat && r.id !== 'beach' && distance(e, s.body) < 4) {
        ctx.fillStyle = e.stun > 0 || s.body.veil > 0 ? '#91bdba' : '#f4a19b';
        ctx.font = '10px Consolas,monospace';
        ctx.fillText(
          e.stun > 0 ? '·' : '!',
          (e.x - v.left + 1) * cw,
          (e.y - v.top) * ch,
        );
      }
    }
    // Spores occupy space between cells; light contributes only where geometry allows it.
    const count = r.id === 'bog' ? 6 : b.fog ? 150 : 60;
    for (let i = 0; i < count; i++) {
      const x =
        (((i * 79.73 +
          Math.sin(time * 0.00013 + i) * 30 +
          time * (r.id === 'canopy' ? 0.022 : 0.004)) %
          w) +
          w) %
        w;
      const y =
        (((i * 47.13 - time * (r.id === 'thermal' ? 0.018 : 0.003)) % h) + h) %
        h;
      const gx = Math.min(WIDTH - 1, Math.floor(x / cw) + v.left),
        gy = Math.min(HEIGHT - 1, Math.floor(y / ch) + v.top);
      const light = illumination[gy * WIDTH + gx];
      if (!light) continue;
      const intensity = (light[0] + light[1] + light[2]) / 700;
      ctx.fillStyle = r.id === 'bloom' ? '#edb1ce' : b.color;
      ctx.globalAlpha = 0.07 + Math.min(0.5, intensity * 0.45);
      ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    if (s.body.veil > 0) {
      ctx.strokeStyle = '#c6acd477';
      ctx.beginPath();
      ctx.ellipse(
        (s.body.x - v.left + 0.5) * cw,
        (s.body.y - v.top + 0.5) * ch,
        cw * 2,
        ch * 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    const corruption = s.body.contamination / 100;
    const clean = rgb('#ffe3a0'),
      dirty = rgb('#718977');
    const color = `rgb(${clean.map((n, i) => Math.round(n * (1 - corruption) + dirty[i] * corruption)).join(',')})`;
    drawGlyph(
      s.body,
      s.status === 'merged' ? '·' : '@',
      color,
      s.status === 'merged' ? 5 : 17,
      1.3,
    );
    if (s.body.sonar > 0) {
      const radius = (time * 0.03) % 500;
      ctx.strokeStyle = '#94d2d43a';
      ctx.beginPath();
      ctx.arc(
        (s.body.x - v.left + 0.5) * cw,
        (s.body.y - v.top + 0.5) * ch,
        radius,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      h * 0.17,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.65,
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, `rgba(1,5,10,${0.5 + corruption * 0.3})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (corruption > 0.4) {
      ctx.strokeStyle = `rgba(181,115,148,${(corruption - 0.4) * 0.8})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    }
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}
