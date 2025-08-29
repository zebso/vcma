// 取引履歴自動更新スクリプト
// /api/history を一定間隔で取得し、テーブル tbody を最新状態に更新。
// サーバ側: server.js の /api/history が history.json をそのまま返す仕様。
// history.json 要素例: { timestamp, id, games, type: 'add'|'subtract'|'generate' 等, amount, balance, dealer }

(() => {
  'use strict';

  // ===== 設定 =====
  const API_URL = '/api/history';
  const POLL_INTERVAL_MS = window.AppUtils?.POLL_INTERVALS?.history ?? 5000; // 5秒ごと
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

    // データ取得とハッシュチェック
    const fetchData = async () => {
      const data = window.AppUtils ? await window.AppUtils.fetchJSON(API_URL) : await (await fetch(API_URL, { cache: 'no-cache' })).json();
      
      if (!Array.isArray(data)) { 
        console.warn('[historyUpdater] 配列でないレスポンス'); 
        return null; 
      }

      const jsonStr = JSON.stringify(data);
      const h = simpleHash(jsonStr);

      if (h === lastHash) return null;

      lastHash = h;
      return data.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    };

    // データ制限とDOM構築
    const buildLimitedRows = (data, container, isMobile) => {
      let limited = data;
      const limitAttr = container.getAttribute('data-limit');

      if (limitAttr) {
        const limit = parseInt(limitAttr, 10);
        if (!isNaN(limit) && limit > 0) limited = data.slice(0, limit);
      }

      const frag = document.createDocumentFragment();
      for (const item of limited) frag.appendChild(buildRow(item, isMobile));
      container.replaceChildren(frag);
    };

    // エラーハンドリング
    const handleError = (err) => {
      window.AppUtils?.handleApiError?.(err, 'history') ?? console.error('[historyUpdater] フェッチエラー', err);
    };

    // デスクトップ・モバイル判定とDOM更新
    const isMobile = getComputedStyle(document.querySelector('.table-wrapper')).display !== 'block';
    const container = isMobile 
      ? document.querySelector('.mobile-wrapper')
      : document.querySelector('.history table tbody');
    
    container.classList.add(LOADING_CLASS);

    try {
      const data = await fetchData();
      if (data) buildLimitedRows(data, container, isMobile);
    } catch (err) {
      handleError(err);
    } finally {
      container.classList.remove(LOADING_CLASS);
      fetching = false;
    }
  };

  const buildRow = (item, isMobile) => {
    if (isMobile) {
      const content = document.createElement('div');
      content.classList.add('history-content');
      const sign = item.type === 'add' ? '+' : item.type === 'subtract' ? '-' : item.type === 'generate' ? '*' : '';

      content.innerHTML = `
        <div class="history-info">
          <p class="timestamp">${formatTimestamp(item.timestamp)}</p>
          <p class="user-id">${item.id || ''}</p>
          <p class="games">${item.games || ''}</p>
        </div>
        <div class="history-amount">
          <p class="amount ${item.type}">${sign}$${item.amount}</p>
          <p class="balance">$${item.balance}</p>
          <p class="dealer">${item.dealer || ''}</p>
        </div>
      `;
      return content;
    } else {
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
    }

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

