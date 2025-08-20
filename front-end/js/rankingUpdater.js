// ランキング自動更新スクリプト
// 期待する ranking.json 形式: [{ id: "USER_ID", balance: 12345 }, ...] 降順

(function() {
	const RANKING_URL = '/api/ranking';
	const POLL_INTERVAL = 8000; // ms

	// DOM 参照取得（存在しない場合は動かさない）
	function selectContainers() {
		return {
			top: document.querySelector('.ranking-top-contents'),
			bottom: document.querySelector('.ranking-bottom-contents')
		};
	}

	// 数値 → 通貨表示
	function formatBalance(v) {
		return '$' + Number(v).toLocaleString();
	}

	// Top3 用カード生成
	function createTopCard(entry) {
		const div = document.createElement('div');
		div.className = 'ranking-content';
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

	// DOM 更新（ページ別件数制限: dashboard=5, ranking=18）
	function render(ranking) {
		const { top, bottom } = selectContainers();
		if (!top || !bottom) return; // 対象ページでない

		const isRankingPage = /ranking\.html$/i.test(location.pathname);
		const maxTotal = isRankingPage ? 18 : 6;
		const limited = ranking.slice(0, maxTotal);

		top.innerHTML = '';
		bottom.innerHTML = '';

		// CSS が nth-child(2) を 1位 として装飾しているため描画順を [2位,1位,3位] に並べ替え
		const top3 = limited.slice(0,3);
		if (top3.length === 1) {
			// 1件のみ → そのまま（中央装飾は不可）
			top.appendChild(createTopCard(top3[0]));
		} else if (top3.length === 2) {
			// [2位,1位] の順で配置（nth-child(2) が中央=1位）
			top.appendChild(createTopCard(top3[1])); // 2位
			top.appendChild(createTopCard(top3[0])); // 1位
		} else if (top3.length === 3) {
			top.appendChild(createTopCard(top3[1])); // 2位 (左)
			top.appendChild(createTopCard(top3[0])); // 1位 (中央)
			top.appendChild(createTopCard(top3[2])); // 3位 (右)
		}

		for (let i = 3; i < limited.length; i++) {
			bottom.appendChild(createRow(limited[i], i + 1));
		}
	}

	let lastSerialized = '';
	let timerId = null;

	async function fetchAndUpdate() {
		try {
			const res = await fetch(RANKING_URL + '?_=' + Date.now(), { cache: 'no-store' });
			if (!res.ok) return;
			const data = await res.json();
			if (!Array.isArray(data)) return;

			// 変更検出（シリアライズ比較）
			const serialized = JSON.stringify(data.map(d => [d.id, d.balance]));
			if (serialized !== lastSerialized) {
				lastSerialized = serialized;
				render(data);
			}
		} catch (e) {
			// ネットワークエラーは黙殺（コンソールには出す）
			console.debug('Ranking fetch error', e);
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

