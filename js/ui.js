/**
 * ui.js
 * ============================================================
 * 应用控制器：界面状态管理、输入校验、绘图调度、性质报告渲染、
 * 数值表与 CSV 导出、智能助手接线。
 * ============================================================
 */
(function (root) {
    'use strict';

    const MathCore = root.MathCore;

    /** 元素取值工具 */
    const $ = (id) => document.getElementById(id);
    const val = (id) => ($(id) ? $(id).value : '');

    /** 读取数值输入并给出中文错误 */
    function readRange() {
        const nums = {};
        const map = { xMin: 'x-min', xMax: 'x-max', yMin: 'y-min', yMax: 'y-max' };
        const label = { xMin: 'x 最小值', xMax: 'x 最大值', yMin: 'y 最小值', yMax: 'y 最大值' };
        for (const k in map) {
            const v = parseFloat(val(map[k]));
            if (!Number.isFinite(v)) throw new Error('范围输入无效：' + label[k] + ' 必须为数字');
            nums[k] = v;
        }
        if (nums.xMin >= nums.xMax) throw new Error('x 范围无效：最小值必须小于最大值');
        if (nums.yMin >= nums.yMax) throw new Error('y 范围无效：最小值必须小于最大值');
        return nums;
    }

    class MathApp {
        constructor() {
            this.mode = '2d';               // '2d' | '3d'
            this.view = 'explicit';         // explicit | parametric | polar | implicit
            this.plotter = new root.MathPlotter('graph-container');
            this.storyPlayer = (typeof root.MathStoryboardPlayer === 'function')
                ? new root.MathStoryboardPlayer('graph-container')
                : null;
            this.story = null;              // { facts, storyboard }
            this.params = {};               // 参数滑块：{ a: 1, b: 2 }
            this.conic = null;              // 最近一次圆锥曲线分析结果
            this.assistant = null;
            this.report = null;
            this.debounceTimer = null;
            this.isPlotting = false;
            this.pendingPlot = false;
            this.pendingManual = false;
            this.lastPlotTime = 0;
            this.autoPlot = true;

            this.assistant = new root.MathAssistant({
                getExpression: () => this.currentExpressions(),
                getRange: () => readRange(),
                getMode: () => (this.mode === '3d' ? '3d' : this.view),
                setExpression: (expr) => {
                    this.mode = '2d';
                    this.view = 'explicit';
                    $('function-expr').value = expr;
                    this.updateUI();
                    this.plot();
                },
                getReport: () => this.report,
                refreshReport: () => {
                    const exprs = this.currentExpressions();
                    if (this.mode !== '2d' || this.view !== 'explicit' || !exprs.length) return null;
                    const range = readRange();
                    this.report = MathCore.analyzeFunction(exprs[0], { xMin: range.xMin, xMax: range.xMax });
                    this.renderReport();
                    return this.report;
                },
                say: (text, role) => this.addMessage(role, text)
            });
        }

        /* ---------------- 初始化 ---------------- */

        init() {
            this.bindEvents();
            const restored = this.restoreFromUrl();
            if (!restored) $('function-expr').value = 'sin(x)';
            this.syncParams();
            this.updateUI();
            this.addMessage('bot', restored
                ? '已从分享链接恢复：' + this._currentRawInput()
                    + '（x ∈ [' + val('x-min') + ', ' + val('x-max') + ']）'
                : this.assistant.helpText());
            this.plot();
            this.startPerfMonitor();
        }

        bindEvents() {
            document.addEventListener('click', (e) => {
                const t = e.target;
                if (t.classList.contains('tab')) this.switchMode(t.dataset.mode);
                else if (t.classList.contains('view-btn')) this.switchView(t.dataset.view);
                else if (t.classList.contains('preset-btn')) this.loadPreset(t.dataset.expr, t.dataset.mode);
                else if (t.classList.contains('quick-btn')) this.assistant.handle(t.dataset.question);
                else if (t.id === 'plot-btn') this.plot(true);
                else if (t.id === 'clear-btn') this.clearAll();
                else if (t.id === 'send-btn') this.sendChat();
                else if (t.id === 'table-btn') this.renderTable();
                else if (t.id === 'csv-btn') this.exportCSV();
                else if (t.id === 'story-btn') this.playStory();
                else if (t.id === 'story-stop-btn') this.stopStory();
                else if (t.id === 'py-btn') this.exportPython();
                else if (t.id === 'manifest-btn') this.exportManifest();
                else if (t.id === 'share-btn') this.copyShareLink();
                else if (t.id === 'tangent-btn') this.showTangent();
                else if (t.id === 'extrema-btn') this.showExtrema();
                else if (t.id === 'conic-tangent-btn') this.showConicTangent();
                else if (t.id === 'conic-chord-btn') this.showConicChord();
                else if (t.id === 'zero-scan-btn') this.showZeroScan();
            });

            const autoHandler = this.debounce(() => { if (this.autoPlot) this.plot(); }, 800);
            ['function-expr', 'param-x', 'param-y', 'polar-r', 'implicit-expr',
             'function-expr-3d', 'x-min', 'x-max', 'y-min', 'y-max', 'slice-pos'].forEach((id) => {
                const el = $(id);
                if (el) el.addEventListener('input', autoHandler);
            });

            // 表达式变化时先同步参数滑块，再等待防抖重绘
            const exprEl = $('function-expr');
            if (exprEl) exprEl.addEventListener('input', () => this.syncParams());

            // 滑块拖动：更新参数值并快速重绘
            const sliderBox = $('param-sliders');
            if (sliderBox) {
                const quickPlot = this.debounce(() => { if (this.autoPlot) this.plot(); }, 220);
                sliderBox.addEventListener('input', (e) => {
                    const key = e.target && e.target.dataset ? e.target.dataset.param : null;
                    if (!key) return;
                    this.params[key] = parseFloat(e.target.value);
                    const label = e.target.parentNode.querySelector('b');
                    if (label) label.textContent = this.params[key].toFixed(1);
                    quickPlot();
                });
            }

            $('chat-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChat();
                }
            });
        }

        debounce(fn, wait) {
            let timer = null;
            return function () {
                clearTimeout(timer);
                timer = setTimeout(fn, wait);
            };
        }

        /* ---------------- 模式切换 ---------------- */

        switchMode(mode) {
            if (mode !== '2d' && mode !== '3d') return;
            this.mode = mode;
            this.updateUI();
            this.plot();
        }

        switchView(view) {
            this.mode = '2d';
            this.view = view;
            this.updateUI();
            this.plot();
        }

        updateUI() {
            const setSelected = (el, selected) => {
                el.classList.toggle('active', selected);
                el.setAttribute('aria-selected', selected ? 'true' : 'false');
            };

            document.querySelectorAll('.tab').forEach((t) =>
                setSelected(t, t.dataset.mode === this.mode));
            document.querySelectorAll('.view-btn').forEach((b) =>
                setSelected(b, b.dataset.view === this.view));

            const is2D = this.mode === '2d';
            $('view-switch').style.display = is2D ? 'grid' : 'none';
            $('panel-3d').style.display = is2D ? 'none' : 'block';
            $('panel-explicit').style.display = is2D && this.view === 'explicit' ? 'block' : 'none';
            $('panel-parametric').style.display = is2D && this.view === 'parametric' ? 'block' : 'none';
            $('panel-polar').style.display = is2D && this.view === 'polar' ? 'block' : 'none';
            $('panel-implicit').style.display = is2D && this.view === 'implicit' ? 'block' : 'none';
            $('panel-conic').style.display = is2D && this.view === 'conic' ? 'block' : 'none';

            const rangeLabel = {
                explicit: ['x 范围', 'y 范围'],
                parametric: ['t 范围', '显示范围 x/y'],
                polar: ['θ 范围', '显示范围'],
                implicit: ['x 范围', 'y 范围'],
                conic: ['x 范围', 'y 范围']
            };
            const labels = this.mode === '3d' ? ['x 范围', 'y 范围'] : (rangeLabel[this.view] || ['x 范围', 'y 范围']);
            $('range-label-x').textContent = labels[0];
            $('range-label-y').textContent = labels[1];

            if (window.MathMotion && window.MathMotion.enter) {
                const activePanelId = this.mode === '3d' ? 'panel-3d' : 'panel-' + this.view;
                window.MathMotion.enter($(activePanelId));
            }
        }

        loadPreset(expr, mode) {
            if (mode === '3d') {
                this.mode = '3d';
                $('function-expr-3d').value = expr;
            } else if (mode === '2d-parametric') {
                const parts = expr.split('|');
                this.mode = '2d'; this.view = 'parametric';
                $('param-x').value = parts[0];
                $('param-y').value = parts[1] || parts[0];
            } else if (mode === '2d-polar') {
                this.mode = '2d'; this.view = 'polar';
                $('polar-r').value = expr;
            } else if (mode === '2d-implicit') {
                this.mode = '2d'; this.view = 'implicit';
                $('implicit-expr').value = expr;
            } else {
                this.mode = '2d'; this.view = 'explicit';
                $('function-expr').value = expr;
            }
            this.syncParams();
            this.updateUI();
            this.plot();
        }

        /* ---------------- 输入收集与校验 ---------------- */

        currentExpressions() {
            if (this.mode === '3d') {
                const e = MathCore.normalizeExpression(val('function-expr-3d'));
                return e ? [e] : [];
            }
            switch (this.view) {
                case 'explicit': {
                    return val('function-expr')
                        .split(/[;；]/)
                        .map((s) => this.applyParams(MathCore.normalizeExpression(s)))
                        .filter(Boolean)
                        .slice(0, 6);
                }
                case 'parametric':
                    return [val('param-x'), val('param-y')].map((s) => MathCore.normalizeExpression(s)).filter(Boolean);
                case 'polar':
                    return [MathCore.normalizeExpression(val('polar-r'))].filter(Boolean);
                case 'implicit': {
                    // 隐函数用等号表达，故关闭「y= 前缀剥离」，只做全角/π 等规范化
                    const raw = val('implicit-expr');
                    if (!raw.trim()) return [];
                    return [MathCore.normalizeExpression(raw, { stripPrefix: false })].filter(Boolean);
                }
                case 'conic': {
                    const raw = val('conic-expr');
                    if (!raw.trim()) return [];
                    return [MathCore.normalizeExpression(raw, { stripPrefix: false })].filter(Boolean);
                }
            }
            return [];
        }

        /* ---------------- 参数滑块 ---------------- */

        /** 把当前参数值代入表达式（无参数时原样返回） */
        applyParams(expr) {
            if (!expr) return '';
            const keys = Object.keys(this.params);
            if (!keys.length) return expr;
            let out = expr;
            for (let i = 0; i < keys.length; i++) {
                try {
                    out = MathCore.substituteVariable(out, keys[i], this.params[keys[i]]);
                } catch (e) { /* 代入失败就保留原式 */ }
            }
            return out;
        }

        /** 根据当前表达式重新识别自由参数，保留已有取值 */
        syncParams() {
            if (this.mode !== '2d' || this.view !== 'explicit') {
                if (Object.keys(this.params).length) { this.params = {}; this.renderParams(); }
                return;
            }
            const raw = String(val('function-expr')).split(/[;；]/)[0] || '';
            let names = [];
            try {
                names = MathCore.freeSymbols(MathCore.normalizeExpression(raw), ['x']);
            } catch (e) { names = []; }

            const next = {};
            names.forEach((k) => {
                if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) return;
                next[k] = Object.prototype.hasOwnProperty.call(this.params, k) ? this.params[k] : 1;
            });

            const before = Object.keys(this.params).join(',');
            const after = Object.keys(next).join(',');
            this.params = next;
            // 首次加载时 before === after（都来自链接），但滑块还没渲染，所以要补一次
            const box = $('param-sliders');
            const rendered = box ? box.children.length : 0;
            if (before !== after || rendered !== Object.keys(this.params).length) {
                this.renderParams();
            }
        }

        renderParams() {
            const box = $('param-sliders');
            if (!box) return;
            const keys = Object.keys(this.params);
            if (!keys.length) { box.innerHTML = ''; return; }
            box.innerHTML = keys.map((k) => {
                const v = this.params[k];
                return '<div class="param-row">'
                    + '<span class="pk">' + k + ' = <b>' + v.toFixed(1) + '</b></span>'
                    + '<input type="range" min="-5" max="5" step="0.1" value="' + v + '" data-param="' + k + '" aria-label="参数 ' + k + '">'
                    + '</div>';
            }).join('');
        }

        validateAll() {
            const exprs = this.currentExpressions();
            if (!exprs.length) throw new Error('请输入函数表达式');

            if (this.mode === '3d') {
                const r = MathCore.validateExpression(exprs[0], ['x', 'y']);
                if (!r.ok) throw new Error(r.error);
                return exprs;
            }
            switch (this.view) {
                case 'explicit':
                    exprs.forEach((e) => {
                        const r = MathCore.validateExpression(e, ['x']);
                        if (!r.ok) throw new Error('「' + e + '」：' + r.error);
                    });
                    break;
                case 'parametric':
                    if (exprs.length < 2) throw new Error('参数方程需要同时填写 x(t) 与 y(t)');
                    exprs.forEach((e) => {
                        const r = MathCore.validateExpression(e, ['t']);
                        if (!r.ok) throw new Error('「' + e + '」：' + r.error);
                    });
                    break;
                case 'polar': {
                    const r = MathCore.validateExpression(exprs[0], ['theta']);
                    if (!r.ok) throw new Error(r.error);
                    break;
                }
                case 'implicit': {
                    const s = exprs[0];
                    const eq = s.indexOf('=');
                    const body = eq > 0 ? '(' + s.slice(0, eq) + ')-(' + s.slice(eq + 1) + ')' : s;
                    const r = MathCore.validateExpression(body, ['x', 'y']);
                    if (!r.ok) throw new Error(r.error);
                    break;
                }
                case 'conic': {
                    if (!root.MathConic) throw new Error('圆锥曲线模块未加载');
                    const body = root.MathConic.toBody(exprs[0]);
                    const r = MathCore.validateExpression(body, ['x', 'y']);
                    if (!r.ok) throw new Error(r.error);
                    break;
                }
            }
            return exprs;
        }

        /* ---------------- 绘图调度 ---------------- */

        async plot(manual) {
            // 正在计算时又来了新请求：记下来，等本轮结束后补一次，
            // 否则用户连续改表达式时最后一次输入会被丢弃（界面停在旧图）。
            if (this.isPlotting) {
                this.pendingPlot = true;
                this.pendingManual = this.pendingManual || !!manual;
                return;
            }
            this.isPlotting = true;
            this.showLoading(true);
            this.showError(null);
            const start = performance.now();

            try {
                const range = readRange();
                const exprs = this.validateAll();
                let ok = true;

                if (this.mode === '3d') {
                    const sliceRaw = String(val('slice-pos')).trim();
                    let sliceY = null;
                    if (sliceRaw) {
                        const c = parseFloat(sliceRaw);
                        if (!Number.isFinite(c)) throw new Error('切片位置必须为数字');
                        sliceY = c;
                    }
                    ok = await this.plotter.plotSurface(exprs[0], range.xMin, range.xMax, range.yMin, range.yMax,
                        sliceY === null ? null : { sliceY: sliceY });
                    if (ok && sliceY !== null) {
                        const vars = MathCore.freeSymbols(exprs[0], ['x']);
                        if (vars.indexOf('y') < 0) {
                            throw new Error('当前曲面表达式不含 y，无法按 y 切片（请检查 z = f(x, y) 的写法）');
                        }
                        const sliceExpr = MathCore.substituteVariable(exprs[0], 'y', sliceY);
                        this.report = MathCore.analyzeFunction(sliceExpr, { xMin: range.xMin, xMax: range.xMax });
                        this.renderReport('切片 y = ' + MathCore.fmt(sliceY, 4)
                            + '：f(x, ' + MathCore.fmt(sliceY, 4) + ') = ' + sliceExpr);
                    } else {
                        this.report = null;
                        if (ok) this.renderReportUnavailable('3D 曲面模式下不提供整体性质分析；填「切片」可分析一维切面');
                    }
                } else if (this.view === 'explicit') {
                    ok = await this.plotter.plotExplicit(exprs, range.xMin, range.xMax, range.yMin, range.yMax);
                    if (ok) {
                        this.report = MathCore.analyzeFunction(exprs[0], { xMin: range.xMin, xMax: range.xMax });
                        this.renderReport();
                        if (exprs.length >= 2) this.renderCompare(exprs, range);
                    }
                } else if (this.view === 'parametric') {
                    ok = await this.plotter.plotParametric(exprs[0], exprs[1], range.xMin, range.xMax, [range.yMin, range.yMax], [range.yMin, range.yMax]);
                    this.report = null;
                    if (ok) this.renderReportUnavailable('参数方程模式：性质分析请切换到显函数模式');
                } else if (this.view === 'polar') {
                    ok = await this.plotter.plotPolar(exprs[0], range.xMin, range.xMax, [range.yMin, range.yMax]);
                    this.report = null;
                    if (ok) this.renderReportUnavailable('极坐标模式：性质分析请切换到显函数模式');
                } else if (this.view === 'implicit') {
                    const segCount = await this.plotter.plotImplicit(exprs[0], range.xMin, range.xMax, range.yMin, range.yMax);
                    ok = segCount !== null;
                    this.report = null;
                    if (ok) this.renderReportUnavailable('隐函数模式：共提取 ' + segCount + ' 段等值线');
                } else if (this.view === 'conic') {
                    const info = root.MathConic.analyze(exprs[0]);
                    const segCount = await this.plotter.plotImplicit(exprs[0], range.xMin, range.xMax, range.yMin, range.yMax, {
                        markers: info.markers,
                        title: info.typeLabel + ' · ' + info.equation
                    });
                    ok = segCount !== null;
                    this.report = null;
                    if (ok) {
                        this.conic = info;
                        this.renderConic(info, segCount);
                    }
                }

                // ok === null/false 表示本次结果已被更新的请求取代，不再覆盖后画的图
                if (!ok) return;

                this.lastPlotTime = performance.now() - start;
                this._syncUrl();
                if (manual) {
                    this.addMessage('bot', '绘制完成，耗时 ' + this.lastPlotTime.toFixed(0) + ' ms。');
                }
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            } finally {
                this.isPlotting = false;
                this.showLoading(false);
                if (this.pendingPlot) {
                    this.pendingPlot = false;
                    const rerunManual = this.pendingManual;
                    this.pendingManual = false;
                    this.plot(rerunManual);
                }
            }
        }

        clearAll() {
            this.plotter.clear();
            this.report = null;
            $('properties-panel').innerHTML = '<p class="empty">绘制后在此显示分析结果。</p>';
            $('table-body').innerHTML = '<tr><td colspan="3" class="empty">暂无数据</td></tr>';
            $('chat-messages').innerHTML = '';
            this.showError(null);
        }

        /* ---------------- 分步讲解（facts → storyboard → player） ---------------- */

        async playStory() {
            if (!this.storyPlayer || !root.MathFacts || !root.MathStoryboard) {
                this.showError('分步讲解模块未加载');
                return;
            }
            if (this.mode !== '2d' || this.view !== 'explicit') {
                this.showError('分步讲解目前仅支持显函数模式');
                return;
            }

            let exprs, range;
            try {
                exprs = this.validateAll();
                range = readRange();
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
                return;
            }

            this.showError(null);
            this.stopStory(true);
            $('story-progress').textContent = '分析中…';
            $('story-facts').textContent = '';
            // 让「分析中…」先渲染出来，再做同步的重计算
            await new Promise((r) => setTimeout(r, 16));

            try {
                const facts = root.MathFacts.buildFacts(exprs[0], { xMin: range.xMin, xMax: range.xMax });
                const sb = root.MathStoryboard.buildStoryboard(facts, {
                    yRange: [range.yMin, range.yMax]
                });
                const check = root.MathStoryboard.validateStoryboard(sb);
                if (!check.ok) throw new Error('分镜校验失败：' + check.errors.join('；'));

                this.story = { facts, storyboard: sb };
                this.renderFacts(facts);
                $('story-caption').classList.add('show');

                let acc = 0;
                const starts = sb.beats.map((b) => { const s = acc; acc += b.seconds; return s; });

                this.storyPlayer.play(sb, {
                    onStep: (i, beat) => {
                        $('story-caption').textContent = beat.caption;
                        $('story-progress').textContent = (i + 1) + '/' + sb.beats.length
                            + ' · ' + starts[i].toFixed(0) + 's/' + sb.totalSeconds.toFixed(0) + 's';
                    },
                    onEnd: () => this.onStoryEnd()
                });
            } catch (e) {
                $('story-progress').textContent = '—';
                $('story-caption').classList.remove('show');
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        stopStory(silent) {
            if (this.storyPlayer) this.storyPlayer.stop();
            if (silent) return;
            if (!this.story) return;
            $('story-progress').textContent = '已停止';
            $('story-caption').classList.remove('show');
            this.plot();
        }

        onStoryEnd() {
            $('story-progress').textContent = '完成';
            $('story-caption').classList.remove('show');
            this.plot();
        }

        renderFacts(facts) {
            const el = $('story-facts');
            if (!el) return;
            const s = facts.summary;
            const r = s.worstRatio;
            const ratioText = !Number.isFinite(r) ? '∞' : (r >= 1e4 ? r.toExponential(1) : r.toFixed(2));
            const worst = s.worstClaim
                ? '最差残差比 ' + ratioText + '（' + s.worstClaim + '）'
                : '';
            el.innerHTML = (s.failed === 0
                ? '<span class="ok">数值自检 ' + s.passed + '/' + s.total + ' 通过</span>'
                : '<span class="bad">数值自检 ' + s.passed + '/' + s.total + ' 通过，' + s.failed + ' 条存疑</span>')
                + (worst ? ' · ' + worst : '');
        }

        /* ---------------- 导出（Python 脚本 / 运行清单） ---------------- */

        downloadText(filename, text, mime) {
            const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
        }

        /** 构造一次导出的上下文（facts + storyboard），失败时抛中文错误 */
        _exportContext() {
            if (!root.MathFacts || !root.MathStoryboard) throw new Error('导出模块未加载');
            if (this.mode !== '2d' || this.view !== 'explicit') {
                throw new Error('导出目前仅支持显函数模式');
            }
            const exprs = this.validateAll();
            const range = readRange();
            const facts = root.MathFacts.buildFacts(exprs[0], { xMin: range.xMin, xMax: range.xMax });
            const sb = root.MathStoryboard.buildStoryboard(facts, { yRange: [range.yMin, range.yMax] });
            return { expression: exprs[0], range, facts, storyboard: sb };
        }

        exportPython() {
            try {
                if (!root.MathCodegen || !root.MathCodeCheck) throw new Error('导出模块未加载');
                const ctx = this._exportContext();
                const out = root.MathCodegen.buildPython({
                    expression: ctx.expression,
                    xMin: ctx.range.xMin, xMax: ctx.range.xMax,
                    yMin: ctx.range.yMin, yMax: ctx.range.yMax,
                    facts: ctx.facts
                });
                const check = root.MathCodeCheck.checkPython(out.code);
                if (!check.ok) throw new Error('生成代码未通过静态检查：' + check.errors.join('；'));

                this.downloadText(out.filename, out.code, 'text/x-python;charset=utf-8');
                this.addMessage('bot',
                    '已导出 ' + out.filename + '（' + out.bytes + ' 字节，静态检查通过）。\n'
                    + '包含 f(x)、' + out.counts.zeros + ' 个零点、' + out.counts.extrema + ' 个极值、'
                    + out.counts.inflections + ' 个拐点、' + out.counts.asymptotes + ' 条渐近线，'
                    + '并带 verify() 复算。\n'
                    + '运行：python ' + out.filename + '（需 numpy + matplotlib）');
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        exportManifest() {
            try {
                if (!root.MathManifest || !root.MathCodegen) throw new Error('导出模块未加载');
                const ctx = this._exportContext();
                const py = root.MathCodegen.buildPython({
                    expression: ctx.expression,
                    xMin: ctx.range.xMin, xMax: ctx.range.xMax,
                    yMin: ctx.range.yMin, yMax: ctx.range.yMax,
                    facts: ctx.facts
                });
                const manifest = root.MathManifest.buildManifest({
                    expression: ctx.expression,
                    mode: this.mode,
                    view: this.view,
                    window: {
                        xMin: ctx.range.xMin, xMax: ctx.range.xMax,
                        yMin: ctx.range.yMin, yMax: ctx.range.yMax
                    },
                    facts: ctx.facts,
                    storyboard: ctx.storyboard,
                    artifacts: [
                        { role: 'python', name: py.filename, content: py.code },
                        { role: 'storyboard', name: 'storyboard.json', content: JSON.stringify(ctx.storyboard, null, 2) }
                    ]
                });
                const fp = root.MathManifest.fingerprint(ctx.expression).split(':')[1] || 'run';
                this.downloadText('manifest_' + fp + '.json', JSON.stringify(manifest, null, 2), 'application/json');
                this.addMessage('bot',
                    '已导出运行清单：' + manifest.result.claims + ' 条结论、'
                    + manifest.artifacts.length + ' 个产物指纹，算法参数与区间已一并记录。');
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        /* ---------------- 分享链接（URL 状态） ---------------- */

        _currentRawInput() {
            if (this.mode === '3d') return val('function-expr-3d');
            if (this.view === 'parametric') return val('param-x') + '|' + val('param-y');
            if (this.view === 'polar') return val('polar-r');
            if (this.view === 'implicit') return val('implicit-expr');
            if (this.view === 'conic') return val('conic-expr');
            return val('function-expr');
        }

        _applyRawInput(raw) {
            if (this.mode === '3d') { $('function-expr-3d').value = raw; return; }
            if (this.view === 'parametric') {
                const parts = String(raw || '').split('|');
                $('param-x').value = parts[0] || '';
                $('param-y').value = parts[1] || '';
                return;
            }
            if (this.view === 'polar') { $('polar-r').value = raw; return; }
            if (this.view === 'implicit') { $('implicit-expr').value = raw; return; }
            if (this.view === 'conic') { $('conic-expr').value = raw; return; }
            $('function-expr').value = raw;
        }

        /** 把当前状态编码成 `#e=...&x=..&y=..&m=..&v=..` */
        _stateHash() {
            let range;
            try { range = readRange(); } catch (e) { range = null; }
            const p = new URLSearchParams();
            p.set('e', this._currentRawInput());
            p.set('m', this.mode);
            p.set('v', this.view);
            if (range) {
                p.set('x', range.xMin + ',' + range.xMax);
                p.set('y', range.yMin + ',' + range.yMax);
            }
            const keys = Object.keys(this.params);
            if (keys.length) {
                p.set('p', keys.map((k) => k + ':' + this.params[k]).join(','));
            }
            return p.toString();
        }

        buildShareUrl() {
            return location.origin + location.pathname + '#' + this._stateHash();
        }

        /** 从 hash 恢复状态；返回是否成功恢复 */
        restoreFromUrl() {
            const hash = String(location.hash || '').replace(/^#/, '');
            if (!hash) return false;
            let p;
            try { p = new URLSearchParams(hash); } catch (e) { return false; }
            if (!p.has('e')) return false;
            if (!String(p.get('e') || '').trim()) return false;

            const mode = p.get('m') === '3d' ? '3d' : '2d';
            const view = ['explicit', 'parametric', 'polar', 'implicit', 'conic'].indexOf(p.get('v')) >= 0
                ? p.get('v') : 'explicit';
            this.mode = mode;
            this.view = view;
            this._applyRawInput(p.get('e') || '');

            const xr = String(p.get('x') || '').split(',').map(Number);
            const yr = String(p.get('y') || '').split(',').map(Number);
            if (xr.length === 2 && Number.isFinite(xr[0]) && Number.isFinite(xr[1]) && xr[0] < xr[1]) {
                $('x-min').value = xr[0];
                $('x-max').value = xr[1];
            }
            if (yr.length === 2 && Number.isFinite(yr[0]) && Number.isFinite(yr[1]) && yr[0] < yr[1]) {
                $('y-min').value = yr[0];
                $('y-max').value = yr[1];
            }

            // 参数取值（可选）
            const pv = String(p.get('p') || '');
            if (pv) {
                const restore = {};
                pv.split(',').forEach((pair) => {
                    const kv = pair.split(':');
                    const key = kv[0];
                    const num = parseFloat(kv[1]);
                    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && Number.isFinite(num)) restore[key] = num;
                });
                this.params = restore;
            }
            return true;
        }

        /** 每次成功绘图后同步地址栏（不产生历史记录） */
        _syncUrl() {
            try {
                const next = '#' + this._stateHash();
                if (location.hash !== next) {
                    history.replaceState(null, '', location.pathname + location.search + next);
                }
            } catch (e) { /* file:// 下可能不支持，忽略 */ }
        }

        async copyShareLink() {
            const url = this.buildShareUrl();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                    this.addMessage('bot', '已复制分享链接（打开即是当前函数与区间）：\n' + url);
                    return;
                }
            } catch (e) { /* 非安全上下文会拒绝，落到手动复制 */ }
            this.addMessage('bot', '分享链接（请手动复制）：\n' + url);
        }

        /* ---------------- 性质报告渲染 ---------------- */

        _propRow(k, v) {
            return '<div class="prop"><span class="k">' + k + '</span><span>' + v + '</span></div>';
        }

        renderReportUnavailable(msg) {
            $('properties-panel').innerHTML = '<p class="empty">' + msg + '</p>';
        }

        renderReport(subtitle) {
            const r = this.report;
            if (!r) return;
            const n = (v, d) => MathCore.fmt(v, d === undefined ? 6 : d);
            const html = [];

            if (subtitle) html.push('<div class="prop-sep">' + subtitle + '</div>');

            // 基本信息
            const parityText = { even: '偶函数', odd: '奇函数', none: '非奇非偶' }[r.parity];
            html.push(this._propRow('奇偶性', parityText));
            html.push(this._propRow('周期性', r.constant ? '常函数' : (r.period ? 'T ≈ ' + n(r.period, 8) : '未发现周期')));

            // 值域：区间采样极值，非全局值域；存在极点时实际可能无界，用 ⚠ 标出
            const bounded = r.range ? r.range.bounded !== false : true;
            html.push(this._propRow('值域（采样）', r.range
                ? '≈[' + n(r.range.min, 6) + ', ' + n(r.range.max, 6) + ']' + (bounded ? '' : ' ⚠')
                : '无（区间内不可求值）'));
            html.push(this._propRow('采样可求值率', n(r.definedRatio * 100, 4) + '%'));

            const undef = r.undefinedPoints || r.domainBreaks || [];
            if (undef.length) {
                html.push(this._propRow('未定义点', undef.slice(0, 8).map((x) => 'x≈' + n(x, 6)).join('，') + (undef.length > 8 ? '…' : '')));
            }

            // 零点
            html.push(this._propRow('零点', r.zeros.length
                ? r.zeros.slice(0, 10).map((p) => 'x≈' + n(p.x, 8)).join('，') + (r.zeros.length > 10 ? '…' : '')
                : '区间内无'));

            // 极值
            html.push(this._propRow('极大值', r.extrema.maxima.length
                ? r.extrema.maxima.slice(0, 5).map((p) => '(' + n(p.x, 5) + ', ' + n(p.y, 5) + ')').join('，') : '无'));
            html.push(this._propRow('极小值', r.extrema.minima.length
                ? r.extrema.minima.slice(0, 5).map((p) => '(' + n(p.x, 5) + ', ' + n(p.y, 5) + ')').join('，') : '无'));

            // 单调区间
            html.push(this._propRow('单调区间', r.monotonic.length
                ? r.monotonic.slice(0, 6).map((s) =>
                    (s.dir > 0 ? '↗' : '↘') + '[' + n(s.from, 3) + ',' + n(s.to, 3) + ']').join(' ')
                : '常函数'));

            // 凹凸与拐点
            html.push(this._propRow('凹凸性', r.concavity.length
                ? r.concavity.slice(0, 5).map((s) =>
                    (s.dir > 0 ? '∪' : '∩') + '[' + n(s.from, 3) + ',' + n(s.to, 3) + ']').join(' ')
                : '—'));
            html.push(this._propRow('拐点', r.inflections.length
                ? r.inflections.slice(0, 6).map((x) => 'x≈' + n(x, 5)).join('，') : '无'));

            // 渐近线
            const a = r.asymptotes;
            html.push(this._propRow('垂直渐近线', a.vertical.length
                ? a.vertical.map((x) => 'x≈' + n(x, 6)).join('，') : '无'));
            html.push(this._propRow('水平渐近线', a.horizontal.length
                ? a.horizontal.map((h) => 'y≈' + n(h.y, 6) + '(' + h.side + ')').join('，') : '无'));
            html.push(this._propRow('斜渐近线', a.oblique.length
                ? a.oblique.map((o) => 'y≈' + n(o.m, 5) + 'x+' + n(o.c, 5) + '(' + o.side + ')').join('，') : '无'));

            const note = '以上为区间内采样与数值迭代结果，非符号推导。';
            html.push('<p class="prop-note">' + note
                + (bounded ? '' : '带 ⚠ 的值域含极点，实际可能无界。') + '</p>');

            $('properties-panel').innerHTML = html.join('');
        }

        /* ---------------- 圆锥曲线 ---------------- */

        renderConic(info, segCount) {
            const n = (v, d) => MathCore.fmt(v, d === undefined ? 6 : d);
            const p = (pt) => '(' + n(pt.x, 5) + ', ' + n(pt.y, 5) + ')';
            const html = [];

            html.push(this._propRow('类型', info.typeLabel + (info.equation ? '：' + info.equation : '')));
            if (info.center) html.push(this._propRow('中心', p(info.center)));
            if (info.radius !== undefined) html.push(this._propRow('半径', n(info.radius, 6)));
            if (info.a !== null && info.a !== undefined) html.push(this._propRow('a / b', n(info.a, 6) + ' / ' + n(info.b, 6)));
            if (info.c !== null && info.c !== undefined) html.push(this._propRow('c（焦距一半）', n(info.c, 6)));
            if (info.e !== null && info.e !== undefined) html.push(this._propRow('离心率 e', n(info.e, 8)));
            if (info.foci && info.foci.length) html.push(this._propRow('焦点', info.foci.map(p).join('，')));
            if (info.vertices && info.vertices.length) html.push(this._propRow('顶点', info.vertices.map(p).join('，')));
            if (info.directrices && info.directrices.length) html.push(this._propRow('准线', info.directrices.join('，')));
            if (info.asymptotes && info.asymptotes.length) html.push(this._propRow('渐近线', info.asymptotes.join('，')));
            if (info.vertex) html.push(this._propRow('抛物线顶点', p(info.vertex)));
            if (info.focus) html.push(this._propRow('抛物线焦点', p(info.focus)));
            if (info.directrix) html.push(this._propRow('抛物线准线', info.directrix));
            if (segCount !== undefined) html.push(this._propRow('绘图', '提取到 ' + segCount + ' 段等值线'));
            if (info.warnings && info.warnings.length) {
                html.push('<p class="prop-note warn">' + info.warnings.join('；') + '</p>');
            }

            $('properties-panel').innerHTML = html.join('');
        }

        showConicTangent() {
            try {
                if (!root.MathConic) throw new Error('圆锥曲线模块未加载');
                if (this.mode !== '2d' || this.view !== 'conic') throw new Error('请先切换到圆锥曲线模式');
                const exprs = this.validateAll();
                const x0 = parseFloat(val('conic-px'));
                const y0 = parseFloat(val('conic-py'));
                if (!Number.isFinite(x0) || !Number.isFinite(y0)) throw new Error('切点坐标必须是数字');
                const t = root.MathConic.tangentAt(exprs[0], x0, y0);
                $('conic-tangent-result').textContent = '切线：' + t.equation
                    + (Number.isFinite(t.slope) ? '（斜率 ' + MathCore.fmt(t.slope, 6) + '）' : '（竖直切线）');

                const range = readRange();
                if (Number.isFinite(t.slope)) {
                    const xs = [range.xMin, range.xMax];
                    this.plotter.addTrace({
                        x: xs,
                        y: xs.map((x) => t.point.y + t.slope * (x - t.point.x)),
                        type: 'scattergl', mode: 'lines',
                        line: { color: '#ffb86c', width: 2, dash: 'dash' },
                        name: '切线'
                    });
                } else {
                    this.plotter.addTrace({
                        x: [x0, x0], y: [range.yMin, range.yMax],
                        type: 'scattergl', mode: 'lines',
                        line: { color: '#ffb86c', width: 2, dash: 'dash' },
                        name: '切线'
                    });
                }
                this.plotter.addTrace({
                    x: [x0], y: [y0], type: 'scatter', mode: 'markers',
                    marker: { color: '#ffb86c', size: 8 }, name: '切点', hoverinfo: 'skip'
                });
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        showConicChord() {
            try {
                if (this.mode !== '2d' || this.view !== 'conic') throw new Error('请先切换到圆锥曲线模式');
                const k = parseFloat(val('conic-k'));
                const m = parseFloat(val('conic-m'));
                if (!Number.isFinite(k) || !Number.isFinite(m)) throw new Error('直线参数 k、m 必须是数字');
                const exprs = this.validateAll();
                const r = root.MathConic.chord(exprs[0], k, m);
                const n = (v) => MathCore.fmt(v, 6);
                const p = (pt) => '(' + n(pt.x) + ', ' + n(pt.y) + ')';
                const box = $('conic-chord-result');
                box.textContent = r.status + '：' + r.points.length + ' 个交点'
                    + (r.length ? '，弦长 ' + n(r.length) : '')
                    + (r.midpoint ? '，中点 ' + p(r.midpoint) : '');

                const range = readRange();
                const xs = [range.xMin, range.xMax];
                this.plotter.addTrace({
                    x: xs, y: xs.map((x) => k * x + m),
                    type: 'scattergl', mode: 'lines',
                    line: { color: '#a99af3', width: 1.6, dash: 'dot' },
                    name: '直线 y = ' + n(k) + 'x + ' + n(m)
                });
                if (r.points.length) {
                    this.plotter.addTrace({
                        x: r.points.map((pt) => pt.x),
                        y: r.points.map((pt) => pt.y),
                        text: r.points.map((pt, i) => 'P' + (i + 1)),
                        textposition: 'top center',
                        type: 'scatter', mode: 'markers+text',
                        marker: { color: '#a99af3', size: 8 },
                        textfont: { size: 10, color: '#c9c0ff' },
                        name: '交点', hoverinfo: 'skip'
                    });
                }
                if (r.midpoint) {
                    this.plotter.addTrace({
                        x: [r.midpoint.x], y: [r.midpoint.y],
                        type: 'scatter', mode: 'markers',
                        marker: { color: '#f1fa8c', size: 7, symbol: 'diamond' },
                        name: '中点', hoverinfo: 'skip'
                    });
                }
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        showZeroScan() {
            try {
                if (!root.MathCalculus) throw new Error('导数工具模块未加载');
                if (this.mode !== '2d' || this.view !== 'explicit') throw new Error('零点扫描仅支持显函数模式');
                const raw = MathCore.normalizeExpression(String(val('function-expr')).split(/[;；]/)[0]);
                if (!raw) throw new Error('请先输入含参数的函数');
                const param = String(val('scan-param')).trim();
                const min = parseFloat(val('scan-min'));
                const max = parseFloat(val('scan-max'));
                const vars = MathCore.freeSymbols(raw, ['x']);
                if (vars.indexOf(param) < 0) throw new Error('表达式里没有参数 ' + param);

                const range = readRange();
                const res = root.MathCalculus.zeroCountScan(raw, param, min, max, 20, range.xMin, range.xMax);
                const rows = res.rows.map((r) => '<span class="scan-cell"><b>' + param + '=' + MathCore.fmt(r.value, 3)
                    + '</b><i>' + (Number.isFinite(r.count) ? r.count : '—') + '</i></span>').join('');
                this.renderDeriv('<div class="deriv-sub">零点个数随 ' + param + ' 变化（' + MathCore.fmt(min, 3)
                    + ' → ' + MathCore.fmt(max, 3) + '）</div><div class="scan-grid">' + rows + '</div>'
                    + '<p class="prop-note">数值扫描：每个参数值独立求根，双击切点可核对图像。</p>');
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        /* ---------------- 导数工具 ---------------- */

        _derivContext() {
            if (!root.MathCalculus) throw new Error('导数工具模块未加载');
            if (this.mode !== '2d' || this.view !== 'explicit') {
                throw new Error('导数工具目前仅支持显函数模式');
            }
            const exprs = this.validateAll();
            return { expr: exprs[0], range: readRange() };
        }

        renderDeriv(html) {
            const box = $('deriv-result');
            if (box) box.innerHTML = html;
        }

        showTangent() {
            try {
                const ctx = this._derivContext();
                const x0 = parseFloat(val('tangent-x'));
                if (!Number.isFinite(x0)) throw new Error('切点 x₀ 必须是数字');
                const t = root.MathCalculus.tangentAt(ctx.expr, x0);

                this.renderDeriv(
                    '<div class="deriv-row"><span class="k">切点</span><span>(' + MathCore.fmt(t.point.x, 6) + ', ' + MathCore.fmt(t.point.y, 6) + ')</span></div>'
                    + '<div class="deriv-row"><span class="k">斜率</span><span>' + MathCore.fmt(t.slope, 8) + '</span></div>'
                    + '<div class="deriv-row"><span class="k">切线</span><span class="mono">' + t.tangent + '</span></div>'
                    + '<div class="deriv-row"><span class="k">法线</span><span class="mono">' + t.normal + '</span></div>'
                );

                const xs = [ctx.range.xMin, ctx.range.xMax];
                if (Number.isFinite(t.slope)) {
                    this.plotter.addTrace({
                        x: xs,
                        y: xs.map((x) => t.point.y + t.slope * (x - t.point.x)),
                        type: 'scattergl', mode: 'lines',
                        line: { color: '#ffb86c', width: 2, dash: 'dash' },
                        name: '切线'
                    });
                }
                if (Number.isFinite(t.slope) && Math.abs(t.slope) > 1e-9) {
                    const m2 = -1 / t.slope;
                    this.plotter.addTrace({
                        x: xs,
                        y: xs.map((x) => t.point.y + m2 * (x - t.point.x)),
                        type: 'scattergl', mode: 'lines',
                        line: { color: 'rgba(169,154,243,.75)', width: 1.5, dash: 'dot' },
                        name: '法线'
                    });
                }
                this.plotter.addTrace({
                    x: [t.point.x], y: [t.point.y],
                    type: 'scatter', mode: 'markers',
                    marker: { color: '#ffb86c', size: 8 },
                    name: '切点', hoverinfo: 'skip'
                });
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        showExtrema() {
            try {
                const ctx = this._derivContext();
                const g = root.MathCalculus.globalExtrema(ctx.expr, ctx.range.xMin, ctx.range.xMax);
                const table = root.MathCalculus.monotonicTable(ctx.expr, ctx.range.xMin, ctx.range.xMax);
                const n = (v) => MathCore.fmt(v, 6);

                const rows = table.rows.map((r) => '<div class="deriv-row"><span class="k">' + r.sign + '</span><span>'
                    + '[' + n(r.from) + ', ' + n(r.to) + '] ' + (r.dir > 0 ? '递增' : '递减') + '</span></div>').join('');
                const candidates = g.candidates.map((p) => '<div class="deriv-row"><span class="k">' + p.kind + '</span><span>('
                    + n(p.x) + ', ' + n(p.y) + ')</span></div>').join('');

                this.renderDeriv(
                    '<div class="deriv-row highlight"><span class="k">最大值</span><span>(' + n(g.max.x) + ', ' + n(g.max.y) + ') · ' + g.max.kind + '</span></div>'
                    + '<div class="deriv-row highlight"><span class="k">最小值</span><span>(' + n(g.min.x) + ', ' + n(g.min.y) + ') · ' + g.min.kind + '</span></div>'
                    + '<div class="deriv-sub">单调性</div>' + rows
                    + '<div class="deriv-sub">候选点</div>' + candidates
                );

                this.plotter.addTrace({
                    x: [g.max.x, g.min.x], y: [g.max.y, g.min.y],
                    text: ['最大值', '最小值'], textposition: ['top center', 'bottom center'],
                    type: 'scatter', mode: 'markers+text',
                    marker: { color: ['#ffb86c', '#8be9fd'], size: 9 },
                    name: '区间最值', hoverinfo: 'skip'
                });
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        /* ---------------- 知识地图的“在实验室验证” ---------------- */

        openDemo(expr, tool) {
            try {
                this.mode = '2d';
                if (tool === 'conic') {
                    this.view = 'conic';
                    $('conic-expr').value = expr;
                } else if (tool === 'parametric') {
                    this.view = 'parametric';
                    const parts = String(expr).split('|');
                    $('param-x').value = parts[0] || '';
                    $('param-y').value = parts[1] || '';
                } else if (tool === 'polar') {
                    this.view = 'polar';
                    $('polar-r').value = expr;
                } else {
                    this.view = 'explicit';
                    $('function-expr').value = expr;
                }
                this.syncParams();
                this.updateUI();
                this.plot();
            } catch (e) {
                this.showError(e && e.message ? e.message : String(e));
            }
        }

        /* ---------------- 多函数对比 ---------------- */

        renderCompare(exprs, range) {
            const panel = $('properties-panel');
            if (!panel || !MathCore.compareFunctions) return;
            let cmp;
            try {
                cmp = MathCore.compareFunctions(exprs[0], exprs[1], range.xMin, range.xMax);
            } catch (e) {
                return;
            }
            const n = (v, d) => MathCore.fmt(v, d === undefined ? 5 : d);
            const rows = [];
            rows.push('<div class="prop-sep">对比：' + exprs[0] + '　vs　' + exprs[1] + '</div>');
            rows.push(this._propRow('交点', cmp.intersections.length
                ? cmp.intersections.slice(0, 8).map((p) => 'x≈' + n(p.x, 5)).join('，')
                : '区间内无'));
            const above = cmp.intervals.filter((s) => s.dir > 0);
            const below = cmp.intervals.filter((s) => s.dir < 0);
            rows.push(this._propRow('f1 在上方', above.length
                ? above.slice(0, 3).map((s) => '[' + n(s.from, 3) + ',' + n(s.to, 3) + ']').join(' ') : '无'));
            rows.push(this._propRow('f2 在上方', below.length
                ? below.slice(0, 3).map((s) => '[' + n(s.from, 3) + ',' + n(s.to, 3) + ']').join(' ') : '无'));
            rows.push(this._propRow('最大间距', Number.isFinite(cmp.maxGap.gap)
                ? '|Δ|≈' + n(Math.abs(cmp.maxGap.gap), 4) + '（x≈' + n(cmp.maxGap.x, 4) + '）' : '—'));
            rows.push(this._propRow('面积差', '∫(f1−f2) ≈ ' + n(cmp.totalArea, 4)));

            // 放在脚注之前，避免「采样说明」被夹在中间
            const note = panel.querySelector('.prop-note');
            if (note) note.insertAdjacentHTML('beforebegin', rows.join(''));
            else panel.insertAdjacentHTML('beforeend', rows.join(''));
        }

        /* ---------------- 数值表与导出 ---------------- */

        /**
         * 把最近一次采样结果归一为 { headers, rows }，供数值表与 CSV 共用。
         * @param {object} samples plotter.lastSamples
         * @param {number} limit 最多返回多少行（Infinity 表示全部）
         */
        _sampleTable(samples, limit) {
            if (!samples) return null;
            const pick = (len) => Math.max(1, Math.ceil(len / limit));

            if (samples.kind === 'explicit') {
                const series = samples.series || [];
                if (!series.length) return null;
                const n = series[0].x.length;
                const step = pick(n);
                const headers = ['x'].concat(series.length === 1
                    ? ['f(x)']
                    : series.map((s, i) => 'f' + (i + 1) + '(x)'));
                const rows = [];
                for (let i = 0; i < n; i += step) {
                    rows.push([series[0].x[i]].concat(series.map((s) => s.y[i])));
                }
                return { headers, rows };
            }
            if (samples.kind === 'parametric') {
                const n = samples.t.length;
                const step = pick(n);
                const rows = [];
                for (let i = 0; i < n; i += step) rows.push([samples.t[i], samples.x[i], samples.y[i]]);
                return { headers: ['t', 'x(t)', 'y(t)'], rows };
            }
            if (samples.kind === 'polar') {
                const n = samples.theta.length;
                const step = pick(n);
                const rows = [];
                for (let i = 0; i < n; i += step) {
                    const x = samples.x[i], y = samples.y[i];
                    const r = (Number.isFinite(x) && Number.isFinite(y)) ? Math.hypot(x, y) : null;
                    rows.push([samples.theta[i], r, x, y]);
                }
                return { headers: ['theta', 'r', 'x', 'y'], rows };
            }
            return null;
        }

        renderTable() {
            const body = $('table-body');
            const table = this._sampleTable(this.plotter.lastSamples, 25);
            if (!table) {
                body.innerHTML = '<tr><td colspan="4" class="empty">暂无数据，请先绘制 2D 图形</td></tr>';
                return;
            }
            const cell = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : MathCore.fmt(v, 8));
            const head = '<tr>' + table.headers.map((h) => '<th>' + h + '</th>').join('') + '</tr>';
            const rows = table.rows.map((r) =>
                '<tr>' + r.map((v) => '<td>' + cell(v) + '</td>').join('') + '</tr>');
            body.innerHTML = head + rows.join('');
        }

        exportCSV() {
            const table = this._sampleTable(this.plotter.lastSamples, Infinity);
            if (!table) {
                this.showError('暂无可导出的数据，请先绘制 2D 图形');
                return;
            }
            const cell = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '' : String(v));
            const lines = [table.headers.join(',')];
            for (const r of table.rows) lines.push(r.map(cell).join(','));
            // \ufeff：让 Excel 正确识别 UTF-8
            const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'function_data.csv';
            a.click();
            URL.revokeObjectURL(a.href);
        }

        /* ---------------- 聊天 ---------------- */

        sendChat() {
            const input = $('chat-input');
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            this.assistant.handle(text);
        }

        addMessage(role, text) {
            const box = $('chat-messages');
            const div = document.createElement('div');
            div.className = 'msg ' + role;
            div.textContent = text;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        }

        /* ---------------- 状态显示 ---------------- */

        showLoading(on) {
            $('loading-indicator').style.display = on ? 'flex' : 'none';
        }

        showError(msg) {
            const el = $('graph-error');
            if (!msg) { el.style.display = 'none'; return; }
            el.textContent = msg;
            el.style.display = 'block';
        }

        startPerfMonitor() {
            let frames = 0, last = performance.now();
            const tick = () => {
                frames++;
                const now = performance.now();
                if (now - last >= 1000) {
                    $('perf-info').textContent =
                        'FPS: ' + frames + ' | 上次绘图: ' + this.lastPlotTime.toFixed(0) + ' ms';
                    frames = 0;
                    last = now;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }
    }

    root.MathApp = MathApp;
}(typeof self !== 'undefined' ? self : this));
