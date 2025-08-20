// 取引履歴自動更新スクリプト
// /api/history を一定間隔で取得し、テーブル tbody を最新状態に更新します。
// サーバ側: server.js の /api/history が history.json をそのまま返す仕様。
// history.json 要素例: { timestamp, id, games, type: 'add'|'subtract'|'generate' 等, amount, balance, dealer }

(function () {
	'use strict';

	// ===== 設定 =====
	const API_URL = '/api/history';
	const POLL_INTERVAL_MS = 5000; // 5秒ごと
	const TABLE_BODY_SELECTOR = '.history table tbody';
	const LOADING_CLASS = 'is-loading';

	let timerId = null;
	let lastHash = null; // 内容変化判定用ハッシュ
	let fetching = false;

	document.addEventListener('DOMContentLoaded', () => {
		start();
	});

	function start() {
		if (timerId) return;
		fetchAndRender();
		timerId = setInterval(fetchAndRender, POLL_INTERVAL_MS);
	}

	function stop() {
		if (!timerId) return;
		clearInterval(timerId);
		timerId = null;
	}

	async function fetchAndRender() {
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
			const res = await fetch(API_URL, { cache: 'no-cache' });
			if (!res.ok) {
				console.warn('[historyUpdater] 取得失敗 status=', res.status);
				return;
			}
			const data = await res.json();

			if (!Array.isArray(data)) {
				console.warn('[historyUpdater] 配列でないレスポンス');
				return;
			}

			// ハッシュで変化判定 (高速化: stringify 一括)
			const jsonStr = JSON.stringify(data);
			const h = simpleHash(jsonStr);
			if (h === lastHash) return; // 変化なし
			lastHash = h;

			// 最新順 (server.js は unshift なので既に最新が先頭だが安全のため)
			data.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

					// data-limit 属性が tbody にあれば件数制限
					let limited = data;
					const limitAttr = tbody.getAttribute('data-limit');
					if (limitAttr) {
						const limit = parseInt(limitAttr, 10);
						if (!isNaN(limit) && limit > 0) {
							limited = data.slice(0, limit);
						}
					}

					// DocumentFragment で再構築
					const frag = document.createDocumentFragment();
					for (const item of limited) {
						frag.appendChild(buildRow(item));
					}
			tbody.replaceChildren(frag);
		} catch (err) {
			console.error('[historyUpdater] フェッチエラー', err);
		} finally {
			tbody.classList.remove(LOADING_CLASS);
			fetching = false;
		}
	}

	function buildRow(item) {
		const tr = document.createElement('tr');
		const typeClass = typeToClass(item.type);
		const amountFormatted = formatCurrency(item.amount);
		const balanceFormatted = formatCurrency(item.balance);
		tr.innerHTML = `
			<td>${escapeHtml(formatTimestamp(item.timestamp))}</td>
			<td>${escapeHtml(item.id || '')}</td>
			<td>${escapeHtml(item.games || '')}</td>
			<td><span class="${escapeHtml(typeClass)}">${escapeHtml(typeLabel(item.type))}</span></td>
			<td class="${item.amount < 0 ? 'minus' : ''}">${amountFormatted}</td>
			<td>${balanceFormatted}</td>
			<td>${escapeHtml(item.dealer || '')}</td>
		`.trim();
		return tr;
	}

	function typeToClass(type) {
		switch (type) {
			case 'add': return 'add';
			case 'subtract': return 'subtract';
			case 'generate': return 'generate';
			default: return 'unknown';
		}
	}

	function typeLabel(type) {
		switch (type) {
			case 'add': return '＋ 入金';
			case 'subtract': return 'ー 出金';
			case 'generate': return '＋ 生成';
			default: return type || '不明';
		}
	}

	function formatTimestamp(ts) {
		if (!ts) return '';
		const d = new Date(ts);
		if (isNaN(d.getTime())) return ts;
		const pad = n => n.toString().padStart(2, '0');
		return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	}

	function formatCurrency(v) {
		if (v === undefined || v === null || v === '') return '';
		const num = Number(v);
		if (isNaN(num)) return String(v);
		const sign = num < 0 ? '-' : '';
		return `${sign}$${Math.abs(num).toLocaleString()}`;
	}

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function simpleHash(str) {
		let h = 0, i = 0, len = str.length;
		while (i < len) h = (h << 5) - h + str.charCodeAt(i++) | 0; // 32bit
		return h.toString();
	}

	// 外部制御用 (必要なら)
	window.historyUpdater = { start, stop, refresh: fetchAndRender };
})();

