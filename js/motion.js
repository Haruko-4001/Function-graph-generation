/**
 * motion.js
 * ============================================================
 * 克制的交互动效层。
 *
 * 原则：
 *  - 只做入场、切换与状态反馈，不做连续装饰性动画
 *  - 尊重 prefers-reduced-motion
 *  - 模块可重复加载，不会在单文件版与开发版之间冲突
 * ============================================================
 */
(function () {
    'use strict';

    if (window.MathMotion) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const EASE = 'cubic-bezier(.2, .8, .2, 1)';

    /** 面板/功能块进入动画 */
    function enter(el) {
        if (!el || reduced.matches || typeof el.animate !== 'function') return;
        el.animate([
            { opacity: 0, transform: 'translateY(5px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: 190,
            easing: EASE,
            fill: 'both'
        });
    }

    /** 页面加载时按顺序显现卡片；脚本加载太晚则直接显示 */
    function revealPanels() {
        document.documentElement.classList.add('motion-ready');
        const panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
        const tooLate = (typeof performance !== 'undefined' ? performance.now() : 0) > 2800;

        if (reduced.matches || tooLate || typeof IntersectionObserver !== 'function') {
            panels.forEach((panel) => panel.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -18px 0px' });

        panels.forEach((panel, index) => {
            panel.classList.add('reveal');
            panel.style.setProperty('--reveal-delay', Math.min(index * 35, 210) + 'ms');
            observer.observe(panel);
        });
    }

    function init() {
        revealPanels();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    window.MathMotion = { enter, reducedMotion: reduced };
}());
