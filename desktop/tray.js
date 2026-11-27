import { defaultWindowIcon, exit } from '@tauri-apps/api/app';
import { CheckMenuItem, Menu, MenuItem, Submenu } from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { CAT_TYPES, TREE_TYPES, WEATHER_PRESETS } from '../src/core/presets.js';

const labels = {
  en: {
    hide: 'Hide pet', show: 'Show pet', top: 'Always on top', clickThrough: 'Mouse click-through',
    size: 'Size', tree: 'Seasonal tree', cat: 'Cat', weather: 'Weather', reset: 'Reset position', exit: 'Quit',
  },
  zh: {
    hide: '隐藏宠物', show: '显示宠物', top: '始终置顶', clickThrough: '鼠标穿透',
    size: '大小', tree: '四季树', cat: '猫咪花色', weather: '天气', reset: '重置位置', exit: '退出',
  },
};

export async function createTray({ lang, preferences, sizes, run, setScene, show, hide, setTop, setClickThrough, reset, rememberPosition }) {
  const t = labels[lang];
  let visible = false;
  let clickThrough = false;

  async function choices(field, options) {
    const items = await Promise.all(options.map(async ([value, text]) => {
      const item = await CheckMenuItem.new({
        text,
        checked: value === preferences[field],
        action: () => run(async () => {
          try {
            await setScene(field, value);
          } finally {
            await Promise.all(items.map(([key, entry]) => entry.setChecked(key === preferences[field])));
          }
        }),
      });
      return [value, item];
    }));
    return Submenu.new({ text: t[field], items: items.map(([, item]) => item) });
  }

  const entries = catalog => Object.entries(catalog).map(([key, label]) => [key, label[lang]]);
  const [visibility, top, mouse, size, tree, cat, weather, position, quit, icon] = await Promise.all([
    MenuItem.new({ text: t.show, action: () => run(() => visible ? hide() : show()) }),
    CheckMenuItem.new({
      text: t.top,
      checked: preferences.alwaysOnTop,
      action: () => run(async () => {
        try {
          await setTop(!preferences.alwaysOnTop);
        } finally {
          await top.setChecked(preferences.alwaysOnTop);
        }
      }),
    }),
    CheckMenuItem.new({
      text: t.clickThrough,
      checked: false,
      action: () => run(async () => {
        try {
          await setClickThrough(!clickThrough);
          clickThrough = !clickThrough;
        } finally {
          await mouse.setChecked(clickThrough);
        }
      }),
    }),
    choices('size', sizes.map(value => [value, `${value}%`])),
    choices('tree', entries(TREE_TYPES)),
    choices('cat', entries(CAT_TYPES)),
    choices('weather', Object.entries(WEATHER_PRESETS).map(([key, { label }]) => [key, label[lang]])),
    MenuItem.new({ text: t.reset, action: () => run(reset) }),
    MenuItem.new({
      text: t.exit,
      action: () => run(async () => {
        try {
          await rememberPosition();
        } finally {
          await exit(0);
        }
      }),
    }),
    defaultWindowIcon(),
  ]);

  const menu = await Menu.new({ items: [visibility, top, mouse, size, tree, cat, weather, position, quit] });
  await TrayIcon.new({ id: 'canopy-cat', icon: icon ?? undefined, menu, tooltip: 'CanopyCat' });
  return async function updateVisibility(value) {
    visible = value;
    await visibility.setText(visible ? t.hide : t.show);
  };
}
