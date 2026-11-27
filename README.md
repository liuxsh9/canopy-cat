<div align="center">

<img src="./docs/assets/banner.png" alt="CanopyCat — Pixel Seasonal Trees & Interactive Cat Companions" width="880" />

<p>
  <strong>English</strong> · <a href="./README.zh-CN.md">简体中文</a>
</p>

<p>
  <a href="https://liuxsh9.github.io/canopy-cat/"><img src="https://img.shields.io/badge/Live_Demo-Play_Now-2563eb?style=for-the-badge" alt="Live Demo" /></a>
  <a href="https://github.com/liuxsh9/canopy-cat/releases"><img src="https://img.shields.io/badge/release-v0.2.0-059669?style=for-the-badge" alt="Release v0.2.0" /></a>
  <img src="https://img.shields.io/badge/dependencies-0-10b981?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/gzip-~35_kB-f59e0b?style=for-the-badge" alt="Bundle Size" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-64748b?style=for-the-badge" alt="MIT License" /></a>
</p>

<p>
  A tiny, zero-dependency pixel seasonal tree &amp; interactive cat companion that lives quietly in the corner of any website.<br />
  Drop one <code>&lt;canopy-cat&gt;</code> tag into your blog, docs site, portfolio, or web app.
</p>

<img src="./docs/assets/demo.gif" alt="CanopyCat Interactive Demo" width="560" />

<br />
<sub><em>Click the cat to pet · Drag branches to shake leaves · Click the tree to customize seasons, breeds &amp; weather</em></sub>

</div>

---

## Highlights

- **Zero runtime dependencies** — pure HTML5 Canvas & procedural pixel art (~35 kB gzipped).
- **4 hand-crafted seasonal trees** — switch freely between Spring Cherry, Summer Silk, Autumn Maple, and Winter Plum, each with bespoke foliage, petals, blooms, or snowfall.
- **9 hand-crafted pixel cat breeds** — 26 animation frames (`30×26` px), freely combinable with any tree, plus `cat="auto"` for high-contrast seasonal pairing.
- **Quietly alive, never distracting** — tuned for always-on websites (~88% calm resting/napping/loafing, cooldown-gated actions, paused automatically when off-screen or when `prefers-reduced-motion` is enabled).
- **Delightful micro-interactions**:
  - **Pet the cat** — click the cat for floating pixel hearts (`♥`) and happy purr frames.
  - **Grab & drag branches** — spring-physics branch swaying with cascading leaves; wakes a sleeping cat (`!`) or entices an awake cat to climb toward the branch.
  - **Storm shelter** — switch to Storm weather and watch the cat stroll off-screen to shelter, then wander back once the wind calms down.
  - **Everyday cat habits** — 4-frame paw-lick & face-wipe grooming, trunk scratching with flying bark chips & trunk shiver, chasing falling leaves, and three-tier paw-rustle leaf physics.
- **Works everywhere** — Shadow DOM `<canopy-cat>` Web Component (zero CSS leakage), Vanilla JS/TS API, and optional React wrapper (`canopy-cat/react`).

---

## Four Seasonal Trees

<div align="center">
  <img src="./docs/assets/seasons.png" alt="Four Seasonal Trees" width="880" />
</div>

| Key | Tree | Auto-Paired Cat | Signature Detail |
| --- | --- | --- | --- |
| `cherry` | Spring Cherry | Calico | Drifting pink cherry petals |
| `silk` | Summer Silk Tree | Tuxedo | Floating silky pink-white blooms |
| `maple` | Autumn Maple *(default)* | Russian Blue-White | Multi-tone crimson & gold falling leaves |
| `plum` | Winter Plum | Ginger Tabby | Snowfall & layered branch snow under perched cats |

---

## Nine Cat Breeds

<div align="center">
  <img src="./docs/assets/breeds.png" alt="Nine Cat Breeds" width="880" />
</div>

Use `cat="auto"` (default) to pair a complementary breed with each tree, `cat="none"` to show only the tree, or pick any breed directly:
`russian-blue` · `calico` · `tuxedo` · `ginger` · `silver-tabby` · `ragdoll` · `seal-ragdoll` · `american-curl` · `orange-rex`.

---

## Windows Desktop Pet

Download and run `CanopyCat-windows-x64.exe` from [GitHub Releases](https://github.com/liuxsh9/canopy-cat/releases). The portable app uses WebView2, which ships with Windows 11 and can be installed on Windows 10. [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)

Drag the base of the tree to move the pet, pull a branch to shake it, and click the cat to pet it. The notification-area menu controls visibility, size, always-on-top, and position reset. It also lets you change the tree, weather, and cat. The desktop starts with Seal Bicolor Ragdoll (`seal-ragdoll`). Enable **Mouse click-through** to pass mouse clicks through the whole pet window, and use the tray menu to restore interaction.

To build on Windows x64, install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), run `npm ci`, then run `npm run build:desktop`. The executable is at `desktop/src-tauri/target/x86_64-pc-windows-msvc/release/canopy-cat.exe`. Use `npm run dev:desktop` for development.

---

## Quick Start

### 1. HTML / Web Component (One Line — Blogs, Docs, Static Sites)

```html
<script type="module" src="https://liuxsh9.github.io/canopy-cat/canopy-cat.js"></script>
<canopy-cat tree="maple" cat="auto" weather="breezy"></canopy-cat>
```

### 2. Vanilla JS / TypeScript (Vue, Svelte, Astro, VitePress, etc.)

```bash
npm install https://github.com/liuxsh9/canopy-cat/releases/latest/download/canopy-cat.tgz
```

```js
import { mountCanopyCat } from 'canopy-cat';

const companion = mountCanopyCat(document.body, {
  tree: 'maple',     // 'cherry' | 'silk' | 'maple' | 'plum'
  cat: 'auto',       // 'auto' | 'none' | breed key
  weather: 'breezy', // 'calm' | 'breezy' | 'storm'
  position: 'bottom-right',
  persist: true,     // remember visitor's customizations in localStorage
});

// Optional programmatic triggers:
companion.triggerAction('pet');     // 'pet' | 'scratch' | 'climb' | 'groom' | 'nap' | 'stretch' | 'stroll'
companion.poke();                   // shake a branch
companion.regrow();                 // regrow fallen foliage
```

### 3. React

```jsx
import { CanopyCat } from 'canopy-cat/react';

export function App() {
  return <CanopyCat tree="maple" cat="auto" weather="breezy" persist />;
}
```

<details>
<summary><strong>Options &amp; Attributes</strong></summary>

| JS Option | HTML Attribute | Default | Values |
| --- | --- | --- | --- |
| `tree` | `tree` | `'maple'` | `'cherry'`, `'silk'`, `'maple'`, `'plum'` |
| `cat` | `cat` | `'auto'` | `'auto'`, `'none'`, `'russian-blue'`, `'calico'`, `'tuxedo'`, `'ginger'`, `'silver-tabby'`, `'ragdoll'`, `'seal-ragdoll'`, `'american-curl'`, `'orange-rex'` |
| `weather` | `weather` | `'breezy'` | `'calm'`, `'breezy'`, `'storm'` |
| `direction` | `wind-direction` | `'right'` | `'left'`, `'right'` |
| `speed` | `wind-speed` | `34` | `0` – `100` |
| `gusts` | `gusts` | `'light'` | `'off'`, `'light'`, `'strong'` |
| `size` | `size` | `150` | `50` – `200` (percentage scale) |
| `growthSpeed` | `growth-speed` | `100` | `0` – `200` |
| `sheddingSpeed` | `shedding-speed` | `100` | `0` – `300` |
| `leafRetention` | `leaf-retention` | `50` | `0` – `100` |
| `controls` | `controls` | `true` | `true` / `false` (click-to-open settings popover) |
| `position` | `position` | `'bottom-right'` | `'bottom-right'`, `'bottom-left'`, `'inline'` |
| `theme` | `theme` | `'auto'` | `'auto'`, `'light'`, `'dark'` |
| `lang` | `lang` | `'en'` | `'en'`, `'zh'` |
| `persist` | `persist` | `false` | `true` / `false` (save user tweaks in `localStorage`) |

</details>

---

## Development

```bash
git clone https://github.com/liuxsh9/canopy-cat.git
cd canopy-cat
npm install
npm run dev     # start interactive playground locally
npm run build   # build dist/ library & dist-demo/ playground
```

---

## Inspiration & Credits

- Seasonal tree motion & spring-branch aesthetics were inspired by [Pixel Play from FeralUI](https://feralui.dev/pixel-play).
- The author's Seal Bicolor Ragdoll inspired the cat in the promotional visuals and the `seal-ragdoll` palette.

## License

[MIT](./LICENSE) © 2026 [liuxsh9](https://github.com/liuxsh9)
