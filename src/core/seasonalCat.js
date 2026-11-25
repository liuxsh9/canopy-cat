import { clamp, SCENE_INSET, SCENE_WIDTH, TREE_ART_SCALE } from './seasonalTreeArt.js';
import {
  CAT_BREEDS,
  CAT_FRAME_PIVOTS,
  CAT_TAIL_ANCHORS,
  createCatAtlas,
  paintAlertBang,
  paintBarkChip,
  paintCatFrame,
  paintCatShadow,
  paintCatTail,
  paintPixelHeart,
  paintSleepZ,
} from './seasonalCatArt.js';

const rand = (min, max) => min + Math.random() * (max - min);
const pick = list => list[Math.floor(Math.random() * list.length)];

// Authentic feline wash cycle: lick paw x3 -> wipe face x2 -> lick paw x2 -> wipe face x2 (~5.25s at 3.8fps)
const GROOM_SEQUENCE = [
  'groomLick0', 'groomLick1', 'groomLick0', 'groomLick1', 'groomLick0', 'groomLick1',
  'groomWipe0', 'groomWipe1', 'groomWipe0', 'groomWipe1', 'groomWipe0',
  'groomLick0', 'groomLick1', 'groomLick0', 'groomLick1',
  'groomWipe0', 'groomWipe1', 'groomWipe0', 'groomWipe1', 'groomWipe0',
];

function sampleBone(bone, t) {
  const ux = bone.x - bone.joint.x;
  const uy = bone.y - bone.joint.y;
  const length = Math.hypot(ux, uy) || 1;
  const tx = ux / length;
  const ty = uy / length;
  const upSign = tx >= 0 ? 1 : -1;
  const nx = ty * upSign;
  const ny = -tx * upSign;
  const radius = (bone.width[0] + (bone.width[1] - bone.width[0]) * t) * 0.5;
  return { x: bone.joint.x + ux * t, y: bone.joint.y + uy * t, tx, ty, nx, ny, upSign, radius, length };
}

function climbingPose(bone, t, climbingDown, preferredSide = 1) {
  const s = sampleBone(bone, t);
  const dir = climbingDown ? -1 : 1;
  const tx = s.tx * dir;
  const ty = s.ty * dir;
  const angle = Math.atan2(ty, tx) + Math.PI / 2;
  const facing = Math.abs(tx) > 0.25 ? (tx >= 0 ? 1 : -1) : (preferredSide < 0 ? dir : -dir);
  const bellyX = -ty * facing;
  const bellyY = tx * facing;
  const offset = Math.max(1.4, s.radius * 0.65 + 1.1);
  return { x: s.x - bellyX * offset, y: s.y - bellyY * offset, angle, facing };
}

function perchPose(bone, t, style, facing) {
  const s = sampleBone(bone, t);
  const rx = s.tx * s.upSign;
  const ry = s.ty * s.upSign;
  const slope = Math.atan2(ry, rx);
  const angle = clamp(slope * (style === 'loaf' ? 0.64 : 0.30), -0.38, 0.38);
  const tuck = style === 'loaf' ? 0.9 : 0.7;
  return {
    x: s.x + s.nx * Math.max(0.5, s.radius - tuck),
    y: s.y + s.ny * Math.max(0.5, s.radius - tuck),
    angle,
    facing,
  };
}

// Explorer-tuned ambient companion cat (~88% calm rest, restrained particles, independent cooldowns,
// and 100% immediate responsiveness to petting, branch dragging, and storm weather).
export function createSeasonalCat({ document: doc, root, branches, fallingLeaves, applyShake, kickGroundLeaf, bark }, config, breedKey) {
  let breed = CAT_BREEDS[breedKey] ?? CAT_BREEDS['russian-blue'];
  let atlas = createCatAtlas(doc, breed);
  const ground = config.ground;
  const climbRoutes = config.climbRoutes ?? [];
  const particles = [];
  const OFF_LEFT = -SCENE_INSET.x - 14;
  const OFF_RIGHT = SCENE_WIDTH - SCENE_INSET.x + 14;

  let time = 0;
  let state = 'sit';
  let stateTime = 0;
  let stateDuration = 8.5;
  let x = config.initialX;
  let y = config.initialY;
  let facing = config.initialFacing;
  let angle = 0;
  let walkPhase = 0;
  let stepDist = 0;
  let blinkUntil = 0;
  let nextBlink = 2.8;
  let sleepZTimer = 4.2;
  let breezeNow = 0;
  let isStormNow = false;
  let calmRecoveryTimer = 0;
  let shelterSide = 1;
  let targetX = x;
  let targetY = y;
  let targetLeaf = null;
  let route = null;
  let segmentIndex = 0;
  let segmentT = 0;
  let perchStyle = 'loaf';
  let jump = null;
  let petMoodUntil = 0;
  let pendingClimb = false;
  let pendingScratch = false;
  let scratchSide = -1;
  let scratchPulseTimer = 0;
  let lastAction = 'sit';
  // Anti-repetition cooldown timestamps for higher-energy behaviors in always-on Explorer
  let nextChaseAt = 24;
  let nextScratchAt = 32;
  let nextClimbAt = 22;
  let nextGroomAt = 12;

  const spawnHeart = (hx, hy) => particles.push({ kind: 'heart', x: hx, y: hy, vx: rand(-1.4, 1.4), vy: -5.6, age: 0, life: 1.25 });
  const spawnSleepZ = (zx, zy) => particles.push({ kind: 'z', x: zx, y: zy, vx: rand(-0.5, 0.7), vy: -2.2, age: 0, life: 1.9 });
  const spawnAlert = (ax, ay) => particles.push({ kind: 'alert', x: ax, y: ay, vx: 0, vy: -3.2, age: 0, life: 0.85 });
  const spawnBarkChip = (bx, by, outDir) => particles.push({
    kind: 'bark',
    x: bx,
    y: by,
    vx: outDir * rand(3.5, 9.0),
    vy: -rand(3.0, 7.2),
    color: (bark && bark.length > 3) ? bark[Math.random() < 0.5 ? 3 : 5] : 'rgb(138 71 48)',
    age: 0,
    life: rand(0.45, 0.70),
  });

  function clampGround(gx, gy) {
    const cx = clamp(gx, ground.minX, ground.maxX);
    const distFromRoot = Math.abs(cx - root.x);
    const rootBulge = Math.exp(-((distFromRoot / 13) ** 2));
    const minY = ground.minY + rootBulge * (ground.rootFrontY - ground.minY);
    const maxY = ground.maxY - clamp((distFromRoot - 28) * 0.025, 0, 1.0);
    return [cx, clamp(gy, minY, maxY)];
  }

  // Tier 1: Subtle paw rustle while strolling (restrained 26% micro-kick on ground litter)
  function rustleLeavesUnderPaws(px, py) {
    for (const leaf of fallingLeaves) {
      if (leaf.y < ground.minY - 5) continue;
      const dx = leaf.x - px;
      const dy = leaf.y - py;
      if (Math.abs(dx) < 6.5 && Math.abs(dy) < 4.5) {
        const pushDir = Math.abs(dx) > 0.6 ? Math.sign(dx) : -facing;
        leaf.vx += pushDir * rand(2.0, 4.4);
        leaf.angle += (Math.random() - 0.5) * 0.42;
        if (leaf.fadeAt < Infinity) {
          leaf.y = Math.max(leaf.floor - 1.0, leaf.y - 0.75);
          leaf.roll += (Math.random() - 0.5) * 0.55;
        }
      }
    }
    if (px >= ground.minX + 6 && px <= ground.maxX - 6 && Math.random() < 0.26) {
      kickGroundLeaf?.(
        px - facing * rand(1.0, 3.0),
        py - 0.6,
        -facing * rand(3.2, 6.8) + breezeNow * 3.5,
        -rand(2.6, 4.8),
        0.5,
      );
    }
  }

  // Tier 2: Crisp radial landing puff (3-4 leaves blown aside on ground contact)
  function scatterLeavesOnLanding(lx, ly, strong = false) {
    const radius = strong ? 17 : 12;
    for (const leaf of fallingLeaves) {
      if (leaf.y < ground.minY - 7) continue;
      const dx = leaf.x - lx;
      const dy = leaf.y - ly;
      const dist = Math.hypot(dx, dy * 1.6);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const outDir = Math.abs(dx) > 0.8 ? Math.sign(dx) : (Math.random() < 0.5 ? -1 : 1);
        leaf.vx += outDir * rand(12, 22) * (0.55 + falloff * 0.65);
        leaf.vy = -rand(6.5, 13.0) * (0.5 + falloff * 0.6);
        leaf.spin += outDir * rand(3.5, 6.2);
        leaf.fadeAt = Infinity;
      }
    }
    const count = strong ? 4 : 3;
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      kickGroundLeaf?.(
        lx + side * rand(1.5, 5.2),
        ly - rand(0.4, 1.3),
        side * rand(11, 22) + breezeNow * 5,
        -rand(7.5, 14.5),
        rand(-0.5, 0.9),
      );
    }
  }

  // Tier 3: Playful pounce bat (boldest leaf impulse)
  function batLeafStrongly(leaf, bx, by) {
    leaf.vx += facing * rand(26, 40);
    leaf.vy = -rand(16, 24);
    leaf.spin = facing * rand(9, 14);
    leaf.fadeAt = Infinity;
    for (let i = 0; i < 2; i += 1) {
      kickGroundLeaf?.(
        bx + facing * rand(1.5, 4.0),
        Math.min(by, ground.maxY) - 1.2,
        facing * rand(18, 28),
        -rand(12, 19),
        0,
      );
    }
  }

  function enter(nextState, duration) {
    state = nextState;
    stateTime = 0;
    stateDuration = duration;
    if (nextState !== 'climbUp' && nextState !== 'climbDown' && nextState !== 'perch') angle = 0;
  }

  function pickRouteForDrag(branchName, dragX, dragY) {
    if (!climbRoutes.length) return null;
    const exact = climbRoutes.find(r => r.perch.branch === branchName || r.segments.some(s => s.branch === branchName && s.branch !== 'trunk'));
    if (exact && !Number.isFinite(dragX)) return exact;
    let best = climbRoutes[0];
    let bestDist = Infinity;
    for (const r of climbRoutes) {
      const bone = branches.get(r.perch.branch);
      if (!bone) continue;
      const pt = sampleBone(bone, r.perch.t);
      const d = Math.hypot(pt.x - dragX, pt.y - dragY);
      if (d < bestDist) { bestDist = d; best = r; }
    }
    return best;
  }

  function pickStrollTarget(preferClimb = false, forcedRoute = null) {
    if (preferClimb && climbRoutes.length > 0) {
      route = forcedRoute ?? pick(climbRoutes);
      const firstSeg = route.segments[0];
      const baseBone = branches.get(firstSeg.branch);
      if (baseBone) {
        const [tx, ty] = clampGround(baseBone.joint.x + (firstSeg.side ?? 1) * 6.5, ground.rootFrontY + 0.5);
        targetX = tx;
        targetY = ty;
        pendingClimb = true;
        pendingScratch = false;
        enter('stroll', 14);
        return;
      }
    }
    pendingClimb = false;
    pendingScratch = false;
    const onRight = x > root.x;
    const rawX = Math.random() < 0.65
      ? (onRight ? rand(ground.minX + 4, root.x - 12) : rand(root.x + 14, ground.maxX - 4))
      : rand(ground.minX + 5, ground.maxX - 5);
    const rawY = rand(ground.minY + 0.4, ground.maxY);
    [targetX, targetY] = clampGround(rawX, rawY);
    lastAction = 'stroll';
    enter('stroll', 14);
  }

  function startGoScratch() {
    const trunk = branches.get('trunk');
    if (!trunk) { enter('sit', rand(12, 20)); return; }
    pendingClimb = false;
    pendingScratch = true;
    scratchSide = x <= trunk.joint.x ? -1 : 1;
    const sample = sampleBone(trunk, 0.25);
    const [tx, ty] = clampGround(sample.x + scratchSide * (sample.radius + 4.8), ground.rootFrontY);
    targetX = tx;
    targetY = ty;
    nextScratchAt = time + rand(65, 105);
    lastAction = 'scratch';
    if (Math.hypot(x - tx, y - ty) <= 3.5) {
      x = tx;
      y = ty;
      facing = -scratchSide;
      pendingScratch = false;
      scratchPulseTimer = 0.08;
      enter('scratch', rand(2.8, 3.8));
    } else {
      enter('stroll', 14);
    }
  }

  function startFleeStorm() {
    if (state === 'fleeStorm' || state === 'sheltered') return;
    pendingClimb = false;
    pendingScratch = false;
    targetLeaf = null;
    if (state === 'perch' || state === 'climbUp' || state === 'climbDown') {
      startJumpDown(true);
      return;
    }
    if (state === 'jumpDown' || state === 'pounce') return;
    shelterSide = x >= root.x ? 1 : -1;
    targetX = shelterSide > 0 ? OFF_RIGHT : OFF_LEFT;
    targetY = clamp(y, ground.rootFrontY, ground.maxY);
    facing = shelterSide;
    enter('fleeStorm', 16);
  }

  function startReturnFromStorm(keepCurrentX = false) {
    if (!keepCurrentX) x = shelterSide > 0 ? OFF_RIGHT : OFF_LEFT;
    const [tx, ty] = clampGround(
      shelterSide > 0 ? rand(root.x + 16, ground.maxX - 8) : rand(ground.minX + 8, root.x - 16),
      rand(ground.rootFrontY + 0.3, ground.maxY - 0.5),
    );
    y = ty;
    targetX = tx;
    targetY = ty;
    facing = tx >= x ? 1 : -1;
    enter('returnFromStorm', 16);
  }

  function findChasableLeaf() {
    let best = null;
    let bestScore = Infinity;
    for (const leaf of fallingLeaves) {
      if (leaf.fadeAt < Infinity || leaf.fromGroundKick) continue;
      if (leaf.y < 54 || leaf.y > ground.maxY + 1) continue;
      if (leaf.x < ground.minX - 2 || leaf.x > ground.maxX + 2) continue;
      const dist = Math.hypot(leaf.x - x, (leaf.y - y) * 1.4);
      if (dist <= 32 && dist < bestScore) { bestScore = dist; best = leaf; }
    }
    return best;
  }

  function startClimb() {
    if (!route?.segments.length) { enter('sit', rand(12, 20)); return; }
    segmentIndex = 0;
    segmentT = route.segments[0].fromT;
    pendingClimb = false;
    nextClimbAt = time + rand(55, 95);
    lastAction = 'climb';
    const bone = branches.get(route.segments[0].branch);
    if (bone) applyShake?.(bone, (route.segments[0].side ?? 1) * 0.24);
    enter('climbUp', 22);
  }

  function startJumpDown(startled = false) {
    if (!route) { enter('sit', rand(12, 20)); return; }
    const bone = branches.get(route.perch.branch);
    if (bone) applyShake?.(bone, (facing > 0 ? -1 : 1) * (startled ? 0.85 : 0.45));
    const dir = x < root.x ? -1 : 1;
    const [landX, landY] = clampGround(
      clamp(x + dir * rand(10, 20), ground.minX + 4, ground.maxX - 4),
      rand(ground.rootFrontY + 0.3, ground.maxY - 0.3),
    );
    const flightTime = clamp(Math.hypot(landX - x, landY - y) / 36, 0.48, 0.85);
    facing = landX >= x ? 1 : -1;
    jump = { startX: x, startY: y, landX, landY, duration: flightTime, arcHeight: startled ? 9.5 : 6.5, startled };
    enter('jumpDown', flightTime);
  }

  // Serene always-on Explorer rhythm (~88% resting, natural chains, zero repetitive jitter)
  function chooseNextGroundAction() {
    if (isStormNow) { startFleeStorm(); return; }
    const choices = [
      { action: 'nap', weight: lastAction === 'nap' ? 0.08 : 0.30 },
      { action: 'groundLoaf', weight: lastAction === 'groundLoaf' ? 0.08 : 0.24 },
      { action: 'sit', weight: lastAction === 'sit' ? 0.10 : 0.22 },
      { action: 'stroll', weight: lastAction === 'stroll' ? 0.04 : 0.11 },
    ];
    if (time >= nextGroomAt && lastAction !== 'groom') choices.push({ action: 'groom', weight: 0.10 });
    if (time >= nextScratchAt && lastAction !== 'scratch') choices.push({ action: 'scratch', weight: 0.06 });
    if (time >= nextClimbAt && climbRoutes.length > 0 && lastAction !== 'climb') choices.push({ action: 'climb', weight: 0.07 });

    const total = choices.reduce((sum, item) => sum + item.weight, 0);
    let pickRoll = Math.random() * total;
    let chosen = choices[0].action;
    for (const item of choices) {
      pickRoll -= item.weight;
      if (pickRoll <= 0) { chosen = item.action; break; }
    }

    if (chosen === 'nap') {
      sleepZTimer = rand(3.5, 5.2);
      lastAction = 'nap';
      enter('nap', rand(28, 52));
    } else if (chosen === 'groundLoaf') {
      sleepZTimer = rand(4.5, 6.5);
      lastAction = 'groundLoaf';
      enter('groundLoaf', rand(20, 36));
    } else if (chosen === 'sit') {
      lastAction = 'sit';
      enter('sit', rand(12, 22));
    } else if (chosen === 'groom') {
      nextGroomAt = time + rand(40, 70);
      lastAction = 'groom';
      enter('groom', 5.25);
    } else if (chosen === 'scratch') {
      startGoScratch();
    } else if (chosen === 'climb') {
      pickStrollTarget(true);
    } else {
      pickStrollTarget(false);
    }
  }

  function isSleeping() {
    return state === 'nap'
      || (state === 'perch' && perchStyle === 'loaf' && stateTime > 4.0)
      || (state === 'groundLoaf' && stateTime > 6.0);
  }

  // User drag interaction (zero cooldown — always immediately responsive!):
  //   - Sleeping -> wakes up with a crisp `!` and looks toward the swayed tree
  //   - Awake -> notices the dragged branch and walks over to climb toward it
  function onTreeDrag(branchName, dragX, dragY) {
    if (state === 'sheltered' || state === 'fleeStorm' || isStormNow) return;
    if (isSleeping()) {
      spawnAlert(x + facing * 1.5, y - 10.5);
      if (state === 'perch') {
        perchStyle = 'sit';
        stateTime = 0;
        stateDuration = Math.max(stateDuration, 12);
        facing = dragX >= x ? 1 : -1;
      } else {
        facing = dragX >= x ? 1 : -1;
        enter('wakeUp', 1.45);
      }
      return;
    }
    if (state === 'climbUp' || state === 'climbDown' || state === 'jumpDown' || state === 'pounce') return;
    if (state === 'perch') {
      facing = dragX >= x ? 1 : -1;
      perchStyle = 'sit';
      return;
    }
    const chosen = pickRouteForDrag(branchName, dragX, dragY);
    if (!chosen) return;
    spawnAlert(x + facing * 1.2, y - 10.8);
    facing = dragX >= x ? 1 : -1;
    route = chosen;
    pendingClimb = true;
    pendingScratch = false;
    enter('lookUp', 0.45);
  }

  function advance(seconds, { breeze = 0, gust = 0, isStorm = false } = {}) {
    time += seconds;
    stateTime += seconds;
    breezeNow = breeze;
    isStormNow = Boolean(isStorm);
    if (time >= nextBlink) { blinkUntil = time + 0.14; nextBlink = time + rand(2.8, 6.2); }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.age += seconds;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.x += (p.vx + breeze * (p.kind === 'z' ? 2.2 : 0.7)) * seconds;
      p.y += p.vy * seconds;
      if (p.kind === 'heart' || p.kind === 'alert') p.vy *= Math.exp(-1.8 * seconds);
      if (p.kind === 'bark') p.vy += 28 * seconds;
    }

    if (isStormNow && state !== 'fleeStorm' && state !== 'sheltered' && state !== 'jumpDown' && state !== 'pounce') {
      startFleeStorm();
      return;
    }

    if (state === 'sheltered') {
      if (!isStormNow) {
        calmRecoveryTimer += seconds;
        if (calmRecoveryTimer >= 1.1) {
          calmRecoveryTimer = 0;
          startReturnFromStorm(false);
        }
      } else {
        calmRecoveryTimer = 0;
      }
      return;
    }

    if (state === 'fleeStorm') {
      if (!isStormNow) {
        if (x > ground.minX + 4 && x < ground.maxX - 4) enter('sit', rand(10, 18));
        else startReturnFromStorm(true);
        return;
      }
      const speed = 15.0;
      const step = speed * seconds;
      x += shelterSide * step;
      facing = shelterSide;
      walkPhase += seconds * 9.8;
      stepDist += step;
      if (stepDist >= 4.8) { stepDist = 0; rustleLeavesUnderPaws(x, y); }
      if ((shelterSide > 0 && x >= OFF_RIGHT) || (shelterSide < 0 && x <= OFF_LEFT)) {
        calmRecoveryTimer = 0;
        enter('sheltered', 9999);
      }
      return;
    }

    if (state === 'returnFromStorm') {
      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.25) facing = dx > 0 ? 1 : -1;
      const speed = 10.5;
      const step = speed * seconds;
      walkPhase += seconds * 7.0;
      stepDist += step;
      if (stepDist >= 5.2 && x >= ground.minX && x <= ground.maxX) {
        stepDist = 0;
        rustleLeavesUnderPaws(x, y);
      }
      if (dist <= step + 0.5 || stateTime >= stateDuration) {
        x = targetX;
        y = targetY;
        lastAction = 'sit';
        enter('sit', rand(12, 20));
      } else {
        x += (dx / dist) * step;
        y += (dy / dist) * step;
      }
      return;
    }

    if (state === 'wakeUp') {
      if (stateTime >= stateDuration) {
        if (Math.random() < 0.45) enter('stretch', 1.45);
        else enter('sit', rand(10, 18));
      }
      return;
    }

    if (state === 'pet') {
      if (stateTime >= stateDuration) {
        if (route && y < root.y - 4) enter('perch', rand(20, 38));
        else enter('sit', rand(10, 18));
      }
      return;
    }

    if (state === 'stroll') {
      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.25) facing = dx > 0 ? 1 : -1;
      const speed = pendingClimb ? 13.8 : 9.8;
      const step = speed * seconds;
      walkPhase += seconds * (speed * 0.65);
      stepDist += step;
      if (stepDist >= 4.8) {
        stepDist = 0;
        rustleLeavesUnderPaws(x, y);
      }
      if (!pendingClimb && !pendingScratch && time >= nextChaseAt && stateTime > 0.9 && Math.random() < seconds * 0.06) {
        const leaf = findChasableLeaf();
        if (leaf) {
          targetLeaf = leaf;
          facing = leaf.x >= x ? 1 : -1;
          nextChaseAt = time + rand(55, 90);
          enter('crouch', 0.45);
          return;
        }
      }
      if (dist <= step + 0.4 || stateTime >= stateDuration) {
        x = targetX;
        y = targetY;
        if (pendingScratch) {
          pendingScratch = false;
          facing = -scratchSide;
          scratchPulseTimer = 0.08;
          enter('scratch', rand(2.8, 3.8));
        } else if (pendingClimb) {
          facing = root.x >= x ? 1 : -1;
          enter('lookUp', 0.55);
        } else {
          chooseNextGroundAction();
        }
      } else {
        [x, y] = clampGround(x + (dx / dist) * step, y + (dy / dist) * step);
      }
      return;
    }

    if (state === 'lookUp') {
      if (stateTime >= stateDuration) {
        if (pendingClimb && route) {
          const firstSeg = route.segments[0];
          const baseBone = branches.get(firstSeg.branch);
          const [tx, ty] = baseBone
            ? clampGround(baseBone.joint.x + (firstSeg.side ?? 1) * 6.5, ground.rootFrontY + 0.5)
            : [root.x, ground.rootFrontY];
          if (Math.hypot(x - tx, y - ty) > 4.5) {
            targetX = tx;
            targetY = ty;
            enter('stroll', 14);
          } else {
            startClimb();
          }
        } else {
          chooseNextGroundAction();
        }
      }
      return;
    }

    if (state === 'sit' || state === 'groom' || state === 'groundLoaf') {
      if (state === 'groundLoaf' && stateTime > 6.0) {
        sleepZTimer -= seconds;
        if (sleepZTimer <= 0) { spawnSleepZ(x + facing * 4.4, y - 7.5); sleepZTimer = rand(4.8, 7.2); }
      }
      if (state === 'sit' && time >= nextChaseAt && stateTime > 3.0 && Math.random() < seconds * 0.04) {
        const leaf = findChasableLeaf();
        if (leaf) {
          targetLeaf = leaf;
          facing = leaf.x >= x ? 1 : -1;
          nextChaseAt = time + rand(55, 90);
          enter('crouch', 0.45);
          return;
        }
      }
      if (stateTime >= stateDuration) chooseNextGroundAction();
      return;
    }

    if (state === 'crouch') {
      if (targetLeaf) facing = targetLeaf.x >= x ? 1 : -1;
      if (stateTime >= stateDuration) {
        if (targetLeaf && fallingLeaves.includes(targetLeaf)) enter('chase', 2.4);
        else { targetLeaf = null; chooseNextGroundAction(); }
      }
      return;
    }

    if (state === 'chase') {
      if (!targetLeaf || !fallingLeaves.includes(targetLeaf) || stateTime >= stateDuration) {
        targetLeaf = null;
        enter('sit', rand(10, 18));
        return;
      }
      const dx = targetLeaf.x - x;
      const [gx, gy] = clampGround(targetLeaf.x, Math.max(targetLeaf.y, ground.minY));
      const mx = gx - x;
      const my = gy - y;
      const dist = Math.hypot(mx, my);
      if (Math.abs(dx) > 0.2) facing = dx > 0 ? 1 : -1;
      walkPhase += seconds * 12.5;
      if (dist < 7.2 && targetLeaf.y > y - 14) {
        const [landX, landY] = clampGround(clamp(x + facing * rand(3.5, 6.5), ground.minX + 2, ground.maxX - 2), y);
        jump = { startX: x, startY: y, landX, landY, duration: 0.42, arcHeight: clamp(y - targetLeaf.y + 3.5, 4.5, 9.0), batting: targetLeaf };
        targetLeaf = null;
        enter('pounce', 0.42);
        return;
      }
      if (dist > 0.1) [x, y] = clampGround(x + (mx / dist) * 18.5 * seconds, y + (my / dist) * 18.5 * seconds);
      return;
    }

    if (state === 'pounce') {
      if (!jump) { enter('sit', rand(10, 18)); return; }
      const p = clamp(stateTime / jump.duration, 0, 1);
      x = jump.startX + (jump.landX - jump.startX) * p;
      y = jump.startY + (jump.landY - jump.startY) * p - Math.sin(p * Math.PI) * jump.arcHeight;
      if (jump.batting && p > 0.30 && p < 0.76) {
        const leaf = jump.batting;
        if (Math.hypot(leaf.x - x, leaf.y - (y - 3.5)) < 12) {
          batLeafStrongly(leaf, x, y);
          jump.batting = null;
        }
      }
      if (p >= 1) {
        x = jump.landX;
        y = jump.landY;
        jump = null;
        scatterLeavesOnLanding(x, y, false);
        lastAction = 'sit';
        enter('sit', rand(10, 18));
      }
      return;
    }

    if (state === 'nap') {
      sleepZTimer -= seconds;
      if (sleepZTimer <= 0) { spawnSleepZ(x + facing * 4.5, y - 6.2); sleepZTimer = rand(4.5, 7.0); }
      if (stateTime >= stateDuration) enter('stretch', 1.5);
      return;
    }

    if (state === 'scratch') {
      const trunk = branches.get('trunk');
      if (trunk) {
        const sample = sampleBone(trunk, 0.25);
        x = sample.x + scratchSide * (sample.radius + 4.8);
        facing = -scratchSide;
      }
      scratchPulseTimer -= seconds;
      if (scratchPulseTimer <= 0) {
        scratchPulseTimer = rand(0.24, 0.34);
        if (trunk) applyShake?.(trunk, facing * 0.15);
        const clawX = x + facing * 5.2;
        const clawY = y - rand(4.2, 6.8);
        spawnBarkChip(clawX, clawY, -facing);
        if (Math.random() < 0.5) spawnBarkChip(clawX, clawY + 1.0, -facing);
      }
      if (stateTime >= stateDuration) {
        // Natural chain after sharpening claws: groom or sit quietly
        if (time >= nextGroomAt && Math.random() < 0.45) {
          nextGroomAt = time + rand(40, 70);
          lastAction = 'groom';
          enter('groom', 5.25);
        } else {
          lastAction = 'sit';
          enter('sit', rand(12, 22));
        }
      }
      return;
    }

    if (state === 'stretch') {
      if (stateTime >= stateDuration) {
        if (Math.random() < 0.45) pickStrollTarget(false);
        else enter('sit', rand(12, 20));
      }
      return;
    }

    if (state === 'climbUp') {
      const seg = route?.segments[segmentIndex];
      const bone = seg && branches.get(seg.branch);
      if (!bone) { startJumpDown(false); return; }
      segmentT += (12.2 / Math.max(8, bone.length)) * seconds;
      walkPhase += seconds * 10.5;
      if (segmentT >= seg.toT) {
        segmentT = seg.toT;
        if (segmentIndex + 1 < route.segments.length) {
          segmentIndex += 1;
          segmentT = route.segments[segmentIndex].fromT;
          const nextBone = branches.get(route.segments[segmentIndex].branch);
          if (nextBone) applyShake?.(nextBone, (route.segments[segmentIndex].side ?? 1) * 0.25);
        } else {
          perchStyle = route.perch.style === 'auto' ? (Math.random() < 0.74 ? 'loaf' : 'sit') : route.perch.style;
          facing = route.perch.facing ?? 1;
          sleepZTimer = rand(4.5, 6.8);
          applyShake?.(bone, facing * 0.32);
          enter('perch', rand(28, 55));
          return;
        }
      }
      const pose = climbingPose(bone, segmentT, false, seg.side ?? 1);
      x = pose.x;
      y = pose.y;
      angle = pose.angle;
      facing = pose.facing;
      if (Math.abs(bone.velocity) > 2.2) startJumpDown(true);
      return;
    }

    if (state === 'perch') {
      const bone = route && branches.get(route.perch.branch);
      if (!bone) { startJumpDown(false); return; }
      const pose = perchPose(bone, route.perch.t, perchStyle, facing);
      x = pose.x;
      y = pose.y;
      angle = pose.angle;
      if (perchStyle === 'loaf' && stateTime > 4.0) {
        sleepZTimer -= seconds;
        if (sleepZTimer <= 0) { spawnSleepZ(x + facing * 4.2, y - 7.8); sleepZTimer = rand(4.8, 7.2); }
      }
      if (Math.abs(bone.velocity) > 1.75 || Math.abs(bone.bend) > 0.34) {
        startJumpDown(true);
        return;
      }
      if (stateTime >= stateDuration) startJumpDown(false);
      return;
    }

    if (state === 'jumpDown') {
      if (!jump) { enter('sit', rand(12, 20)); return; }
      const p = clamp(stateTime / jump.duration, 0, 1);
      x = jump.startX + (jump.landX - jump.startX) * p;
      y = jump.startY + (jump.landY - jump.startY) * p - Math.sin(p * Math.PI) * jump.arcHeight;
      if (p >= 1) {
        x = jump.landX;
        y = jump.landY;
        const wasStartled = jump.startled;
        jump = null;
        route = null;
        scatterLeavesOnLanding(x, y, true);
        if (isStormNow) startFleeStorm();
        else if (wasStartled) pickStrollTarget(false);
        else {
          lastAction = 'sit';
          enter(Math.random() < 0.45 ? 'groundLoaf' : 'sit', rand(14, 26));
        }
      }
    }
  }

  function currentFrame() {
    const blinking = time < blinkUntil;
    if (state === 'pet' || time < petMoodUntil) {
      if (state === 'perch') return perchStyle === 'loaf' ? 'loafBlink' : 'happy';
      return 'happy';
    }
    if (state === 'stroll' || state === 'chase' || state === 'fleeStorm' || state === 'returnFromStorm') {
      return `walk${Math.floor(walkPhase) % 4}`;
    }
    if (state === 'lookUp' || state === 'wakeUp') return 'sitLookUp';
    if (state === 'sit') return blinking ? 'sitBlink' : 'sit';
    if (state === 'groundLoaf') return (stateTime > 6.0 || blinking) ? 'groundLoafBlink' : 'groundLoaf';
    if (state === 'groom') return GROOM_SEQUENCE[Math.floor(stateTime * 3.8) % GROOM_SEQUENCE.length];
    if (state === 'scratch') return Math.floor(stateTime * 6.8) % 2 === 0 ? 'scratch0' : 'scratch1';
    if (state === 'stretch') return 'stretch';
    if (state === 'nap') return Math.sin(stateTime * 1.8) > 0.15 ? 'nap1' : 'nap0';
    if (state === 'crouch') return 'crouch';
    if (state === 'pounce' || state === 'jumpDown') {
      const p = jump ? clamp(stateTime / jump.duration, 0, 1) : 0.5;
      return p < 0.45 ? 'leapUp' : 'leapDown';
    }
    if (state === 'climbUp' || state === 'climbDown') return Math.floor(walkPhase) % 2 === 0 ? 'climb0' : 'climb1';
    if (state === 'perch') return perchStyle === 'loaf' ? (stateTime > 4.0 || blinking ? 'loafBlink' : 'loaf') : (blinking ? 'sitBlink' : 'sit');
    return 'sit';
  }

  function currentLayer() {
    if (state === 'sheltered') return 'none';
    if (state === 'climbUp' || state === 'climbDown' || state === 'perch') return 'on-tree';
    return 'foreground';
  }

  function tailShape() {
    const sway = Math.sin(time * 2.2) * 2.2 + breezeNow * 2.4;
    if (state === 'perch') {
      const pendulum = Math.sin(time * 1.9) * 2.8 + breezeNow * 4.2;
      return { ctrlX: -1.8 + pendulum * 0.45, ctrlY: 6.2, tipX: -0.6 + pendulum, tipY: 12.6 };
    }
    if (state === 'climbUp' || state === 'climbDown') return { ctrlX: -2.8, ctrlY: 5.0, tipX: -4.5 + Math.sin(time * 5.0) * 1.5, tipY: 10.6 };
    if (state === 'nap') return { ctrlX: -3.6, ctrlY: 1.8, tipX: 2.8, tipY: 2.8, thick: 0.72 };
    if (state === 'groundLoaf') return { ctrlX: -4.5, ctrlY: 1.8, tipX: -8.2, tipY: -0.6 + Math.sin(time * 1.3) * 1.1 };
    if (state === 'scratch') return { ctrlX: -4.8, ctrlY: -5.4, tipX: -1.4 + Math.sin(time * 9.5) * 2.2, tipY: -10.8 };
    if (state === 'stretch') return { ctrlX: -3.2, ctrlY: -6.8, tipX: 0.4 + sway * 0.25, tipY: -11.2 };
    if (state === 'crouch') return { ctrlX: -5.8, ctrlY: 1.0, tipX: -9.8, tipY: -1.4 + Math.sin(time * 10.5) * 1.9 };
    if (state === 'pounce' || state === 'jumpDown') return { ctrlX: -6.0, ctrlY: -2.4, tipX: -10.2, tipY: -6.0 };
    if (state === 'stroll' || state === 'chase' || state === 'fleeStorm' || state === 'returnFromStorm') {
      return { ctrlX: -5.2, ctrlY: -4.8, tipX: -1.6 + Math.sin(walkPhase * 1.4) * 1.7 + breezeNow * 1.5, tipY: -10.6 };
    }
    if (state === 'pet' || time < petMoodUntil) return { ctrlX: -4.8, ctrlY: -5.2, tipX: -1.2 + Math.sin(time * 7.5) * 2.6, tipY: -10.8 };
    return { ctrlX: -5.2, ctrlY: 1.4, tipX: -9.4, tipY: -2.4 + Math.sin(time * 1.5) * 1.7 + breezeNow * 1.1 };
  }

  return {
    setBreed(nextKey) {
      breed = CAT_BREEDS[nextKey] ?? CAT_BREEDS['russian-blue'];
      atlas = createCatAtlas(doc, breed);
    },
    onTreeDrag,
    reset() {
      particles.length = 0;
      time = 0;
      stateTime = 0;
      x = config.initialX;
      y = config.initialY;
      facing = config.initialFacing;
      angle = 0;
      walkPhase = 0;
      stepDist = 0;
      calmRecoveryTimer = 0;
      targetLeaf = null;
      route = null;
      jump = null;
      petMoodUntil = 0;
      pendingClimb = false;
      pendingScratch = false;
      nextChaseAt = 24;
      nextScratchAt = 32;
      nextClimbAt = 22;
      nextGroomAt = 12;
      lastAction = 'sit';
      enter('sit', rand(7.5, 11.0));
    },
    advance,
    paint(ctx, layer) {
      if (layer === currentLayer()) {
        const frameName = currentFrame();
        const [pivotX, pivotY] = CAT_FRAME_PIVOTS[frameName] ?? CAT_FRAME_PIVOTS.default;
        const [tailPx, tailPy] = CAT_TAIL_ANCHORS[frameName] ?? [5, 16];
        const px = 1 / TREE_ART_SCALE;
        const relX = (tailPx - pivotX) * px;
        const relY = (tailPy - pivotY) * px;
        const shape = tailShape();
        if (state !== 'climbUp' && state !== 'climbDown' && state !== 'perch') {
          const heightOffGround = jump
            ? Math.max(0, (jump.startY + (jump.landY - jump.startY) * clamp(stateTime / jump.duration, 0, 1)) - y)
            : 0;
          const shadowScale = clamp(1 - heightOffGround * 0.045, 0.45, 1);
          const radiusX = (state === 'nap' || state === 'groundLoaf' ? 5.6 : state === 'sit' || state === 'groom' ? 4.4 : 5.4) * shadowScale;
          paintCatShadow(ctx, x + (state === 'sit' ? -0.3 * facing : 0), y + heightOffGround + 0.25, radiusX, 1.2 * shadowScale, 0.18 * shadowScale);
        }
        const tailInFront = state === 'nap';
        if (!tailInFront) {
          ctx.save();
          ctx.translate(x, y);
          if (state === 'perch' && angle) {
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const rlx = relX * facing;
            const rly = relY;
            const wx = rlx * cosA - rly * sinA;
            const wy = rlx * sinA + rly * cosA;
            paintCatTail(ctx, breed, wx, wy, shape.ctrlX, shape.ctrlY, shape.tipX, shape.tipY, { facing, thick: shape.thick ?? 1 });
          } else {
            if (angle) ctx.rotate(angle);
            paintCatTail(ctx, breed, relX * facing, relY, shape.ctrlX, shape.ctrlY, shape.tipX, shape.tipY, { facing, thick: shape.thick ?? 1 });
          }
          ctx.restore();
        }
        paintCatFrame(ctx, atlas, frameName, x, y, facing, angle);
        if (tailInFront) {
          ctx.save();
          ctx.translate(x, y);
          if (angle) ctx.rotate(angle);
          paintCatTail(ctx, breed, relX * facing, relY, shape.ctrlX, shape.ctrlY, shape.tipX, shape.tipY, { facing, thick: shape.thick ?? 1 });
          ctx.restore();
        }
      }
      if (layer === 'foreground' && particles.length > 0) {
        for (const p of particles) {
          const alpha = clamp(p.age / 0.18, 0, 1) * clamp((p.life - p.age) / 0.45, 0, 1);
          if (p.kind === 'heart') paintPixelHeart(ctx, p.x, p.y, alpha);
          else if (p.kind === 'z') paintSleepZ(ctx, p.x, p.y, alpha, breed.palette['2']);
          else if (p.kind === 'alert') paintAlertBang(ctx, p.x, p.y, alpha);
          else if (p.kind === 'bark') paintBarkChip(ctx, p.x, p.y, alpha, p.color);
        }
      }
    },
    hitTest(localX, localY) {
      if (state === 'sheltered') return false;
      const cy = (state === 'climbUp' || state === 'climbDown') ? y : y - 5.2;
      return Math.abs(localX - x) <= 8.2 && Math.abs(localY - cy) <= 7.0;
    },
    pet() {
      if (state === 'sheltered') return false;
      petMoodUntil = time + 2.0;
      spawnHeart(x + facing * 1.8, y - 11.2);
      if (Math.random() < 0.7) spawnHeart(x - facing * 2.2, y - 9.6);
      if (state === 'perch') {
        const bone = route && branches.get(route.perch.branch);
        if (bone) applyShake?.(bone, facing * 0.16);
        stateDuration = Math.max(stateDuration, stateTime + 5.0);
      } else if (state !== 'climbUp' && state !== 'climbDown' && state !== 'jumpDown' && state !== 'pounce' && state !== 'fleeStorm') {
        enter('pet', 1.7);
      }
      return true;
    },
    triggerAction(action) {
      if (state === 'sheltered' || state === 'fleeStorm') return false;
      if (action === 'pet') return this.pet();
      if (state === 'perch' || state === 'climbUp' || state === 'climbDown') {
        if (action === 'jumpDown') { startJumpDown(false); return true; }
        if (action === 'climb') return false;
        startJumpDown(false);
        return true;
      }
      if (state === 'jumpDown' || state === 'pounce') return false;
      if (action === 'scratch') { startGoScratch(); return true; }
      if (action === 'climb' && climbRoutes.length > 0) { pickStrollTarget(true); return true; }
      if (action === 'groom') { enter('groom', rand(5.5, 7.5)); return true; }
      if (action === 'nap') { enter('nap', rand(20, 35)); return true; }
      if (action === 'stretch') { enter('stretch', 2.4); return true; }
      if (action === 'stroll') { pickStrollTarget(false); return true; }
      if (action === 'chase') {
        const leaf = findChasableLeaf();
        if (leaf) { targetLeaf = leaf; enter('crouch', 0.32); return true; }
      }
      return false;
    },
  };
}
