// ダッシュボード上部情報欄自動更新スクリプト
// /api/dashboard-stats から統計を取得して描画
(function() {
	const ENDPOINT = '/api/dashboard-stats';
	const INTERVAL = 7000; // ms

	function fmtCurrency(n) {
		return '￥' + Number(n || 0).toLocaleString();
	}

	function updateDOM(stats) {
		const activeIdsEl = document.querySelector('#active-ids h2');
		const totalBalanceEl = document.querySelector('#total-balance h2');
		const todaysTxEl = document.querySelector('#todays-transactions h2');
		if (activeIdsEl) activeIdsEl.textContent = stats.activeIds.toLocaleString();
		if (totalBalanceEl) totalBalanceEl.textContent = fmtCurrency(stats.totalBalance);
		if (todaysTxEl) todaysTxEl.textContent = stats.totalTransactions.toLocaleString(); // 仕様: 全期間 or 今日? 要確認
	}

	async function fetchStats() {
		try {
			const res = await fetch(ENDPOINT + '?_=' + Date.now(), { cache: 'no-store' });
			if (!res.ok) return;
			const data = await res.json();
			if (data && typeof data === 'object') {
				updateDOM(data);
			}
		} catch (e) {
			console.debug('stats fetch failed', e);
		}
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

