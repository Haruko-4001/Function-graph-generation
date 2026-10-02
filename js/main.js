/**
 * main.js
 * ============================================================
 * 应用入口：等待 Plotly 与 MathJS 就绪后启动 MathApp。
 * ============================================================
 */
(function () {
    'use strict';

    let app = null;

    function start() {
        if (!window.MathViz || !window.MathViz.checkLibraries()) {
            setTimeout(start, 300);
            return;
        }
        try {
            app = new window.MathApp();
            app.init();
            window.__mathApp = app; // 便于调试与自动化测试
        } catch (e) {
            console.error('应用初始化失败:', e);
            if (window.MathViz.showLibraryError) {
                window.MathViz.showLibraryError('应用初始化失败：' + (e && e.message ? e.message : e));
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(start, 50));
    } else {
        setTimeout(start, 50);
    }

    // 页面隐藏时停止新的绘图请求，节省资源
    document.addEventListener('visibilitychange', () => {
        if (app) app.autoPlot = !document.hidden;
    });
})();
