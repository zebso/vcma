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

  // 成功メッセージ表示
  showSuccessMessage(userId) {
    this.showMessage(`${userId}の新しい残高：$<span id="updated-balance">読み込み中...</span>`, 'success');
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
      const amount = parseFloat(amountInput.value);

      if (isNaN(amount) || amount <= 0) {
        this.showError('有効な金額を入力してください。');
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
          games: '',
          dealer: 'dealer1'
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccessMessage(id);
        this.displayUpdatedBalance(data.balance);
        this.resetAmountInput();
      } else {
        this.showError('残高の更新に失敗しました。');
      }
    } catch (error) {
      console.error('API呼び出しエラー:', error);
    }
  }

  // 入力フィールドをリセット
  resetAmountInput() {
    if (!this.amountInput) {
      this.amountInput = document.querySelector('#amount');
    }

    if (this.amountInput) {
      this.amountInput.value = '';
    }
  }
}

// インスタンスを作成
const balanceUpdater = new BalanceUpdater();

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.querySelector('.add-btn');
  const subtractButton = document.querySelector('.subtract-btn');

  // 初期状態でボタンを無効化
  if (addButton) {
    addButton.disabled = true;
    addButton.style.opacity = '0.5';
    addButton.style.cursor = 'not-allowed';
  }

  if (subtractButton) {
    subtractButton.disabled = true;
    subtractButton.style.opacity = '0.5';
    subtractButton.style.cursor = 'not-allowed';
  }

  // 残高入金処理
  if (addButton) {
    addButton.addEventListener('click', () => balanceUpdater.updateBalance('add'));
  }

  // 残高出金処理
  if (subtractButton) {
    subtractButton.addEventListener('click', () => balanceUpdater.updateBalance('subtract'));
  }
});