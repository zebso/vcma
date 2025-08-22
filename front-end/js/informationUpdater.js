// ダッシュボード上部情報欄自動更新スクリプト
// /api/dashboard-stats から統計を取得して描画
(() => {
  const ENDPOINT = '/api/dashboard-stats';
  const INTERVAL = window.AppUtils?.POLL_INTERVALS?.stats ?? 7000; // ms

  const updateDOM = stats => {
    const map = [
      ['#active-ids h2', Number(stats.activeIds || 0).toLocaleString()],
      ['#total-balance h2', window.AppUtils?.formatCurrency(stats.totalBalance) ?? `$${Number(stats.totalBalance || 0).toLocaleString()}`],
      ['#todays-transactions h2', Number(stats.totalTransactions || 0).toLocaleString()]
    ];
    map.forEach(([sel, val]) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    });
  };

  const fetchStats = async () => {
    try {
      const data = window.AppUtils ? await window.AppUtils.fetchJSON(ENDPOINT) : await (await fetch(ENDPOINT, { cache: 'no-store' })).json();
      if (data && typeof data === 'object') updateDOM(data);
    } catch (e) {
      window.AppUtils?.handleApiError?.(e, 'stats') ?? console.debug('stats fetch failed', e);
    }
  };

  const start = () => {
    fetchStats();
    setInterval(fetchStats, INTERVAL);
  };

  document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();

