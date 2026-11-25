import { clamp, createCrownArtwork, createGroundArtwork, createSpriteAtlas, grain, paintPolygon, paintSprite,
  paintTwig, spriteSpans, TREE_ART_SCALE } from './seasonalTreeArt.js';

const ROOT = { x: 65, y: 77 };
const BRANCHES = [
  { name: 'trunk', parent: null, tip: [68, 58], width: [12, 8], flex: 0.17 },
  { name: 'fork', parent: 'trunk', tip: [62, 45], width: [8, 5], flex: 0.29 },
  { name: 'leader', parent: 'fork', tip: [70, 34], width: [5.1, 3], flex: 0.43 },
  { name: 'middle', parent: 'leader', tip: [65, 23], width: [3, 1.1], flex: 0.66 },
  { name: 'middle-tip', parent: 'middle', tip: [73, 18], width: [1.7, 0.6], flex: 0.85 },
  { name: 'middle-left', parent: 'leader', tip: [51, 26], width: [3, 1.1], flex: 0.69 },
  { name: 'middle-right', parent: 'leader', tip: [87, 27], width: [3, 1.1], flex: 0.68 },
  { name: 'west', parent: 'fork', tip: [44, 40], width: [5, 3.6], flex: 0.46 },
  { name: 'west-spread', parent: 'west', tip: [29, 35], width: [3.5, 2], flex: 0.63 },
  { name: 'west-end', parent: 'west-spread', tip: [15, 32], width: [2.2, 0.7], flex: 0.83 },
  { name: 'west-rise', parent: 'west-spread', tip: [27, 26], width: [1.9, 0.7], flex: 0.80 },
  { name: 'west-low', parent: 'west', tip: [25, 45], width: [2.5, 0.9], flex: 0.85 },
  { name: 'east', parent: 'trunk', tip: [84, 47], width: [6.1, 4], flex: 0.44 },
  { name: 'east-spread', parent: 'east', tip: [101, 36], width: [4, 2.2], flex: 0.59 },
  { name: 'east-end', parent: 'east-spread', tip: [115, 33], width: [2.1, 0.7], flex: 0.83 },
  { name: 'east-rise', parent: 'east-spread', tip: [101, 25], width: [2.4, 0.8], flex: 0.76 },
  { name: 'east-low', parent: 'east', tip: [104, 45], width: [2.8, 1], flex: 0.82 },
];

const BARK = ['rgb(52 45 39)', 'rgb(68 57 45)', 'rgb(88 68 49)', 'rgb(115 86 57)',
  'rgb(145 110 70)', 'rgb(171 135 82)', 'rgb(197 159 99)'];
const LEAF_PALETTES = [
  ['rgb(30 62 52)', 'rgb(42 83 62)', 'rgb(63 108 68)', 'rgb(102 140 79)'],
  ['rgb(42 78 53)', 'rgb(63 112 65)', 'rgb(92 145 78)', 'rgb(139 176 91)'],
  ['rgb(66 101 56)', 'rgb(101 143 67)', 'rgb(151 179 85)', 'rgb(194 205 111)'],
];
const FLOWER_PALETTES = [
  ['rgb(87 116 72)', 'rgb(235 201 191)', 'rgb(206 127 147)', 'rgb(227 154 174)'],
  ['rgb(116 133 71)', 'rgb(255 226 204)', 'rgb(229 145 167)', 'rgb(251 177 195)'],
  ['rgb(143 147 78)', 'rgb(255 241 212)', 'rgb(238 168 179)', 'rgb(255 205 212)'],
];
const SILK_COLORS = ['rgb(166 116 124)', 'rgb(218 163 171)', 'rgb(246 183 202)', 'rgb(255 228 217)'];

function drawPixelFrame(draw) {
  const pixels = Array.from({ length: 17 }, () => Array(17).fill('.'));
  draw((x, y, tone) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (rx >= 0 && rx < 17 && ry >= 0 && ry < 17) pixels[ry][rx] = String(tone);
  });
  return pixels.map(row => row.join(''));
}

function makeFrond(lean) {
  return drawPixelFrame(pixel => {
    const spine = y => 8 + (15 - y) * lean;
    for (let y = 2; y < 17; y += 1) pixel(spine(y), y, 2);
    for (let pair = 0; pair < 5; pair += 1) {
      const py = 5 + pair * 2;
      const length = pair < 4 ? 3 + pair : 5;
      for (const side of [-1, 1]) {
        for (let p = 1; p <= length; p += 1) {
          const x = spine(py) + p * side;
          const y = py - p * (0.31 + pair * 0.02);
          pixel(x, y, 2);
          pixel(x, y - 1, side < 0 && p > length - 2 ? 4 : 3);
          if (p < length && (p + pair) % 2 === 0) pixel(x + side, y + 1, 3);
        }
      }
    }
    pixel(spine(2), 2, 4);
    pixel(spine(3) - 1, 3, 3);
    pixel(spine(3) + 1, 3, 4);
  });
}

function makeSilkFlower(offset) {
  return drawPixelFrame(pixel => {
    const tips = [[1, 9], [1, 6], [2, 4], [4, 5], [4, 2], [6, 1], [7, 3], [9, 1], [10, 3], [12, 2],
      [12, 5], [14, 4], [15, 7], [15, 10]];
    for (const [index, [x, y]] of tips.entries()) {
      const endY = y + (index % 3 === 1 ? offset : 0);
      for (let step = 0; step <= 16; step += 1) {
        const t = step / 16;
        const u = 8 + (x - 8) * t + Math.sin(t * Math.PI) * (x - 8) * 0.20;
        const v = 13 - (13 - endY) * t;
        pixel(u, v, t > 0.86 ? 4 : t > 0.45 ? 3 : 2);
      }
    }
    pixel(8, 13, 2);
    pixel(7, 14, 1);
    pixel(8, 14, 1);
    pixel(9, 14, 1);
    pixel(8, 15, 1);
  });
}

const LEAVES_AND_FLOWERS = [makeFrond(-0.11), makeFrond(0.13), makeSilkFlower(0), makeSilkFlower(2)];
const SILK_FRAMES = [
  ['.........', '....4....', '....4....', '...3.....', '...3.....', '....3....', '....2....', '.....2...', '.........'],
  ['.........', '..4...4..', '..4..4...', '...33....', '....3....', '....3....', '.....2...', '.....12..', '.........'],
  ['.........', '.4..4..4.', '.4..4.4..', '..3.33...', '..333....', '...32....', '....2....', '.....2...', '.........'],
  ['.........', '.4.4...4.', '..4.4.4..', '...333...', '....323..', '....32...', '.....2...', '......2..', '.........'],
];

const FAN = { width: 40, height: 26, tips: [[7, 16], [11, 9], [17, 7], [25, 8], [33, 9], [34, 16]] };
const RIM = { width: 30, height: 22, tips: [[6, 13], [9, 7], [15, 7], [23, 7], [24, 13]] };
const LACE = { width: 25, height: 20, tips: [[6, 12], [9, 7], [17, 7], [19, 12]] };
const CROWNS = [
  { branch: 'west-low', offset: [-13, -11], profile: LACE, back: true },
  { branch: 'west', offset: [-24, -13], profile: RIM, back: true },
  { branch: 'middle-left', offset: [-15, -9], profile: FAN, back: true },
  { branch: 'middle', offset: [-19, -9], profile: FAN, back: true },
  { branch: 'middle-right', offset: [-10, -11], profile: RIM, back: true },
  { branch: 'east-spread', offset: [-10, -15], profile: FAN, back: true },
  { branch: 'east-low', offset: [-13, -10], profile: LACE, back: true },
  { branch: 'west-end', offset: [-8, -11], profile: RIM, mirror: true },
  { branch: 'west-rise', offset: [-15, -10], profile: RIM },
  { branch: 'west-spread', offset: [-13, -14], profile: RIM },
  { branch: 'middle-left', offset: [-18, -12], profile: RIM },
  { branch: 'middle-tip', offset: [-19, -10], profile: FAN },
  { branch: 'middle-right', offset: [-14, -10], profile: RIM, mirror: true },
  { branch: 'east-rise', offset: [-12, -11], profile: LACE },
  { branch: 'east-end', offset: [-16, -12], profile: RIM, mirror: true },
];

function paintSilkSprig(art, stems, atlases, silks, profile, anchor, tip, seed, back) {
  const { length, angle, point } = paintTwig(stems, anchor, tip, seed, LEAF_PALETTES[back ? 0 : 1][0]);
  const sprites = [];
  const count = 2 + Math.round(length / 6.5);
  const push = sprite => {
    paintSprite(art, sprite, sprite.x * TREE_ART_SCALE, sprite.y * TREE_ART_SCALE, TREE_ART_SCALE);
    sprites.push(sprite);
  };
  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.96) / (count + 0.2);
    const side = (seed + index) % 2 ? 1 : -1;
    const direction = angle + side * (0.52 + grain(seed, index, 137) * 0.35);
    const [u, v] = point(t);
    const width = 10.4 + t * 3.6 + grain(seed, index, 139) * 2.3;
    const height = width * (0.79 + grain(seed, index, 149) * 0.10);
    const x = clamp(u + Math.cos(direction) * width * 0.24, width * 0.34, profile.width - width * 0.34);
    const y = clamp(v + Math.sin(direction) * height * 0.24, height * 0.34, profile.height - height * 0.34);
    const tone = back ? Number(grain(seed, index, 151) > 0.48) : 1 + Number(grain(seed, index, 157) + 0.55 - y / profile.height > 0);
    push({ atlas: atlases[tone], frame: index % 2, x, y, width, height,
      angle: direction + Math.PI / 2, stemX: u, stemY: v, staysAttached: true });
  }
  if (back && seed % 4 !== 0) return sprites;
  const flowerCount = !back && seed % 4 === 0 ? 2 : 1;
  for (let index = 0; index < flowerCount; index += 1) {
    const [u, v] = point(index === 0 ? 0.87 : 0.55);
    const width = 8.4 + grain(seed, index, 161) * 2;
    const height = width * 0.87;
    const x = clamp(u + grain(seed, index, 163) * 2.2, width * 0.4, profile.width - width * 0.4);
    const y = clamp(v - height * 0.45, height * 0.4, profile.height - height * 0.4);
    const tone = back ? 0 : 1 + Number(grain(seed, index, 167) > -0.26);
    push({ atlas: atlases[tone], silks, frame: 2 + (seed + index) % 2, x, y, width, height,
      angle: grain(seed, index, 173) * 0.38, stemX: u, stemY: v });
  }
  return sprites;
}

function paintGround(ctx, silks) {
  paintPolygon(ctx, 'rgb(92 87 47 / 18%)', [[20, 82], [39, 78], [54, 75], [72, 75], [101, 79], [114, 82],
    [96, 84], [71, 86], [43, 84]]);
  paintPolygon(ctx, BARK[1], [[45, 81], [55, 77], [59, 75], [67, 74], [74, 78], [87, 82], [72, 80],
    [68, 83], [61, 82], [56, 80]]);
  paintPolygon(ctx, BARK[4], [[48, 81], [57, 77], [63, 75], [65, 76], [60, 79], [54, 80]]);
  for (let i = 0; i < 58; i += 1) {
    const x = 25 + (grain(i, 107, 19) + 1) * 41;
    const y = 78 + (grain(i, 109, 23) + 1) * 3.6;
    if (i % 3 === 0) {
      paintSprite(ctx, { atlas: silks, frame: 2, width: 2.7 + i % 4 * 0.29, height: 1.3,
        angle: grain(i, 113, 29) * 0.49 }, x, y);
    } else {
      ctx.fillStyle = LEAF_PALETTES[1][2 + i % 2];
      ctx.fillRect(Math.round(x), Math.round(y), 0.5 + i % 3 * 0.5, 0.5);
    }
  }
}

function createSilkArtwork(document) {
  const atlases = LEAF_PALETTES.map((palette, tone) => createSpriteAtlas(document, LEAVES_AND_FLOWERS,
    frame => frame < 2 ? palette : FLOWER_PALETTES[tone]));
  const silks = createSpriteAtlas(document, SILK_FRAMES, () => SILK_COLORS);
  const ground = createGroundArtwork(document, ctx => paintGround(ctx, silks));
  const crowns = CROWNS.map((crown, seed) => createCrownArtwork(document, crown, crown.profile,
    (art, stems, anchor, tip, index) => paintSilkSprig(art, stems, atlases, silks, crown.profile, anchor, tip, seed * 13 + index, crown.back)));
  return { ground, crowns };
}

export const SUMMER_SILK = {
  root: ROOT,
  branches: BRANCHES,
  bark: BARK,
  centerY: 33,
  foliageFrames: LEAVES_AND_FLOWERS,
  fallingSpans: spriteSpans(SILK_FRAMES),
  fallSpeed: [4.4, 9],
  fallMotion: { glideSpeed: 17.5, glideRate: 0.41, bobSpeed: 2, edgeSpeed: 1.9, groundHeight: 0.36 },
  recommendedCat: 'tuxedo',
  catConfig: {
    initialX: 87,
    initialY: 82.4,
    initialFacing: -1,
    ground: { minX: 20, maxX: 110, minY: 80.2, maxY: 84.0, rootFrontY: 81.8 },
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
  createArtwork: createSilkArtwork,
  dropSprite: ({ silks, width, height }) => ({ atlas: silks, frame: 2, width: width * 0.58, height: height * 0.60 }),
};
