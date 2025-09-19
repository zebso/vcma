const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
  res.redirect('/dealer/dashboard');
});

router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/dealers-pages', 'dashboard.html'));
});

router.get('/balance-checker', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/dealers-pages', 'balance-checker.html'));
});

router.get('/balance-updater', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/dealers-pages', 'balance-updater.html'));
});

router.get('/ranking', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/dealers-pages', 'ranking.html'));
});

router.get('/transaction-history', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/dealers-pages', 'transaction-history.html'));
});

router.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front-end/dealers-pages', 'settings.html'));
});

module.exports = router;