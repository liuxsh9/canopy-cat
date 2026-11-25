import { clamp, createCrownArtwork, createGroundArtwork, createSpriteAtlas, grain, paintPolygon, paintSprite,
  paintTwig, spriteSpans, TREE_ART_SCALE } from './seasonalTreeArt.js';

const MAPLE_ROOT = { x: 65, y: 76 };

// Endpoints are given in the resting pose, with parents listed before their branches.
const MAPLE_BRANCHES = [
  { name: 'trunk', parent: null, tip: [67, 59], width: [13, 9], flex: 0.21 },
  { name: 'fork', parent: 'trunk', tip: [57, 43], width: [9, 5], flex: 0.33 },
  { name: 'leader', parent: 'fork', tip: [59, 28], width: [5, 3], flex: 0.49 },
  { name: 'spire', parent: 'leader', tip: [66, 14], width: [3, 1], flex: 0.79 },
  { name: 'upper-west', parent: 'leader', tip: [42, 22], width: [3, 1], flex: 0.69 },
  { name: 'upper-east', parent: 'leader', tip: [79, 22], width: [3, 1], flex: 0.76 },
  { name: 'west', parent: 'fork', tip: [41, 45], width: [5, 3], flex: 0.52 },
  { name: 'west-tip', parent: 'west', tip: [24, 38], width: [3, 1], flex: 0.84 },
  { name: 'west-rise', parent: 'west', tip: [33, 30], width: [3, 1], flex: 0.74 },
  { name: 'west-low', parent: 'west', tip: [32, 51], width: [2, 1], flex: 0.89 },
  { name: 'east', parent: 'trunk', tip: [82, 46], width: [7, 4], flex: 0.47 },
  { name: 'east-tip', parent: 'east', tip: [101, 35], width: [3, 1], flex: 0.86 },
  { name: 'east-rise', parent: 'east', tip: [86, 31], width: [3, 1], flex: 0.77 },
  { name: 'east-low', parent: 'east', tip: [100, 47], width: [3, 1], flex: 0.91 },
  { name: 'spire-twig', parent: 'spire', tip: [71, 8], width: [2, 1], flex: 0.9 },
  { name: 'west-tip-twig', parent: 'west-tip', tip: [17, 32], width: [2, 1], flex: 0.95 },
  { name: 'west-rise-twig', parent: 'west-rise', tip: [28, 21], width: [2, 1], flex: 0.9 },
  { name: 'upper-east-twig', parent: 'upper-east', tip: [91, 19], width: [2, 1], flex: 0.87 },
  { name: 'east-tip-twig', parent: 'east-tip', tip: [108, 29], width: [2, 1], flex: 0.9 },
];

const BARK = ['rgb(45 30 36)', 'rgb(64 37 37)', 'rgb(83 45 40)', 'rgb(108 56 44)',
  'rgb(138 71 48)', 'rgb(167 91 54)', 'rgb(194 115 67)'];
const COLORS = {
  amber: ['rgb(112 56 41)', 'rgb(151 75 44)', 'rgb(184 95 48)', 'rgb(215 125 59)',
    'rgb(233 153 73)', 'rgb(249 188 97)', 'rgb(254 214 133)', 'rgb(255 228 160)'],
  chestnut: ['rgb(83 42 43)', 'rgb(114 53 40)', 'rgb(146 66 40)', 'rgb(175 83 45)',
    'rgb(201 105 53)', 'rgb(221 128 64)', 'rgb(238 153 80)', 'rgb(248 178 98)'],
  ochre: ['rgb(110 51 45)', 'rgb(146 67 46)', 'rgb(174 88 49)', 'rgb(205 109 54)',
    'rgb(226 135 60)', 'rgb(241 161 75)', 'rgb(249 185 94)', 'rgb(255 207 125)'],
  scarlet: ['rgb(88 37 46)', 'rgb(124 48 44)', 'rgb(160 59 45)', 'rgb(183 75 47)',
    'rgb(205 97 56)', 'rgb(226 121 68)', 'rgb(239 145 81)', 'rgb(248 174 103)'],
};

// Twig tips shape each spray and leave small openings between neighboring sprays.
const SHAPES = {
  fan: { width: 35, height: 23, tips: [[5, 15], [9, 7], [16, 6], [23, 4], [30, 8], [29, 17]] },
  crest: { width: 31, height: 23, tips: [[5, 15], [10, 8], [17, 5], [24, 6], [26, 13], [23, 18]] },
  spray: { width: 23, height: 17, tips: [[4, 10], [9, 6], [16, 4], [18, 11]] },
  droop: { width: 29, height: 23, tips: [[5, 9], [12, 6], [20, 6], [24, 12], [19, 18], [10, 17]] },
};

// Offsets place separate hand-shaped sprites around their branch tips.
const CROWNS = [
  { branch: 'west-low', shape: 'droop', palette: 'scarlet', offset: [-15, -14], back: true },
  { branch: 'west-rise', shape: 'crest', palette: 'chestnut', offset: [-13, -12], back: true },
  { branch: 'west', shape: 'spray', palette: 'chestnut', offset: [-12, -6], back: true, mirror: true },
  { branch: 'upper-west', shape: 'fan', palette: 'ochre', offset: [-14, -9], back: true },
  { branch: 'spire', shape: 'fan', palette: 'ochre', offset: [-15, -5], back: true },
  { branch: 'upper-east', shape: 'crest', palette: 'chestnut', offset: [-10, -8], back: true },
  { branch: 'leader', shape: 'droop', palette: 'chestnut', offset: [-8, -7], back: true },
  { branch: 'east-low', shape: 'droop', palette: 'scarlet', offset: [-12, -13], back: true },
  { branch: 'east-rise', shape: 'spray', palette: 'ochre', offset: [-8, -8], back: true, mirror: true },
  { branch: 'west-tip', shape: 'fan', palette: 'ochre', offset: [-16, -12], mirror: true },
  { branch: 'west-tip-twig', shape: 'spray', palette: 'amber', offset: [-9, -7] },
  { branch: 'upper-west', shape: 'crest', palette: 'amber', offset: [-15, -10] },
  { branch: 'spire', shape: 'crest', palette: 'amber', offset: [-15, -11], mirror: true },
  { branch: 'upper-east-twig', shape: 'spray', palette: 'ochre', offset: [-12, -8] },
  { branch: 'upper-east', shape: 'spray', palette: 'amber', offset: [-8, -6] },
  { branch: 'east-tip', shape: 'fan', palette: 'ochre', offset: [-14, -10] },
  { branch: 'east-low', shape: 'spray', palette: 'ochre', offset: [-7, -6], mirror: true },
  { branch: 'leader', shape: 'spray', palette: 'ochre', offset: [-6, -6], mirror: true },
];

const OPEN_LEAF = [
  '....3....', '...333...', '.2.333.4.', '.2333334.', '..333344.',
  '223334443', '.2333433.', '...323...', '....1....',
];
const CURLED_LEAF = [
  '...3.....', '...333...', '.2.3334..', '.233344.2', '..3334422',
  '223334433', '.2333332.', '..23332..', '....1....',
];
const LEAF_FRAMES = [
  ['.....3...', '....33...', '...33....', '...34....', '..334....',
    '...33....', '...32....', '...21....', '....1....'],
  ['.....3...', '....33...', '...333...', '..3334...', '.233344..',
    '..23343..', '...333...', '....32...', '....1....'],
  OPEN_LEAF,
  CURLED_LEAF,
];
const GROUND_PATCHES = [
  { x: 43, y: 79, rx: 16, ry: 3, palette: 'ochre', count: 11 },
  { x: 61, y: 78, rx: 18, ry: 4, palette: 'chestnut', count: 20 },
  { x: 75, y: 80, rx: 17, ry: 3, palette: 'amber', count: 17 },
  { x: 92, y: 79, rx: 12, ry: 2, palette: 'scarlet', count: 8 },
];

function paintGround(ctx, leaves) {
  paintPolygon(ctx, 'rgb(80 50 47 / 13%)', [[30, 78], [44, 76], [64, 73], [94, 76], [103, 79], [85, 82], [48, 82], [37, 80]]);
  paintPolygon(ctx, BARK[1], [[43, 80], [52, 76], [60, 73], [68, 72], [73, 75], [78, 76], [88, 79],
    [77, 79], [70, 78], [67, 81], [61, 80], [60, 78], [53, 79]]);
  paintPolygon(ctx, BARK[4], [[47, 79], [55, 76], [62, 73], [66, 74], [62, 77], [56, 78]]);
  GROUND_PATCHES.forEach(({ x, y, rx, ry, palette, count }, seed) => {
    for (let index = 0; index < count; index += 1) {
      const angle = (grain(index, seed, 73) + 1) * Math.PI;
      const distance = Math.sqrt((grain(index, seed, 81) + 1) / 2);
      const u = x + Math.cos(angle) * distance * rx;
      const v = y + Math.sin(angle) * distance * ry;
      const atlas = leaves[palette][3 + Math.round(grain(index, seed, 89) * 2)];
      const length = 2.4 + (grain(index, seed, 97) + 1) * 1.35;
      paintSprite(ctx, { atlas, frame: 2, width: length, height: length * 0.55, angle: grain(index, seed, 101) * 0.54 }, u, v);
    }
  });
}

function paintSprig(art, stems, leaves, shape, anchor, tip, seed, back) {
  const { length, angle, point } = paintTwig(stems, anchor, tip, seed, BARK[back ? 1 : 2]);
  const count = 2 + Math.round(length / 3.85);
  const sprigLight = Math.cos(angle + 2.22) * 0.43 + grain(seed, 0, 101) * 0.24;
  const sprites = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const t = clamp(0.18 + 0.78 * (i + grain(seed, i, 41) * 0.31) / (count - 1), 0.1, 0.98);
    const side = (i + seed) % 2 ? 1 : -1;
    const terminal = i === count - 1;
    const spread = terminal ? 0.17 + grain(seed, i, 55) * 0.23 : 0.74 + grain(seed, i, 51) * 0.34;
    const direction = angle + side * spread;
    const size = 5.8 + (1 - t) * 0.9 + (terminal ? 1.65 : 0) + grain(seed, i, 61) * 1.25;
    const slender = 0.89 + grain(seed, i, 71) * 0.26;
    const [u, v] = point(t);
    const x = clamp(u + Math.cos(direction) * size * 0.36, size * 0.39, shape.width - size * 0.39);
    const y = clamp(v + Math.sin(direction) * size * 0.36, size * 0.39, shape.height - size * 0.39);
    const light = sprigLight + (1 - y / shape.height) * 1.03 + (1 - x / shape.width) * 0.45
      + t * 0.87 + grain(seed, i, 83) * 0.21;
    const tone = clamp(Math.round((back ? 1.85 : 3.54) + light), 2, 7);
    const frame = slender < 0.71 ? 1 : grain(seed, i, 107) < -0.32 ? 3 : 2;
    const sprite = { atlas: leaves[tone - 2], frame, x, y, width: size * slender, height: size,
      angle: direction + Math.PI / 2 + grain(seed, i, 113) * 0.28, stemX: u, stemY: v };
    paintSprite(art, sprite, x * TREE_ART_SCALE, y * TREE_ART_SCALE, TREE_ART_SCALE);
    sprites.push(sprite);
  }
  return sprites;
}

export function createMapleArtwork(document) {
  const leaves = Object.fromEntries(Object.entries(COLORS).map(([palette, colors]) => {
    const atlases = Array.from({ length: 6 }, (_, index) => createSpriteAtlas(document, LEAF_FRAMES, frame => {
      const tone = index + 2 - (frame === 3 ? 1 : 0);
      return [-2, -1, 0, 1].map(offset => colors[clamp(tone + offset, 0, colors.length - 1)]);
    }));
    return [palette, atlases];
  }));
  const ground = createGroundArtwork(document, ctx => paintGround(ctx, leaves));
  const crowns = CROWNS.map((crown, seed) => {
    const profile = SHAPES[crown.shape];
    return createCrownArtwork(document, crown, profile, (art, stems, anchor, tip, index) =>
      paintSprig(art, stems, leaves[crown.palette], profile, anchor, tip, seed * 11 + index, crown.back));
  });
  return { ground, crowns };
}

export const AUTUMN_MAPLE = {
  root: MAPLE_ROOT,
  branches: MAPLE_BRANCHES,
  bark: BARK,
  centerY: 36,
  foliageFrames: LEAF_FRAMES,
  fallingSpans: spriteSpans(LEAF_FRAMES),
  fallSpeed: [11, 24],
  recommendedCat: 'russian-blue',
  catConfig: {
    initialX: 85,
    initialY: 81.6,
    initialFacing: -1,
    ground: { minX: 20, maxX: 108, minY: 79.4, maxY: 83.2, rootFrontY: 81.0 },
    climbRoutes: [
      {
        segments: [
          { branch: 'trunk', fromT: 0.08, toT: 0.96, side: 1 },
          { branch: 'east', fromT: 0.06, toT: 0.58, side: 1 },
        ],
        perch: { branch: 'east', t: 0.58, style: 'auto', facing: 1 },
      },
      {
        segments: [
          { branch: 'trunk', fromT: 0.08, toT: 0.98, side: -1 },
          { branch: 'fork', fromT: 0.05, toT: 0.96, side: -1 },
          { branch: 'west', fromT: 0.06, toT: 0.52, side: -1 },
        ],
        perch: { branch: 'west', t: 0.52, style: 'auto', facing: -1 },
      },
      {
        segments: [{ branch: 'trunk', fromT: 0.08, toT: 0.98, side: 1 }],
        perch: { branch: 'east', t: 0.18, style: 'sit', facing: -1 },
      },
    ],
  },
  createArtwork: createMapleArtwork,
};
