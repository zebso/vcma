window.currentUserId = '';

class BalanceChecker {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.stream = null;
    this.scanning = false;
    this.scanInterval = null;
    this.jsQR = null;
    this.messageArea = null;
    this.detectionResults = []; // 複数回の検出結果を保存
    this.requiredDetections = 2; // 連続検出回数を減らす
    this.maxDetectionResults = 3; // 保存する最大検出結果数を減らす
  }

  // カメラを起動してQRコードスキャンを開始
  async startScan() {
    try {

      this.showMessage('カメラを起動しています...', 'info');

      // カメラ映像表示用の要素を作成
      this.createVideoElement();

      // カメラストリームを取得
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // loadedmetadata前にリスナーを登録
      this.video.addEventListener('loadedmetadata', () => {
        if (this.scanning) this.startQRDetection();
      }, { once: true });

      this.video.srcObject = this.stream;
      await this.video.play().catch(() => { });

      // jsQR ライブラリ参照を確実に取得
      this.jsQR = window.jsQR || this.jsQR;

      this.scanning = true;
      this.showScannerUI();
      this.hideMessage();

      // 既にメタデータが読まれている場合のフォールバック
      if (this.video.readyState >= this.video.HAVE_METADATA) {
        this.startQRDetection();
      }

    } catch (error) {
      console.error('カメラアクセスエラー:', error);
      this.showMessage('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。', 'error');
    }
  }

  // スキャナーUIを表示
  showScannerUI() {
    const overlay = document.createElement('div');
    overlay.id = 'qr-scanner-overlay';
    overlay.innerHTML = `
      <div class="scanner-container">
        <div class="scanner-header">
          <h3>QRコードをスキャン</h3>
          <button class="close-scanner-btn" type="button">×</button>
        </div>
        <div class="video-container" id="video-slot">
          <div class="scan-frame"></div>
        </div>
        <p class="scan-instruction">QRコードをカメラに向けてください</p>
        <div class="scan-status" id="scan-status">スキャンしています...</div>
      </div>`;
    document.body.appendChild(overlay);

    // 既存videoノードをそのまま挿入（クローンしない）
    const slot = overlay.querySelector('#video-slot');
    slot.insertBefore(this.video, slot.firstChild);

    // 閉じるボタンのイベント
    overlay.querySelector('.close-scanner-btn').addEventListener('click', () => {
      this.stopScan();
    });

    // ESCキーで閉じる
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.stopScan();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ビデオ要素を作成
  createVideoElement() {
    this.video = document.createElement('video');
    this.video.id = 'qr-video';
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  // QRコード検出を開始
  startQRDetection() {
    this.detectionResults = [];
    this.scanInterval = setInterval(() => {
      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        this.detectQRCode();
      }
    }, 200); // 200msごとに検出（安定性重視）
  }

  // QRコード検出処理
  detectQRCode() {
    if (!this.scanning) return;
    const jsQRFn = this.jsQR || window.jsQR;
    if (!jsQRFn) {
      this.updateScanStatus('QRライブラリ未読み込み');
      return;
    }

    const { videoWidth, videoHeight } = this.video;
    if (videoWidth === 0 || videoHeight === 0) return;

    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;
    this.context.drawImage(this.video, 0, 0, videoWidth, videoHeight);

    const imageData = this.context.getImageData(0, 0, videoWidth, videoHeight);

    try {
      // 通常の検出
      let code = jsQRFn(imageData.data, imageData.width, imageData.height);

      // 失敗した場合は反転を試行
      if (!code) {
        code = jsQRFn(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth"
        });
      }

      if (code) {
        this.handleDetection(code.data);
      } else {
        this.updateScanStatus('QRコードを探しています...');
      }
    } catch (error) {
      console.error('QRコード検出エラー:', error);
    }
  }

  // 検出結果の処理
  handleDetection(qrData) {
    this.detectionResults.push(qrData);

    if (this.detectionResults.length > this.maxDetectionResults) {
      this.detectionResults.shift();
    }

    const lastDetections = this.detectionResults.slice(-this.requiredDetections);
    const isConsistent = lastDetections.length === this.requiredDetections &&
      lastDetections.every(result => result === qrData);

    if (isConsistent) {
      this.onQRCodeDetected(qrData);
    } else {
      this.updateScanStatus(`検出中... (${this.detectionResults.length}/${this.requiredDetections})`);
    }
  }

  // スキャンステータス更新
  updateScanStatus(message) {
    const statusElement = document.getElementById('scan-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  // QRコード検出成功時の処理
  onQRCodeDetected(qrData) {
    this.updateScanStatus('QRコードを検出しました！');

    // スキャン停止
    setTimeout(() => {
      this.stopScan();

      // 成功メッセージを表示
      this.showSuccessMessage(qrData);

      // 残高確認APIを呼び出し
      this.checkBalance(qrData);
    }, 500);
  }

  // スキャン停止
  stopScan() {
    this.scanning = false;
    this.detectionResults = [];

    // スキャン間隔をクリア
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    // カメラストリームを停止
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // スキャナーUIを削除
    const overlay = document.getElementById('qr-scanner-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // メッセージ表示
  showMessage(message, type = 'info') {
    if (!this.messageArea) this.messageArea = document.querySelector((window.AppUtils && window.AppUtils.selectors.messageArea) || '#message-area');
    if (window.AppUtils && this.messageArea) window.AppUtils.showInlineMessage(this.messageArea, message, type);
  }

  // メッセージ非表示
  hideMessage() {
    if (this.messageArea && window.AppUtils) window.AppUtils.clearInlineMessage(this.messageArea);
  }

  // BalanceUpdaterのボタンを有効化
  enableBalanceUpdaterButtons() {
    if (window.AppUtils) window.AppUtils.updateBalanceButtons();
  }
  disableBalanceUpdaterButtons() {
    if (window.AppUtils) window.AppUtils.updateBalanceButtons();
  }

  // 成功メッセージ表示
  showSuccessMessage(userId) {
    this.showMessage(`${userId}の残高：$<span id="current-balance">読み込み中...</span>`, 'success');
    // グローバル変数に現在のユーザーIDを保存
    window.currentUserId = userId;
    this.enableBalanceUpdaterButtons();
    // バランス更新ボタンの状態を更新
    if (typeof window.updateBalanceButtonStates === 'function') {
      window.updateBalanceButtonStates();
    }

    const updateMessageArea = document.querySelector('#update-message-area');
    if (updateMessageArea) updateMessageArea.innerHTML = ''; // メッセージエリアをクリア
  }

  // エラーメッセージ表示
  showError(message) {
    this.showMessage(message, 'error');
    // エラー時はユーザーIDをクリア
    window.currentUserId = '';
    this.disableBalanceUpdaterButtons();
    // 残高更新ボタンの状態を更新
    if (typeof window.updateBalanceButtonStates === 'function') {
      window.updateBalanceButtonStates();
    }
  }

  // 残高確認
  async checkBalance(userId) {
    try {
      // APIエンドポイント
      const apiUrl = `/api/balance/${encodeURIComponent(userId)}`;

      const response = await fetch(apiUrl);
      let data = null;

      try { data = await response.json(); } catch (_) { }

      if (response.ok && data) {
        this.displayBalance(data.balance);
      } else if (response.status === 404) {
        this.showError('該当するIDが見つかりませんでした。');
      } else {
        this.showError('残高の取得に失敗しました。');
      }

    } catch (error) {
      if (window.AppUtils && window.AppUtils.handleApiError) window.AppUtils.handleApiError(error, 'balance-check'); else console.error('API呼び出しエラー:', error);
      this.showError('通信エラーが発生しました。');
    }
  }

  // 残高表示
  displayBalance(balance) {
    const el = document.querySelector('#current-balance');
    if (!el) return;
    if (window.AppUtils && typeof window.AppUtils.animateValue === 'function') {
      window.AppUtils.animateValue(el, balance);
    } else {
      el.textContent = Number(balance || 0).toLocaleString();
    }
  }
}

// 残高チェッカーのインスタンスを作成
const balanceChecker = new BalanceChecker();

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  const scanButton = document.querySelector('.scan-qr-btn');
  const idSearchButton = document.querySelector('.check-balance-btn');
  const idSearchInput = document.querySelector('#id-search');

  // QRスキャンボタンのイベント
  if (scanButton) {
    scanButton.addEventListener('click', () => balanceChecker.startScan());
  }

  // ID検索ボタンのイベント
  if (idSearchButton) {
    idSearchButton.addEventListener('click', () => {
      const updateMessageArea = document.querySelector('#update-message-area');
      if (updateMessageArea) updateMessageArea.innerHTML = ''; // メッセージエリアをクリア
      const userId = idSearchInput.value.trim();
      if (userId) {
        balanceChecker.showSuccessMessage(userId);
        balanceChecker.checkBalance(userId);
      } else {
        balanceChecker.showError('IDを入力してください。');
      }
    });
  }

  // Enter キーでID検索
  if (idSearchInput) {
    idSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        idSearchButton.click();
      }
    });
  }
});