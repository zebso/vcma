// テーマ管理システム（CSS分離版）
(function() {
    'use strict';

    let currentThemeLink = null;

    // テーマCSSファイルの読み込み
    function loadThemeCSS(theme) {
        // 既存のテーマCSSを削除
        if (currentThemeLink) {
            currentThemeLink.remove();
        }

        // 新しいテーマCSSを読み込み
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `css/${theme}-theme.css`;
        link.id = 'theme-css';
        
        // headの最後に追加（他のCSSより後に読み込ませる）
        document.head.appendChild(link);
        currentThemeLink = link;
    }

    // テーマの初期化
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        loadThemeCSS(savedTheme);
        applyTheme(savedTheme);
    }

    // テーマの適用（bodyクラス管理）
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // テーマの保存と適用
    function saveTheme(theme) {
        localStorage.setItem('theme', theme);
        loadThemeCSS(theme);
        applyTheme(theme);
    }

    // 設定ページでのテーマ切り替え機能
    function initializeThemeSettings() {
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        if (themeInputs.length === 0) return;

        // 現在のテーマを反映
        const currentTheme = localStorage.getItem('theme') || 'light';
        const currentInput = document.querySelector(`input[value="${currentTheme}"]`);
        if (currentInput) {
            currentInput.checked = true;
        }

        // テーマ変更イベントの設定
        themeInputs.forEach(input => {
            input.addEventListener('change', function() {
                if (this.checked) {
                    saveTheme(this.value);
                }
            });
        });
    }

    // DOM読み込み完了後に実行
    document.addEventListener('DOMContentLoaded', function() {
        initializeTheme();
        initializeThemeSettings();
    });

    // ページ読み込み前にテーマを適用（フラッシュ防止）
    const savedTheme = localStorage.getItem('theme') || 'light';
    loadThemeCSS(savedTheme);
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    }

    // グローバルに関数を公開
    window.ThemeManager = {
        loadThemeCSS: loadThemeCSS,
        applyTheme: applyTheme,
        saveTheme: saveTheme,
        getCurrentTheme: function() {
            return localStorage.getItem('theme') || 'light';
        }
    };
})();
