// ランキング自動更新スクリプト
// 期待する ranking.json 形式: [{ id: "USER_ID", balance: 12345 }, ...] 降順

(function () {
  const RANKING_URL = '/api/ranking';
  const POLL_INTERVAL = (window.AppUtils && window.AppUtils.POLL_INTERVALS.ranking) || 8000; // ms

  // DOM 参照取得（存在しない場合は動かさない）
  function selectContainers() {
    const sel = (window.AppUtils && window.AppUtils.selectors) || {};
    return {
      top: document.querySelector(sel.rankingTop || '.ranking-top-contents'),
      bottom: document.querySelector(sel.rankingBottom || '.ranking-bottom-contents')
    };
  }

  // 数値 → 通貨表示
  function formatBalance(v) { return window.AppUtils ? window.AppUtils.formatCurrency(v, { style: 'usd' }) : ('$' + Number(v).toLocaleString()); }

  // Top3 用カード生成
  function createTopCard(entry, rank) {
    const div = document.createElement('div');
    div.className = 'ranking-content';
    div.id = `ranking-${rank}`;
    div.innerHTML = `
			<p class="user-id">${entry.id}</p>
			<h3 class="point">${formatBalance(entry.balance)}</h3>
		`;
    return div;
  }

  // 4位以下行生成（rankNumber を直接指定）
  function createRow(entry, rankNumber) {
    const div = document.createElement('div');
    div.className = 'ranking-content';
    div.innerHTML = `
			<div class="rank-section">
				<div class="rank-num">${rankNumber}</div>
				<div class="user-info">
					<div class="user-id">${entry.id}</div>
				</div>
			</div>
			<div class="point">${formatBalance(entry.balance)}</div>
		`;
    return div;
  }

  // DOM 更新（ページ別件数制限: dashboard=6, ranking=18）
  function render(ranking) {
    const { top, bottom } = selectContainers();
    if (!top || !bottom) return;
    const isRankingPage = /ranking\.html$/i.test(location.pathname);
    const maxTotal = isRankingPage ? 18 : 6; // 5 + top3(重複を許容) 仕様調整可
    const limited = ranking.slice(0, maxTotal);

    top.innerHTML = '';
    bottom.innerHTML = '';

    const arranged = limited.slice(0, 3);
    arranged.forEach((entry, i) => top.appendChild(createTopCard(entry, i === 0 ? 'first' : i === 1 ? 'second' : 'third')));

    for (let i = 3; i < limited.length; i++) bottom.appendChild(createRow(limited[i], i + 1));
  }

  let lastSerialized = '';
  let timerId = null;

  async function fetchAndUpdate() {
    try {
      const data = window.AppUtils ? await window.AppUtils.fetchJSON(RANKING_URL) : await (await fetch(RANKING_URL, { cache: 'no-store' })).json();
      if (!Array.isArray(data)) return;
      const serialized = JSON.stringify(data.map(d => [d.id, d.balance]));
      if (serialized !== lastSerialized) {
        lastSerialized = serialized;
        render(data);
      }
    } catch (e) {
      if (window.AppUtils && window.AppUtils.handleApiError) window.AppUtils.handleApiError(e, 'ranking'); else console.debug('Ranking fetch error', e);
    }
  }

  function start() {
    // 初回即時
    fetchAndUpdate();
    // ポーリング
    timerId = setInterval(fetchAndUpdate, POLL_INTERVAL);
  }

  // ページ遷移等で複数回動かないようガード
  if (!window.__rankingUpdaterStarted) {
    window.__rankingUpdaterStarted = true;
    document.addEventListener('DOMContentLoaded', start);
  }
})();

