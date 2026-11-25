import { clamp, coversSprite, createBranchArtwork, paintSprite,
  SCENE_HEIGHT, SCENE_INSET, SCENE_WIDTH, TREE_ART_SCALE, TWIG_COVERAGE } from './seasonalTreeArt.js';
import { createSeasonalCat } from './seasonalCat.js';

const GUST_STRENGTH = { off: 0, light: 0.34, strong: 1 };
const GUST_TRAVEL_SPEED = 112;
const SHAKE_TRAVEL_SPEED = 228;
const MAX_LEAVES = 72;
const LEAF_GROWTH_SECONDS = 0.3;
const LEAF_EDGE_WIDTH = 0.18;
const MAX_SPRIG_SWAY = 0.13;
const LEAF_FALL_MOTION = { glideSpeed: 11, glideRate: 1, bobSpeed: 8, edgeSpeed: 0, groundHeight: 0.58 };
const snap = value => Math.round(value * TREE_ART_SCALE) / TREE_ART_SCALE;

function paintFallingLeaf(ctx, leaf, elapsed) {
  const drawX = snap(leaf.x);
  const drawY = snap(leaf.y);
  const x = drawX + SCENE_INSET.x;
  const y = drawY + SCENE_INSET.y;
  const edge = Math.min(x, SCENE_WIDTH - x, y, SCENE_HEIGHT - y);
  const fade = (edge - Math.hypot(leaf.width, leaf.height) / 2) / 6;
  const opacity = clamp(Math.min(fade, (leaf.fadeAt - elapsed) / 1.5), 0, 1);
  if (opacity === 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  paintSprite(ctx, leaf, drawX, drawY);
  ctx.restore();
}

function gustAt(time, strength, x, y, root) {
  if (Math.abs(strength) < 0.003) return 0;
  // The pulse reaches the upwind branches first, then sweeps across the crown.
  const distance = Math.sign(strength) * (x - root.x) + (root.y - y) * 0.16;
  const localTime = time - distance / GUST_TRAVEL_SPEED;
  const crest = Math.sin(localTime * 1.24 - 0.9) + Math.sin(localTime * 0.51 + 1) * 0.19;
  return strength * clamp(crest, 0, 1) ** 4;
}

function applyShake(branch, strength) {
  const bend = branch.bend - branch.windTarget;
  const budget = 2.7 + branch.flex * 1.7;
  // Stored bend energy counts toward the next kick.
  const spare = Math.sqrt(Math.max(0, budget ** 2 - branch.stiffness * bend ** 2));
  const limit = Math.max(spare, Math.abs(branch.velocity));
  const tension = clamp(Math.abs(branch.windTarget) / (branch.flex * 0.25), 0, 1);
  branch.velocity = clamp(branch.velocity + strength * (1 - tension * 0.58), -limit, limit);
}

export function createSeasonalTree(canvas, artwork, initialCat = 'auto') {
  const { root, branches: branchSpecs, bark, centerY, foliageFrames, fallingSpans,
    fallSpeed: [minFall, maxFall], fallMotion = LEAF_FALL_MOTION, createArtwork, dropSprite, createWeather,
    catConfig, recommendedCat } = artwork;
  const { glideSpeed, glideRate, bobSpeed, edgeSpeed, groundHeight } = fallMotion;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(TREE_ART_SCALE, 0, 0, TREE_ART_SCALE, 0, 0);
  const document = canvas.ownerDocument;
  const weather = createWeather?.();

  const branches = new Map();
  branchSpecs.forEach(({ name, parent, tip: [x, y], width, flex }, index) => {
    const joint = branches.get(parent) ?? root;
    const bone = {
      name, joint, children: [], x, y, dx: x - joint.x, dy: y - joint.y,
      length: Math.hypot(x - joint.x, y - joint.y), width, flex,
      stiffness: 54 + (1 - flex) * 30,
      restX: x, restY: y, gust: 0, rustle: 0,
      previousX: x, previousY: y, previousAngle: 0, previousRustle: 0,
      phase: index * 1.57, bend: 0, windTarget: 0, velocity: 0, angle: 0, cos: 1, sin: 0,
    };
    if (joint !== root) joint.children.push(bone);
    bone.art = createBranchArtwork(document, bone, bark);
    branches.set(name, bone);
  });
  const { ground, crowns: crownArt } = createArtwork(document);
  const crowns = crownArt.map(crown => {
    const bone = branches.get(crown.branch);
    const sprigs = crown.sprigs.map(({ row, sprites, x, y }) => {
      const sprig = { row, bone, back: crown.back, phase: bone.phase - x * 0.23 - y * 0.34 };
      sprig.leaves = sprites.map(sprite => ({
        ...sprite, sprig, dropAt: Infinity, growAt: -Infinity,
        exposure: Math.hypot(bone.x + sprite.x - root.x, (bone.y + sprite.y - centerY) * 1.35),
      }));
      return sprig;
    });
    return { ...crown, bone, sprigs };
  });
  const backCrowns = crowns.filter(crown => crown.back);
  const surfaceCrowns = crowns.filter(crown => !crown.back && crown.surface);
  const frontCrowns = crowns.filter(crown => !crown.back && !crown.surface);
  const hitOrder = [...crowns].reverse();
  const canopy = crowns.flatMap(crown => crown.sprigs.flatMap(sprig => sprig.leaves))
    .filter(leaf => !leaf.staysAttached)
    .sort((a, b) => b.exposure - a.exposure);

  const fallingLeaves = [];
  const pendingShakes = [];

  function kickGroundLeaf(gx, gy, vx, vy, floorOffset = 0) {
    if (fallingLeaves.length >= MAX_LEAVES + 14 || !canopy.length) return null;
    const sample = canopy[Math.floor(Math.random() * canopy.length)];
    const { atlas, frame, width, height } = dropSprite?.(sample) ?? sample;
    const scale = 0.56 + Math.random() * 0.24;
    const w = width * scale;
    const h = height * scale;
    const leaf = {
      atlas, frame, width: w, height: h,
      mirror: Math.random() < 0.5, back: false,
      angle: (Math.random() - 0.5) * 1.4,
      x: gx, y: gy,
      openWidth: w, openHeight: h,
      vx, vy,
      fall: minFall + Math.random() * (maxFall - minFall) * 0.7,
      roll: Math.random() * Math.PI * 2,
      spin: (Math.random() < 0.5 ? -1 : 1) * (4.5 + Math.random() * 5.0),
      heading: (Math.random() - 0.5) * 1.2,
      floor: clamp(gy + floorOffset + (Math.random() - 0.3) * 2.2, root.y - 0.5, root.y + 6.2),
      fadeAt: Infinity,
      fromGroundKick: true,
    };
    fallingLeaves.push(leaf);
    return leaf;
  }

  let companion = null;
  let activeCatMode = null;

  function resolveCatBreed(catMode) {
    if (!catConfig || catMode === 'none') return null;
    if (!catMode || catMode === 'auto') return recommendedCat ?? 'russian-blue';
    return catMode;
  }

  function setCat(catMode) {
    const breedKey = resolveCatBreed(catMode);
    if (breedKey === activeCatMode) return;
    activeCatMode = breedKey;
    if (!breedKey) {
      companion = null;
    } else if (companion) {
      companion.setBreed(breedKey);
    } else {
      companion = createSeasonalCat(
        { document, root, branches, fallingLeaves, applyShake, kickGroundLeaf, bark },
        catConfig,
        breedKey,
      );
    }
    paint();
  }

  const initialBreed = resolveCatBreed(initialCat);
  if (initialBreed) {
    activeCatMode = initialBreed;
    companion = createSeasonalCat(
      { document, root, branches, fallingLeaves, applyShake, kickGroundLeaf, bark },
      catConfig,
      initialBreed,
    );
  }
  let elapsed = 0;
  let growthTime = 0;
  let sheddingTime = 0;
  let shed = 0;
  let held = null;
  let storm = false;
  let restUntil = 0;
  let breeze = 0;
  let gusting = 0;
  let swayPhase = 0;

  function moveBranch(bone, angle) {
    bone.previousX = bone.x;
    bone.previousY = bone.y;
    bone.previousAngle = bone.angle;
    bone.previousRustle = bone.rustle;
    bone.angle = angle;
    bone.cos = Math.cos(angle);
    bone.sin = Math.sin(angle);
    bone.x = bone.joint.x + bone.dx * bone.cos - bone.dy * bone.sin;
    bone.y = bone.joint.y + bone.dx * bone.sin + bone.dy * bone.cos;
  }

  function sprigTurn(sprig, time = elapsed, rustle = sprig.bone.rustle) {
    const { flex } = sprig.bone;
    const amplitude = Math.min(MAX_SPRIG_SWAY, Math.max(0, rustle - 0.1) * 0.078);
    const phase = time * (4.1 + flex * 1.5) + sprig.phase;
    return amplitude * (Math.sin(phase) * 0.82 + Math.sin(phase * 1.54 + 0.5) * 0.18);
  }

  function leafGrowth(leaf) {
    const amount = clamp((growthTime - leaf.growAt) / LEAF_GROWTH_SECONDS, 0, 1);
    return 1 - (1 - amount) ** 2;
  }

  function leafCenter({ x, y, stemX, stemY }, scale) {
    return [stemX + (x - stemX) * scale, stemY + (y - stemY) * scale];
  }

  function isGrown(leaf) {
    return growthTime - leaf.growAt >= LEAF_GROWTH_SECONDS;
  }

  function isSprigFull(sprig) {
    return sprig.leaves.every(isGrown);
  }

  function isCrownStill(sprigs, rustle) {
    return rustle < 0.1 && sprigs.every(isSprigFull);
  }

  function drawBranch({ art, joint, angle }) {
    ctx.save();
    ctx.translate(snap(joint.x), snap(joint.y));
    ctx.rotate(angle);
    ctx.drawImage(art.canvas, art.x, art.y, art.width, art.height);
    ctx.restore();
  }

  function drawSprig(crown, sprite, row, turn) {
    const { frameWidth, frameHeight, x, y, width, height } = crown;
    ctx.save();
    ctx.rotate(turn);
    ctx.drawImage(sprite, 0, row, frameWidth, frameHeight, x, y, width, height);
    ctx.restore();
  }

  function drawSprigLeaves(crown, sprig) {
    const turn = sprigTurn(sprig);
    if (isSprigFull(sprig)) {
      drawSprig(crown, crown.atlas, sprig.row, turn);
      return;
    }
    ctx.save();
    ctx.rotate(turn);
    ctx.beginPath();
    ctx.rect(crown.x, crown.y, crown.width, crown.height);
    ctx.clip();
    for (const leaf of sprig.leaves) {
      const scale = leafGrowth(leaf);
      if (scale <= 0) continue;
      const [x, y] = leafCenter(leaf, scale);
      paintSprite(ctx, leaf, x, y, scale);
    }
    ctx.restore();
  }

  function drawCrown(crown) {
    const { atlas, twigs, frameWidth, frameHeight, width, height, x, y, bone, sprigs } = crown;
    ctx.save();
    ctx.translate(snap(bone.x), snap(bone.y));
    ctx.rotate(bone.angle);
    if (isCrownStill(sprigs, bone.rustle)) {
      ctx.drawImage(twigs, 0, 0, frameWidth, frameHeight, x, y, width, height);
      ctx.drawImage(atlas, 0, 0, frameWidth, frameHeight, x, y, width, height);
    } else {
      for (const sprig of sprigs) drawSprig(crown, twigs, sprig.row, sprigTurn(sprig));
      for (const sprig of sprigs) drawSprigLeaves(crown, sprig);
    }
    ctx.restore();
  }

  function paint() {
    ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.save();
    ctx.translate(SCENE_INSET.x, SCENE_INSET.y);
    ctx.drawImage(ground, 0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    weather?.paint(ctx, false);
    backCrowns.forEach(drawCrown);
    for (const leaf of fallingLeaves) if (leaf.back) paintFallingLeaf(ctx, leaf, elapsed);
    for (const bone of branches.values()) drawBranch(bone);
    surfaceCrowns.forEach(drawCrown);
    companion?.paint(ctx, 'on-tree');
    frontCrowns.forEach(drawCrown);
    for (const leaf of fallingLeaves) if (!leaf.back) paintFallingLeaf(ctx, leaf, elapsed);
    companion?.paint(ctx, 'foreground');
    weather?.paint(ctx, true);
    ctx.restore();
  }

  function detach(leaf, poseStep) {
    leaf.dropAt = Infinity;
    const scale = leafGrowth(leaf);
    const [x, y] = leafCenter(leaf, scale);
    leaf.growAt = growthTime + (storm ? 20 + Math.random() * 13 : 11 + Math.random() * 9);
    const { angle, mirror, sprig } = leaf;
    const { atlas, frame, width: spriteWidth, height: spriteHeight } = dropSprite?.(leaf) ?? leaf;
    const width = spriteWidth * scale;
    const height = spriteHeight * scale;
    const { bone, back } = sprig;
    const turn = bone.angle + sprigTurn(sprig);
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const offsetX = x * cos - y * sin;
    const offsetY = x * sin + y * cos;
    // Use the last two positions of the whole sprig, including rotation around its moving joint.
    const previousTurn = bone.previousAngle + sprigTurn(sprig, elapsed - poseStep, bone.previousRustle);
    const previousCos = Math.cos(previousTurn);
    const previousSin = Math.sin(previousTurn);
    const moveX = bone.x + offsetX - (bone.previousX + x * previousCos - y * previousSin);
    const moveY = bone.y + offsetY - (bone.previousY + x * previousSin + y * previousCos);
    const carry = poseStep > 0 ? Math.min(0.75 / poseStep, 36 / Math.hypot(moveX, moveY)) : 0;
    const leafAngle = angle + turn;
    fallingLeaves.push({
      atlas, frame, width, height, mirror, back, angle: leafAngle,
      x: snap(bone.x) + offsetX, y: snap(bone.y) + offsetY,
      openWidth: width, openHeight: height,
      vx: moveX * carry + breeze * 6 + (Math.random() - 0.5) * 4.5,
      vy: moveY * carry + Math.random() * 5 - 2,
      fall: minFall + Math.random() * (maxFall - minFall),
      roll: frame === 3 ? Math.PI : Math.acos((fallingSpans[frame] - LEAF_EDGE_WIDTH) / (1 - LEAF_EDGE_WIDTH)),
      spin: (Math.random() < 0.5 ? -1 : 1) * (2.8 + Math.random() * 4.3),
      heading: leafAngle + (Math.random() - 0.5) * 0.95,
      floor: root.y - 1 + Math.random() * 5.5, fadeAt: Infinity,
    });
  }

  function scatter(branch, strength, wave) {
    const count = Math.min(wave.remaining, Math.ceil((Math.abs(strength) - 0.32) * 1.65));
    if (count <= 0) return;
    let dropped = 0;
    const touched = new Set();
    for (const leaf of canopy) {
      if (leaf.sprig.bone !== branch || leaf.dropAt < Infinity || !isGrown(leaf) || touched.has(leaf.sprig)) continue;
      touched.add(leaf.sprig);
      leaf.dropAt = sheddingTime + dropped * 0.055;
      dropped += 1;
      if (dropped === count) break;
    }
    wave.remaining -= dropped;
  }

  function clearScheduledDrops() {
    for (const leaf of canopy) leaf.dropAt = Infinity;
    for (const { wave } of pendingShakes) wave.remaining = 0;
  }

  function regrow(duration, immediate = false) {
    clearScheduledDrops();
    canopy.forEach((leaf, index) => {
      if (!isGrown(leaf)) {
        const start = growthTime + duration * (1 - (index + 1) / canopy.length);
        leaf.growAt = immediate ? -Infinity : Math.min(leaf.growAt, start);
      }
    });
    if (immediate) paint();
  }

  function shedLeaves(seconds, sheddingSpeed, leafRetention, growthPaused, poseStep) {
    if (sheddingSpeed === 0) {
      shed = 0;
      clearScheduledDrops();
      return;
    }
    const dt = seconds * sheddingSpeed / 100;
    sheddingTime += dt;
    if (growthTime >= restUntil) {
      const gust = Math.abs(gustAt(elapsed, gusting, root.x, root.y, root));
      shed += dt * (0.28 + Math.abs(breeze) ** 2.8 * 16 + gust ** 1.6 * 24);
    }
    const attempts = Math.floor(shed);
    shed -= attempts;

    const attached = canopy.filter(leaf => growthPaused ? growthTime > leaf.growAt : isGrown(leaf));
    const retained = Math.ceil(canopy.length * leafRetention / 100);
    let available = Math.min(attached.length - retained, MAX_LEAVES - fallingLeaves.length);
    for (const leaf of attached) {
      if (leaf.dropAt > sheddingTime) continue;
      leaf.dropAt = Infinity;
      if (available <= 0) continue;
      detach(leaf, poseStep);
      available -= 1;
    }
    if (attempts === 0 || available <= 0) return;

    const candidates = attached.filter(leaf => leaf.dropAt === Infinity && growthTime > leaf.growAt);
    const count = Math.min(attempts, available, candidates.length);
    for (let i = 0; i < count; i += 1) {
      const exposed = Math.ceil(candidates.length * 0.22);
      const first = Math.floor(Math.random() * exposed);
      const second = Math.floor(Math.random() * exposed);
      const index = candidates[first].sprig.bone.gust > candidates[second].sprig.bone.gust ? first : second;
      const [leaf] = candidates.splice(index, 1);
      detach(leaf, poseStep);
    }
  }

  function moveFallingLeaves(seconds) {
    const response = 1 - Math.exp(-3.1 * seconds);
    const friction = Math.exp(-8.5 * seconds);
    for (let i = fallingLeaves.length - 1; i >= 0; i -= 1) {
      const leaf = fallingLeaves[i];
      if (leaf.fadeAt === Infinity) {
        const gust = gustAt(elapsed, gusting, leaf.x, leaf.y, root);
        const lift = Math.max(0, Math.abs(gust) - 0.18) * 14;
        leaf.roll += leaf.spin * (1 + Math.abs(gust) * 0.43) * seconds;
        const flutter = Math.sin(leaf.roll);
        const glide = Math.sin(leaf.roll * glideRate);
        // A petal slips down more quickly when its narrow edge faces the air.
        const descent = leaf.fall + flutter * bobSpeed + Math.abs(flutter) * edgeSpeed;
        leaf.vx += (breeze * 20 + gust * 24 + glide * glideSpeed - leaf.vx) * response;
        leaf.vy += (descent - lift - leaf.vy) * response;
        leaf.y += leaf.vy * seconds;
        const heading = leaf.heading + flutter * 0.88 + Math.atan2(leaf.vx, Math.max(8, leaf.vy)) * 0.45;
        const turn = heading - leaf.angle;
        leaf.angle += Math.atan2(Math.sin(turn), Math.cos(turn)) * response;
        if (leaf.y >= leaf.floor) {
          leaf.y = leaf.floor;
          leaf.vx *= 0.35;
          leaf.fadeAt = elapsed + 5 + Math.random() * 5;
          leaf.restingRoll = Math.round(leaf.roll / Math.PI) * Math.PI;
        }
      } else {
        leaf.vx *= friction;
        leaf.roll += (leaf.restingRoll - leaf.roll) * response;
        leaf.height += (leaf.openHeight * groundHeight - leaf.height) * response;
      }
      const face = Math.cos(leaf.roll);
      const visibleWidth = LEAF_EDGE_WIDTH + Math.abs(face) * (1 - LEAF_EDGE_WIDTH);
      leaf.frame = visibleWidth < 0.38 ? 0 : visibleWidth < 0.76 ? 1 : face < 0 ? 3 : 2;
      // The silhouettes have different amounts of padding inside their sprite frames.
      leaf.width = leaf.openWidth * visibleWidth / fallingSpans[leaf.frame];
      leaf.x += leaf.vx * seconds;
      const x = leaf.x + SCENE_INSET.x;
      if (leaf.fadeAt <= elapsed || x < 0 || x >= SCENE_WIDTH) fallingLeaves.splice(i, 1);
    }
  }

  function spreadShake({ bone, along }, impulse, leafLimit) {
    const wave = { remaining: leafLimit };
    function visit(branch, previous, distanceFromJoint, delay, strength) {
      if (Math.abs(strength) < 0.035) return;
      if (previous) pendingShakes.push({ branch, at: elapsed + delay, strength, wave });
      else scatter(branch, strength, wave);
      const parent = branch.joint;
      if (parent !== root && parent !== previous) {
        const mid = parent.length / 2;
        const travel = (distanceFromJoint + mid) / SHAKE_TRAVEL_SPEED;
        visit(parent, branch, mid, delay + travel, strength * 0.54);
      }
      for (const child of branch.children) {
        if (child === previous) continue;
        const mid = child.length / 2;
        const travel = (branch.length - distanceFromJoint + mid) / SHAKE_TRAVEL_SPEED;
        visit(child, branch, mid, delay + travel, strength * 0.61);
      }
    }
    visit(bone, null, along, 0, impulse);
    pendingShakes.sort((a, b) => a.at - b.at);
  }

  function windStep(dt, targetBreeze, targetGust) {
    const response = 1 - Math.exp(-6.5 * dt);
    breeze += (targetBreeze - breeze) * response;
    gusting += (targetGust - gusting) * response;
    const wind = Math.abs(breeze);
    swayPhase += dt * (1.7 + wind * 1.6);
    elapsed += dt;
    while (pendingShakes[0]?.at <= elapsed) {
      const { branch, strength, wave } = pendingShakes.shift();
      applyShake(branch, strength);
      scatter(branch, strength, wave);
    }
    for (const bone of branches.values()) {
      const wave = Math.sin(swayPhase + bone.phase) * 0.72 + Math.sin(swayPhase * 0.63 + bone.phase * 0.55) * 0.28;
      const gust = gustAt(elapsed, gusting, bone.restX, bone.restY, root);
      const windBend = breeze * (0.09 + wind * 0.12) + gust * 0.29;
      const jointAngle = (bone.joint.angle ?? 0) * 0.82;
      const grabbed = bone === held?.grab.bone;
      let target = bone.flex * (windBend + wave * (wind * 0.1 + Math.abs(gust) * 0.05));
      bone.windTarget = target;
      if (grabbed) {
        const aim = Math.atan2(held.y - bone.joint.y, held.x - bone.joint.x);
        const difference = aim - held.grab.localAngle - jointAngle;
        const bendLimit = 0.1 + bone.flex * 0.47;
        target = clamp(Math.atan2(Math.sin(difference), Math.cos(difference)), -bendLimit, bendLimit);
      }
      const spring = grabbed ? 400 : bone.stiffness;
      const damping = grabbed ? 34 : 8.2;
      bone.velocity += (spring * (target - bone.bend) - damping * bone.velocity) * dt;
      bone.bend = clamp(bone.bend + bone.velocity * dt, -0.68, 0.68);
      moveBranch(bone, jointAngle + bone.bend);
      bone.gust = Math.abs(gust);
      bone.rustle = wind * 0.61 + bone.gust * 0.93 + Math.min(Math.abs(bone.velocity) * 0.12, 0.35);
    }
  }

  function findBranch(sceneX, sceneY) {
    const x = sceneX - SCENE_INSET.x;
    const y = sceneY - SCENE_INSET.y;
    for (const crown of hitOrder) {
      const { bone, sprigs, coverageAt } = crown;
      const { rustle } = bone;
      const dx = x - snap(bone.x);
      const dy = y - snap(bone.y);
      const localX = dx * bone.cos + dy * bone.sin;
      const localY = -dx * bone.sin + dy * bone.cos;
      const margin = Math.hypot(crown.width, crown.height) * MAX_SPRIG_SWAY;
      if (localX < crown.x - margin || localX >= crown.x + crown.width + margin ||
        localY < crown.y - margin || localY >= crown.y + crown.height + margin) continue;
      if (isCrownStill(sprigs, rustle)) {
        if (coverageAt(localX, localY)) return bone.name;
        continue;
      }
      for (const [index, sprig] of sprigs.entries()) {
        const turn = sprigTurn(sprig);
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        const u = localX * cos + localY * sin;
        const v = -localX * sin + localY * cos;
        const coverage = coverageAt(u, v);
        if (coverage & (TWIG_COVERAGE << index)) return bone.name;
        if (isSprigFull(sprig)) {
          if (coverage & (1 << index)) return bone.name;
          continue;
        }
        if (u < crown.x || u >= crown.x + crown.width || v < crown.y || v >= crown.y + crown.height) continue;
        for (const leaf of sprig.leaves) {
          const scale = leafGrowth(leaf);
          if (scale <= 0) continue;
          const [x, y] = leafCenter(leaf, scale);
          if (coversSprite(foliageFrames, leaf, u - x, v - y, scale)) return bone.name;
        }
      }
    }
    let nearest = null;
    let distance = 6;
    for (const bone of branches.values()) {
      const dx = bone.x - bone.joint.x;
      const dy = bone.y - bone.joint.y;
      const fraction = clamp(((x - bone.joint.x) * dx + (y - bone.joint.y) * dy) / (dx * dx + dy * dy), 0, 1);
      const gap = Math.hypot(x - bone.joint.x - dx * fraction, y - bone.joint.y - dy * fraction);
      if (gap >= distance) continue;
      distance = gap;
      nearest = bone.name;
    }
    return nearest;
  }

  return {
    findBranch,
    setCat,
    hitCompanion(sceneX, sceneY) {
      return Boolean(companion?.hitTest(sceneX - SCENE_INSET.x, sceneY - SCENE_INSET.y));
    },
    petCompanion(sceneX, sceneY) {
      if (!companion?.hitTest(sceneX - SCENE_INSET.x, sceneY - SCENE_INSET.y)) return false;
      return Boolean(companion.pet());
    },
    notifyTreeDrag(branchName, sceneX, sceneY) {
      companion?.onTreeDrag?.(branchName, sceneX - SCENE_INSET.x, sceneY - SCENE_INSET.y);
    },
    grab(sceneX, sceneY, branch = findBranch(sceneX, sceneY)) {
      const bone = branches.get(branch);
      if (!bone) return null;
      const dx = sceneX - SCENE_INSET.x - bone.joint.x;
      const dy = sceneY - SCENE_INSET.y - bone.joint.y;
      const localAngle = Math.atan2(dy, dx) - bone.angle;
      const along = clamp((dx * (bone.x - bone.joint.x) + dy * (bone.y - bone.joint.y)) / bone.length, 0, bone.length);
      return { bone, localAngle, along };
    },
    still() {
      held = null;
      elapsed = 0;
      growthTime = 0;
      sheddingTime = 0;
      shed = 0;
      storm = false;
      restUntil = 0;
      breeze = 0;
      gusting = 0;
      swayPhase = 0;
      fallingLeaves.length = 0;
      pendingShakes.length = 0;
      weather?.reset();
      companion?.reset();
      for (const bone of branches.values()) {
        bone.bend = 0;
        bone.velocity = 0;
        bone.windTarget = 0;
        bone.gust = 0;
        bone.rustle = 0;
        moveBranch(bone, 0);
      }
      regrow(0, true);
    },
    growCanopy(animate) {
      restUntil = growthTime + 2.4;
      shed = 0;
      regrow(0.9, !animate);
    },
    poke(grip) {
      const branch = grip?.bone ?? branches.get(grip) ?? branches.get('leader');
      const along = grip?.along ?? branch.length * 0.65;
      const side = grip?.bone ? Math.sin(grip.localAngle - Math.atan2(branch.dy, branch.dx)) : 0;
      const direction = Math.abs(side) > 0.11 ? Math.sign(side) : (Math.sign(branch.x - root.x) || 1);
      const leverage = 0.52 + 0.72 * along / branch.length;
      const strength = direction * (1.45 + branch.flex * 2.2) * leverage;
      applyShake(branch, strength);
      spreadShake({ bone: branch, along }, strength, 10);
    },
    triggerCatAction(action) {
      return companion?.triggerAction?.(action) ?? false;
    },
    pull(grab, sceneX, sceneY) {
      held = { grab, x: sceneX - SCENE_INSET.x, y: sceneY - SCENE_INSET.y };
    },
    release(shouldShake = true) {
      const grip = held?.grab;
      held = null;
      if (!grip || !shouldShake) return;
      const { bone } = grip;
      const recoil = clamp((bone.windTarget - bone.bend) * 8.2 + bone.velocity * 0.16, -2.8, 2.8);
      spreadShake(grip, recoil, 8);
    },
    advance(seconds, { speed, direction, gusts, growthSpeed = 100, sheddingSpeed = 100, leafRetention = 50 }) {
      const wind = speed / 100;
      const strength = GUST_STRENGTH[gusts];
      const travel = direction === 'left' ? -1 : 1;
      const strong = wind >= 0.67 || strength === GUST_STRENGTH.strong;
      if (storm && !strong) {
        regrow(5);
        restUntil = Math.max(restUntil, growthTime + 5.3);
      }
      storm = strong;
      const steps = Math.ceil(seconds * 90);
      const poseStep = steps > 0 ? seconds / steps : 0;
      for (let step = 0; step < steps; step += 1) windStep(poseStep, travel * wind, travel * strength);
      // The growth clock changes rate without moving the deadlines of leaves already growing.
      growthTime += seconds * growthSpeed / 100;
      if (growthSpeed === 0) restUntil = growthTime;
      moveFallingLeaves(seconds);
      shedLeaves(seconds, sheddingSpeed, leafRetention, growthSpeed === 0, poseStep);
      const rootGust = gustAt(elapsed, gusting, root.x, root.y, root);
      weather?.advance(seconds, elapsed, breeze, rootGust, sheddingSpeed);
      companion?.advance(seconds, { breeze, gust: rootGust, isStorm: strong });
      paint();
    },
  };
}
