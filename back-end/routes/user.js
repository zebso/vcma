const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
  res.redirect('/user/balance-checker');
});

router.get('/balance-checker', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/users-pages', 'balance-checker.html'));
});

router.get('/ranking', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/users-pages', 'ranking.html'));
});

router.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/users-pages', 'settings.html'));
});

module.exports = router;