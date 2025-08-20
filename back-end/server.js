"use strict";
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('../front-end'));

const usersFile = path.join(__dirname, '../data', 'users.json');
const historyFile = path.join(__dirname, '../data', 'history.json');
const rankingFile = path.join(__dirname, '../data', 'ranking.json');

// ユーティリティ関数（空ファイル/欠損に耐性）
const loadJSON = (file) => {
  try {
    const txt = fs.readFileSync(file, 'utf-8');
    if (!txt.trim()) return [];
    return JSON.parse(txt);
  } catch (e) {
    return [];
  }
};
const saveJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ランキング更新: users.json から都度再構築（シンプル & 一貫性）
const updateRanking = () => {
  try {
    const users = loadJSON(usersFile);
    const ranking = users
      .map(u => ({ id: u.id, balance: Number(u.balance || 0) }))
      .sort((a, b) => b.balance - a.balance);
    saveJSON(rankingFile, ranking);
  } catch (e) {
    console.error('ランキング更新エラー:', e);
  }
};

//残高取得API
app.get('/api/balance/:id', (req, res) => {
  const users = loadJSON(usersFile);
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'ID not found' });
  res.json({ id: user.id, balance: user.balance})
});

// 共通トランザクション処理
function createTransactionHandler(type, sign) {
  return (req, res) => {
    const { id, amount, games, dealer } = req.body || {};
    const num = Number(amount);

    // 最低限のバリデーション（フロントと挙動変えない: エラー時 success:false ではなく既存通りエラーレスポンス）
    if (!id || isNaN(num) || num <= 0) {
      return res.status(400).json({ error: 'invalid request' });
    }

    const users = loadJSON(usersFile);
    const history = loadJSON(historyFile);
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'ID not found' });

    user.balance += sign * num; // 加算 or 減算

    history.unshift({
      timestamp: new Date().toISOString(),
      id,
      games,
      type,
      amount: sign * num, // subtract の場合は負数
      balance: user.balance,
      dealer
    });

    saveJSON(usersFile, users);
    saveJSON(historyFile, history);
    updateRanking();

    res.json({ success: true, balance: user.balance });
  };
}

// 入金API / 出金API （挙動・レスポンス互換）
app.post('/api/add', createTransactionHandler('add', +1));
app.post('/api/subtract', createTransactionHandler('subtract', -1));

// 履歴取得API
app.get('/api/history', (req, res) => {
  const history = loadJSON(historyFile);
  res.json(history);
});

app.get('/api/ranking', (req, res) => {
  const ranking = loadJSON(rankingFile);
  res.json(ranking);
});

// ダッシュボード統計API（必要最小限の値のみ返却）
app.get('/api/dashboard-stats', (req, res) => {
  try {
    const users = loadJSON(usersFile);
    const history = loadJSON(historyFile);
    res.json({
      activeIds: users.length,
      totalBalance: users.reduce((sum, u) => sum + Number(u.balance || 0), 0),
      totalTransactions: history.length
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

//サーバー立ち上げ
app.listen(PORT, () => {
  console.log(`The Dashboard page is at http://localhost:${PORT}/dashboard.html`);
});