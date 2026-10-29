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
            this.updateUI();
            this.addMessage('bot', this.assistant.helpText());
            $('function-expr').value = 'sin(x)';
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
            });

            const autoHandler = this.debounce(() => { if (this.autoPlot) this.plot(); }, 800);
            ['function-expr', 'param-x', 'param-y', 'polar-r', 'implicit-expr',
             'function-expr-3d', 'x-min', 'x-max', 'y-min', 'y-max'].forEach((id) => {
                const el = $(id);
                if (el) el.addEventListener('input', autoHandler);
            });

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
            document.querySelectorAll('.tab').forEach((t) =>
                t.classList.toggle('active', t.dataset.mode === this.mode));
            document.querySelectorAll('.view-btn').forEach((b) =>
                b.classList.toggle('active', b.dataset.view === this.view));

            const is2D = this.mode === '2d';
            $('view-switch').style.display = is2D ? 'flex' : 'none';
            $('panel-3d').style.display = is2D ? 'none' : 'block';
            $('panel-explicit').style.display = is2D && this.view === 'explicit' ? 'block' : 'none';
            $('panel-parametric').style.display = is2D && this.view === 'parametric' ? 'block' : 'none';
            $('panel-polar').style.display = is2D && this.view === 'polar' ? 'block' : 'none';
            $('panel-implicit').style.display = is2D && this.view === 'implicit' ? 'block' : 'none';

            const rangeLabel = { explicit: ['x 范围', 'y 范围'], parametric: ['t 范围', '显示范围 x/y'], polar: ['θ 范围', '显示范围'], implicit: ['x 范围', 'y 范围'] };
            const labels = this.mode === '3d' ? ['x 范围', 'y 范围'] : (rangeLabel[this.view] || ['x 范围', 'y 范围']);
            $('range-label-x').textContent = labels[0];
            $('range-label-y').textContent = labels[1];
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
                        .map((s) => MathCore.normalizeExpression(s))
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
            }
            return [];
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
                    ok = await this.plotter.plotSurface(exprs[0], range.xMin, range.xMax, range.yMin, range.yMax);
                    this.report = null;
                    if (ok) this.renderReportUnavailable('3D 曲面模式下暂不提供自动性质分析');
                } else if (this.view === 'explicit') {
                    ok = await this.plotter.plotExplicit(exprs, range.xMin, range.xMax, range.yMin, range.yMax);
                    if (ok) {
                        this.report = MathCore.analyzeFunction(exprs[0], { xMin: range.xMin, xMax: range.xMax });
                        this.renderReport();
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
                }

                // ok === null/false 表示本次结果已被更新的请求取代，不再覆盖后画的图
                if (!ok) return;

                this.lastPlotTime = performance.now() - start;
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

        /* ---------------- 性质报告渲染 ---------------- */

        _propRow(k, v) {
            return '<div class="prop"><span class="k">' + k + '</span><span>' + v + '</span></div>';
        }

        renderReportUnavailable(msg) {
            $('properties-panel').innerHTML = '<p class="empty">' + msg + '</p>';
        }

        renderReport() {
            const r = this.report;
            if (!r) return;
            const n = (v, d) => MathCore.fmt(v, d === undefined ? 6 : d);
            const html = [];

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
