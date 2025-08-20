class BalanceUpdater {
  constructor() {
    this.messageArea = null;
  }

  // メッセージ表示
  showMessage(message, type = 'info') {
    if (!this.messageArea) {
      this.messageArea = document.querySelector('#update-message-area');
    }

    if (this.messageArea) {
      const messageClass = type === 'error' ? 'error-message' :
        type === 'success' ? 'success-message' :
          'info-message';

      this.messageArea.innerHTML = `
        <div class="${messageClass}">
          <p>${message}</p>
        </div>
      `;
    }
  }

  // メッセージ非表示
  hideMessage() {
    if (this.messageArea) {
      this.messageArea.innerHTML = '';
    }
  }

  // 成功メッセージ（ポップアップ表示）
  showSuccessMessage(userId, amount, type) {
    // 既存のインライン表示をクリア
    this.hideMessage();
    // 既存ポップアップがあれば削除
    const old = document.querySelector('.balance-popup');
    if (old) old.remove();

    const sign = type === 'subtract' ? '-' : '+';
    const formattedAmount = amount.toLocaleString();

    const popup = document.createElement('div');
    popup.className = 'balance-popup success';
    popup.setAttribute('role', 'alert');
    popup.innerHTML = `
      <button class="close-popup" aria-label="閉じる">&times;</button>
      <div class="popup-content">
        <strong>残高更新成功</strong>
        <p>${userId} の新しい残高：$<span id="updated-balance">…</span> <span class="balance-diff ${sign === '+' ? 'positive' : 'negative'}">(${sign}$${formattedAmount})</span></p>
      </div>
    `;

    popup.querySelector('.close-popup').addEventListener('click', () => popup.remove());
    // 8秒後自動クローズ
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 8000);
    document.body.appendChild(popup);
  }

  // エラーメッセージ表示
  showError(message) {
    this.showMessage(message, 'error');
  }

  // 更新後残高表示
  displayUpdatedBalance(balance) {
    const balanceElement = document.querySelector('#updated-balance');
    if (balanceElement) {
      // アニメーション効果付きで残高を表示
      let currentValue = 0;
      const targetValue = parseFloat(balance);
      const increment = targetValue / 30;

      const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
          currentValue = targetValue;
          clearInterval(timer);
        }
        balanceElement.textContent = Math.floor(currentValue).toLocaleString();
      }, 30);
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          amount,
          games: selectedGame,
          dealer: 'dealer1'
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccessMessage(id, amount, type);
        this.displayUpdatedBalance(data.balance);
        this.resetAll();
      } else {
        this.showError('残高の更新に失敗しました。');
      }
    } catch (error) {
      console.error('API呼び出しエラー:', error);
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
  function updateButtonStates() {
    const hasUserId = window.currentUserId && window.currentUserId.trim() !== '';
    const hasAmount = amountInput && amountInput.value && parseFloat(amountInput.value) > 0;
    const hasGame = Array.from(gameRadios).some(radio => radio.checked);
    
    const isValid = hasUserId && hasAmount && hasGame;

    if (addButton) {
      addButton.disabled = !isValid;
      addButton.style.opacity = isValid ? '1' : '0.5';
      addButton.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }

    if (subtractButton) {
      subtractButton.disabled = !isValid;
      subtractButton.style.opacity = isValid ? '1' : '0.5';
      subtractButton.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
  }

  // 初期状態でボタンを無効化
  updateButtonStates();

  // 金額入力の変更を監視
  if (amountInput) {
    amountInput.addEventListener('input', updateButtonStates);
  }

  // ゲーム選択ラジオボタンの変更を監視
  gameRadios.forEach(radio => {
    radio.addEventListener('change', updateButtonStates);
  });

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