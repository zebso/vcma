class BalanceUpdater {
  constructor() {
    this.messageArea = null;
  }

  // メッセージ表示
  showMessage(message, type = 'info') {
    if (!this.messageArea) this.messageArea = document.querySelector((window.AppUtils && window.AppUtils.selectors.updateMessageArea) || '#update-message-area');
    if (window.AppUtils && this.messageArea) {
      window.AppUtils.showInlineMessage(this.messageArea, message, type);
    }
  }

  // メッセージ非表示
  hideMessage() { if (this.messageArea && window.AppUtils) window.AppUtils.clearInlineMessage(this.messageArea); }

  // 成功メッセージ（ポップアップ表示）
  showSuccessMessage(userId, amount, type) {
    // 既存のインライン表示をクリア
    this.hideMessage();
    // 既存ポップアップがあれば削除
    const old = document.querySelector('.balance-popup');
    if (old) old.remove();

    if (window.AppUtils) {
      window.AppUtils.showBalanceUpdatePopup({ userId, amount, type });
    }
  }

  // エラーメッセージ表示
  showError(message) {
    this.showMessage(message, 'error');
  }

  // 数値アニメーション（requestAnimationFrame 使用 / 30フレーム相当）
  animateValue(el, targetValue) {
    if (!el) return;
    if (window.AppUtils && typeof window.AppUtils.animateValue === 'function') {
      window.AppUtils.animateValue(el, targetValue);
      return;
    }
    // フォールバック（ユーティリティ未読込時）
    const totalFrames = 30; let frame = 0; const start = 0; const target = Number(targetValue) || 0;
    const step = () => { frame++; const p = Math.min(frame / totalFrames, 1); const cur = start + (target - start) * p; el.textContent = Math.floor(cur).toLocaleString(); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // 更新後残高表示（互換ラッパ）
  displayUpdatedBalance(balance) {
    const sel = (window.AppUtils && window.AppUtils.selectors && window.AppUtils.selectors.updatedBalance) || '#updated-balance';
    const balanceElement = document.querySelector(sel);
    // 共通ユーティリティ側デフォルト時間で実行（common.jsでのみ調整可能）
    if (window.AppUtils) {
      window.AppUtils.animateValue(balanceElement, balance);
    } else {
      this.animateValue(balanceElement, balance);
    }
  }

  // 残高更新
  async updateBalance(type) {
    try {

      const amountInput = document.querySelector('#amount');
      const selectedGameRadio = document.querySelector('input[name="game-type"]:checked');
      const amount = parseFloat(amountInput.value);
      const selectedGame = selectedGameRadio ? selectedGameRadio.value : '';

      if (isNaN(amount) || amount <= 0) {
        this.showError('有効な金額を入力してください。');
        return;
      }

      if (!selectedGame) {
        this.showError('ゲームの種類を選択してください。');
        return;
      }

      const id = window.currentUserId || '';

      if (!id) {
        this.showError('IDが設定されていません。まずユーザーを検索してください。');
        return;
      }

      const apiUrl = `/api/${type}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, amount, games: selectedGame, dealer: 'dealer1' })
      });
      let data = null;
      try { data = await response.json(); } catch (_) { /* JSONでない */ }
      if (!response.ok || !data) {
        this.showError('残高の更新に失敗しました。');
        return;
      }
      if (data.success) {
        this.showSuccessMessage(id, amount, type);
        this.displayUpdatedBalance(data.balance);
        this.resetAll();
      } else {
        this.showError(data.message || '残高の更新に失敗しました。');
      }
    } catch (error) {
      if (window.AppUtils && window.AppUtils.handleApiError) window.AppUtils.handleApiError(error, 'balance-update'); else console.error('API呼び出しエラー:', error);
      this.showError('通信エラーが発生しました。');
    }
  }

  // 入力フィールドをリセット
  resetAmountInput() {
    const amountInput = document.querySelector('#amount');

    if (amountInput) {
      amountInput.value = '';
    }
  }

  // ゲーム選択をリセット
  resetGameSelection() {
    const gameRadios = document.querySelectorAll('input[name="game-type"]');
    gameRadios.forEach(radio => {
      radio.checked = false;
    });
  }

  // メッセージエリアを削除
  deleteMessageArea() {
    const messageArea = document.querySelector('#message-area');
    if (messageArea) {
      messageArea.innerHTML = '';
    }
  }

  // 全てのリセット処理
  resetAll() {
    this.resetAmountInput();
    this.resetGameSelection();
    this.deleteMessageArea();
    this.hideMessage();
    this.messageArea = null; // メッセージエリアを再初期化
    // ID入力欄と内部保持IDをクリア
    const idInput = document.querySelector('#id-search');
    if (idInput) idInput.value = '';
    if (typeof window !== 'undefined') {
      window.currentUserId = '';
    }
    // ボタン状態を更新して無効化
    if (typeof window.updateBalanceButtonStates === 'function') {
      window.updateBalanceButtonStates();
    }
  }
}

// インスタンスを作成
const balanceUpdater = new BalanceUpdater();

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.querySelector('.add-btn');
  const subtractButton = document.querySelector('.subtract-btn');
  const amountInput = document.querySelector('#amount');
  const gameRadios = document.querySelectorAll('input[name="game-type"]');

  // ボタンの有効化/無効化を制御する関数
  function updateButtonStates() { if (window.AppUtils) window.AppUtils.updateBalanceButtons(); }

  // 初期状態でボタンを無効化
  updateButtonStates();

  // 金額入力の変更を監視
  amountInput && amountInput.addEventListener('input', updateButtonStates);

  // ゲーム選択ラジオボタンの変更を監視
  gameRadios.forEach(radio => radio.addEventListener('change', updateButtonStates));

  // ユーザー検索後にボタン状態を更新（グローバルに呼び出せるようにする）
  window.updateBalanceButtonStates = updateButtonStates;

  // 残高入金処理
  if (addButton) {
    addButton.addEventListener('click', () => balanceUpdater.updateBalance('add'));
  }

  // 残高出金処理
  if (subtractButton) {
    subtractButton.addEventListener('click', () => balanceUpdater.updateBalance('subtract'));
  }
});