// 取引履歴自動更新スクリプト
// /api/history を一定間隔で取得し、テーブル tbody を最新状態に更新。
// サーバ側: server.js の /api/history が history.json をそのまま返す仕様。
// history.json 要素例: { timestamp, id, games, type: 'add'|'subtract'|'generate' 等, amount, balance, dealer }

(() => {
  'use strict';

  // ===== 設定 =====
  const API_URL = '/api/history';
  const POLL_INTERVAL_MS = window.AppUtils?.POLL_INTERVALS?.history ?? 5000; // 5秒ごと
  const TABLE_BODY_SELECTOR = window.AppUtils?.selectors?.historyTableBody ?? '.history table tbody';
  const LOADING_CLASS = 'is-loading';

  let timerId = null;
  let lastHash = null; // 内容変化判定用ハッシュ
  let fetching = false;

  const start = () => {
    if (timerId) return;
    fetchAndRender();
    timerId = setInterval(fetchAndRender, POLL_INTERVAL_MS);
  };

  const stop = () => {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;
  };

  const fetchAndRender = async () => {
    if (fetching) return; // 多重実行防止
    fetching = true;

    const tbody = document.querySelector(TABLE_BODY_SELECTOR);
    if (!tbody) {
      console.warn('[historyUpdater] tbody が見つかりません:', TABLE_BODY_SELECTOR);
      fetching = false;
      return;
    }
    tbody.classList.add(LOADING_CLASS);

    try {
      const data = window.AppUtils ? await window.AppUtils.fetchJSON(API_URL) : await (await fetch(API_URL, { cache: 'no-cache' })).json();

      if (!Array.isArray(data)) { console.warn('[historyUpdater] 配列でないレスポンス'); return; }

      const jsonStr = JSON.stringify(data);
      const h = simpleHash(jsonStr);

      if (h === lastHash) return;

      lastHash = h;
      data.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      let limited = data;
      const limitAttr = tbody.getAttribute('data-limit');

      if (limitAttr) {
        const limit = parseInt(limitAttr, 10);
        if (!isNaN(limit) && limit > 0) limited = data.slice(0, limit);
      }
      const frag = document.createDocumentFragment();

      for (const item of limited) frag.appendChild(buildRow(item));

      tbody.replaceChildren(frag);
    } catch (err) {
      if (window.AppUtils && window.AppUtils.handleApiError) window.AppUtils.handleApiError(err, 'history'); else console.error('[historyUpdater] フェッチエラー', err);
    } finally {
      tbody.classList.remove(LOADING_CLASS);
      fetching = false;
    }
  };

  const buildRow = (item) => {
    const tr = document.createElement('tr');

    const sign = item.type === 'add' ? '+' : item.type === 'subtract' ? '-' : item.type === 'generate' ? '*' : '';

    tr.innerHTML = `
			<td>${formatTimestamp(item.timestamp)}</td>
			<td>${item.id || ''}</td>
			<td>${item.games || ''}</td>
			<td class="${item.type}">${sign}$${item.amount}</td>
			<td>$${item.balance}</td>
			<td>${item.dealer || ''}</td>
		`.trim();
    
    return tr;
  };

  const formatTimestamp = (ts) => (window.AppUtils ? window.AppUtils.formatDateTime(ts) : ts);

  const simpleHash = (str) => {
    let h = 0, i = 0, len = str.length;
    while (i < len) h = (h << 5) - h + str.charCodeAt(i++) | 0; // 32bit
    return h.toString();
  };

  document.addEventListener('DOMContentLoaded', () => {
    start();
  });

  // 外部制御用 (必要なら)
  window.historyUpdater = { start, stop, refresh: fetchAndRender };
})();

