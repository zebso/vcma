# QRスキャナー機能

## 概要
カジノ管理システム用のQRコードスキャナー機能です。ユーザーのIDが埋め込まれたQRコードを読み取り、残高確認を行います。

## ファイル構成
```
js/
├── qrScanner.js       # QRスキャナーのメイン機能
├── theme.js           # テーマ管理
├── slideIn.js         # サイドナビゲーション
└── tabControl.js      # タブ制御

css/
├── qrScanner.css      # QRスキャナー用スタイル
├── main.css           # メインスタイル
├── light-theme.css    # ライトテーマ
└── dark-theme.css     # ダークテーマ
```

## 使用方法

### 1. HTMLファイルに追加
```html
<!-- CSSファイルを読み込み -->
<link rel="stylesheet" href="css/qrScanner.css">

<!-- JavaScriptファイルを読み込み -->
<script src="js/qrScanner.js"></script>
```

### 2. HTMLボタンの設定
```html
<button class="scan-qr-btn">QRコードをスキャン</button>
<button class="check-balance-btn">ID 検索</button>
<input type="search" id="id-search" placeholder="Enter ID to search">
```

### 3. メッセージ表示エリアの設定
```html
<div id="message-area"></div>
```

## 機能

### ✅ 実装済み
- 実際のQRコード読み取り（jsQRライブラリ使用）
- カメラアクセス（フロント/リアカメラ対応）
- スキャナーUI表示
- 手動ID入力機能
- API連携対応（開発時はダミーデータ）
- 残高表示（アニメーション付き）
- ダークモード対応
- レスポンシブデザイン
- エラーハンドリング

### 🔧 API設定
残高確認のAPIエンドポイントを設定してください：
```javascript
const apiUrl = `/api/balance/${encodeURIComponent(userId)}`;
```

期待するレスポンス形式：
```json
{
  "balance": 1500,
  "status": "success"
}
```

## 使用ライブラリ

- **jsQR**: QRコード読み取りライブラリ
- CDNから自動読み込み: `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js`

## ブラウザ対応

- Chrome 53+
- Firefox 36+
- Safari 11+
- Edge 12+

## セキュリティ

- HTTPSが必要（カメラアクセスのため）
- カメラ使用許可が必要

## カスタマイズ

### スキャンフレームの色変更
```css
.scan-frame {
    border-color: #your-color;
}
```

### APIエンドポイントの変更
```javascript
// qrScanner.js の checkBalance メソッド内
const apiUrl = `https://your-api.com/balance/${encodeURIComponent(userId)}`;
```

## テーマシステム

### ライトモード・ダークモード
- `js/theme.js`で自動管理
- 設定ページで切り替え可能
- LocalStorageで永続化

### テーマファイル
- `css/light-theme.css` - ライトモード用スタイル
- `css/dark-theme.css` - ダークモード用スタイル
