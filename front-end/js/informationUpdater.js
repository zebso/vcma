// ダッシュボード上部情報欄自動更新スクリプト
// /api/dashboard-stats から統計を取得して描画
(function () {
  const ENDPOINT = '/api/dashboard-stats';
  const INTERVAL = (window.AppUtils && window.AppUtils.POLL_INTERVALS.stats) || 7000; // ms

  function updateDOM(stats) {
    const map = [
      ['#active-ids h2', Number(stats.activeIds || 0).toLocaleString()],
      ['#total-balance h2', window.AppUtils ? window.AppUtils.formatCurrency(stats.totalBalance, { style: 'jpy' }) : ('￥' + Number(stats.totalBalance || 0).toLocaleString())],
      ['#todays-transactions h2', Number(stats.totalTransactions || 0).toLocaleString()]
    ];
    map.forEach(([sel, val]) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    });
  }

  async function fetchStats() {
    try {
      const data = window.AppUtils ? await window.AppUtils.fetchJSON(ENDPOINT) : await (await fetch(ENDPOINT, { cache: 'no-store' })).json();
      if (data && typeof data === 'object') updateDOM(data);
    } catch (e) { if (window.AppUtils && window.AppUtils.handleApiError) window.AppUtils.handleApiError(e, 'stats'); else console.debug('stats fetch failed', e); }
  }

  function start() {
    fetchStats();
    setInterval(fetchStats, INTERVAL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

