const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('../front-end'));

const usersFile = path.join(__dirname, '../data', 'users.json');
const historyFile = path.join(__dirname, '../data', 'history.json');

// ユーティリティ関数
const loadJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));
const saveJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

//残高取得API
app.get('/api/balance/:id', (req, res) => {
  const users = loadJSON(usersFile);
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'ID not found' });
  res.json({ id: user.id, balance: user.balance})
});

// 入金API
app.post('/api/add', (req, res) => {
  const { id, amount, games } = req.body;
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
    dealer: 'dealer1'
  });

  saveJSON(usersFile, users);
  saveJSON(historyFile, history);

  res.json({ success: true, balance: user.balance });
});

// 出金API
app.post('/api/subtract', (req, res) => {
  const { id, amount, games } = req.body;
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
    dealer: 'dealer1'
  });

  saveJSON(usersFile, users);
  saveJSON(historyFile, history);

  res.json({ success: true, balance: user.balance });
});

//サーバー立ち上げ
app.listen(PORT, () => {
  console.log(`The server is running at http://localhost:${PORT}`);
});