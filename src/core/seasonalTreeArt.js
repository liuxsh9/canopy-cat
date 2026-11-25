const TREE_WIDTH = 136;
export const SCENE_WIDTH = TREE_WIDTH + 8;
export const SCENE_HEIGHT = 102;
export const TREE_ART_SCALE = 2;
// Compensate for transparent room at both sides so the tree keeps its display size.
export const SCENE_VIEW_SCALE = SCENE_WIDTH / TREE_WIDTH;
export const SCENE_INSET = { x: 8, y: 13 };
export const TWIG_COVERAGE = 1 << 8;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function grain(x, y, seed) {
  let bits = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 69069);
  bits = Math.imul(bits ^ (bits >>> 13), 1274126177);
  return ((bits ^ (bits >>> 16)) >>> 0) / 2147483648 - 1;
}

function texture(x, y, seed, size) {
  const u = x / size;
  const v = y / size;
  const left = Math.floor(u);
  const top = Math.floor(v);
  const horizontal = u - left;
  const vertical = v - top;
  const upper = grain(left, top, seed) * (1 - horizontal) + grain(left + 1, top, seed) * horizontal;
  const lower = grain(left, top + 1, seed) * (1 - horizontal) + grain(left + 1, top + 1, seed) * horizontal;
  return upper * (1 - vertical) + lower * vertical;
}

export function paintPolygon(ctx, color, points) {
  const bottom = Math.max(...points.map(point => point[1]));
  ctx.fillStyle = color;
  for (let y = Math.min(...points.map(point => point[1])); y < bottom; y += 1) {
    const crossings = [];
    points.forEach(([x, top], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length];
      if ((top <= y) !== (nextY <= y)) crossings.push(x + ((y + 0.5 - top) / (nextY - top)) * (nextX - x));
    });
    crossings.sort((a, b) => a - b);
    for (let i = 0; i < crossings.length; i += 2) {
      const start = Math.round(crossings[i]);
      ctx.fillRect(start, y, Math.round(crossings[i + 1]) - start, 1);
    }
  }
}

export function createBranchArtwork(document, { dx, dy, width: [start, end], phase }, bark) {
  const length = Math.hypot(dx, dy);
  const pad = Math.ceil(Math.max(start, end) / 2 + 3);
  const x = Math.floor(Math.min(0, dx)) - pad;
  const y = Math.floor(Math.min(0, dy)) - pad;
  const width = Math.ceil(Math.abs(dx)) + 2 * pad;
  const height = Math.ceil(Math.abs(dy)) + 2 * pad;
  const canvas = document.createElement('canvas');
  canvas.width = width * TREE_ART_SCALE;
  canvas.height = height * TREE_ART_SCALE;
  const ctx = canvas.getContext('2d');
  const seed = Math.round(phase * 23);
  const sun = (dy * 0.88 - dx * 0.53) / length;
  for (let row = 0; row < canvas.height; row += 1) {
    for (let column = 0; column < canvas.width; column += 1) {
      const u = x + (column + 0.5) / TREE_ART_SCALE;
      const v = y + (row + 0.5) / TREE_ART_SCALE;
      const along = (u * dx + v * dy) / length;
      if (along < -0.75 || along > length + 0.9) continue;
      const t = clamp(along / length, 0, 1);
      const across = (v * dx - u * dy) / length - Math.sin(t * Math.PI) * Math.min(1.3, start * 0.13);
      const flare = start >= 12 ? 2.5 * (1 - t) ** 4 : 0;
      const radius = (start + (end - start) * t) / 2 + flare;
      const edge = Math.abs(across) - radius + texture(along, across, seed, 1.35) * 0.56;
      if (edge > 0) continue;
      const facing = across / radius * sun;
      const light = clamp((facing + 0.22) * 1.4, 0, 1);
      const fiber = texture(along * 0.24, across + Math.sin(t * 5.6) * 0.68, seed + 17, 1.4);
      const groove = fiber < -0.32 ? -0.85 : fiber * 0.75;
      const shade = start < 2.5 || (edge > -0.52 && facing < -0.15) ? 0
        : clamp(Math.round(1.45 + light * 3.45 + groove), 0, bark.length - 1);
      ctx.fillStyle = bark[shade];
      ctx.fillRect(column, row, 1, 1);
    }
  }
  return { canvas, x, y, width, height };
}

export function createSpriteAtlas(document, frames, paletteForFrame) {
  const atlas = document.createElement('canvas');
  const size = frames[0].length;
  atlas.width = size;
  atlas.height = size * frames.length;
  const ctx = atlas.getContext('2d');
  frames.forEach((shape, frame) => {
    const tones = paletteForFrame(frame);
    shape.forEach((line, y) => {
      for (let x = 0; x < line.length; x += 1) {
        if (line[x] === '.') continue;
        ctx.fillStyle = tones[Number(line[x]) - 1];
        ctx.fillRect(x, frame * size + y, 1, 1);
      }
    });
  });
  return atlas;
}

export function paintSprite(ctx, { atlas, frame, width, height, angle, mirror }, x, y, scale = 1) {
  const size = atlas.width;
  const w = width * scale;
  const h = height * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(atlas, 0, frame * size, size, size, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function coversSprite(frames, { frame, width, height, cos, sin, mirror }, dx, dy, scale) {
  const shape = frames[frame];
  const side = mirror ? -1 : 1;
  const u = Math.floor(((dx * cos + dy * sin) * side / (width * scale) + 0.5) * shape.length);
  const v = Math.floor(((-dx * sin + dy * cos) / (height * scale) + 0.5) * shape.length);
  const pixel = shape[v]?.[u];
  return Boolean(pixel && pixel !== '.');
}

// A sprite's drawn width can include blank columns, which are removed when projecting a turn.
export function spriteSpans(frames) {
  return frames.map(shape => {
    const occupied = shape.filter(row => /\d/.test(row));
    const left = Math.min(...occupied.map(row => row.search(/\d/)));
    const right = Math.max(...occupied.map(row => row.replace(/\.+$/, '').length));
    return (right - left) / shape[0].length;
  });
}

export function createGroundArtwork(document, paint) {
  const ground = document.createElement('canvas');
  ground.width = SCENE_WIDTH * TREE_ART_SCALE;
  ground.height = SCENE_HEIGHT * TREE_ART_SCALE;
  const context = ground.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.scale(TREE_ART_SCALE, TREE_ART_SCALE);
  paint(context);
  return ground;
}

export function paintTwig(stems, anchor, tip, seed, color) {
  const dx = tip[0] - anchor[0];
  const dy = tip[1] - anchor[1];
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const curl = grain(seed, 12, 23) * 2.35;
  const point = t => [anchor[0] + dx * t - Math.sin(angle) * Math.sin(t * Math.PI) * curl,
    anchor[1] + dy * t + Math.cos(angle) * Math.sin(t * Math.PI) * curl];
  stems.fillStyle = color;
  const segments = Math.ceil(length * TREE_ART_SCALE * 1.5);
  for (let step = 0; step < segments; step += 1) {
    const [u, v] = point(step / segments);
    stems.fillRect(Math.round(u * TREE_ART_SCALE), Math.round(v * TREE_ART_SCALE), 1, 1);
  }

  return { length, angle, point };
}

export function createCrownArtwork(document, { branch, offset: [x, y], back, surface, mirror }, profile, paintSprig) {
  const { tips, width, height } = profile;
  const frameWidth = width * TREE_ART_SCALE;
  const frameHeight = height * TREE_ART_SCALE;
  const atlas = document.createElement('canvas');
  atlas.width = frameWidth;
  atlas.height = frameHeight * (1 + tips.length);
  const art = atlas.getContext('2d', { willReadFrequently: true });
  art.imageSmoothingEnabled = false;
  const twigs = document.createElement('canvas');
  twigs.width = frameWidth;
  twigs.height = atlas.height;
  const stems = twigs.getContext('2d', { willReadFrequently: true });
  const anchor = [mirror ? width + x : -x, -y];

  const mask = new Uint16Array(frameWidth * frameHeight);
  const sprigs = tips.map((tip, index) => {
    const row = (index + 1) * frameHeight;
    art.save();
    art.beginPath();
    art.rect(0, row, frameWidth, frameHeight);
    art.clip();
    art.translate(mirror ? frameWidth : 0, row);
    if (mirror) art.scale(-1, 1);
    stems.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? frameWidth : 0, row);
    const artwork = paintSprig(art, stems, anchor, tip, index);
    art.restore();
    stems.resetTransform();
    art.drawImage(atlas, 0, row, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    stems.drawImage(twigs, 0, row, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    const data = art.getImageData(0, row, frameWidth, frameHeight).data;
    const twigPixels = stems.getImageData(0, row, frameWidth, frameHeight).data;
    for (let position = 0; position < mask.length; position += 1) {
      if (twigPixels[position * 4 + 3]) mask[position] |= TWIG_COVERAGE << index;
      if (data[position * 4 + 3]) mask[position] |= 1 << index;
    }
    const centerX = x + (anchor[0] + tip[0]) / 2;
    const centerY = y + (anchor[1] + tip[1]) / 2;
    const localX = u => x + (mirror ? width - u : u);
    const sprites = artwork.map(sprite => {
      const angle = mirror ? -sprite.angle : sprite.angle;
      return { ...sprite, x: localX(sprite.x), y: y + sprite.y, stemX: localX(sprite.stemX), stemY: y + sprite.stemY,
        angle, mirror, cos: Math.cos(angle), sin: Math.sin(angle) };
    });
    return { row, sprites, x: mirror ? 2 * x + width - centerX : centerX, y: centerY };
  });
  const coverageAt = (localX, localY) => {
    const u = Math.floor((localX - x) * TREE_ART_SCALE);
    const v = Math.floor((localY - y) * TREE_ART_SCALE);
    return u >= 0 && u < frameWidth && v >= 0 && v < frameHeight ? mask[v * frameWidth + u] : 0;
  };
  return { branch, back, surface, atlas, twigs, frameWidth, frameHeight, width, height, x, y, sprigs, coverageAt };
}
