// 共通ユーティリティ（UI/機能変更なしの内部共通化）
(function () {
  'use strict';
  if (window.AppUtils) return; // 多重読み込みガード

  // 数値アニメーション（一定時間: デフォルト 500ms + 簡易 easing 対応）
  // options: { duration:number, easing:'linear'|'easeOutCubic'|カスタム関数(p)->p }
  function animateValue(el, targetValue, options) {
    if (!el) return;
    const target = Number(targetValue) || 0;
    const startVal = 0;
    let duration = 500;
    let easingFn = null;
    if (typeof options === 'number') {
      duration = Math.max(200, options * (1000 / 60));
    } else if (options && typeof options === 'object') {
      if (options.duration) duration = options.duration;
      if (options.easing) easingFn = options.easing;
    }
    if (typeof easingFn === 'string') {
      if (easingFn === 'easeOutCubic') easingFn = p => 1 - Math.pow(1 - p, 3);
      else easingFn = null; // 不明 → linear
    }
    if (typeof easingFn !== 'function') easingFn = p => p; // linear
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const p = easingFn(t);
      const current = startVal + (target - startVal) * p;
      el.textContent = Math.floor(current).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function fetchJSON(url, opts) {
    const finalUrl = url.includes('?') ? url + '&_=' + Date.now() : url + '?_=' + Date.now();
    const res = await fetch(finalUrl, Object.assign({ cache: 'no-store' }, opts || {}));
    if (!res.ok) throw res; // 呼び出し側で握りつぶすか任せる
    return res.json();
  }

  // 通貨フォーマット（USD / JPY）
  function formatCurrency(value, { style = 'usd', sign = true } = {}) {
    const num = Number(value) || 0;
    const abs = Math.abs(num).toLocaleString();
    const prefix = style === 'jpy' ? '￥' : '$';
    const signStr = num < 0 && sign ? '-' : '';
    return `${signStr}${prefix}${abs}`;
  }

  // 日時フォーマット統一
  function formatDateTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return ts;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // ボタン活性化ロジック（残高更新用）
  function updateBalanceButtons() {
    const addBtn = document.querySelector('.add-btn');
    const subBtn = document.querySelector('.subtract-btn');
    const amountInput = document.querySelector('#amount');
    const gameRadios = document.querySelectorAll('input[name="game-type"]');
    const hasUserId = window.currentUserId && window.currentUserId.trim() !== '';
    const hasAmount = amountInput && amountInput.value && parseFloat(amountInput.value) > 0;
    const hasGame = Array.from(gameRadios).some(r => r.checked);
    const valid = hasUserId && hasAmount && hasGame;
    [addBtn, subBtn].forEach(btn => { if (!btn) return; btn.disabled = !valid; btn.style.opacity = valid ? '1' : '0.5'; btn.style.cursor = valid ? 'pointer' : 'not-allowed'; });
  }

  // エラーハンドラ共通
  function handleApiError(e, context = '') {
    console.error('[API_ERROR]', context, e);
  }

  // ポーリング間隔集約
  const POLL_INTERVALS = Object.freeze({ ranking: 6000, history: 5000, stats: 7000 });

  // ランキングTop3配置（2位,1位,3位）
  function arrangeTop3(arr) {
    if (!Array.isArray(arr)) return [];
    const top3 = arr.slice(0, 3);
    if (top3.length === 1) return [top3[0]];
    if (top3.length === 2) return [top3[1], top3[0]];
    if (top3.length === 3) return [top3[1], top3[0], top3[2]];
    return top3;
  }

  // セレクタ集約
  const selectors = Object.freeze({
    updateMessageArea: '#update-message-area',
    messageArea: '#message-area',
    rankingTop: '.ranking-top-contents',
    rankingBottom: '.ranking-bottom-contents',
    historyTableBody: '.history table tbody',
    currentBalance: '#current-balance',
    updatedBalance: '#updated-balance'
  });

  // インラインメッセージ表示（既存クラス名互換）
  function showInlineMessage(containerSelector, message, type = 'info') {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!container) return;
    const cls = type === 'error' ? 'error-message' : (type === 'success' ? 'success-message' : 'info-message');
    container.innerHTML = `<div class="${cls}"><p>${message}</p></div>`;
  }
  function clearInlineMessage(containerSelector) {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (container) container.innerHTML = '';
  }

  // 汎用成功ポップアップ（HTML可）
  function showPopup({ html, timeout = 8000, role = 'alert', className = 'balance-popup success' }) {
    // 既存を1つだけに保つ
    const old = document.querySelector('.balance-popup');
    if (old) old.remove();
    const div = document.createElement('div');
    div.className = className;
    div.setAttribute('role', role);
    div.innerHTML = `
      <button class="close-popup" aria-label="閉じる">&times;</button>
      <div class="popup-content">${html}</div>`;
    div.querySelector('.close-popup')?.addEventListener('click', () => div.remove());
    setTimeout(() => { if (div.parentNode) div.remove(); }, timeout);
    document.body.appendChild(div);
    return div;
  }

  // 残高更新専用ポップアップ（従来マークアップ互換）
  function showBalanceUpdatePopup({ userId, amount, type, pendingId = 'updated-balance' }) {
    const sign = type === 'subtract' ? '-' : '+';
    const formatted = Number(amount).toLocaleString();
    return showPopup({
      html: `<strong>残高更新成功</strong><p>${userId} の新しい残高：$<span id="${pendingId}">…</span> <span class="balance-diff ${sign === '+' ? 'positive' : 'negative'}">(${sign}$${formatted})</span></p>`
    });
  }

  window.AppUtils = {
    animateValue, fetchJSON,
    formatCurrency, formatDateTime,
    updateBalanceButtons, handleApiError,
    POLL_INTERVALS, arrangeTop3, selectors,
    showInlineMessage, clearInlineMessage, showPopup, showBalanceUpdatePopup
  };
})();
