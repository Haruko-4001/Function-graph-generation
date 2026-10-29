/**
 * visualizer.js
 * ============================================================
 * 绘图引擎：基于 Plotly 的函数图像渲染。
 *
 * 支持模式：
 *  - explicit   显函数 y = f(x)，支持用 ; 分隔最多 6 个函数叠加
 *  - parametric 参数方程 x(t), y(t)
 *  - polar      极坐标 r = r(θ)
 *  - implicit   隐函数 f(x, y) = 0（marching squares 等值线）
 *  - surface    3D 曲面 z = f(x, y)
 *
 * 大数据量计算（隐函数网格 / 3D 网格）采用分块异步执行，避免阻塞 UI。
 * ============================================================
 */
(function (root) {
    'use strict';

    const MathCore = root.MathCore;

    /** 曲线配色（色盲友好） */
    const PALETTE = ['#2f6b52', '#b5613a', '#6b5b95', '#3f6f8f', '#8a7a3f', '#7d5a6b'];

    /** 每帧最多计算的点数（分块异步的块大小） */
    const CHUNK = 4000;

    /**
     * 下一帧回调。
     * 标签页切到后台时 requestAnimationFrame 会被浏览器暂停，
     * 若只用 rAF，分块任务会永久挂起、界面一直停在「正在计算」。故加 setTimeout 兜底。
     */
    function nextFrame(fn) {
        const hidden = typeof document !== 'undefined' && document.hidden;
        if (!hidden && typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(fn);
        } else {
            setTimeout(fn, 0);
        }
    }

    /**
     * 分块异步执行循环体，避免长时间阻塞主线程。
     * @param {number} total 总迭代次数
     * @param {(i:number)=>void} body 单次迭代
     * @param {()=>boolean} [isStale] 返回 true 时提前中止（有更新的绘图请求）
     * @returns {Promise<boolean>} true=跑完，false=被中止
     */
    function chunked(total, body, isStale) {
        return new Promise((resolve, reject) => {
            let i = 0;
            function step() {
                try {
                    if (isStale && isStale()) { resolve(false); return; }
                    const end = Math.min(i + CHUNK, total);
                    for (; i < end; i++) body(i);
                    if (i < total) nextFrame(step);
                    else resolve(true);
                } catch (e) {
                    reject(e);
                }
            }
            nextFrame(step);
        });
    }

    /**
     * Plotter：持有目标容器与最近一次的采样结果。
     */
    class Plotter {
        /**
         * @param {string} containerId 绘图容器 id
         */
        constructor(containerId) {
            this.containerId = containerId;
            this.lastTraces = [];
            this.lastSamples = null;   // 供数值表 / CSV 导出使用
            this.lastMeta = null;
            this._runId = 0;           // 绘图请求序号，用于丢弃过期结果
        }

        /**
         * 开启一次绘图请求。快速连续改表达式时，旧请求可能算完得更晚，
         * 若不加序号会把新图覆盖掉（表现为「画的是上一个函数」）。
         */
        _begin() {
            return ++this._runId;
        }

        /** 该请求是否已被更新的请求取代 */
        _isStale(rid) {
            return this._runId !== rid;
        }

        /* ---------------- 布局 ---------------- */

        _baseLayout(title) {
            return {
                title: { text: title, font: { color: '#24302a', size: 14, family: 'Noto Serif SC, Songti SC, serif' } },
                font: { family: 'Noto Sans SC, Microsoft YaHei, sans-serif', color: '#5f675f', size: 11 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: '#fbf8f1',
                showlegend: true,
                legend: { orientation: 'h', y: 1.1, font: { size: 10, color: '#4f5a53' } },
                autosize: true,
                margin: { l: 60, r: 25, t: 60, b: 50 }
            };
        }

        _axis2D(titleText, range, gridColor) {
            return {
                title: titleText,
                range: range,
                gridcolor: gridColor,
                zerolinecolor: 'rgba(36,48,42,.28)', linecolor: 'rgba(36,48,42,.22)'
            };
        }

        _render(traces, layout, meta) {
            const config = {
                displayModeBar: true,
                displaylogo: false,
                responsive: true,
                scrollZoom: true,
                toImageButtonOptions: { format: 'png', filename: 'math_function' },
                modeBarButtonsToRemove: ['lasso2d', 'select2d']
            };
            this.lastTraces = traces;
            this.lastMeta = meta || null;
            return Plotly.react(this.containerId, traces, layout, config);
        }

        /* ---------------- 显函数 y = f(x) ---------------- */

        /**
         * @param {string[]} expressions 规范化后的表达式列表（1~6 个）
         * @param {number} xMin
         * @param {number} xMax
         * @param {number} yMin
         * @param {number} yMax
         */
        async plotExplicit(expressions, xMin, xMax, yMin, yMax) {
            const rid = this._begin();
            const traces = [];
            const samplesOut = [];
            const n = 1600;
            const xs = MathCore.linspace(xMin, xMax, n);

            for (let k = 0; k < expressions.length; k++) {
                const expr = expressions[k];
                const f = MathCore.makeFunction(expr, ['x']);
                const xArr = new Array(n);
                const yArr = new Array(n);

                const finished = await chunked(n, (i) => {
                    const y = f(xs[i]);
                    if (Number.isFinite(y) && Math.abs(y) < 1e8) {
                        xArr[i] = xs[i];
                        yArr[i] = y;
                    } else {
                        xArr[i] = xs[i];
                        yArr[i] = null; // 断点处断开线条
                    }
                }, () => this._isStale(rid));
                if (!finished) return null;

                traces.push({
                    x: xArr,
                    y: yArr,
                    type: 'scattergl',
                    mode: 'lines',
                    connectgaps: false,
                    line: { color: PALETTE[k % PALETTE.length], width: 2.5 },
                    name: 'y = ' + expr
                });
                samplesOut.push({ expr, x: xArr, y: yArr });
            }

            // 两个函数时自动标注交点
            if (expressions.length === 2) {
                const pts = MathCore.intersections(expressions[0], expressions[1], xMin, xMax);
                if (pts.length) {
                    traces.push({
                        x: pts.map((p) => p.x),
                        y: pts.map((p) => p.y),
                        type: 'scattergl',
                        mode: 'markers',
                        marker: { color: '#ff5555', size: 9, symbol: 'circle-open', line: { width: 2 } },
                        name: '交点 (' + pts.length + ')'
                    });
                }
            }

            const layout = this._baseLayout('y = f(x)');
            layout.xaxis = this._axis2D('x', [xMin, xMax], 'rgba(36,48,42,.09)');
            layout.yaxis = this._axis2D('y', [yMin, yMax], 'rgba(36,48,42,.09)');

            if (this._isStale(rid)) return null;
            this.lastSamples = { kind: 'explicit', series: samplesOut };
            await this._render(traces, layout, { mode: 'explicit', expressions });
            return samplesOut;
        }

        /* ---------------- 参数方程 ---------------- */

        async plotParametric(exprX, exprY, tMin, tMax, xView, yView) {
            const rid = this._begin();
            const fx = MathCore.makeFunction(exprX, ['t']);
            const fy = MathCore.makeFunction(exprY, ['t']);
            const n = 2000;
            const ts = MathCore.linspace(tMin, tMax, n);
            const xArr = new Array(n), yArr = new Array(n);

            const finished = await chunked(n, (i) => {
                const px = fx(ts[i]);
                const py = fy(ts[i]);
                if (Number.isFinite(px) && Number.isFinite(py) && Math.abs(px) < 1e8 && Math.abs(py) < 1e8) {
                    xArr[i] = px; yArr[i] = py;
                } else {
                    xArr[i] = null; yArr[i] = null;
                }
            }, () => this._isStale(rid));
            if (!finished) return null;

            const traces = [{
                x: xArr, y: yArr,
                type: 'scattergl', mode: 'lines', connectgaps: false,
                line: { color: PALETTE[0], width: 2.5 },
                name: 'x=' + exprX + ', y=' + exprY
            }];

            const layout = this._baseLayout('参数方程 (t ∈ [' + tMin + ', ' + tMax + '])');
            layout.xaxis = this._axis2D('x', xView, 'rgba(36,48,42,.09)');
            layout.yaxis = this._axis2D('y', yView, 'rgba(36,48,42,.09)');

            if (this._isStale(rid)) return null;
            this.lastSamples = { kind: 'parametric', t: ts, x: xArr, y: yArr, expressions: [exprX, exprY] };
            await this._render(traces, layout, { mode: 'parametric' });
            return true;
        }

        /* ---------------- 极坐标 r = r(θ) ---------------- */

        async plotPolar(exprR, tMin, tMax, view) {
            const rid = this._begin();
            const fr = MathCore.makeFunction(exprR, ['theta']);
            const n = 2400;
            const ts = MathCore.linspace(tMin, tMax, n);
            const xArr = new Array(n), yArr = new Array(n);

            const finished = await chunked(n, (i) => {
                const r = fr(ts[i]);
                if (Number.isFinite(r) && Math.abs(r) < 1e6) {
                    xArr[i] = r * Math.cos(ts[i]);
                    yArr[i] = r * Math.sin(ts[i]);
                } else {
                    xArr[i] = null; yArr[i] = null;
                }
            }, () => this._isStale(rid));
            if (!finished) return null;

            const traces = [{
                x: xArr, y: yArr,
                type: 'scattergl', mode: 'lines', connectgaps: false,
                line: { color: PALETTE[1], width: 2.5 },
                name: 'r = ' + exprR
            }];

            const layout = this._baseLayout('极坐标 r = r(θ)');
            layout.xaxis = this._axis2D('x', view, 'rgba(36,48,42,.09)');
            layout.yaxis = this._axis2D('y', view, 'rgba(36,48,42,.09)');
            layout.yaxis.scaleanchor = 'x';

            if (this._isStale(rid)) return null;
            this.lastSamples = { kind: 'polar', theta: ts, x: xArr, y: yArr, expression: exprR };
            await this._render(traces, layout, { mode: 'polar' });
            return true;
        }

        /* ---------------- 隐函数 f(x,y) = 0 ---------------- */

        /**
         * marching squares 提取零等值线。
         */
        _marchingSquares(grid, xs, ys) {
            const nx = xs.length, ny = ys.length;
            const segments = [];

            const interp = (x1, y1, x2, y2, v1, v2) => {
                const t = v1 / (v1 - v2);
                return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
            };

            for (let i = 0; i < nx - 1; i++) {
                for (let j = 0; j < ny - 1; j++) {
                    const va = grid[i][j], vb = grid[i + 1][j],
                          vc = grid[i + 1][j + 1], vd = grid[i][j + 1];
                    if (!Number.isFinite(va) || !Number.isFinite(vb) ||
                        !Number.isFinite(vc) || !Number.isFinite(vd)) continue;

                    let m = 0;
                    if (va > 0) m |= 1;
                    if (vb > 0) m |= 2;
                    if (vc > 0) m |= 4;
                    if (vd > 0) m |= 8;
                    if (m === 0 || m === 15) continue;

                    const xa = xs[i], xb = xs[i + 1], ya = ys[j], yb = ys[j + 1];
                    const eAB = interp(xa, ya, xb, ya, va, vb); // 下边
                    const eBC = interp(xb, ya, xb, yb, vb, vc); // 右边
                    const eCD = interp(xa, yb, xb, yb, vd, vc); // 上边
                    const eDA = interp(xa, ya, xa, yb, va, vd); // 左边

                    const seg = (p, q) => segments.push([p[0], p[1], q[0], q[1]]);

                    switch (m) {
                        case 1: case 14: seg(eDA, eAB); break;
                        case 2: case 13: seg(eAB, eBC); break;
                        case 3: case 12: seg(eDA, eBC); break;
                        case 4: case 11: seg(eBC, eCD); break;
                        case 6: case 9:  seg(eAB, eCD); break;
                        case 7: case 8:  seg(eDA, eCD); break;
                        case 5: {
                            const center = (va + vb + vc + vd) / 4;
                            if (center > 0) { seg(eDA, eAB); seg(eBC, eCD); }
                            else { seg(eAB, eBC); seg(eDA, eCD); }
                            break;
                        }
                        case 10: {
                            const center = (va + vb + vc + vd) / 4;
                            if (center > 0) { seg(eAB, eBC); seg(eDA, eCD); }
                            else { seg(eDA, eAB); seg(eBC, eCD); }
                            break;
                        }
                    }
                }
            }
            return segments;
        }

        async plotImplicit(expr, xMin, xMax, yMin, yMax, opts) {
            const rid = this._begin();
            // 允许用户输入 "x^2 + y^2 = 9" 形式，转换为 f(x,y) = 0
            let body = expr;
            const eq = expr.indexOf('=');
            if (eq > 0) {
                body = '(' + expr.slice(0, eq) + ') - (' + expr.slice(eq + 1) + ')';
            }
            const f = MathCore.makeFunction(body, ['x', 'y']);

            const nx = 200, ny = 200;
            const xs = MathCore.linspace(xMin, xMax, nx);
            const ys = MathCore.linspace(yMin, yMax, ny);
            const grid = new Array(nx);
            for (let i = 0; i < nx; i++) grid[i] = new Array(ny);

            const finished = await chunked(nx * ny, (k) => {
                const i = Math.floor(k / ny), j = k % ny;
                grid[i][j] = f(xs[i], ys[j]);
            }, () => this._isStale(rid));
            if (!finished) return null;

            const segments = this._marchingSquares(grid, xs, ys);

            if (this._isStale(rid)) return null;

            const xArr = [], yArr = [];
            for (const s of segments) {
                xArr.push(s[0], s[2], null);
                yArr.push(s[1], s[3], null);
            }

            const traces = [{
                x: xArr, y: yArr,
                type: 'scattergl', mode: 'lines', connectgaps: false,
                line: { color: PALETTE[2], width: 2 },
                name: expr
            }];

            // 圆锥曲线的焦点/顶点/中心等标记
            if (opts && Array.isArray(opts.markers) && opts.markers.length) {
                const kinds = { focus: '#b5613a', vertex: '#3f6f8f', center: '#8a7a3f' };
                const groups = {};
                opts.markers.forEach(function (m) {
                    const kind = m.kind || 'vertex';
                    if (!groups[kind]) groups[kind] = [];
                    groups[kind].push(m);
                });
                Object.keys(groups).forEach(function (kind) {
                    const list = groups[kind];
                    traces.push({
                        x: list.map(function (m) { return m.x; }),
                        y: list.map(function (m) { return m.y; }),
                        text: list.map(function (m) { return kind === 'vertex' ? '' : (m.label || ''); }),
                        textposition: kind === 'center' ? 'bottom center' : 'top center',
                        type: 'scatter',
                        mode: kind === 'vertex' ? 'markers' : 'markers+text',
                        marker: { color: kinds[kind] || '#24302a', size: 8, line: { color: 'rgba(255,253,248,.95)', width: 1 } },
                        textfont: { size: 10, color: kinds[kind] || '#24302a' },
                        name: kind === 'focus' ? '焦点' : (kind === 'center' ? '中心' : '顶点'),
                        hoverinfo: 'skip'
                    });
                });
            }

            const layout = this._baseLayout((opts && opts.title) || ('隐函数 ' + expr + ' = 0'));
            // 标题靠左、字号收敛，避免与图例/工具栏在顶部打架
            layout.title = {
                text: (opts && opts.title) || ('隐函数 ' + expr + ' = 0'),
                font: { color: '#4f5a53', size: 12 },
                x: 0.012, xanchor: 'left', y: 0.985, yanchor: 'top'
            };
            layout.showlegend = false;
            layout.margin.t = 46;
            layout.xaxis = this._axis2D('x', [xMin, xMax], 'rgba(36,48,42,.09)');
            layout.yaxis = this._axis2D('y', [yMin, yMax], 'rgba(36,48,42,.09)');
            layout.yaxis.scaleanchor = 'x';

            this.lastSamples = { kind: 'implicit', segments: segments.length, expression: expr };
            await this._render(traces, layout, { mode: 'implicit', expression: expr });
            return segments.length;
        }

        /* ---------------- 3D 曲面 z = f(x,y) ---------------- */

        async plotSurface(expr, xMin, xMax, yMin, yMax, opts) {
            const rid = this._begin();
            const f = MathCore.makeFunction(expr, ['x', 'y']);
            const n = 80;
            const xs = MathCore.linspace(xMin, xMax, n);
            const ys = MathCore.linspace(yMin, yMax, n);
            const zs = new Array(n);
            for (let i = 0; i < n; i++) zs[i] = new Array(n);

            const finished = await chunked(n * n, (k) => {
                const i = Math.floor(k / n), j = k % n;
                const z = f(xs[i], ys[j]);
                zs[i][j] = Number.isFinite(z) && Math.abs(z) < 1e6 ? z : null;
            }, () => this._isStale(rid));
            if (!finished) return null;

            const traces = [{
                x: xs, y: ys, z: zs,
                type: 'surface',
                colorscale: 'Viridis',
                showscale: true,
                contours: {
                    z: { show: true, usecolormap: true, highlightcolor: '#42f462', project: { z: true } }
                },
                name: 'z = ' + expr
            }];

            // 可选：在曲面上高亮一条切片，配合一维性质分析
            if (opts && opts.sliceY !== undefined && opts.sliceY !== null) {
                const cy = opts.sliceY;
                const sx = MathCore.linspace(xMin, xMax, 240);
                const sz = sx.map(function (x) {
                    const z = f(x, cy);
                    return (Number.isFinite(z) && Math.abs(z) < 1e6) ? z : null;
                });
                traces.push({
                    x: sx,
                    y: sx.map(function () { return cy; }),
                    z: sz,
                    type: 'scatter3d',
                    mode: 'lines',
                    line: { color: '#ffb86c', width: 6 },
                    name: '切片 y = ' + MathCore.fmt(cy, 4)
                });
            }

            const layout = this._baseLayout('z = ' + expr);
            layout.scene = {
                xaxis: { title: 'x', gridcolor: 'rgba(36,48,42,.1)' },
                yaxis: { title: 'y', gridcolor: 'rgba(36,48,42,.1)' },
                zaxis: { title: 'z', gridcolor: 'rgba(36,48,42,.1)' }
            };

            if (this._isStale(rid)) return null;
            this.lastSamples = { kind: 'surface', x: xs, y: ys, z: zs, expression: expr };
            await this._render(traces, layout, { mode: 'surface', expression: expr });
            return true;
        }

        /** 在现有图上叠加一条临时曲线（切线、辅助线等） */
        addTrace(trace) {
            if (typeof Plotly === 'undefined' || !trace) return;
            try {
                Plotly.addTraces(this.containerId, trace);
            } catch (e) { /* 容器未初始化时忽略 */ }
        }

        /** 清空画布 */
        clear() {
            this._runId++; // 让仍在计算的绘图任务作废，避免清空后又被画回来
            if (typeof Plotly !== 'undefined') {
                Plotly.purge(this.containerId);
            }
            this.lastTraces = [];
            this.lastSamples = null;
            this.lastMeta = null;
        }
    }

    root.MathPlotter = Plotter;
}(typeof self !== 'undefined' ? self : this));
