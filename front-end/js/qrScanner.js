// QRコードスキャナー機能（実装版）
class QRScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.stream = null;
        this.scanning = false;
        this.scanInterval = null;
        this.jsQR = null;
        this.messageArea = null;
    }

    // jsQRライブラリを動的に読み込み
    async loadJsQR() {
        if (this.jsQR) return;

        try {
            // jsQRライブラリをCDNから読み込み
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
            document.head.appendChild(script);

            return new Promise((resolve, reject) => {
                script.onload = () => {
                    this.jsQR = window.jsQR;
                    resolve();
                };
                script.onerror = () => {
                    reject(new Error('jsQRライブラリの読み込みに失敗しました'));
                };
            });
        } catch (error) {
            throw new Error('jsQRライブラリの読み込みに失敗しました');
        }
    }

    // カメラを起動してQRコードスキャンを開始
    async startScan() {
        try {
            this.showMessage('QRライブラリを読み込んでいます...', 'info');
            
            // jsQRライブラリを読み込み
            await this.loadJsQR();
            
            this.showMessage('カメラを起動しています...', 'info');
            
            // カメラ映像表示用の要素を作成
            this.createVideoElement();
            
            // カメラストリームを取得
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // 背面カメラを優先
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = this.stream;
            this.video.play();
            
            this.scanning = true;
            this.showScannerUI();
            this.hideMessage();
            
            // QRコード検出を開始
            this.video.addEventListener('loadedmetadata', () => {
                this.startQRDetection();
            });

        } catch (error) {
            console.error('カメラアクセスエラー:', error);
            this.showMessage('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。', 'error');
        }
    }

    // スキャナーUIを表示
    showScannerUI() {
        // スキャナーオーバーレイを作成
        const overlay = document.createElement('div');
        overlay.id = 'qr-scanner-overlay';
        overlay.innerHTML = `
            <div class="scanner-container">
                <div class="scanner-header">
                    <h3>QRコードをスキャン</h3>
                    <button class="close-scanner-btn" type="button">×</button>
                </div>
                <div class="video-container">
                    ${this.video.outerHTML}
                    <div class="scan-frame"></div>
                </div>
                <p class="scan-instruction">QRコードをカメラに向けてください</p>
                <div class="scan-status" id="scan-status">スキャンしています...</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 新しく作成されたvideo要素を取得し直す
        this.video = overlay.querySelector('video');
        this.video.srcObject = this.stream;
        
        // 閉じるボタンのイベント
        overlay.querySelector('.close-scanner-btn').addEventListener('click', () => {
            this.stopScan();
        });

        // オーバーレイクリックで閉じる
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.stopScan();
            }
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
        this.context = this.canvas.getContext('2d');
    }

    // QRコード検出を開始
    startQRDetection() {
        this.scanInterval = setInterval(() => {
            if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
                this.detectQRCode();
            }
        }, 200); // 200msごとに検出
    }

    // QRコード検出処理
    detectQRCode() {
        if (!this.scanning || !this.jsQR) return;

        const { videoWidth, videoHeight } = this.video;
        if (videoWidth === 0 || videoHeight === 0) return;

        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;

        // ビデオフレームをキャンバスに描画
        this.context.drawImage(this.video, 0, 0, videoWidth, videoHeight);

        // 画像データを取得
        const imageData = this.context.getImageData(0, 0, videoWidth, videoHeight);

        // jsQRでQRコード検出
        try {
            const code = this.jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                this.onQRCodeDetected(code.data);
            } else {
                this.updateScanStatus('QRコードを探しています...');
            }
        } catch (error) {
            console.error('QRコード検出エラー:', error);
            this.updateScanStatus('エラーが発生しました');
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
        console.log('QRコード検出:', qrData);
        
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
        if (!this.messageArea) {
            this.messageArea = document.getElementById('message-area');
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
        this.showMessage(`${userId}の残高：$<span id="current-balance">読み込み中...</span>`, 'success');
    }

    // エラーメッセージ表示
    showError(message) {
        this.showMessage(message, 'error');
    }

    // 残高確認（実装版）
    async checkBalance(userId) {
        try {
            // APIエンドポイント（実際のAPIに置き換えてください）
            const apiUrl = `/api/balance/${encodeURIComponent(userId)}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayBalance(data.balance);
            } else if (response.status === 404) {
                this.showError('該当するIDが見つかりませんでした。');
            } else {
                this.showError('残高の取得に失敗しました。');
            }
        } catch (error) {
            console.error('API呼び出しエラー:', error);
            // 開発用：ダミーデータを表示
            this.displayDummyBalance(userId);
        }
    }

    // 残高表示
    displayBalance(balance) {
        const balanceElement = document.getElementById('current-balance');
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

    // 開発用ダミー残高表示
    displayDummyBalance(userId) {
        console.log('開発モード: ダミー残高を表示');
        
        // ダミーの残高データ（ユーザーIDに基づく）
        let dummyBalance;
        if (userId.toUpperCase().includes('ADMIN')) {
            dummyBalance = Math.floor(Math.random() * 50000) + 10000;
        } else if (userId.toUpperCase().includes('GUEST')) {
            dummyBalance = Math.floor(Math.random() * 1000) + 100;
        } else {
            dummyBalance = Math.floor(Math.random() * 10000) + 1000;
        }
        
        setTimeout(() => {
            this.displayBalance(dummyBalance);
        }, 500);
    }
}

// QRスキャナーインスタンスを作成
const qrScanner = new QRScanner();

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', function() {
    const scanButton = document.querySelector('.scan-qr-btn');
    const idSearchButton = document.querySelector('.check-balance-btn');
    const idSearchInput = document.getElementById('id-search');
    
    // QRスキャンボタンのイベント
    if (scanButton) {
        scanButton.addEventListener('click', function() {
            qrScanner.startScan();
        });
    }

    // ID検索ボタンのイベント
    if (idSearchButton) {
        idSearchButton.addEventListener('click', function() {
            const userId = idSearchInput.value.trim();
            if (userId) {
                qrScanner.showSuccessMessage(userId);
                qrScanner.checkBalance(userId);
            } else {
                qrScanner.showError('IDを入力してください。');
            }
        });
    }

    // Enter キーでID検索
    if (idSearchInput) {
        idSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                idSearchButton.click();
            }
        });
    }
});
