/**
 * learning.js
 * ============================================================
 * 学习中心：知识节点、题型卡、结论库、三层自测、讲义导出。
 *
 * 状态保存在 localStorage，不上传；题目由题型库自动生成，
 * 正确答案来自题型卡的识别信号/通法/易错点，避免硬编码题库。
 * ============================================================
 */
(function () {
    'use strict';

    const data = window.MathCurriculum;
    if (!data) return;
    const patternLib = window.MathPatterns || null;
    const patterns = patternLib ? patternLib.patterns : [];
    const patternById = patternLib ? patternLib.byId : {};
    const bookLib = window.MathBooks || null;
    const books = bookLib ? bookLib.books : [];
    const groups = data.moduleGroups || data.modules.map((m) => ({ id: m.id, title: m.title, stage: m.stage, modules: [m.id] }));
    const lessonLib = window.MathLessons || null;
    const lessons = lessonLib ? lessonLib.lessons : {};
    const examBankRaw = window.MathExamBank ? window.MathExamBank.items : [];
    const mergeLib = window.MathNodeMerge || {
        merged: {}, reason: {}, target: function (id) { return id; },
        isMerged: function () { return false; }, hostOf: function () { return []; }
    };
    const Core = window.MathCore || null;

    const $ = (id) => document.getElementById(id);
    const overlay = $('learn-overlay');
    const tree = $('learn-tree');
    const card = $('learn-card');
    const search = $('learn-search');
    if (!overlay || !tree || !card) return;

    const STORE_KEY = 'mfv.learning.v1';
    const EXAM_LABEL = { highschool: '高中可用', extension: '拓展', university: '大学方法', caution: '慎用' };
    const TYPE_LABEL = { identify: '识别', method: '方法', pitfall: '错因' };

    let currentId = null;
    let lastFocus = null;
    let closeTimer = null;
    let session = null;

    const EXP_BASE = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: '#fbf8f1',
        font: { color: '#5f675f', size: 10 },
        margin: { l: 44, r: 18, t: 34, b: 56 },
        showlegend: true,
        legend: { orientation: 'h', y: -0.18, x: 0, font: { size: 9 } },
        xaxis: { gridcolor: 'rgba(36,48,42,.08)', zerolinecolor: 'rgba(36,48,42,.22)' },
        yaxis: { gridcolor: 'rgba(36,48,42,.08)', zerolinecolor: 'rgba(36,48,42,.22)' }
    };

    function lin(a, b, n) {
        const out = [];
        for (let i = 0; i <= n; i++) out.push(a + (b - a) * i / n);
        return out;
    }

    const EXPERIMENTS = [
        {
            id: 'secant', title: '割线 → 切线', hint: '让 h 趋近 0，看割线斜率如何变成切线斜率。',
            params: [{ key: 'h', label: '增量 h', min: -1.5, max: 1.5, step: 0.05, value: 1 }],
            build(v) {
                const h = Math.abs(v.h) < 1e-3 ? 1e-3 : v.h;
                const x0 = 1, y0 = 1;
                const x1 = x0 + h, y1 = x1 * x1;
                const k = (y1 - y0) / h;
                const xs = lin(-0.2, 3.2, 240);
                return {
                    traces: [
                        { x: xs, y: xs.map((x) => x * x), type: 'scattergl', mode: 'lines', name: 'y=x²', line: { color: '#2f6b52', width: 2 } },
                        { x: [x0, x1], y: [y0, y1], type: 'scatter', mode: 'lines+markers', name: '割线', line: { color: '#b5613a', width: 1.8, dash: 'dot' }, marker: { size: 5 } },
                        { x: xs, y: xs.map((x) => 2 * x - 1), type: 'scattergl', mode: 'lines', name: '切线', line: { color: '#6b5b95', width: 1.6, dash: 'dash' } }
                    ],
                    layout: Object.assign({}, EXP_BASE, { title: { text: '割线斜率 ' + k.toFixed(4) + ' → 切线斜率 2', font: { size: 11, color: '#4f5a53' }, x: 0.01 } }),
                    note: '当 h=' + h.toFixed(2) + ' 时，割线斜率为 <b>' + k.toFixed(4) + '</b>；h→0 时趋近 2。'
                };
            }
        },
        {
            id: 'tangent', title: '切线与法线', hint: '拖动 x₀，观察切线与法线随导数变化。',
            params: [{ key: 'x0', label: '切点 x₀', min: -2.5, max: 2.5, step: 0.05, value: 1 }],
            build(v) {
                const x0 = v.x0, y0 = x0 * x0 * x0 - 3 * x0;
                const k = 3 * x0 * x0 - 3;
                const xs = lin(-2.6, 2.6, 260);
                const traces = [
                    { x: xs, y: xs.map((x) => x * x * x - 3 * x), type: 'scattergl', mode: 'lines', name: 'f(x)', line: { color: '#2f6b52', width: 2 } },
                    { x: xs, y: xs.map((x) => y0 + k * (x - x0)), type: 'scattergl', mode: 'lines', name: '切线', line: { color: '#b5613a', width: 1.8, dash: 'dash' } }
                ];
                if (Math.abs(k) > 1e-6) {
                    const m2 = -1 / k;
                    traces.push({ x: xs, y: xs.map((x) => y0 + m2 * (x - x0)), type: 'scattergl', mode: 'lines', name: '法线', line: { color: '#6b5b95', width: 1.4, dash: 'dot' } });
                }
                return {
                    traces,
                    layout: Object.assign({}, EXP_BASE, { title: { text: 'f′(x₀) = ' + k.toFixed(3), font: { size: 11, color: '#4f5a53' }, x: 0.01 } }),
                    note: '切点 (' + x0.toFixed(2) + ', ' + y0.toFixed(2) + ')，斜率 <b>' + k.toFixed(3) + '</b>；法线斜率 ' + (Math.abs(k) > 1e-6 ? (-1 / k).toFixed(3) : '不存在') + '。'
                };
            }
        },
        {
            id: 'signchart', title: '函数与导数符号', hint: '对比 f(x) 与 f′(x)，看导数符号如何决定单调性。',
            params: [{ key: 'a', label: '系数 a', min: 0.5, max: 4, step: 0.1, value: 3 }],
            build(v) {
                const a = v.a;
                const xs = lin(-3, 3, 260);
                const f = (x) => x * x * x - a * x;
                const d = (x) => 3 * x * x - a;
                const r = window.MathCore.analyzeFunction('x^3 - ' + a + '*x', { xMin: -3, xMax: 3 });
                return {
                    traces: [
                        { x: xs, y: xs.map(f), type: 'scattergl', mode: 'lines', name: 'f(x)', line: { color: '#2f6b52', width: 2 } },
                        { x: xs, y: xs.map(d), type: 'scattergl', mode: 'lines', name: "f′(x)", line: { color: '#b5613a', width: 1.5, dash: 'dot' } }
                    ],
                    layout: Object.assign({}, EXP_BASE, { title: { text: 'f′>0 的区间就是递增区间', font: { size: 11, color: '#4f5a53' }, x: 0.01 } }),
                    note: '极小值 x≈' + (r.extrema.minima[0] ? r.extrema.minima[0].x.toFixed(3) : '—')
                        + '，极大值 x≈' + (r.extrema.maxima[0] ? r.extrema.maxima[0].x.toFixed(3) : '—') + '。'
                };
            }
        },
        {
            id: 'ellipse', title: '椭圆定义', hint: '拖动 P 点，验证 |PF₁|+|PF₂| 恒等于 2a。',
            params: [{ key: 'c', label: '半焦距 c', min: 0.5, max: 4.5, step: 0.1, value: 3 }, { key: 't', label: 'P 的参数', min: 0, max: 6.28, step: 0.05, value: 1 }],
            build(v) {
                const a = 5, c = v.c, b = Math.sqrt(Math.max(0.01, a * a - c * c));
                const t = v.t;
                const P = { x: a * Math.cos(t), y: b * Math.sin(t) };
                const F1 = { x: -c, y: 0 }, F2 = { x: c, y: 0 };
                const d1 = Math.hypot(P.x - F1.x, P.y - F1.y);
                const d2 = Math.hypot(P.x - F2.x, P.y - F2.y);
                const ts = lin(0, Math.PI * 2, 240);
                return {
                    traces: [
                        { x: ts.map((x) => a * Math.cos(x)), y: ts.map((x) => b * Math.sin(x)), type: 'scattergl', mode: 'lines', name: '椭圆', line: { color: '#2f6b52', width: 2 } },
                        { x: [F1.x, P.x, F2.x], y: [F1.y, P.y, F2.y], type: 'scatter', mode: 'lines+markers', name: 'PF₁、PF₂', line: { color: '#b5613a', width: 1.6 }, marker: { size: [9, 9, 9], color: ['#b5613a', '#8a7a3f', '#b5613a'] }, text: ['F₁', 'P', 'F₂'], textposition: 'top center' }
                    ],
                    layout: Object.assign({}, EXP_BASE, { title: { text: '|PF₁| + |PF₂| = ' + (d1 + d2).toFixed(3), font: { size: 11, color: '#4f5a53' }, x: 0.01 }, xaxis: Object.assign({}, EXP_BASE.xaxis, { range: [-6, 6] }), yaxis: Object.assign({}, EXP_BASE.yaxis, { range: [-4.5, 4.5], scaleanchor: 'x', constrain: 'domain' }) }),
                    note: '|PF₁|=' + d1.toFixed(3) + '，|PF₂|=' + d2.toFixed(3) + '，和 <b>' + (d1 + d2).toFixed(3) + '</b>，恒等于 2a=10。'
                };
            }
        },
        {
            id: 'eccentricity', title: '离心率与形状', hint: 'e 越大，椭圆越扁；e→1 时趋近抛物线。',
            params: [{ key: 'e', label: '离心率 e', min: 0.1, max: 0.95, step: 0.01, value: 0.6 }],
            build(v) {
                const a = 4, e = v.e, b = a * Math.sqrt(1 - e * e), c = a * e;
                const ts = lin(0, Math.PI * 2, 240);
                return {
                    traces: [
                        { x: ts.map((t) => a * Math.cos(t)), y: ts.map((t) => b * Math.sin(t)), type: 'scattergl', mode: 'lines', name: '椭圆', line: { color: '#2f6b52', width: 2 } },
                        { x: [-c, c], y: [0, 0], type: 'scatter', mode: 'markers+text', name: '焦点', marker: { size: 8, color: '#b5613a' }, text: ['F₁', 'F₂'], textposition: 'bottom center' }
                    ],
                    layout: Object.assign({}, EXP_BASE, { title: { text: 'e = ' + e.toFixed(2) + '，b = ' + b.toFixed(3), font: { size: 11, color: '#4f5a53' }, x: 0.01 }, xaxis: Object.assign({}, EXP_BASE.xaxis, { range: [-4.8, 4.8] }), yaxis: Object.assign({}, EXP_BASE.yaxis, { range: [-4.2, 4.2], scaleanchor: 'x', constrain: 'domain' }) }),
                    note: 'a=4，c=' + c.toFixed(3) + '，b=' + b.toFixed(3) + '。e 越接近 1，短轴越短、图像越扁。'
                };
            }
        },
        {
            id: 'param', title: '参数扫描', hint: '拖动 a，观察函数族如何连续变化。',
            params: [{ key: 'a', label: '参数 a', min: -3, max: 3, step: 0.1, value: 1 }],
            build(v) {
                const xs = lin(-8, 8, 260);
                return {
                    traces: [{ x: xs, y: xs.map((x) => v.a * Math.sin(x)), type: 'scattergl', mode: 'lines', name: 'y=a·sin x', line: { color: '#2f6b52', width: 2 } }],
                    layout: Object.assign({}, EXP_BASE, { title: { text: 'a = ' + v.a.toFixed(1), font: { size: 11, color: '#4f5a53' }, x: 0.01 } }),
                    note: 'a 控制振幅；a<0 时图像关于 x 轴翻转。'
                };
            }
        },
        {
            id: 'area', title: '面积累积', hint: '拖动上限 b，观察定积分作为“累积面积”的变化。',
            params: [{ key: 'b', label: '上限 b', min: 0, max: 6.28, step: 0.05, value: 3.14 }],
            build(v) {
                const f = (x) => Math.sin(x) + 1.5;
                const b = v.b;
                const xs = lin(0, b, 120);
                const all = lin(0, Math.PI * 2, 240);
                const area = window.MathCore.adaptiveSimpson(f, 0, b, 1e-8, 20).value;
                return {
                    traces: [
                        { x: xs, y: xs.map(() => 0), type: 'scattergl', mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
                        { x: xs, y: xs.map(f), type: 'scattergl', mode: 'lines', fill: 'tonexty', fillcolor: 'rgba(47,107,82,.14)', line: { color: '#2f6b52', width: 2 }, name: 'f(x)' },
                        { x: all, y: all.map(f), type: 'scattergl', mode: 'lines', line: { color: 'rgba(47,107,82,.35)', width: 1 }, name: '完整曲线' }
                    ],
                    layout: Object.assign({}, EXP_BASE, { title: { text: '∫₀^' + b.toFixed(2) + ' f = ' + area.toFixed(4), font: { size: 11, color: '#4f5a53' }, x: 0.01 } }),
                    note: '当前面积（带符号）≈ <b>' + area.toFixed(4) + '</b>；面积随上限增加而累积。'
                };
            }
        }
    ];

    const state = loadState();

    function loadState() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }
        saved.stats = saved.stats || { attempted: 0, correct: 0, byType: {}, wrong: {} };
        saved.stats.byType = saved.stats.byType || {};
        saved.stats.wrong = saved.stats.wrong || {};
        saved.stats.exam = saved.stats.exam || { asked: 0, mastered: 0, partial: 0, missed: 0 };
        return {
            tab: 'nodes',
            nodeId: 'A1',
            patternId: null,
            chapterId: 'D-1',
            query: '',
            examFilter: 'all',
            experimentId: 'secant',
            expValues: {},
            selected: new Set(saved.selected || []),
            studied: saved.studied || {},
            stats: saved.stats || { attempted: 0, correct: 0, byType: {}, wrong: {} }
        };
    }

    function persist() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({
                selected: Array.from(state.selected),
                studied: state.studied,
                stats: state.stats
            }));
        } catch (e) { /* 隐私模式忽略 */ }
    }

    function esc(s) {
        return String(s === undefined || s === null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function hostIds(id) { return [id].concat(mergeLib.hostOf(id)); }
    function conclusionsOf(id) {
        const ids = hostIds(id);
        return data.conclusions.filter((c) => ids.indexOf(c.node) >= 0);
    }
    function patternsOf(id) {
        const ids = hostIds(id);
        return patterns.filter((p) => ids.indexOf(p.node) >= 0);
    }
    function studiedCount() { return Object.keys(state.studied).filter((id) => data.nodes[id]).length; }

    function shuffle(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function uniqueOptions(correct, pool, n) {
        const opts = [correct];
        shuffle(pool).forEach((v) => {
            if (opts.length >= n) return;
            if (!v || opts.indexOf(v) >= 0) return;
            opts.push(v);
        });
        return shuffle(opts);
    }

    /* ---------------- 侧栏 ---------------- */

    function renderTreeNodes() {
        const q = state.query.trim().toLowerCase();
        const html = groups.map((g, index) => {
            const all = [];
            g.modules.forEach((mid) => {
                const m = data.modules.filter((x) => x.id === mid)[0];
                if (m) all.push.apply(all, m.nodes);
            });
            const nodes = all.filter((id) => {
                if (mergeLib.isMerged(id)) return false;
                if (!q) return true;
                const n = data.nodes[id];
                return (id + ' ' + n.title + ' ' + n.summary + ' ' + (n.patterns || []).join(' ')).toLowerCase().indexOf(q) >= 0;
            });
            if (!nodes.length) return '';
            const items = nodes.map((id) => {
                const n = data.nodes[id];
                return '<button type="button" class="learn-node' + (id === state.nodeId && state.tab === 'nodes' ? ' active' : '') + '" data-node="' + esc(id) + '">'
                    + '<span class="learn-node-id">' + esc(id) + '</span>'
                    + '<span class="learn-node-title">' + esc(n.title) + '</span>'
                    + (state.studied[id] ? '<span class="learn-done" aria-label="已学">✓</span>' : '')
                    + '</button>';
            }).join('');
            return '<details class="learn-group" ' + (q || index === 0 ? 'open' : '') + '>'
                + '<summary><span class="learn-group-title">' + esc(g.title) + '</span>'
                + '<span class="learn-group-stage">' + esc(g.stage) + ' · ' + nodes.length + ' 节</span></summary>'
                + '<div class="learn-nodes">' + items + '</div></details>';
        }).join('');

        const pct = Math.round(studiedCount() / 62 * 100);
        tree.innerHTML = '<div class="learn-progress">'
            + '<div class="learn-progress-head"><span>学习进度</span><b>' + studiedCount() + '/62</b></div>'
            + '<div class="learn-progress-bar"><i style="width:' + pct + '%"></i></div>'
            + '</div>' + (html || '<p class="learn-empty">没有匹配的知识点。</p>');
    }

    function renderTreePatterns() {
        const q = state.query.trim().toLowerCase();
        const html = groups.map((g) => {
            const list = patterns.filter((p) => g.modules.indexOf(p.module) >= 0 && (!q
                || (p.title + ' ' + p.signals + ' ' + p.variants.join(' ')).toLowerCase().indexOf(q) >= 0));
            if (!list.length) return '';
            const items = list.map((p) => '<button type="button" class="learn-node learn-pattern-node'
                + (p.id === state.patternId && state.tab === 'patterns' ? ' active' : '') + '" data-pattern="' + esc(p.id) + '">'
                + '<span class="learn-node-id">' + esc(p.id) + '</span>'
                + '<span class="learn-node-title">' + esc(p.title) + '</span>'
                + '<span class="learn-pattern-count">' + p.variants.length + '</span>'
                + '</button>').join('');
            return '<details class="learn-group" open><summary><span class="learn-group-title">'
                + esc(g.title) + '</span><span class="learn-group-stage">' + list.length + ' 族</span></summary>'
                + '<div class="learn-nodes">' + items + '</div></details>';
        }).join('');
        tree.innerHTML = '<div class="learn-progress"><div class="learn-progress-head"><span>题型库</span><b>'
            + patterns.length + ' 族 / ' + (patternLib ? patternLib.variantCount() : 0) + ' 子型</b></div></div>'
            + (html || '<p class="learn-empty">没有匹配的题型。</p>');
    }

    function renderTreeConclusions() {
        const filters = [['all', '全部'], ['highschool', '高中可用'], ['extension', '拓展'], ['university', '大学方法']];
        tree.innerHTML = '<div class="learn-filter">' + filters.map((f) => '<button type="button" class="learn-filter-btn'
            + (state.examFilter === f[0] ? ' active' : '') + '" data-exam-filter="' + f[0] + '">' + f[1] + '</button>').join('')
            + '</div><p class="learn-side-note">共 ' + data.conclusions.length + ' 条结论，每条都带条件与易错点。</p>';
    }

    function renderTreePractice() {
        const s = state.stats;
        const rate = s.attempted ? Math.round(s.correct / s.attempted * 100) : 0;
        tree.innerHTML = '<div class="practice-stats">'
            + '<div><b>' + s.attempted + '</b><span>已答</span></div>'
            + '<div><b>' + s.correct + '</b><span>答对</span></div>'
            + '<div><b>' + rate + '%</b><span>正确率</span></div>'
            + '</div>'
            + '<div class="learn-filter">'
            + '<button class="learn-filter-btn" data-start-practice="exam">真题演练</button>'
            + '<button class="learn-filter-btn" data-start-practice="exam-all">全真题池（30 题）</button>'
            + '</div>'
            + '<p class="learn-side-note">真题演练：已练 ' + (s.exam ? s.exam.asked : 0) + ' 题，掌握 '
                + (s.exam ? s.exam.mastered : 0) + ' 题</p>'
            + '<p class="learn-side-note">真题演练：已练 ' + (s.exam ? s.exam.asked : 0) + ' 题，掌握 '
                + (s.exam ? s.exam.mastered : 0) + ' 题</p>'
            + '<button class="learn-reset" type="button" data-reset-stats>清空练习统计</button>'
            + (Object.keys(s.wrong).length ? '<p class="learn-side-note">薄弱题型：'
                + Object.keys(s.wrong).sort((a, b) => s.wrong[b] - s.wrong[a]).slice(0, 4)
                    .map((id) => esc(patternById[id] ? patternById[id].title : id)).join('、') + '</p>' : '');
    }

    function renderSidebar() {
        const noSearch = state.tab === 'practice' || state.tab === 'experiments';
        const searchLabel = document.querySelector('.learn-search-label');
        if (searchLabel) searchLabel.style.display = noSearch ? 'none' : '';
        if (search) search.style.display = noSearch ? 'none' : '';
        if (search) {
            search.placeholder = state.tab === 'nodes' ? '例如：极值点偏移、焦点三角形'
                : state.tab === 'patterns' ? '例如：切线、零点个数、中点弦'
                : '例如：e²−1、隐零点、放缩';
        }
        if (state.tab === 'nodes') renderTreeNodes();
        else if (state.tab === 'patterns') renderTreePatterns();
        else if (state.tab === 'books') renderTreeBooks();
        else if (state.tab === 'conclusions') renderTreeConclusions();
        else if (state.tab === 'practice') renderTreePractice();
        else renderTreeExperiments();
    }

    function renderTreeBooks() {
        const q = state.query.trim().toLowerCase();
        const html = books.map((b) => {
            const chapters = b.chapters.filter((c) => !q
                || (c.title + ' ' + c.summary + ' ' + c.topics.join(' ')).toLowerCase().indexOf(q) >= 0);
            if (!chapters.length) return '';
            const items = chapters.map((c) => '<button type="button" class="learn-node'
                + (c.id === state.chapterId && state.tab === 'books' ? ' active' : '') + '" data-chapter="' + esc(c.id) + '">'
                + '<span class="learn-node-id">' + esc(c.id) + '</span>'
                + '<span class="learn-node-title">' + esc(c.title.replace(/^第.+章\s*/, '')) + '</span>'
                + '</button>').join('');
            return '<details class="learn-group" open><summary><span class="learn-group-title">' + esc(b.title) + '</span>'
                + '<span class="learn-group-stage">' + esc(b.subtitle) + '</span></summary>'
                + '<div class="learn-nodes">' + items + '</div></details>';
        }).join('');
        tree.innerHTML = '<p class="learn-side-note">两本专著 · ' + books.reduce((n, b) => n + b.chapters.length, 0)
            + ' 章 · 完整小节索引</p>' + (html || '<p class="learn-empty">没有匹配的章节。</p>');
    }

    function renderTreeExperiments() {
        tree.innerHTML = '<div class="learn-side-note" style="margin:-2px 0 10px">7 个交互实验，全部在浏览器内实时计算。</div>'
            + '<div class="experiment-list">' + EXPERIMENTS.map((x) => '<button type="button" class="experiment-btn'
                + (x.id === state.experimentId ? ' active' : '') + '" data-experiment="' + x.id + '">'
                + '<b>' + esc(x.title) + '</b><span>' + esc(x.hint) + '</span></button>').join('') + '</div>';
    }

    /* ---------------- 知识节点卡 ---------------- */

    function bookContextFor(id) {
        const pids = patternsOf(id).map((p) => p.id);
        const out = [];
        books.forEach((b) => b.chapters.forEach((c) => {
            if ((c.patterns || []).some((pid) => pids.indexOf(pid) >= 0)) out.push({ book: b, chapter: c });
        }));
        return out;
    }

    function bookContextHtml(id) {
        const list = bookContextFor(id);
        if (!list.length) return '<p class="learn-empty">这个节点主要对应教材主线，暂无专著章节定位。</p>';
        return '<div class="book-context">' + list.map((x) => {
            const topics = x.chapter.topics.map((t) => '<li>' + esc(t) + '</li>').join('');
            return '<details class="book-context-item"><summary><span class="tag">' + esc(x.book.title) + '</span>'
                + '<span>' + esc(x.chapter.title) + '</span><span class="book-context-count">' + x.chapter.topics.length + ' 节</span></summary>'
                + '<p class="learn-summary">' + esc(x.chapter.summary) + '</p>'
                + '<ul class="book-context-topics">' + topics + '</ul></details>';
        }).join('') + '</div>';
    }

    function renderNode(id) {
        const node = data.nodes[id];
        if (!node) return;
        state.nodeId = id;
        state.studied[id] = true;
        persist();

        const cons = conclusionsOf(id);
        const pats = patternsOf(id);
        const points = (node.points || []).map((p) => '<li>' + esc(p) + '</li>').join('');
        const chips = pats.map((p) => '<button type="button" class="learn-chip action" data-pattern="' + esc(p.id) + '">'
            + esc(p.title) + '<span>' + p.variants.length + '</span></button>').join('');
        const prereq = (node.prereq || []).map((p) => {
            const n = data.nodes[p];
            return n ? '<button type="button" class="learn-link" data-node="' + esc(p) + '">' + esc(p + ' ' + n.title) + '</button>' : '';
        }).join('');
        const selected = state.selected.has(id);
        const methodSteps = [];
        pats.slice(0, 3).forEach((p) => {
            (p.steps || []).forEach((st) => {
                if (methodSteps.indexOf(st) < 0) methodSteps.push(st);
            });
        });
        const methodHtml = methodSteps.length
            ? '<ol class="learn-method">' + methodSteps.slice(0, 6).map((st) => '<li>' + esc(st) + '</li>').join('') + '</ol>'
            : '<p class="learn-empty">这个节点的通法随关联题型给出。</p>';
        const hosts = mergeLib.hostOf(id);
        const hostHtml = hosts.length
            ? '<p class="learn-merged">已并入：' + hosts.map((hid) => {
                const hn = data.nodes[hid];
                return esc(hid + (hn ? ' ' + hn.title : '') + '——' + (mergeLib.reason[hid] || '内容较单薄'));
            }).join('；') + '</p>'
            : '';

        const consHtml = cons.length ? cons.map(conclusionHtml).join('')
            : '<p class="learn-empty">这个节点暂时只有要点，还没有独立结论卡。</p>';

        card.innerHTML = '<div class="learn-card-head">'
            + '<div class="learn-badges"><span class="tag">' + esc(node.stage) + '</span>'
            + '<span class="tag ghost">' + esc(node.book) + '</span>'
            + '<button type="button" class="tag action" data-select-node="' + esc(id) + '">'
            + (selected ? '移出讲义' : '加入讲义') + '</button></div>'
            + '<h3>' + esc(node.title) + '</h3>'
            + '<p class="learn-summary">' + esc(node.summary) + '</p>'
            + '</div>'
            + '<section class="learn-section"><h4>关键结论</h4>' + consHtml + '</section>'
            + '<section class="learn-section"><h4>要点</h4><ul class="learn-points">' + points + '</ul></section>'
            + hostHtml
            + '<section class="learn-section"><h4>通法</h4>' + methodHtml + '</section>'
            + '<section class="learn-section"><h4>例题 · 3–4 道</h4>' + nodeExamplesHtml(id) + '</section>'
            + (chips ? '<section class="learn-section"><h4>关联题型</h4><div class="learn-chips">' + chips + '</div></section>' : '')
            + '<section class="learn-section"><h4>书目定位</h4>' + bookContextHtml(id) + '</section>'
            + (prereq ? '<section class="learn-section"><h4>前置知识</h4><div class="learn-chips">' + prereq + '</div></section>' : '')
            + Object.keys(lessons).filter((k) => lessons[k].nodeId === id).map((k) => lessonHtml(k)).join('')
            + '<section class="learn-section learn-actions">'
            + '<button type="button" class="btn" data-demo="' + esc(id) + '">在实验室中验证</button>'
            + '<button type="button" class="btn ghost" data-demo-close>返回实验室</button>'
            + '</section>';

        card.scrollTop = 0;
    }

    function conclusionUsage(c) {
        const ps = patternsOf(c.node);
        const steps = [];
        ps.slice(0, 2).forEach((p) => {
            (p.steps || []).forEach((s) => { if (steps.indexOf(s) < 0) steps.push(s); });
        });
        if (!steps.length) steps.push('先核对结论的适用条件，再把题目数据代入，不要跳过条件验证。');
        return steps.slice(0, 4);
    }

    function conclusionHtml(c) {
        const usage = conclusionUsage(c).map((s) => '<li>' + esc(s) + '</li>').join('');
        return '<article class="learn-conclusion">'
            + '<div class="learn-conclusion-head"><span class="tag">' + esc(EXAM_LABEL[c.examUse] || c.examUse) + '</span>'
            + '<span class="learn-conclusion-id">' + esc(c.id) + '</span></div>'
            + '<p class="learn-claim-form">当 <b>' + esc(c.condition) + '</b> 时 ⇒ <b>' + esc(c.text) + '</b></p>'
            + '<div class="learn-usage"><b>做题用法</b><ol>' + usage + '</ol></div>'
            + '<p class="learn-meta pitfall"><b>易错</b>' + esc(c.pitfall) + '</p>'
            + '</article>';
    }

    /* ---------------- 题型卡 ---------------- */

    function renderPattern(id) {
        const p = patternById[id];
        if (!p) return;
        state.patternId = id;
        const node = data.nodes[p.node];
        const cons = conclusionsOf(p.node);
        const variants = p.variants.map((v) => '<span class="learn-chip">' + esc(v) + '</span>').join('');
        const steps = p.steps.map((s, i) => '<li><b>' + (i + 1) + '</b>' + esc(s) + '</li>').join('');

        card.innerHTML = '<div class="learn-card-head">'
            + '<div class="learn-badges"><span class="tag">' + esc(p.stage) + '</span>'
            + '<button type="button" class="tag ghost action" data-node="' + esc(p.node) + '">' + esc(p.id + ' · ' + (node ? node.title : '')) + '</button></div>'
            + '<h3>' + esc(p.title) + '</h3>'
            + '<p class="learn-summary">' + esc(node ? node.summary : '') + '</p>'
            + '</div>'
            + '<section class="learn-section"><h4>识别信号</h4><p class="learn-signal">' + esc(p.signals) + '</p>'
            + '<p class="learn-meta"><b>子型</b></p><div class="learn-chips">' + variants + '</div></section>'
            + '<section class="learn-section"><h4>通法</h4><ol class="learn-steps">' + steps + '</ol></section>'
            + '<section class="learn-section"><h4>易错点</h4><p class="learn-meta pitfall"><b>注意</b>' + esc(p.pitfalls) + '</p></section>'
            + '<section class="learn-section"><h4>支撑结论</h4>' + (cons.length ? cons.slice(0, 3).map(conclusionHtml).join('') : '<p class="learn-empty">关联结论见知识节点。</p>') + '</section>'
            + '<section class="learn-section learn-actions">'
            + '<button type="button" class="btn" data-demo-pattern="' + esc(p.id) + '">在实验室验证</button>'
            + '<button type="button" class="btn ghost" data-start-practice="pattern" data-pattern-id="' + esc(p.id) + '">练这个题型</button>'
            + '</section>';

        card.scrollTop = 0;
    }

    /* ---------------- 书目 ---------------- */

    function findChapter(id) {
        for (let i = 0; i < books.length; i++) {
            const c = books[i].chapters.filter((x) => x.id === id)[0];
            if (c) return { book: books[i], chapter: c };
        }
        return null;
    }

    function renderChapter(id) {
        const found = findChapter(id) || findChapter('D-1');
        if (!found) return;
        state.chapterId = found.chapter.id;
        const b = found.book, c = found.chapter;
        const topics = c.topics.map((t, i) => '<li><span class="book-topic-no">' + String(i + 1).padStart(2, '0') + '</span>'
            + '<span>' + esc(t) + '</span></li>').join('');
        const pats = c.patterns.map((pid) => {
            const p = patternById[pid];
            return p ? '<button type="button" class="learn-chip action" data-pattern="' + esc(pid) + '">'
                + esc(pid + ' ' + p.title) + '</button>' : '';
        }).join('');

        card.innerHTML = '<div class="learn-card-head">'
            + '<div class="learn-badges"><span class="tag">' + esc(b.title) + '</span>'
            + '<span class="tag ghost">' + esc(b.subtitle) + '</span></div>'
            + '<h3>' + esc(c.title) + '</h3>'
            + '<p class="learn-summary">' + esc(c.summary) + '</p></div>'
            + '<section class="learn-section"><h4>本章小节</h4><ol class="book-topics">' + topics + '</ol></section>'
            + (pats ? '<section class="learn-section"><h4>对应题型卡</h4><div class="learn-chips">' + pats + '</div></section>' : '')
            + lessonHtml(c.id)
            + '<section class="learn-section"><h4>怎么用这条书目</h4>'
            + '<p class="learn-summary">先按小节读一遍，再打开对应题型卡看“识别信号—通法—易错点”，'
            + '最后去实验室或实验页签动手验证。书目只负责结构与路径，具体方法在题型卡里。</p></section>';
        card.scrollTop = 0;
    }

    function lessonHtml(chapterId) {
        const lesson = lessons[chapterId];
        if (!lesson) return '';
        const sections = lesson.sections.map((sec, si) => {
            const body = (sec.body || []).map((p) => '<p>' + p + '</p>').join('');
            const method = (sec.method || []).map((m) => '<li>' + esc(m) + '</li>').join('');
            const examples = sec.examples.map((ex) => {
                const steps = ex.steps.map((st) => '<li>' + st + '</li>').join('');
                return '<article class="lesson-example">'
                    + '<div class="lesson-example-head"><span class="tag">' + esc(ex.tag) + '</span>'
                    + '<b>' + esc(ex.id) + '</b></div>'
                    + '<p class="lesson-source">来源：' + esc(ex.source || '未标注') + '</p>'
                    + '<p class="lesson-problem">' + ex.problem + '</p>'
                    + '<p class="lesson-analysis"><b>分析</b>' + ex.analysis + '</p>'
                    + '<details class="lesson-answer"><summary>查看解答与答案</summary>'
                    + '<ol class="lesson-steps">' + steps + '</ol>'
                    + '<p class="lesson-answer-line"><b>答案</b>' + ex.answer + '</p>'
                    + '<p class="lesson-link"><b>与正文的关系</b>' + ex.link + '</p>'
                    + '<p class="lesson-pitfall"><b>易错</b>' + ex.pitfall + '</p>'
                    + '</details></article>';
            }).join('');

            return '<details class="lesson-sec" ' + (si === 0 ? 'open' : '') + '>'
                + '<summary><span class="lesson-sec-no">' + esc(sec.id) + '</span>'
                + '<span class="lesson-sec-title">' + esc(sec.title.replace(/^\d+\.\d+\s*/, '')) + '</span>'
                + '<span class="lesson-sec-count">' + sec.examples.length + ' 例</span></summary>'
                + '<div class="lesson-body"><p class="lesson-lead">' + esc(sec.lead) + '</p>'
                + body
                + '<h5>通法</h5><ol class="lesson-method">' + method + '</ol>'
                + '<div class="lesson-examples">' + examples + '</div></div></details>';
        }).join('');

        return '<section class="lesson-sample"><div class="lesson-sample-head">'
            + '<div class="learn-badges"><span class="tag">' + esc(lesson.badge) + '</span>'
            + '<span class="tag ghost">' + esc(lesson.title) + '</span></div>'
            + '<h3>' + esc(lesson.title) + ' · 精讲</h3>'
            + '<p>' + esc(lesson.intro) + '</p>'
            + '<p class="lesson-sample-note">' + esc(lesson.note) + '</p></div>'
            + '<div class="lesson-sections">' + sections + '</div></section>';
    }

    /* ---------------- 结论库 ---------------- */

    function renderConclusions() {
        const q = state.query.trim().toLowerCase();
        const list = data.conclusions.filter((c) => {
            if (state.examFilter !== 'all' && c.examUse !== state.examFilter) return false;
            if (!q) return true;
            return (c.text + ' ' + c.condition + ' ' + c.pitfall + ' ' + c.id).toLowerCase().indexOf(q) >= 0;
        });

        const groups = {};
        list.forEach((c) => { (groups[c.node] = groups[c.node] || []).push(c); });
        const html = Object.keys(groups).map((nodeId) => {
            const n = data.nodes[nodeId];
            return '<section class="learn-section"><h4><button type="button" class="learn-link" data-node="' + esc(nodeId) + '">'
                + esc(nodeId + ' · ' + (n ? n.title : nodeId)) + '</button></h4>'
                + groups[nodeId].map(conclusionHtml).join('') + '</section>';
        }).join('');

        card.innerHTML = '<div class="learn-card-head"><div class="learn-badges"><span class="tag">结论库</span></div>'
            + '<h3>' + (state.examFilter === 'all' ? '全部结论' : EXAM_LABEL[state.examFilter]) + '</h3>'
            + '<p class="learn-summary">命中 ' + list.length + ' 条。每条都注明条件与易错点，大学方法单独标记。</p></div>'
            + (html || '<p class="learn-empty">没有匹配的结论。</p>');
        card.scrollTop = 0;
    }

    /* ---------------- 三层自测 ---------------- */

    function makeQuestion(type, p) {
        const others = patterns.filter((x) => x.id !== p.id);
        let prompt, correct, pool;
        if (type === 'identify') {
            prompt = '题干出现「' + p.signals + '」，最可能属于哪一题型？';
            correct = p.title;
            pool = others.map((x) => x.title);
        } else if (type === 'method') {
            prompt = '做「' + p.title + '」时，第一步通常是？';
            correct = p.steps[0];
            pool = others.map((x) => x.steps[0]);
        } else {
            prompt = '做「' + p.title + '」最容易错在哪里？';
            correct = p.pitfalls;
            pool = others.map((x) => x.pitfalls);
        }
        const options = uniqueOptions(correct, pool, 4);
        return {
            type,
            patternId: p.id,
            prompt,
            options,
            correct: options.indexOf(correct),
            explain: p.title + '：' + p.steps.join(' → ')
        };
    }

    function startPractice(kind, patternId) {
        if (kind === 'exam' || kind === 'exam-all') {
            const pool = buildExamPool();
            const questions = kind === 'exam-all' ? shuffle(pool).slice(0, 30) : shuffle(pool).slice(0, 10);
            session = { mode: 'exam', questions, index: 0, answers: [], wrong: [], finished: false, feedback: null, showSteps: false, showAnswer: false, rated: null };
            state.tab = 'practice';
            render();
            card.scrollTop = 0;
            return;
        }
        let questions = [];
        if (kind === 'pattern' && patternById[patternId]) {
            ['identify', 'method', 'pitfall'].forEach((type) => {
                questions.push(makeQuestion(type, patternById[patternId]));
            });
        } else {
            const types = kind === 'mixed' ? ['identify', 'method', 'pitfall'] : [kind];
            const chosen = shuffle(patterns).slice(0, 10);
            chosen.forEach((p, i) => {
                const type = types[i % types.length];
                questions.push(makeQuestion(type, p));
            });
        }
        session = { mode: 'choice', questions, index: 0, answers: [], wrong: [], finished: false, feedback: null };
        state.tab = 'practice';
        render();
        card.scrollTop = 0;
    }

    function answerQuestion(choice) {
        if (!session || session.finished || session.feedback) return;
        const q = session.questions[session.index];
        const ok = choice === q.correct;
        session.answers.push(ok);
        if (!ok) session.wrong.push(q);
        session.feedback = { choice, ok };

        const st = state.stats;
        st.attempted++;
        if (ok) st.correct++;
        const t = st.byType[q.type] || (st.byType[q.type] = { attempted: 0, correct: 0 });
        t.attempted++;
        if (ok) t.correct++;
        if (!ok) st.wrong[q.patternId] = (st.wrong[q.patternId] || 0) + 1;
        persist();
        renderSidebar();
        renderPractice();
    }

    function nextQuestion() {
        if (!session) return;
        if (session.index >= session.questions.length - 1) {
            session.finished = true;
            session.feedback = null;
            renderPractice();
            card.scrollTop = 0;
            return;
        }
        session.index++;
        session.feedback = null;
        session.showSteps = false;
        session.showAnswer = false;
        session.rated = null;
        renderPractice();
        card.scrollTop = 0;
    }

    function renderPractice() {
        if (!session) {
            const s = state.stats;
            card.innerHTML = '<div class="learn-card-head"><div class="learn-badges"><span class="tag">三层自测</span></div>'
                + '<h3>自测与真题演练</h3><p class="learn-summary">真题演练：抽题自各地高考真题与模拟卷，标注卷别题号，可查思路与答案，再自评掌握程度；'
                + '方法复习：由 ' + patterns.length + ' 个题型族生成识别/通法/错因三类题。每次 10 题。</p></div>'
                + '<section class="learn-section learn-practice-start">'
                + '<button class="btn" data-start-practice="exam">开始真题演练（10 题）</button>'
                + '<button class="btn ghost" data-start-practice="exam-all">全真题池（30 题）</button>'
                + '<p class="learn-summary">题库只收各地高考真题与模拟卷：每题标注卷别、题号与难度，可先看思路再看答案，再自评掌握程度。</p>'
                + '</section>'
                + '<section class="learn-section"><h4>累计</h4><p class="learn-summary">已答 ' + s.attempted
                + ' 题，答对 ' + s.correct + ' 题' + (s.attempted ? '，正确率 ' + Math.round(s.correct / s.attempted * 100) + '%' : '') + '。</p></section>';
            return;
        }

        if (session.finished) {
            const total = session.questions.length;
            const right = session.answers.filter(Boolean).length;
            const wrongList = session.wrong.map((q) => {
                const pid = q.patternId || q.nodeId;
                const p = patternById[pid];
                const n = data.nodes[pid];
                return '<button type="button" class="search-hit" data-pattern="' + esc(pid) + '">'
                    + '<b>' + esc(p ? p.title : pid) + '</b><span>' + esc(TYPE_LABEL[q.type]) + ' · ' + esc(pid) + '</span></button>';
            }).join('');
            const typeStats = ['identify', 'method', 'pitfall'].map((type) => {
                const t = state.stats.byType[type] || { attempted: 0, correct: 0 };
                return t.attempted ? '<div class="deriv-row"><span class="k">' + TYPE_LABEL[type] + '</span><span>'
                    + t.correct + '/' + t.attempted + '（' + Math.round(t.correct / t.attempted * 100) + '%）</span></div>' : '';
            }).join('');
            if (session.mode === 'exam') {
                const st = state.stats.exam;
                card.innerHTML = '<div class="learn-card-head"><div class="learn-badges"><span class="tag">本轮完成</span></div>'
                    + '<h3>掌握 ' + session.answers.filter((a) => a === 'yes').length + ' / ' + total + '</h3>'
                    + '<p class="learn-summary">本轮自评：会 ' + session.answers.filter((a) => a === 'yes').length
                    + ' 题，半会 ' + session.answers.filter((a) => a === 'part').length
                    + ' 题，不会 ' + session.answers.filter((a) => a === 'no').length + ' 题。</p></div>'
                    + '<section class="learn-section"><h4>累计</h4><p class="learn-summary">已练 ' + st.asked + ' 题，掌握 ' + st.mastered
                    + ' 题，半会 ' + st.partial + ' 题，不会 ' + st.missed + ' 题。</p></section>'
                    + '<section class="learn-section learn-actions">'
                    + '<button class="btn" data-start-practice="exam">再来一轮</button>'
                    + '<button class="btn ghost" data-start-practice="mixed">方法复习</button>'
                    + '</section>';
                return;
            }
            card.innerHTML = '<div class="learn-card-head"><div class="learn-badges"><span class="tag">本轮完成</span></div>'
                + '<h3>' + right + ' / ' + total + '</h3><p class="learn-summary">正确率 '
                + Math.round(right / total * 100) + '%。' + (session.wrong.length ? '下面这些题型需要回看。' : '全部答对。') + '</p></div>'
                + '<section class="learn-section"><h4>分层表现</h4>' + typeStats + '</section>'
                + '<section class="learn-section"><h4>错题回溯</h4>' + (wrongList || '<p class="learn-empty">没有错题。</p>') + '</section>'
                + '<section class="learn-section learn-actions">'
                + '<button class="btn" data-start-practice="mixed">再来一轮</button>'
                + '<button class="btn ghost" data-learn-tab="patterns">去题型卡复习</button>'
                + '</section>';
            return;
        }

        if (session.mode === 'exam') {
            const q = session.questions[session.index];
            const node = data.nodes[q.node];
            const steps = (q.steps || []).map((x) => '<li>' + x + '</li>').join('');
            const rate = session.rated;
            card.innerHTML = '<div class="learn-card-head"><div class="learn-badges">'
                + '<span class="tag">第 ' + (session.index + 1) + ' / ' + session.questions.length + ' 题</span>'
                + '<span class="tag ghost">' + esc(q.kind || '真题') + '</span>'
                + '<span class="tag ghost">' + esc(q.difficulty || '中档') + '</span>'
                + '</div><h3>' + esc(q.mode || '练习') + '</h3>'
                + '<p class="learn-source-line">来源：' + esc(q.source) + '</p>'
                + '<p class="learn-source-line">考点：' + esc(q.topic || '') + (node ? ' · 关联节点 ' + esc(node.title) : '') + '</p></div>'
                + '<section class="learn-section exam-item"><p class="exam-prompt">' + q.prompt + '</p>'
                + '<div class="exam-actions">'
                + '<button class="btn ghost" type="button" data-exam-reveal="steps">查看思路</button>'
                + '<button class="btn ghost" type="button" data-exam-reveal="answer">查看答案</button>'
                + '</div>'
                + (session.showSteps ? '<div class="exam-block"><b>思路</b><ol class="lesson-steps">' + steps + '</ol></div>' : '')
                + (session.showAnswer ? '<div class="exam-block answer"><b>答案</b>' + q.answer + (q.note ? '<p class="lesson-pitfall">' + q.note + '</p>' : '') + '</div>' : '')
                + '<div class="exam-rate"><span>自评：</span>'
                + ['yes:会', 'part:半会', 'no:不会'].map((x) => {
                    const v = x.split(':');
                    return '<button type="button" class="learn-filter-btn' + (rate === v[0] ? ' active' : '') + '" data-exam-rate="' + v[0] + '"' + (rate ? ' disabled' : '') + '>' + v[1] + '</button>';
                }).join('')
                + '</div>'
                + (rate ? '<button class="btn practice-next" type="button" data-next-question>'
                    + (session.index === session.questions.length - 1 ? '查看结果' : '下一题') + '</button>' : '')
                + '</section>';
            return;
        }
        const q = session.questions[session.index];
        const p = patternById[q.patternId];
        const options = q.options.map((opt, i) => {
            let cls = 'practice-option';
            if (session.feedback) {
                if (i === q.correct) cls += ' correct';
                else if (i === session.feedback.choice) cls += ' wrong';
            }
            return '<button type="button" class="' + cls + '" data-answer="' + i + '">'
                + '<span>' + String.fromCharCode(65 + i) + '</span>' + esc(opt) + '</button>';
        }).join('');

        card.innerHTML = '<div class="learn-card-head"><div class="learn-badges">'
            + '<span class="tag">第 ' + (session.index + 1) + ' / ' + session.questions.length + ' 题</span>'
            + '<span class="tag ghost">' + TYPE_LABEL[q.type] + '</span>'
            + '<button type="button" class="tag ghost action" data-pattern="' + esc(q.patternId) + '">' + esc(p ? p.title : '') + '</button>'
            + '</div><h3>' + esc(q.prompt) + '</h3></div>'
            + '<div class="practice-options">' + options + '</div>'
            + (session.feedback ? '<div class="practice-feedback ' + (session.feedback.ok ? 'ok' : 'bad') + '">'
                + (session.feedback.ok ? '回答正确。' : '再想想：正确答案已标绿。')
                + '<span>' + esc(q.explain) + '</span></div>'
                + '<button class="btn practice-next" type="button" data-next-question>'
                + (session.index === session.questions.length - 1 ? '查看结果' : '下一题') + '</button>' : '');
    }

    /* ---------------- 节点例题 ---------------- */

    function calcVariants(nodeId) {
        const node = data.nodes[nodeId];
        if (!node || !Core || !node.demo) return [];
        const expr = String(node.demo);
        if (expr.indexOf('|') >= 0 || expr.indexOf(';') >= 0) return [];
        const out = [];
        try {
            const f = Core.makeFunction(expr, ['x']);
            const zeros = Core.findZeros(f, -10, 10, { samples: 1200 }).length;
            out.push({
                kind: '计算实战 · 待换真题', source: '基于本节点示例函数 · ' + expr, difficulty: '基础', real: false,
                prompt: '求 <code>f(x)=' + esc(expr) + '</code> 在 [−10,10] 上的零点个数。',
                answer: zeros + ' 个',
                steps: ['先写定义域，再在区间内找变号点与切触点；每个单调区间至多一个零点。']
            });
        } catch (e) { /* 跳过不可解析的示例 */ }
        try {
            const r = Core.analyzeFunction(expr, { xMin: -10, xMax: 10 });
            out.push({
                kind: '计算实战 · 待换真题', source: '基于本节点示例函数 · ' + expr, difficulty: '基础', real: false,
                prompt: '求 <code>f(x)=' + esc(expr) + '</code> 在 [−10,10] 上的单调区间个数。',
                answer: r.monotonic.length + ' 个',
                steps: ['求导 → 解 f′=0 → 按根把定义域分段 → 逐段判断符号。']
            });
            out.push({
                kind: '计算实战 · 待换真题', source: '基于本节点示例函数 · ' + expr, difficulty: '基础', real: false,
                prompt: '求 <code>f(x)=' + esc(expr) + '</code> 在 [−10,10] 上的极值点个数。',
                answer: (r.extrema.maxima.length + r.extrema.minima.length) + ' 个',
                steps: ['解 f′(x)=0，并检查左右是否变号；只有变号点才是极值点。']
            });
        } catch (e) { /* 跳过不可解析的示例 */ }
        return out;
    }

    function nodeExampleItems(nodeId) {
        const list = [];
        examBankRaw.forEach((it) => {
            if (mergeLib.target(it.node) !== nodeId) return;
            list.push({
                kind: it.kind, source: it.source, difficulty: it.difficulty, real: true,
                prompt: it.prompt, answer: it.answer, steps: it.steps
            });
        });
        Object.keys(lessons).forEach((ch) => {
            const L = lessons[ch];
            if (mergeLib.target(L.nodeId) !== nodeId) return;
            L.sections.forEach((sec) => sec.examples.forEach((ex) => {
                list.push({
                    kind: '精讲例题', source: ex.source, difficulty: '同例题', real: true,
                    prompt: ex.problem, answer: ex.answer, steps: ex.steps
                });
            }));
        });
        calcVariants(nodeId).forEach((t) => list.push(t));
        return list.slice(0, 4);
    }

    function nodeExamplesHtml(nodeId) {
        const items = nodeExampleItems(nodeId);
        const realCount = items.filter((it) => it.real).length;
        const cover = '<p class="learn-coverage">真题覆盖 <b>' + realCount + ' / 3</b>'
            + (realCount >= 3 ? '（已达标）' : '（还差 ' + (3 - realCount) + ' 道真题待补）') + '</p>';
        if (!items.length) return cover + '<p class="learn-empty">这个节点的例题正在补充中。</p>';
        return cover + '<div class="node-examples">' + items.map((it, i) => {
            const steps = (it.steps || []).map((x) => '<li>' + x + '</li>').join('');
            return '<article class="node-example">'
                + '<div class="node-example-head"><span class="tag">例 ' + (i + 1) + '</span>'
                + '<span class="tag ghost">' + esc(it.kind) + '</span>'
                + '<span class="tag ghost">' + esc(it.difficulty || '中档') + '</span>'
                + (it.real ? '' : '<span class="tag ghost pending">待换真题</span>') + '</div>'
                + '<p class="node-example-source">来源：' + esc(it.source) + '</p>'
                + '<p class="node-example-problem">' + it.prompt + '</p>'
                + '<details class="node-example-detail"><summary>查看解析与答案</summary>'
                + (steps ? '<ol class="lesson-steps">' + steps + '</ol>' : '')
                + '<p class="node-example-answer">' + it.answer + '</p>'
                + '</details></article>';
        }).join('') + '</div>';
    }

    /* ---------------- 真题演练 ---------------- */

    function buildExamPool() {
        const pool = examBankRaw.map((it) => Object.assign({ origin: 'bank' }, it));
        Object.keys(data.nodes).forEach((nid) => {
            if (mergeLib.isMerged(nid)) return;
            calcVariants(nid).forEach((v, i) => {
                pool.push(Object.assign({
                    id: 'CALC-' + nid + '-' + i, kind: '计算实战', topic: data.nodes[nid].title,
                    node: nid, difficulty: v.difficulty, mode: '计算型', steps: v.steps, note: v.steps[0]
                }, v));
            });
        });
        Object.keys(lessons).forEach((ch) => {
            const L = lessons[ch];
            L.sections.forEach((sec) => {
                sec.examples.forEach((ex) => {
                    const base = {
                        source: ex.source, kind: '高考真题', topic: sec.title, node: L.nodeId,
                        chapter: L.chapterId, sectionId: sec.id, difficulty: '同例题',
                        origin: 'derived', exampleId: ex.id, steps: ex.steps, note: ex.pitfall
                    };
                    pool.push(Object.assign({}, base, {
                        id: ex.id + '-c', mode: '结论型',
                        prompt: ex.problem + '<br><b>本题要得到的结论是什么？</b>',
                        answer: ex.answer
                    }));
                    pool.push(Object.assign({}, base, {
                        id: ex.id + '-m', mode: '方法型',
                        prompt: '不解出最终结果，说明本题的关键一步是什么：<br>' + ex.problem,
                        answer: ex.analysis
                    }));
                });
            });
        });
        return pool;
    }

    function rateExam(rate) {
        if (!session || session.mode !== 'exam' || session.finished || session.rated) return;
        const q = session.questions[session.index];
        session.rated = rate;
        session.answers.push(rate);
        if (rate !== 'yes') session.wrong.push(q);
        const st = state.stats.exam;
        st.asked++;
        if (rate === 'yes') st.mastered++;
        else if (rate === 'part') st.partial++;
        else st.missed++;
        persist();
        renderSidebar();
        renderPractice();
    }

    /* ---------------- 交互实验 ---------------- */

    function experimentValues(exp) {
        if (!state.expValues[exp.id]) {
            state.expValues[exp.id] = {};
            exp.params.forEach((p) => { state.expValues[exp.id][p.key] = p.value; });
        }
        return state.expValues[exp.id];
    }

    function renderExperiment() {
        const exp = EXPERIMENTS.filter((x) => x.id === state.experimentId)[0] || EXPERIMENTS[0];
        const values = experimentValues(exp);
        const controls = exp.params.map((p) => '<div class="experiment-row">'
            + '<label for="exp-' + p.key + '">' + esc(p.label) + '</label>'
            + '<input type="range" id="exp-' + p.key + '" data-exp-param="' + p.key + '" min="' + p.min + '" max="' + p.max
            + '" step="' + p.step + '" value="' + values[p.key] + '">'
            + '<output data-exp-output="' + p.key + '">' + Number(values[p.key]).toFixed(2) + '</output></div>').join('');

        card.innerHTML = '<div class="learn-card-head"><div class="learn-badges"><span class="tag">交互实验</span>'
            + '<span class="tag ghost">' + esc(exp.title) + '</span></div>'
            + '<h3>' + esc(exp.title) + '</h3><p class="learn-summary">' + esc(exp.hint) + '</p></div>'
            + '<div class="experiment-stage"><div class="experiment-chart" id="experiment-chart"></div>'
            + '<div class="experiment-controls">' + controls + '</div>'
            + '<div class="experiment-note" id="experiment-note"></div></div>';
        mountExperiment();
    }

    function mountExperiment() {
        const exp = EXPERIMENTS.filter((x) => x.id === state.experimentId)[0];
        const el = $('experiment-chart');
        if (!exp || !el) return;
        if (!window.Plotly) {
            el.innerHTML = '<p class="learn-empty">Plotly 未加载，无法绘制实验图。</p>';
            return;
        }
        const built = exp.build(experimentValues(exp));
        const layout = Object.assign({}, built.layout, { autosize: true, height: el.clientHeight || 330 });
        try {
            window.Plotly.react(el, built.traces, layout, { displayModeBar: false, responsive: true });
        } catch (e) {
            el.innerHTML = '<p class="learn-empty">绘制失败：' + esc(e.message) + '</p>';
        }
        const note = $('experiment-note');
        if (note) note.innerHTML = built.note;
    }

    /* ---------------- 讲义导出 ---------------- */

    function download(filename, text, mime) {
        const blob = new Blob([text], { type: mime || 'text/markdown;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function exportHandout() {
        const ids = state.selected.size ? Array.from(state.selected) : [state.nodeId];
        const lines = ['# 函数学习讲义', '', '生成时间：' + new Date().toLocaleString('zh-CN'), '覆盖：' + ids.length + ' 个知识节点', ''];
        ids.forEach((id) => {
            const n = data.nodes[id];
            if (!n) return;
            lines.push('## ' + id + ' · ' + n.title);
            lines.push('');
            lines.push('- 学段：' + n.stage);
            lines.push('- 教材：' + n.book);
            lines.push('');
            lines.push(n.summary);
            lines.push('');
            if (n.points && n.points.length) {
                lines.push('**要点**');
                n.points.forEach((p) => lines.push('- ' + p));
                lines.push('');
            }
            const cons = conclusionsOf(id);
            if (cons.length) {
                lines.push('**关键结论**');
                cons.forEach((c) => {
                    lines.push('- ' + c.text + '（条件：' + c.condition + '；易错：' + c.pitfall + '；' + (EXAM_LABEL[c.examUse] || c.examUse) + '）');
                });
                lines.push('');
            }
            const pats = patternsOf(id);
            if (pats.length) {
                lines.push('**关联题型**');
                pats.forEach((p) => lines.push('- ' + p.id + ' ' + p.title + '：' + p.signals + '；通法：' + p.steps.join(' → ')));
                lines.push('');
            }
            lines.push('示例：`' + n.demo + '`（可在实验室一键打开）');
            lines.push('');
            lines.push('---');
            lines.push('');
        });
        lines.push('由 Math Function Visualizer v3.1 生成。');
        download('函数学习讲义.md', lines.join('\n'));
    }

    function updateExportCount() {
        const el = $('learn-export-count');
        if (el) el.textContent = state.selected.size;
    }

    /* ---------------- 渲染入口 ---------------- */

    function renderCard() {
        if (state.tab === 'nodes') renderNode(state.nodeId);
        else if (state.tab === 'books') renderChapter(state.chapterId);
        else if (state.tab === 'patterns') {
            if (state.patternId) renderPattern(state.patternId);
            else card.innerHTML = '<div class="learn-card-head"><h3>题型卡</h3><p class="learn-summary">从左侧选择题型，或直接搜索识别信号。</p></div>';
        } else if (state.tab === 'conclusions') renderConclusions();
        else if (state.tab === 'practice') renderPractice();
        else renderExperiment();
    }

    function render() {
        if (state.tab === 'nodes' && data.nodes[state.nodeId]) {
            state.studied[state.nodeId] = true;
            persist();
        }
        document.querySelectorAll('.learn-tab').forEach((b) => {
            const active = b.dataset.learnTab === state.tab;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        renderSidebar();
        renderCard();
        updateExportCount();
    }

    function switchTab(tab) {
        if (['nodes', 'patterns', 'conclusions', 'practice', 'experiments'].indexOf(tab) < 0) return;
        state.tab = tab;
        state.query = '';
        if (search) search.value = '';
        render();
    }

    /* ---------------- 事件 ---------------- */

    function open(id) {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        lastFocus = document.activeElement;
        overlay.hidden = false;
        document.body.classList.add('learn-locked');
        if (id) { state.nodeId = id; state.tab = 'nodes'; }
        render();
        requestAnimationFrame(() => {
            overlay.classList.add('open');
            if (search && state.tab !== 'practice') search.focus();
        });
    }

    function close() {
        overlay.classList.remove('open');
        document.body.classList.remove('learn-locked');
        closeTimer = setTimeout(() => { overlay.hidden = true; closeTimer = null; }, 180);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
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

    document.addEventListener('click', function (e) {
        if (e.target.closest('#learn-btn')) { open(currentId || state.nodeId); return; }
        if (e.target.closest('#learn-close') || e.target.closest('[data-learn-close]')) { close(); return; }
        if (!overlay.contains(e.target)) return;

        const tab = e.target.closest('[data-learn-tab]');
        if (tab) { switchTab(tab.dataset.learnTab); return; }

        const nodeBtn = e.target.closest('[data-node]');
        if (nodeBtn) { state.nodeId = mergeLib.target(nodeBtn.dataset.node); state.tab = 'nodes'; render(); return; }

        const patternBtn = e.target.closest('[data-pattern]');
        if (patternBtn) { state.patternId = patternBtn.dataset.pattern; state.tab = 'patterns'; render(); return; }

        const chapterBtn = e.target.closest('[data-chapter]');
        if (chapterBtn) { state.chapterId = chapterBtn.dataset.chapter; state.tab = 'books'; render(); return; }

        const expBtn = e.target.closest('[data-experiment]');
        if (expBtn) { state.experimentId = expBtn.dataset.experiment; state.tab = 'experiments'; render(); return; }

        const demoBtn = e.target.closest('[data-demo]');
        if (demoBtn) { runDemo(demoBtn.dataset.demo); return; }
        const demoPattern = e.target.closest('[data-demo-pattern]');
        if (demoPattern) {
            const p = patternById[demoPattern.dataset.demoPattern];
            if (p) runDemo(p.node);
            return;
        }
        if (e.target.closest('[data-demo-close]')) { close(); return; }

        const selectBtn = e.target.closest('[data-select-node]');
        if (selectBtn) {
            const id = selectBtn.dataset.selectNode;
            if (state.selected.has(id)) state.selected.delete(id);
            else state.selected.add(id);
            persist();
            renderNode(id);
            updateExportCount();
            return;
        }

        const filterBtn = e.target.closest('[data-exam-filter]');
        if (filterBtn) { state.examFilter = filterBtn.dataset.examFilter; renderSidebar(); renderCard(); return; }

        const startBtn = e.target.closest('[data-start-practice]');
        if (startBtn) {
            startPractice(startBtn.dataset.startPractice, startBtn.dataset.patternId);
            return;
        }
        const answerBtn = e.target.closest('[data-answer]');
        if (answerBtn) { answerQuestion(Number(answerBtn.dataset.answer)); return; }
        const revealBtn = e.target.closest('[data-exam-reveal]');
        if (revealBtn) {
            if (revealBtn.dataset.examReveal === 'steps') session.showSteps = true;
            else session.showAnswer = true;
            renderPractice();
            return;
        }
        const rateBtn = e.target.closest('[data-exam-rate]');
        if (rateBtn) { rateExam(rateBtn.dataset.examRate); return; }
        if (e.target.closest('[data-next-question]')) { nextQuestion(); return; }
        if (e.target.closest('[data-reset-stats]')) {
            state.stats = { attempted: 0, correct: 0, byType: {}, wrong: {} };
            persist();
            render();
            return;
        }
        if (e.target.closest('#learn-export')) { exportHandout(); return; }
    });

    document.addEventListener('input', function (e) {
        const key = e.target && e.target.dataset ? e.target.dataset.expParam : null;
        if (!key || state.tab !== 'experiments') return;
        const exp = EXPERIMENTS.filter((x) => x.id === state.experimentId)[0];
        if (!exp) return;
        const values = experimentValues(exp);
        values[key] = parseFloat(e.target.value);
        const out = document.querySelector('[data-exp-output="' + key + '"]');
        if (out) out.textContent = Number(values[key]).toFixed(2);
        mountExperiment();
    });

    if (search) {
        search.addEventListener('input', function () {
            state.query = search.value;
            renderSidebar();
            if (state.tab === 'conclusions') renderCard();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.hidden) { close(); return; }
        if (e.key !== 'Tab' || overlay.hidden) return;
        const focusables = overlay.querySelectorAll('button:not([disabled]), input, summary, [href], [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    render();
    document.documentElement.classList.add('learn-ready');
}());
