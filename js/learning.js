/**
 * learning.js
 * ============================================================
 * 知识地图：课程树、节点卡、结论检索。
 *
 * 数据来自 curriculum-data.js；不依赖框架，打开/关闭不影响实验室状态。
 * ============================================================
 */
(function () {
    'use strict';

    const data = window.MathCurriculum;
    if (!data) return;

    const $ = (id) => document.getElementById(id);
    const overlay = $('learn-overlay');
    const tree = $('learn-tree');
    const card = $('learn-card');
    const search = $('learn-search');
    if (!overlay || !tree || !card) return;

    const EXAM_LABEL = {
        highschool: '高中可用',
        extension: '拓展',
        university: '大学方法',
        caution: '慎用'
    };

    let currentId = null;
    let lastFocus = null;
    let closeTimer = null;

    function esc(s) {
        return String(s === undefined || s === null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function conclusionsOf(id) {
        return data.conclusions.filter((c) => c.node === id);
    }

    function renderTree() {
        tree.innerHTML = data.modules.map((m, index) => {
            const items = m.nodes.map((id) => {
                const n = data.nodes[id];
                if (!n) return '';
                return '<button type="button" class="learn-node" data-node="' + esc(id) + '">'
                    + '<span class="learn-node-id">' + esc(id) + '</span>'
                    + '<span class="learn-node-title">' + esc(n.title) + '</span>'
                    + '</button>';
            }).join('');
            return '<details class="learn-group" ' + (index < 2 ? 'open' : '') + '>'
                + '<summary><span class="learn-group-title">' + esc(m.id + ' · ' + m.title) + '</span>'
                + '<span class="learn-group-stage">' + esc(m.stage) + '</span></summary>'
                + '<div class="learn-nodes">' + items + '</div>'
                + '</details>';
        }).join('');
    }

    function renderNode(id) {
        const node = data.nodes[id];
        if (!node) return;
        currentId = id;

        tree.querySelectorAll('.learn-node').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.node === id);
        });

        const cons = conclusionsOf(id);
        const points = (node.points || []).map((p) => '<li>' + esc(p) + '</li>').join('');
        const patterns = (node.patterns || []).map((p) => '<span class="learn-chip">' + esc(p) + '</span>').join('');
        const prereq = (node.prereq || []).map((p) => {
            const n = data.nodes[p];
            return n ? '<button type="button" class="learn-link" data-node="' + esc(p) + '">' + esc(p + ' ' + n.title) + '</button>' : '';
        }).join('');

        const consHtml = cons.length
            ? cons.map((c) => {
                return '<article class="learn-conclusion">'
                    + '<div class="learn-conclusion-head"><span class="tag">' + esc(EXAM_LABEL[c.examUse] || c.examUse) + '</span>'
                    + '<span class="learn-conclusion-id">' + esc(c.id) + '</span></div>'
                    + '<p class="learn-claim">' + esc(c.text) + '</p>'
                    + '<p class="learn-meta"><b>条件</b>' + esc(c.condition) + '</p>'
                    + '<p class="learn-meta pitfall"><b>易错</b>' + esc(c.pitfall) + '</p>'
                    + '</article>';
            }).join('')
            : '<p class="learn-empty">这个节点暂时只有要点，还没有独立结论卡。</p>';

        card.innerHTML = '<div class="learn-card-head">'
            + '<div class="learn-badges"><span class="tag">' + esc(node.stage) + '</span>'
            + '<span class="tag ghost">' + esc(node.book) + '</span></div>'
            + '<h3>' + esc(node.title) + '</h3>'
            + '<p class="learn-summary">' + esc(node.summary) + '</p>'
            + '</div>'
            + '<section class="learn-section"><h4>关键结论</h4>' + consHtml + '</section>'
            + '<section class="learn-section"><h4>要点</h4><ul class="learn-points">' + points + '</ul></section>'
            + (patterns ? '<section class="learn-section"><h4>典型题型</h4><div class="learn-chips">' + patterns + '</div></section>' : '')
            + (prereq ? '<section class="learn-section"><h4>前置知识</h4><div class="learn-chips">' + prereq + '</div></section>' : '')
            + '<section class="learn-section learn-actions">'
            + '<button type="button" class="btn" data-demo="' + esc(id) + '">在实验室中验证</button>'
            + '<button type="button" class="btn ghost" data-demo-close>返回实验室</button>'
            + '</section>';

        card.scrollTop = 0;
    }

    function toolFor(id) {
        if (id.charAt(0) === 'G') return 'conic';
        if (id === 'H2') return 'polar';
        if (id.charAt(0) === 'H') return 'parametric';
        return 'explicit';
    }

    function runDemo(id) {
        const node = data.nodes[id];
        if (!node || !node.demo) return;
        const app = window.__mathApp;
        if (!app || typeof app.openDemo !== 'function') return;
        app.openDemo(node.demo, toolFor(id));
        close();
    }

    function searchAll(q) {
        const key = q.trim().toLowerCase();
        if (!key) { renderNode(currentId || 'A1'); return; }
        const nodeHits = Object.keys(data.nodes).filter((id) => {
            const n = data.nodes[id];
            return (id + ' ' + n.title + ' ' + n.summary + ' ' + (n.patterns || []).join(' ')).toLowerCase().indexOf(key) >= 0;
        });
        const conclHits = data.conclusions.filter((c) => (c.text + ' ' + c.condition + ' ' + c.pitfall).toLowerCase().indexOf(key) >= 0);

        const nodeHtml = nodeHits.map((id) => {
            const n = data.nodes[id];
            return '<button type="button" class="search-hit" data-node="' + esc(id) + '">'
                + '<b>' + esc(n.title) + '</b><span>' + esc(id + ' · ' + n.stage) + '</span></button>';
        }).join('');
        const conclHtml = conclHits.slice(0, 12).map((c) => {
            const n = data.nodes[c.node];
            return '<button type="button" class="search-hit" data-node="' + esc(c.node) + '">'
                + '<b>' + esc(c.text) + '</b><span>' + esc((n ? n.title : c.node) + ' · ' + c.id) + '</span></button>';
        }).join('');

        card.innerHTML = '<div class="learn-card-head"><div class="learn-badges"><span class="tag">搜索结果</span></div>'
            + '<h3>“' + esc(q) + '”</h3><p class="learn-summary">命中 ' + nodeHits.length + ' 个知识点，' + conclHits.length + ' 条结论。</p></div>'
            + '<section class="learn-section"><h4>知识点</h4>' + (nodeHtml || '<p class="learn-empty">没有匹配的知识点。</p>') + '</section>'
            + '<section class="learn-section"><h4>结论</h4>' + (conclHtml || '<p class="learn-empty">没有匹配的结论。</p>') + '</section>';
    }

    function open(id) {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        lastFocus = document.activeElement;
        overlay.hidden = false;
        document.body.classList.add('learn-locked');
        renderTree();
        renderNode(id || currentId || 'A1');
        requestAnimationFrame(() => {
            overlay.classList.add('open');
            if (search) search.focus();
        });
    }

    function close() {
        overlay.classList.remove('open');
        document.body.classList.remove('learn-locked');
        closeTimer = setTimeout(() => { overlay.hidden = true; closeTimer = null; }, 180);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
        const learnBtn = e.target.closest('#learn-btn');
        if (learnBtn) { open(currentId); return; }
        if (e.target.closest('#learn-close') || e.target.closest('[data-learn-close]')) { close(); return; }

        const nodeBtn = e.target.closest('[data-node]');
        if (nodeBtn && overlay.contains(nodeBtn)) {
            renderNode(nodeBtn.dataset.node);
            return;
        }
        const demoBtn = e.target.closest('[data-demo]');
        if (demoBtn) { runDemo(demoBtn.dataset.demo); return; }
        if (e.target.closest('[data-demo-close]')) { close(); return; }
    });

    if (search) {
        search.addEventListener('input', function () { searchAll(search.value); });
        search.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.hidden) { close(); return; }
        if (e.key !== 'Tab' || overlay.hidden) return;
        // 简单焦点陷阱：Tab 只在浮层内循环
        const focusables = overlay.querySelectorAll('button:not([disabled]), input, summary, [href], [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

    renderTree();
    renderNode('A1');
    document.documentElement.classList.add('learn-ready');
}());
