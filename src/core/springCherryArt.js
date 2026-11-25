import { clamp, createCrownArtwork, createGroundArtwork, createSpriteAtlas, grain, paintPolygon, paintSprite,
  paintTwig, spriteSpans, TREE_ART_SCALE } from './seasonalTreeArt.js';

const ROOT = { x: 67, y: 77 };

// The trunk bends left before rising into a high crown and a long, open branch to the right.
const BRANCHES = [
  { name: 'trunk', parent: null, tip: [61, 59], width: [10, 7], flex: 0.22 },
  { name: 'fork', parent: 'trunk', tip: [64, 43], width: [7, 5], flex: 0.35 },
  { name: 'leader', parent: 'fork', tip: [57, 27], width: [5, 3], flex: 0.51 },
  { name: 'spire', parent: 'leader', tip: [62, 13], width: [3, 1.8], flex: 0.72 },
  { name: 'spire-tip', parent: 'spire', tip: [67, 6], width: [1.8, 0.7], flex: 0.91 },
  { name: 'spire-east', parent: 'spire', tip: [75, 12], width: [1.9, 0.8], flex: 0.84 },
  { name: 'leader-west', parent: 'leader', tip: [43, 18], width: [2.8, 1.1], flex: 0.77 },
  { name: 'west', parent: 'fork', tip: [46, 38], width: [4.6, 3.1], flex: 0.58 },
  { name: 'west-tip', parent: 'west', tip: [29, 32], width: [3.1, 1.5], flex: 0.78 },
  { name: 'west-end', parent: 'west-tip', tip: [17, 29], width: [1.5, 0.7], flex: 0.92 },
  { name: 'west-rise', parent: 'west-tip', tip: [31, 21], width: [1.7, 0.8], flex: 0.88 },
  { name: 'west-low', parent: 'west', tip: [35, 47], width: [2.7, 0.9], flex: 0.86 },
  { name: 'east', parent: 'fork', tip: [79, 39], width: [5, 3.2], flex: 0.49 },
  { name: 'east-rise', parent: 'east', tip: [83, 23], width: [3.1, 1.5], flex: 0.72 },
  { name: 'east-lace', parent: 'east-rise', tip: [96, 18], width: [1.6, 0.7], flex: 0.88 },
  { name: 'east-reach', parent: 'east', tip: [97, 33], width: [3.1, 1.6], flex: 0.72 },
  { name: 'east-end', parent: 'east-reach', tip: [108, 27], width: [1.6, 0.7], flex: 0.93 },
  { name: 'east-low', parent: 'east-reach', tip: [105, 43], width: [1.5, 0.7], flex: 0.91 },
  { name: 'lower-fork', parent: 'trunk', tip: [72, 50], width: [3.5, 1.7], flex: 0.67 },
  { name: 'lower-twig', parent: 'lower-fork', tip: [83, 49], width: [1.8, 0.7], flex: 0.92 },
];

const BARK = ['rgb(52 34 48)', 'rgb(72 44 57)', 'rgb(90 52 62)', 'rgb(112 65 73)',
  'rgb(143 87 87)', 'rgb(173 114 105)', 'rgb(199 144 122)'];

const PETAL_COLORS = {
  mauve: ['rgb(96 50 80)', 'rgb(129 66 103)', 'rgb(163 86 125)', 'rgb(190 107 146)',
    'rgb(215 131 164)', 'rgb(233 157 183)', 'rgb(247 178 198)', 'rgb(251 204 216)'],
  rose: ['rgb(115 55 82)', 'rgb(151 72 105)', 'rgb(185 90 129)', 'rgb(218 114 150)',
    'rgb(238 141 170)', 'rgb(251 174 194)', 'rgb(255 202 214)', 'rgb(255 228 234)'],
  blush: ['rgb(134 63 86)', 'rgb(170 82 111)', 'rgb(203 104 133)', 'rgb(229 131 155)',
    'rgb(246 161 183)', 'rgb(255 192 209)', 'rgb(255 219 225)', 'rgb(255 238 239)'],
};

const PROFILES = {
  crest: { width: 34, height: 23, tips: [[5, 16], [9, 9], [14, 6], [21, 4], [27, 6], [29, 12]] },
  fan: { width: 34, height: 21, tips: [[5, 13], [9, 7], [15, 5], [22, 5], [29, 8], [27, 15]] },
  fringe: { width: 25, height: 19, tips: [[4, 8], [9, 5], [16, 6], [21, 11], [16, 15]] },
  spray: { width: 25, height: 15, tips: [[5, 9], [10, 5], [16, 4], [21, 8]] },
};

const CROWNS = [
  { branch: 'west-low', shape: 'fringe', palette: 'mauve', offset: [-14, -11], back: true },
  { branch: 'west', shape: 'fan', palette: 'mauve', offset: [-19, -10], back: true },
  { branch: 'west-rise', shape: 'crest', palette: 'rose', offset: [-11, -7], back: true },
  { branch: 'leader-west', shape: 'crest', palette: 'mauve', offset: [-14, -8], back: true },
  { branch: 'spire', shape: 'fan', palette: 'rose', offset: [-18, -8], back: true },
  { branch: 'east-rise', shape: 'crest', palette: 'mauve', offset: [-13, -10], back: true, mirror: true },
  { branch: 'east-reach', shape: 'fan', palette: 'mauve', offset: [-11, -8], back: true },
  { branch: 'east-low', shape: 'fringe', palette: 'rose', offset: [-11, -10], back: true },
  { branch: 'lower-fork', shape: 'spray', palette: 'mauve', offset: [-9, -9], back: true },
  { branch: 'west-end', shape: 'fringe', palette: 'rose', offset: [-10, -11], mirror: true },
  { branch: 'west-tip', shape: 'fan', palette: 'blush', offset: [-14, -11] },
  { branch: 'leader-west', shape: 'fringe', palette: 'rose', offset: [-9, -12], mirror: true },
  { branch: 'spire-tip', shape: 'crest', palette: 'blush', offset: [-19, -12] },
  { branch: 'spire-east', shape: 'fan', palette: 'blush', offset: [-13, -9], mirror: true },
  { branch: 'leader', shape: 'fringe', palette: 'rose', offset: [-10, -9] },
  { branch: 'east-lace', shape: 'spray', palette: 'blush', offset: [-11, -7] },
  { branch: 'east-end', shape: 'fan', palette: 'rose', offset: [-15, -12], mirror: true },
  { branch: 'lower-twig', shape: 'spray', palette: 'rose', offset: [-10, -7] },
];

const FLOWER_FRAMES = [
  ['...4.4...', '..44444..', '.44.34.44', '444333444', '.4335334.', '..33433..', '.443.344.', '.444.444.', '..44.44..'],
  ['.........', '..4...4..', '.444.444.', '444333444', '343353343', '.2333332.', '..24242..', '...223...', '.........'],
  ['.........', '....4....', '...444...', '..44344..', '..43434..', '...343...', '...232...', '....2....', '.........'],
];

const PETAL_FRAMES = [
  ['.....4...', '....44...', '....43...', '...443...', '...432...', '..432....', '..32.....', '..2......', '.........'],
  ['...44....', '..4444...', '.344443..', '.444433..', '..44432..', '..4432...', '...432...', '...32....', '....1....'],
  ['..44..44.', '.4444444.', '344444443', '344444433', '.3444432.', '.344332..', '..3332...', '...321...', '....1....'],
  ['.44..44..', '34444443.', '344444433', '234444333', '.2344332.', '..23332..', '...232...', '...12....', '....1....'],
];

function createAtlases(document, colors) {
  return Array.from({ length: 6 }, (_, index) => {
    const tone = index + 2;
    const shades = offset => [-2, -1, 0, 1].map(value => colors[clamp(tone + value + offset, 0, colors.length - 1)]);
    const flowers = createSpriteAtlas(document, FLOWER_FRAMES, frame => [...shades(frame === 2 ? -1 : 0),
      tone >= 4 ? 'rgb(232 156 148)' : 'rgb(190 109 116)']);
    const petals = createSpriteAtlas(document, PETAL_FRAMES, frame => shades(frame === 3 ? -1 : 0));
    return { flowers, petals };
  });
}

function paintSprig(art, stems, atlases, shape, anchor, tip, seed, back) {
  const { length, angle, point } = paintTwig(stems, anchor, tip, seed, BARK[back ? 2 : 3]);
  const count = 3 + Math.round(length / 5.4);
  const sprites = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const terminal = index === count - 1;
    const t = clamp(0.24 + (index + grain(seed, index, 129) * 0.34) / (count - 1) * 0.75, 0.1, 1);
    const side = (seed + index) % 2 ? 1 : -1;
    const spread = angle + side * (terminal ? 0.28 : 1.06 + grain(seed, index, 151) * 0.54);
    const [u, v] = point(t);
    const size = 6.35 + (terminal ? 1.1 : 0) + grain(seed, index, 139) * 1.4;
    const distance = size * (terminal ? 0.14 : 0.38);
    const x = clamp(u + Math.cos(spread) * distance, size * 0.42, shape.width - size * 0.42);
    const y = clamp(v + Math.sin(spread) * distance, size * 0.42, shape.height - size * 0.42);
    const light = (1 - y / shape.height) * 1.24 + (1 - x / shape.width) * 0.56
      + grain(seed, index, 157) * 0.54 + t * 0.48;
    const tone = clamp(Math.round((back ? 2.3 : 3.9) + light), 2, 7);
    const { flowers, petals } = atlases[tone - 2];
    const pose = grain(seed, index, 173);
    const frame = pose < -0.68 ? 2 : pose < -0.19 ? 1 : 0;
    const sprite = { atlas: flowers, petals, frame, x, y, width: size, height: size * (0.88 + pose * 0.11),
      angle: grain(seed, index, 183) * Math.PI, stemX: u, stemY: v };
    paintSprite(art, sprite, x * TREE_ART_SCALE, y * TREE_ART_SCALE, TREE_ART_SCALE);
    sprites.push(sprite);
  }
  return sprites;
}

function paintGround(ctx, atlases) {
  paintPolygon(ctx, 'rgb(85 43 65 / 12%)', [[31, 80], [51, 76], [68, 75], [86, 77], [103, 81], [96, 83], [55, 83]]);
  paintPolygon(ctx, BARK[1], [[46, 81], [56, 78], [63, 74], [70, 74], [73, 78], [85, 81],
    [76, 81], [69, 80], [65, 82], [62, 80], [53, 82]]);
  paintPolygon(ctx, BARK[4], [[50, 81], [57, 78], [63, 75], [66, 76], [62, 78], [55, 80]]);
  for (let index = 0; index < 62; index += 1) {
    const x = ROOT.x + grain(index, 53, 81) * (15 + (grain(index, 13, 17) + 1) * 12);
    const y = 79.5 + grain(index, 17, 23) * (1.6 + (grain(index, 29, 37) + 1) * 1.45);
    if (Math.abs(x - ROOT.x) < 6 && y < 79) continue;
    const tone = 2 + Math.round((grain(index, 31, 43) + 1) * 1.5);
    const width = 2.9 + grain(index, 41, 47) * 1.1;
    const palette = index % 3 === 0 ? atlases.mauve : atlases.rose;
    paintSprite(ctx, { atlas: palette[tone].petals, frame: 2, width, height: width * 0.57,
      angle: grain(index, 59, 67) * 0.63 }, x, y);
  }
}

function createCherryArtwork(document) {
  const atlases = Object.fromEntries(Object.entries(PETAL_COLORS).map(([key, colors]) => [key, createAtlases(document, colors)]));
  const ground = createGroundArtwork(document, ctx => paintGround(ctx, atlases));
  const crowns = CROWNS.map((crown, seed) => {
    const profile = PROFILES[crown.shape];
    return createCrownArtwork(document, crown, profile, (art, stems, anchor, tip, index) =>
      paintSprig(art, stems, atlases[crown.palette], profile, anchor, tip, seed * 11 + index, crown.back));
  });
  return { ground, crowns };
}

export const SPRING_CHERRY = {
  root: ROOT,
  branches: BRANCHES,
  bark: BARK,
  centerY: 29,
  foliageFrames: FLOWER_FRAMES,
  fallingSpans: spriteSpans(PETAL_FRAMES),
  fallSpeed: [6.5, 13],
  fallMotion: { glideSpeed: 15, glideRate: 0.55, bobSpeed: 2.5, edgeSpeed: 5.5, groundHeight: 0.42 },
  recommendedCat: 'calico',
  catConfig: {
    initialX: 86,
    initialY: 82.0,
    initialFacing: -1,
    ground: { minX: 22, maxX: 108, minY: 80.0, maxY: 83.6, rootFrontY: 81.5 },
    climbRoutes: [
      {
        segments: [
          { branch: 'trunk', fromT: 0.08, toT: 0.98, side: 1 },
          { branch: 'fork', fromT: 0.05, toT: 0.96, side: 1 },
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
        segments: [
          { branch: 'trunk', fromT: 0.08, toT: 0.98, side: 1 },
          { branch: 'lower-fork', fromT: 0.06, toT: 0.62, side: 1 },
        ],
        perch: { branch: 'lower-fork', t: 0.62, style: 'sit', facing: 1 },
      },
    ],
  },
  createArtwork: createCherryArtwork,
  dropSprite: ({ petals, frame, width, height }) => ({ atlas: petals, frame: frame === 1 ? 1 : 2,
    width: width * 0.63, height: height * 0.68 }),
};
