// 共通ユーティリティ
(() => {
  'use strict';
  if (window.AppUtils) return; // 多重読み込みガード

  // 数値アニメーション（一定時間: デフォルト 500ms）
  // 呼び出し例: animateValue(el, 12345); / animateValue(el, 12345, 500);
  // 旧シグネチャで { duration: 500 } / 数値 を渡した場合も継続サポート
  const animateValue = (el, targetValue, opts) => {
    if (!el) return;
    const target = Number(targetValue) || 0;
    let duration = 500;
    if (typeof opts === 'number') {
      duration = opts;
    } else if (opts && typeof opts === 'object' && opts.duration) {
      duration = opts.duration;
    }
    const startTime = performance.now();
    const tick = now => {
      const p = Math.min((now - startTime) / duration, 1);
      el.textContent = Math.round(target * p).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // API 呼び出し（GET JSON）
  const fetchJSON = async (url, opts = {}) => {
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(finalUrl, { cache: 'no-store', ...opts });
    if (!res.ok) throw res; // 呼び出し側で握りつぶすか任せる
    return res.json();
  };

  // 通貨フォーマット（常に USD $ に統一）
  const formatCurrency = (value, { sign = true } = {}) => {
    const num = Number(value) || 0;
    const abs = Math.abs(num).toLocaleString();
    return `${num < 0 && sign ? '-' : ''}$${abs}`;
  };

  // 日時フォーマット統一
  const formatDateTime = ts => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return ts;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // ボタン活性化ロジック（残高更新用）
  const updateBalanceButtons = () => {
    const [addBtn, subBtn] = ['.add-btn', '.subtract-btn'].map(sel => document.querySelector(sel));
    const amountInput = document.querySelector('#amount');
    const gameRadios = document.querySelectorAll('input[name="game-type"]');
    
    const hasUserId = window.currentUserId?.trim();
    const hasAmount = amountInput?.value && parseFloat(amountInput.value) > 0;
    const hasGame = Array.from(gameRadios).some(r => r.checked);
    const valid = hasUserId && hasAmount && hasGame;
    
    [addBtn, subBtn].forEach(btn => {
      if (!btn) return;
      Object.assign(btn, {
        disabled: !valid,
        style: `opacity: ${valid ? '1' : '0.5'}; cursor: ${valid ? 'pointer' : 'not-allowed'};`
      });
    });
  };

  // エラーハンドラ共通
  const handleApiError = (e, context = '') => {
    console.error('[API_ERROR]', context, e);
  };

  // ポーリング間隔集約
  const POLL_INTERVALS = Object.freeze({ ranking: 6000, history: 5000, stats: 7000 });

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
  const showInlineMessage = (containerSelector, message, type = 'info') => {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!container) return;
    const cls = { error: 'error-message', success: 'success-message' }[type] ?? 'info-message';
    container.innerHTML = `<div class="${cls}"><p>${message}</p></div>`;
  };
  const clearInlineMessage = containerSelector => {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (container) container.innerHTML = '';
  };

  // 汎用成功ポップアップ（HTML可）
  const showPopup = ({ html, timeout = 8000, role = 'alert', className = 'balance-popup success' }) => {
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
  };

  // 残高更新専用ポップアップ（従来マークアップ互換）
  const showBalanceUpdatePopup = ({ userId, amount, type, pendingId = 'updated-balance' }) => {
    const sign = type === 'subtract' ? '-' : '+';
    const formatted = Number(amount).toLocaleString();
    return showPopup({
      html: `<strong>残高更新成功</strong><p>${userId} の新しい残高：$<span id="${pendingId}">…</span> <span class="balance-diff ${sign === '+' ? 'positive' : 'negative'}">(${sign}$${formatted})</span></p>`
    });
  };

  window.AppUtils = {
    animateValue, fetchJSON,
    formatCurrency, formatDateTime,
    updateBalanceButtons, handleApiError,
    POLL_INTERVALS, selectors,
    showInlineMessage, clearInlineMessage, showPopup, showBalanceUpdatePopup
  };
})();
