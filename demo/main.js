import {
  CAT_BREEDS,
  mountCanopyCat,
  paintCatPreview,
  resolveAutoTree,
  TREE_TYPES,
  WEATHER_PRESETS,
} from '../src/index.js';

const state = {
  lang: navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en',
  theme: 'light',
  tree: 'auto',
  cat: 'auto',
  weather: 'breezy',
  size: 170,
  tab: 'html',
};

const I18N = {
  en: {
    subtitle: 'A tiny pixel seasonal tree & interactive cat companion for any website.',
    hintLeft: 'Drag branches · Click the cat to pet · Click tree for settings',
    secSeason: 'Seasonal Tree',
    secCat: 'Cat Companion (8 Breeds)',
    secWeather: 'Weather & Size',
    sizeLabel: 'Tree size',
    embedTitle: 'Embed on your website in 10 seconds',
    copy: 'Copy',
    copied: 'Copied!',
    creditText: 'Seasonal tree motion inspired by',
    autoLabel: 'Auto',
    offLabel: 'Off',
    actions: [
      ['pet', '♥ Pet cat'],
      ['poke', '🌿 Shake branch'],
      ['scratch', '🪵 Scratch trunk'],
      ['climb', '🌳 Climb tree'],
      ['groom', '🐾 Groom'],
      ['nap', '💤 Nap'],
      ['regrow', '✨ Regrow'],
    ],
  },
  zh: {
    subtitle: '零依赖、轻量级的四季像素树与互动小猫网页伴侣，一行代码即可嵌入任意网站。',
    hintLeft: '拖动树枝晃动落叶 · 点击小猫抚摸 · 点击树打开详细配置',
    secSeason: '四季树木',
    secCat: '小猫伴侣（8 款花色）',
    secWeather: '天气与缩放',
    sizeLabel: '树木大小',
    embedTitle: '10 秒嵌入你的博客或网站',
    copy: '复制代码',
    copied: '已复制!',
    creditText: '季节树动画灵感来自',
    autoLabel: '随树推荐',
    offLabel: '关闭',
    actions: [
      ['pet', '♥ 摸摸猫'],
      ['poke', '🌿 晃树枝'],
      ['scratch', '🪵 抓树干'],
      ['climb', '🌳 爬树'],
      ['groom', '🐾 舔手洗脸'],
      ['nap', '💤 睡觉'],
      ['regrow', '✨ 恢复枝叶'],
    ],
  },
};

const instance = mountCanopyCat('#stageMount', {
  tree: state.tree,
  cat: state.cat,
  weather: state.weather,
  size: state.size,
  position: 'inline',
  lang: state.lang,
  theme: state.theme,
  controls: true,
});

function buildEmbedCode() {
  const attrs = [];
  if (state.tree !== 'auto') attrs.push(`tree="${state.tree}"`);
  else attrs.push('tree="auto"');
  if (state.cat !== 'auto') attrs.push(`cat="${state.cat}"`);
  if (state.weather !== 'breezy') attrs.push(`weather="${state.weather}"`);
  if (state.size !== 150) attrs.push(`size="${state.size}"`);
  if (state.lang === 'zh') attrs.push('lang="zh"');

  if (state.tab === 'html') {
    return `<script type="module" src="https://unpkg.com/canopy-cat/dist/canopy-cat.js"></script>\n<canopy-cat ${attrs.join(' ')}></canopy-cat>`;
  }
  const objLines = [
    `  tree: '${state.tree}',`,
    `  cat: '${state.cat}',`,
    `  weather: '${state.weather}',`,
    ...(state.size !== 150 ? [`  size: ${state.size},`] : []),
    ...(state.lang === 'zh' ? [`  lang: 'zh',`] : []),
  ].join('\n');
  if (state.tab === 'js') {
    return `import { mountCanopyCat } from 'canopy-cat';\n\nconst companion = mountCanopyCat(document.body, {\n${objLines}\n});`;
  }
  const jsxProps = [
    `tree="${state.tree}"`,
    `cat="${state.cat}"`,
    ...(state.weather !== 'breezy' ? [`weather="${state.weather}"`] : []),
    ...(state.size !== 150 ? [`size={${state.size}}`] : []),
    ...(state.lang === 'zh' ? ['lang="zh"'] : []),
  ].join(' ');
  return `import { CanopyCat } from 'canopy-cat/react';\n\nexport function App() {\n  return <CanopyCat ${jsxProps} />;\n}`;
}

function renderUI() {
  const text = I18N[state.lang];
  document.documentElement.dataset.theme = state.theme;
  document.getElementById('subtitle').textContent = text.subtitle;
  document.getElementById('hintLeft').textContent = text.hintLeft;
  document.getElementById('secSeason').textContent = text.secSeason;
  document.getElementById('secCat').textContent = text.secCat;
  document.getElementById('secWeather').textContent = text.secWeather;
  document.getElementById('sizeLabel').textContent = text.sizeLabel;
  document.getElementById('sizeValue').textContent = `${state.size}%`;
  document.getElementById('embedTitle').textContent = text.embedTitle;
  document.getElementById('creditText').textContent = text.creditText;
  document.getElementById('langBtn').textContent = state.lang === 'en' ? '中文' : 'English';
  document.getElementById('themeBtn').textContent = state.theme === 'light' ? '🌙 Dark' : '☀️ Light';

  const autoSeason = resolveAutoTree();
  const statusEl = document.getElementById('statusText');
  const resolvedTreeKey = state.tree === 'auto' ? autoSeason : state.tree;
  statusEl.textContent = `${TREE_TYPES[resolvedTreeKey][state.lang]} · ${WEATHER_PRESETS[state.weather].label[state.lang]}`;

  // Seasons
  const seasonGrid = document.getElementById('seasonGrid');
  seasonGrid.innerHTML = '';
  const seasonMeta = [
    ['auto', '🗓️', state.lang === 'zh' ? '自动' : 'Auto', TREE_TYPES[autoSeason][state.lang]],
    ['cherry', '🌸', state.lang === 'zh' ? '春樱' : 'Cherry', state.lang === 'zh' ? '3–5月' : 'Spring'],
    ['silk', '🌺', state.lang === 'zh' ? '夏合欢' : 'Silk', state.lang === 'zh' ? '6–8月' : 'Summer'],
    ['maple', '🍁', state.lang === 'zh' ? '秋枫' : 'Maple', state.lang === 'zh' ? '9–11月' : 'Autumn'],
    ['plum', '❄️', state.lang === 'zh' ? '冬梅' : 'Plum', state.lang === 'zh' ? '12–2月' : 'Winter'],
  ];
  for (const [key, icon, name, sub] of seasonMeta) {
    const btn = document.createElement('button');
    btn.className = `season-btn${state.tree === key ? ' active' : ''}`;
    btn.innerHTML = `<span>${icon} ${name}</span><small>${sub}</small>`;
    btn.onclick = () => {
      state.tree = key;
      instance.setOptions({ tree: key });
      renderUI();
    };
    seasonGrid.appendChild(btn);
  }

  // Cats
  const catGrid = document.getElementById('catGrid');
  catGrid.innerHTML = '';
  const specialCats = [
    ['auto', `✨ ${text.autoLabel}`],
    ['none', `🚫 ${text.offLabel}`],
  ];
  for (const [key, label] of specialCats) {
    const btn = document.createElement('button');
    btn.className = `cat-btn${state.cat === key ? ' active' : ''}`;
    btn.textContent = label;
    btn.onclick = () => {
      state.cat = key;
      instance.setOptions({ cat: key });
      renderUI();
    };
    catGrid.appendChild(btn);
  }
  for (const [key, breed] of Object.entries(CAT_BREEDS)) {
    const btn = document.createElement('button');
    btn.className = `cat-btn${state.cat === key ? ' active' : ''}`;
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 52;
    paintCatPreview(c, key);
    const span = document.createElement('span');
    span.textContent = breed.label[state.lang];
    btn.append(c, span);
    btn.onclick = () => {
      state.cat = key;
      instance.setOptions({ cat: key });
      renderUI();
    };
    catGrid.appendChild(btn);
  }

  // Weather
  const weatherRow = document.getElementById('weatherRow');
  weatherRow.innerHTML = '';
  for (const [key, preset] of Object.entries(WEATHER_PRESETS)) {
    const btn = document.createElement('button');
    btn.className = `btn${state.weather === key ? ' active' : ''}`;
    btn.style.justifyContent = 'center';
    const icon = key === 'calm' ? '☀️' : key === 'breezy' ? '🍃' : '⛈️';
    btn.textContent = `${icon} ${preset.label[state.lang]}`;
    btn.onclick = () => {
      state.weather = key;
      instance.setOptions({ weather: key, speed: preset.speed, gusts: preset.gusts });
      renderUI();
    };
    weatherRow.appendChild(btn);
  }

  // Action chips
  const actionBar = document.getElementById('actionBar');
  actionBar.innerHTML = '';
  for (const [action, label] of text.actions) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = label;
    chip.onclick = () => {
      if (action === 'poke') instance.poke();
      else if (action === 'regrow') instance.regrow();
      else instance.triggerAction(action);
    };
    actionBar.appendChild(chip);
  }

  // Embed code
  document.getElementById('embedCode').textContent = buildEmbedCode();
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  });
}

document.getElementById('langBtn').onclick = () => {
  state.lang = state.lang === 'en' ? 'zh' : 'en';
  instance.setOptions({ lang: state.lang });
  renderUI();
};
document.getElementById('themeBtn').onclick = () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  instance.setOptions({ theme: state.theme });
  renderUI();
};
document.getElementById('sizeSlider').oninput = e => {
  state.size = e.target.valueAsNumber;
  instance.setOptions({ size: state.size });
  renderUI();
};
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.onclick = () => {
    state.tab = btn.dataset.tab;
    renderUI();
  };
});
document.getElementById('copyBtn').onclick = async () => {
  const btn = document.getElementById('copyBtn');
  try {
    await navigator.clipboard.writeText(buildEmbedCode());
    btn.textContent = I18N[state.lang].copied;
    setTimeout(() => { btn.textContent = I18N[state.lang].copy; }, 1400);
  } catch {
    // Fallback ignored
  }
};

renderUI();
