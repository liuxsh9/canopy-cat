import { clamp, SCENE_INSET, SCENE_WIDTH, TREE_ART_SCALE } from './seasonalTreeArt.js';

const LEFT = -SCENE_INSET.x;
const RIGHT = SCENE_WIDTH - SCENE_INSET.x;
const SKY = -SCENE_INSET.y;
const GROUND = 82;
const MAX_FLAKES = 48;
const snap = value => Math.round(value * TREE_ART_SCALE) / TREE_ART_SCALE;

export function createSnowfall() {
  const flakes = [];
  let unseeded = true;
  let budget = 0;

  function addFlake(wind, starting) {
    const depth = Math.random();
    const entry = Math.random() < Math.abs(wind) * 0.32 && !starting;
    const x = entry ? (wind > 0 ? LEFT : RIGHT) : LEFT + Math.random() * SCENE_WIDTH;
    const y = starting || entry ? SKY + Math.random() * (GROUND - SKY) : SKY;
    flakes.push({ x, y, depth, phase: Math.random() * Math.PI * 2 });
  }

  function reset() {
    flakes.length = 0;
    unseeded = true;
    budget = 0;
  }

  return {
    reset,
    advance(seconds, time, breeze, gust, density) {
      const wind = breeze + gust * 0.65;
      const level = density / 100;
      if (level === 0) {
        reset();
        return;
      }
      if (unseeded) {
        for (let i = 0; i < Math.ceil(level * 7); i += 1) addFlake(wind, true);
        unseeded = false;
      }
      budget += seconds * level * (2.4 + Math.abs(gust) * 1.5);
      const count = Math.min(Math.floor(budget), MAX_FLAKES - flakes.length);
      budget %= 1;
      for (let i = 0; i < count; i += 1) addFlake(wind, false);
      for (let i = flakes.length - 1; i >= 0; i -= 1) {
        const flake = flakes[i];
        const sway = Math.sin(time * (1.5 + flake.depth) + flake.phase);
        flake.x += (wind * (15 + flake.depth * 14) + sway * 3.2) * seconds;
        flake.y += (7.1 + flake.depth * 10 + sway * 1.1) * seconds;
        if (flake.y > GROUND || flake.x < LEFT - 3 || flake.x > RIGHT + 3) flakes.splice(i, 1);
      }
    },
    paint(ctx, foreground) {
      ctx.save();
      for (const { x, y, depth } of flakes) {
        if ((depth > 0.60) !== foreground) continue;
        const edge = Math.min(x - LEFT, RIGHT - x, y - SKY, GROUND - y);
        const opacity = clamp(edge / 6, 0, 1) * (0.44 + depth * 0.56);
        if (opacity === 0) continue;
        const sx = snap(x);
        const sy = snap(y);
        const size = depth > 0.88 ? 1.5 : depth > 0.45 ? 1 : 0.5;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = depth > 0.6 ? 'rgb(158 186 208)' : 'rgb(160 183 203)';
        ctx.fillRect(sx, sy + 0.5, size, size);
        ctx.fillStyle = 'rgb(242 250 255)';
        ctx.fillRect(sx, sy, size, size);
        if (depth > 0.88) {
          ctx.fillRect(sx - 0.5, sy + 0.5, size + 1, 0.5);
          ctx.fillRect(sx + 0.5, sy - 0.5, 0.5, size + 1);
        }
      }
      ctx.restore();
    },
  };
}
