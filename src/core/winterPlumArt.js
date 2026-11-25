import { clamp, createCrownArtwork, createGroundArtwork, createSpriteAtlas, grain, paintPolygon, paintSprite,
  paintTwig, spriteSpans, TREE_ART_SCALE } from './seasonalTreeArt.js';
import { createSnowfall } from './winterSnow.js';

const ROOT = { x: 60, y: 77 };
const BRANCHES = [
  { name: 'trunk', parent: null, tip: [62, 62], width: [12, 8], flex: 0.16 },
  { name: 'elbow', parent: 'trunk', tip: [53, 48], width: [8, 6], flex: 0.23 },
  { name: 'leader', parent: 'elbow', tip: [64, 33], width: [6, 4], flex: 0.35 },
  { name: 'spire', parent: 'leader', tip: [76, 19], width: [4, 2.6], flex: 0.43 },
  { name: 'spire-tip', parent: 'spire', tip: [84, 8], width: [2.5, 1], flex: 0.67 },
  { name: 'spire-hook', parent: 'spire-tip', tip: [94, 4], width: [1.2, 0.5], flex: 0.80 },
  { name: 'spire-left', parent: 'spire', tip: [67, 11], width: [2.2, 0.7], flex: 0.70 },
  { name: 'spire-right', parent: 'spire', tip: [97, 18], width: [2.3, 0.9], flex: 0.69 },
  { name: 'high-west', parent: 'leader', tip: [50, 24], width: [3.5, 2], flex: 0.52 },
  { name: 'high-tip', parent: 'high-west', tip: [41, 12], width: [2.1, 0.7], flex: 0.69 },
  { name: 'high-twig', parent: 'high-west', tip: [33, 20], width: [1.8, 0.6], flex: 0.77 },
  { name: 'west', parent: 'elbow', tip: [38, 44], width: [5, 3.1], flex: 0.48 },
  { name: 'west-tip', parent: 'west', tip: [25, 35], width: [3.1, 1.5], flex: 0.61 },
  { name: 'west-end', parent: 'west-tip', tip: [14, 28], width: [1.5, 0.6], flex: 0.76 },
  { name: 'west-low', parent: 'west-tip', tip: [12, 39], width: [1.8, 0.7], flex: 0.75 },
  { name: 'west-rise', parent: 'west', tip: [35, 31], width: [2.5, 0.8], flex: 0.68 },
  { name: 'east', parent: 'elbow', tip: [76, 46], width: [5.2, 3.5], flex: 0.45 },
  { name: 'east-tip', parent: 'east', tip: [94, 40], width: [3.5, 2], flex: 0.60 },
  { name: 'east-end', parent: 'east-tip', tip: [110, 32], width: [2, 0.8], flex: 0.72 },
  { name: 'east-twig', parent: 'east-end', tip: [120, 30], width: [1.2, 0.5], flex: 0.85 },
  { name: 'east-rise', parent: 'east-tip', tip: [98, 27], width: [1.8, 0.6], flex: 0.78 },
  { name: 'east-low', parent: 'east', tip: [93, 50], width: [2.5, 0.9], flex: 0.67 },
  { name: 'low-twig', parent: 'trunk', tip: [48, 61], width: [2.6, 0.9], flex: 0.51 },
];
const BARK = ['rgb(76 51 64)', 'rgb(89 56 65)', 'rgb(102 62 67)', 'rgb(118 70 68)',
  'rgb(135 82 73)', 'rgb(167 106 91)', 'rgb(189 132 108)'];
const FLOWER_PALETTES = [
  ['rgb(111 41 66)', 'rgb(156 52 80)', 'rgb(196 71 101)', 'rgb(230 107 129)', 'rgb(251 202 146)'],
  ['rgb(127 48 66)', 'rgb(183 59 84)', 'rgb(222 87 105)', 'rgb(251 146 155)', 'rgb(255 217 154)'],
  ['rgb(154 58 79)', 'rgb(203 79 102)', 'rgb(238 124 138)', 'rgb(255 181 180)', 'rgb(255 230 169)'],
];
const SNOW = ['rgb(119 148 174)', 'rgb(174 197 215)', 'rgb(213 229 241)', 'rgb(249 253 255)'];

const FLOWERS_AND_SNOW = [
  ['...444...', '..44344..', '.44.3.44.', '443333344', '433525334', '.4331334.', '..43334..', '.444.444.', '..44.44..'],
  ['.........', '...4.4...', '..44444..', '.4433344.', '433525334', '.3333332.', '..23332..', '...22....', '.........'],
  ['.........', '....3....', '...344...', '...4443..', '...3443..', '...233...', '....2....', '....1....', '.........'],
  ['.........', '.........', '...44....', '..44444..', '.4444444.', '444444443', '.2333221.', '...22....', '.........'],
];
const FALLING_SNOW = [
  ['.......', '...4...', '...43..', '..343..', '..32...', '..2....', '.......'],
  ['.......', '..44...', '..443..', '.4443..', '.332...', '..22...', '.......'],
  ['...4...', '..344..', '.44443.', '4444433', '.34432.', '..332..', '...2...'],
  ['.......', '..444..', '.344443', '3444443', '.33332.', '..222..', '.......'],
];

const FAN = { width: 22, height: 19, tips: [[4, 12], [8, 6], [15, 4], [18, 10]] };
const SPRIG = { width: 18, height: 15, tips: [[4, 8], [9, 4], [14, 6]] };
const BLOSSOM_CROWNS = [
  { branch: 'high-twig', offset: [-10, -8], profile: SPRIG, back: true },
  { branch: 'spire-left', offset: [-13, -8], profile: FAN, back: true },
  { branch: 'west-low', offset: [-7, -9], profile: SPRIG, back: true },
  { branch: 'east-low', offset: [-8, -9], profile: SPRIG, back: true },
  { branch: 'spire-tip', offset: [-10, -11], profile: FAN },
  { branch: 'spire-hook', offset: [-7, -8], profile: SPRIG },
  { branch: 'spire-right', offset: [-7, -10], profile: SPRIG },
  { branch: 'high-tip', offset: [-12, -9], profile: SPRIG },
  { branch: 'west-end', offset: [-10, -8], profile: SPRIG },
  { branch: 'west-rise', offset: [-9, -10], profile: SPRIG },
  { branch: 'east-twig', offset: [-9, -8], profile: SPRIG },
  { branch: 'east-rise', offset: [-8, -10], profile: SPRIG },
  { branch: 'low-twig', offset: [-9, -7], profile: SPRIG },
];
const SNOW_BEARING = ['elbow', 'leader', 'spire', 'high-west', 'west', 'west-tip', 'west-low', 'east', 'east-tip', 'east-end', 'east-low'];

function paintBlossomSprig(art, stems, atlases, anchor, tip, seed, back) {
  const { point } = paintTwig(stems, anchor, tip, seed, BARK[back ? 1 : 2]);
  const count = seed % 5 === 0 ? 3 : 2;
  const sprites = [];
  for (let index = 0; index < count; index += 1) {
    const t = (index + 1.35 + grain(seed, index, 97) * 0.20) / (count + 0.42);
    const [u, v] = point(t);
    const x = u + grain(seed, index, 103) * 1.35;
    const y = v - 0.65 + grain(seed, index, 107) * 1.25;
    const tone = clamp(Math.round((back ? 0.45 : 1.38) + grain(seed, index, 109) * 0.76), 0, 2);
    const bloom = grain(seed, index, 113);
    const frame = bloom < -0.61 ? 2 : bloom > 0.49 ? 1 : 0;
    const size = 4.2 + t * 1.5 + grain(seed, index, 127) * 0.82;
    const sprite = { atlas: atlases[tone], frame, x, y, width: size, height: size * 0.92,
      angle: grain(seed, index, 131) * 0.71, stemX: u, stemY: v, staysAttached: true };
    paintSprite(art, sprite, x * TREE_ART_SCALE, y * TREE_ART_SCALE, TREE_ART_SCALE);
    sprites.push(sprite);
  }
  return sprites;
}

function makeBranchSnow(document, name, branches, atlas, flakes) {
  const { tip: [endX, endY], parent, width: [start, end] } = branches.get(name);
  const [startX, startY] = branches.get(parent).tip;
  const dx = endX - startX;
  const dy = endY - startY;
  const x = Math.min(-dx, 0) - 7;
  const y = Math.min(-dy, 0) - 9;
  const width = Math.abs(dx) + 14;
  const height = Math.abs(dy) + 15;
  const angle = Math.atan(dy / dx);
  const count = Math.max(2, Math.round(Math.hypot(dx, dy) / 4.7));
  return createCrownArtwork(document, { branch: name, offset: [x, y], surface: true }, { width, height, tips: [[-x, -y]] }, art => {
    const sprites = [];
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.56) / count;
      const pad = (start + (end - start) * t) * 0.42 + 0.25;
      const size = 4.5 + (1 - t) * 3 + grain(i, dx, dy) * 1.4;
      const sx = dx * (t - 1) - x + Math.sin(angle) * pad;
      const sy = dy * (t - 1) - y - Math.cos(angle) * pad;
      const sprite = { atlas, flakes, frame: 3, x: sx, y: sy, width: size, height: size * 0.54,
        angle, stemX: sx, stemY: sy };
      paintSprite(art, sprite, sx * TREE_ART_SCALE, sy * TREE_ART_SCALE, TREE_ART_SCALE);
      sprites.push(sprite);
    }
    return sprites;
  });
}

function paintGround(ctx) {
  paintPolygon(ctx, 'rgb(109 144 176 / 22%)', [[19, 83], [33, 79], [51, 75], [71, 74], [89, 76], [113, 81],
    [97, 85], [67, 87], [44, 85], [31, 87]]);
  paintPolygon(ctx, SNOW[1], [[26, 82], [41, 78], [55, 76], [72, 77], [91, 78], [108, 82],
    [85, 85], [71, 84], [54, 86], [38, 84]]);
  paintPolygon(ctx, SNOW[2], [[27, 81], [39, 79], [48, 76], [66, 76], [80, 77], [96, 79], [104, 81],
    [89, 83], [70, 81], [58, 84], [48, 82], [34, 83]]);
  paintPolygon(ctx, SNOW[3], [[73, 79], [81, 77], [91, 79], [99, 81], [88, 81], [84, 80]]);
  paintPolygon(ctx, BARK[1], [[44, 81], [55, 77], [61, 75], [67, 77], [71, 81], [62, 80], [49, 82]]);
  paintPolygon(ctx, SNOW[3], [[39, 81], [47, 79], [56, 78], [53, 81], [63, 82], [58, 84], [46, 82]]);
  for (let i = 0; i < 42; i += 1) {
    const x = 23 + (grain(i, 34, 67) + 1) * 43;
    const y = 78 + (grain(i, 38, 71) + 1) * 4;
    ctx.fillStyle = SNOW[2 + (i % 2)];
    ctx.fillRect(Math.round(x), Math.round(y * 2) / 2, 1 + i % 3 * 0.5, 0.5);
  }
}

function createPlumArtwork(document) {
  const atlases = FLOWER_PALETTES.map(palette => createSpriteAtlas(document, FLOWERS_AND_SNOW, frame => frame === 3 ? SNOW : palette));
  const flakes = createSpriteAtlas(document, FALLING_SNOW, () => SNOW);
  const branches = new Map(BRANCHES.map(branch => [branch.name, branch]));
  const ground = createGroundArtwork(document, paintGround);
  const snow = SNOW_BEARING.map(name => makeBranchSnow(document, name, branches, atlases[0], flakes));
  const blossoms = BLOSSOM_CROWNS.map((crown, seed) => createCrownArtwork(document, crown, crown.profile,
    (art, stems, anchor, tip, index) => paintBlossomSprig(art, stems, atlases, anchor, tip, seed * 13 + index, crown.back)));
  return { ground, crowns: [...snow, ...blossoms] };
}

export const WINTER_PLUM = {
  root: ROOT,
  branches: BRANCHES,
  bark: BARK,
  centerY: 32,
  foliageFrames: FLOWERS_AND_SNOW,
  fallingSpans: spriteSpans(FALLING_SNOW),
  fallSpeed: [12, 21],
  fallMotion: { glideSpeed: 8.5, glideRate: 0.53, bobSpeed: 3.5, edgeSpeed: 3, groundHeight: 0.40 },
  recommendedCat: 'ginger',
  catConfig: {
    initialX: 82,
    initialY: 82.5,
    initialFacing: -1,
    ground: { minX: 20, maxX: 106, minY: 80.2, maxY: 84.2, rootFrontY: 81.8 },
    climbRoutes: [
      {
        segments: [
          { branch: 'trunk', fromT: 0.08, toT: 0.98, side: 1 },
          { branch: 'elbow', fromT: 0.06, toT: 0.96, side: 1 },
          { branch: 'east', fromT: 0.06, toT: 0.56, side: 1 },
        ],
        perch: { branch: 'east', t: 0.56, style: 'auto', facing: 1 },
      },
      {
        segments: [
          { branch: 'trunk', fromT: 0.08, toT: 0.98, side: -1 },
          { branch: 'elbow', fromT: 0.06, toT: 0.96, side: -1 },
          { branch: 'west', fromT: 0.06, toT: 0.52, side: -1 },
        ],
        perch: { branch: 'west', t: 0.52, style: 'auto', facing: -1 },
      },
      {
        segments: [
          { branch: 'trunk', fromT: 0.08, toT: 0.98, side: 1 },
          { branch: 'elbow', fromT: 0.06, toT: 0.96, side: 1 },
        ],
        perch: { branch: 'east', t: 0.18, style: 'sit', facing: 1 },
      },
    ],
  },
  createWeather: createSnowfall,
  createArtwork: createPlumArtwork,
  dropSprite: ({ flakes, width }) => ({ atlas: flakes, frame: 2, width: width * 0.48, height: width * 0.37 }),
};
