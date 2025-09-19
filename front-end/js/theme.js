// テーマ管理システム（最適化版）
(() => {
  'use strict';
  if (window.ThemeManager) return; // 多重初期化ガード

  const THEME_KEY = 'theme';
  const THEMES = ['light', 'dark'];
  let linkEl = null;
  let initialized = false;

  const normalizeTheme = t => {
    return THEMES.includes(t) ? t : 'light';
  };

  const getPreferredTheme = () => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return normalizeTheme(stored);
    // 保存なし → システム設定参照
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  };

  const ensureLink = theme => {
    if (linkEl && !document.head.contains(linkEl)) linkEl = null; // 手動削除対策
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.id = 'theme-css';
      // 他CSS後ろに配置
      document.head.appendChild(linkEl);
    }
    const href = `../css/${theme}-theme.css`;
    if (linkEl.getAttribute('href') !== href) {
      linkEl.setAttribute('href', href);
    }
    linkEl.dataset.theme = theme;
  };

  const applyThemeClass = theme => {
    // body がまだ存在しない場合は DOMContentLoaded 後に再実行
    const target = document.body;
    if (!target) {
      document.addEventListener('DOMContentLoaded', () => applyThemeClass(theme), { once: true });
      return;
    }
    if (theme === 'dark') target.classList.add('dark-mode'); else target.classList.remove('dark-mode');
  };

  const loadTheme = theme => {
    const t = normalizeTheme(theme);
    ensureLink(t);
    applyThemeClass(t);
    return t;
  };

  const setTheme = theme => {
    const t = loadTheme(theme);
    localStorage.setItem(THEME_KEY, t);
    return t;
  };

  const initOnce = () => {
    if (initialized) return;
    initialized = true;
    const t = getPreferredTheme();
    loadTheme(t); // 早期適用（再読み込みなし）
    // 反対テーマは即時適用されないため preload ではなく prefetch を使用し
    // "preloaded but not used" 警告を回避しつつキャッシュウォームのみ行う
    const other = t === 'dark' ? 'light' : 'dark';
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = `../css/${other}-theme.css`;
    prefetch.as = 'style';
    prefetch.crossOrigin = 'anonymous';
    prefetch.dataset.prefetch = 'theme';
    document.head.appendChild(prefetch);
  };

  const initSettingsPage = () => {
    const inputs = document.querySelectorAll('input[name="theme"]');
    if (!inputs.length) return;
    const current = getCurrentTheme();
    const el = document.querySelector(`input[name="theme"][value="${current}"]`);
    if (el) el.checked = true;
    inputs.forEach(r => r.addEventListener('change', function () {
      if (this.checked) setTheme(this.value);
    }));
  };

  const getCurrentTheme = () => {
    return normalizeTheme((linkEl && linkEl.dataset.theme) || localStorage.getItem(THEME_KEY) || getPreferredTheme());
  };

  // 初期化実行
  initOnce();
  document.addEventListener('DOMContentLoaded', initSettingsPage);

  // 公開 API
  window.ThemeManager = {
    loadThemeCSS: loadTheme,      // 互換: 旧関数名
    applyTheme: applyThemeClass,  // 互換
    saveTheme: setTheme,          // 互換
    setTheme,                     // 新推奨
    getCurrentTheme
  };
})();
