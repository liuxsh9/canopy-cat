import { AUTUMN_MAPLE } from './autumnMapleArt.js';
import { CAT_BREEDS } from './seasonalCatArt.js';
import { SPRING_CHERRY } from './springCherryArt.js';
import { SUMMER_SILK } from './summerSilkArt.js';
import { WINTER_PLUM } from './winterPlumArt.js';

export const TREE_ARTWORKS = {
  cherry: SPRING_CHERRY,
  silk: SUMMER_SILK,
  maple: AUTUMN_MAPLE,
  plum: WINTER_PLUM,
};

export const TREE_TYPES = {
  auto: { en: 'Auto (by season)', zh: '随季节自动' },
  cherry: { en: 'Spring cherry', zh: '春日樱花' },
  silk: { en: 'Summer silk tree', zh: '夏日合欢' },
  maple: { en: 'Autumn maple', zh: '秋日枫树' },
  plum: { en: 'Winter plum', zh: '冬日梅花' },
};

export const TREE_STYLES = {
  cherry: {
    artwork: SPRING_CHERRY,
    settings: { en: 'Spring cherry settings', zh: '春日樱花设置' },
    foliageSection: { en: 'Blossoms', zh: '樱花细节' },
    shedding: { en: 'Petal shedding speed', zh: '落瓣速度' },
    growth: { en: 'Blossom growth speed', zh: '开花速度' },
    retention: { en: 'Minimum blossoms', zh: '最低花量' },
    regrow: { en: 'Regrow blossoms', zh: '重新开花' },
  },
  silk: {
    artwork: SUMMER_SILK,
    settings: { en: 'Summer silk tree settings', zh: '夏日合欢设置' },
    foliageSection: { en: 'Blooms', zh: '绒花细节' },
    shedding: { en: 'Silk drift rate', zh: '落絮速度' },
    growth: { en: 'Bloom growth speed', zh: '绒花生长速度' },
    retention: { en: 'Minimum blooms', zh: '最低绒花量' },
    regrow: { en: 'Regrow blooms', zh: '恢复绒花' },
  },
  maple: {
    artwork: AUTUMN_MAPLE,
    settings: { en: 'Autumn maple settings', zh: '秋日枫树设置' },
    foliageSection: { en: 'Foliage', zh: '枫叶细节' },
    shedding: { en: 'Leaf shedding speed', zh: '落叶速度' },
    growth: { en: 'Leaf growth speed', zh: '叶片生长速度' },
    retention: { en: 'Minimum foliage', zh: '最低叶量' },
    regrow: { en: 'Regrow leaves', zh: '让枫叶长回来' },
  },
  plum: {
    artwork: WINTER_PLUM,
    settings: { en: 'Winter plum settings', zh: '冬日梅花设置' },
    foliageSection: { en: 'Snow', zh: '飞雪与积雪' },
    shedding: { en: 'Snowfall density', zh: '飞雪量' },
    growth: { en: 'Snow cover recovery', zh: '积雪回补速度' },
    retention: { en: 'Minimum snow cover', zh: '最低积雪量' },
    regrow: { en: 'Restore branch snow', zh: '恢复枝头积雪' },
  },
};

export const CAT_TYPES = {
  auto: { en: 'Auto', zh: '随树推荐' },
  none: { en: 'Off', zh: '关闭' },
  ...Object.fromEntries(Object.entries(CAT_BREEDS).map(([key, { label }]) => [key, label])),
};

export const WEATHER_PRESETS = {
  calm: { label: { en: 'Calm', zh: '平静' }, speed: 0, gusts: 'off' },
  breezy: { label: { en: 'Breezy', zh: '微风' }, speed: 34, gusts: 'light' },
  storm: { label: { en: 'Storm', zh: '风暴' }, speed: 78, gusts: 'strong' },
};

export const WIND_DIRECTIONS = {
  left: { en: 'To the left', zh: '向左' },
  right: { en: 'To the right', zh: '向右' },
};

export const GUST_OPTIONS = {
  off: { en: 'Off', zh: '关闭' },
  light: { en: 'Light gusts', zh: '轻阵风' },
  strong: { en: 'Strong gusts', zh: '强阵风' },
};

export const RANGES = {
  size: { min: 50, max: 200, initial: 150, step: 5 },
  growthSpeed: { min: 0, max: 200, initial: 100, step: 5 },
  sheddingSpeed: { min: 0, max: 300, initial: 100, step: 5 },
  leafRetention: { min: 0, max: 100, initial: 50, step: 1 },
  speed: { min: 0, max: 100, initial: 34, step: 1 },
};

/**
 * Resolve the seasonal tree for a calendar date (Northern Hemisphere default):
 * Mar–May -> cherry, Jun–Aug -> silk, Sep–Nov -> maple, Dec–Feb -> plum.
 */
export function resolveAutoTree(date = new Date()) {
  const month = date.getMonth(); // 0..11
  if (month >= 2 && month <= 4) return 'cherry';
  if (month >= 5 && month <= 7) return 'silk';
  if (month >= 8 && month <= 10) return 'maple';
  return 'plum';
}

export function resolveTreeKey(tree = 'auto', date = new Date()) {
  if (tree === 'auto' || !Object.hasOwn(TREE_STYLES, tree)) {
    return resolveAutoTree(date);
  }
  return tree;
}

export function normalizeOptions(input = {}) {
  const weather = Object.hasOwn(WEATHER_PRESETS, input.weather) ? input.weather : 'breezy';
  const preset = WEATHER_PRESETS[weather];
  const clampRange = (val, { min, max, initial, step }) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return initial;
    return Math.max(min, Math.min(max, Math.round(n / step) * step));
  };
  return {
    tree: Object.hasOwn(TREE_TYPES, input.tree) ? input.tree : 'auto',
    cat: Object.hasOwn(CAT_TYPES, input.cat) ? input.cat : 'auto',
    weather,
    direction: input.direction === 'left' ? 'left' : 'right',
    speed: Number.isFinite(Number(input.speed))
      ? Math.round(Math.max(0, Math.min(100, Number(input.speed))))
      : preset.speed,
    gusts: Object.hasOwn(GUST_OPTIONS, input.gusts) ? input.gusts : preset.gusts,
    size: clampRange(input.size, RANGES.size),
    growthSpeed: clampRange(input.growthSpeed, RANGES.growthSpeed),
    sheddingSpeed: clampRange(input.sheddingSpeed, RANGES.sheddingSpeed),
    leafRetention: clampRange(input.leafRetention, RANGES.leafRetention),
    controls: input.controls !== false,
    lang: input.lang === 'zh' ? 'zh' : 'en',
    theme: input.theme === 'dark' || input.theme === 'light' ? input.theme : 'auto',
    position: input.position === 'inline' || input.position === 'bottom-left' ? input.position : 'bottom-right',
    persist: Boolean(input.persist),
  };
}
