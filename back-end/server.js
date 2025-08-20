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

// ランキング更新: 対象ユーザーを差し替え後、残高降順で保存
const updateRanking = (user) => {
  try {
    let ranking = loadJSON(rankingFile);
    if (!Array.isArray(ranking)) ranking = [];
    // 同一IDを削除
    ranking = ranking.filter(r => r.id !== user.id);
    // 追加
    ranking.push({ id: user.id, balance: user.balance });
    // 並び替え（降順）
    ranking.sort((a, b) => b.balance - a.balance);
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

// 入金API
app.post('/api/add', (req, res) => {
  const { id, amount, games, dealer } = req.body;
  const users = loadJSON(usersFile);
  const history = loadJSON(historyFile);

  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'ID not found' });

  user.balance += Number(amount);

  history.unshift({
    timestamp: new Date().toISOString(),
    id,
    games,
    type: 'add',
    amount: Number(amount),
    balance: user.balance,
    dealer
  });

  saveJSON(usersFile, users);
  saveJSON(historyFile, history);
  updateRanking(user);

  res.json({ success: true, balance: user.balance });
});

// 出金API
app.post('/api/subtract', (req, res) => {
  const { id, amount, games, dealer } = req.body;
  const users = loadJSON(usersFile);
  const history = loadJSON(historyFile);

  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'ID not found' });

  user.balance -= Number(amount);

  history.unshift({
    timestamp: new Date().toISOString(),
    id,
    games,
    type: 'subtract',
    amount: -Number(amount),
    balance: user.balance,
    dealer
  });

  saveJSON(usersFile, users);
  saveJSON(historyFile, history);
  updateRanking(user);

  res.json({ success: true, balance: user.balance });
});

// 履歴取得API
app.get('/api/history', (req, res) => {
  const history = loadJSON(historyFile);
  res.json(history);
});

app.get('/api/ranking', (req, res) => {
  const ranking = loadJSON(rankingFile);
  res.json(ranking);
});

//サーバー立ち上げ
app.listen(PORT, () => {
  console.log(`The Dashboard page is at http://localhost:${PORT}/dashboard.html`);
});