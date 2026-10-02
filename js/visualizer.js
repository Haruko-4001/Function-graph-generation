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
    const PALETTE = ['#64ffda', '#ffb86c', '#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c'];

    /** 每帧最多计算的点数（分块异步的块大小） */
    const CHUNK = 4000;

    /**
     * 分块异步执行循环体，避免长时间阻塞主线程。
     * @param {number} total 总迭代次数
     * @param {(i:number)=>void} body 单次迭代
     * @returns {Promise<void>}
     */
    function chunked(total, body) {
        return new Promise((resolve, reject) => {
            let i = 0;
            function step() {
                try {
                    const end = Math.min(i + CHUNK, total);
                    for (; i < end; i++) body(i);
                    if (i < total) requestAnimationFrame(step);
                    else resolve();
                } catch (e) {
                    reject(e);
                }
            }
            requestAnimationFrame(step);
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
        }

        /* ---------------- 布局 ---------------- */

        _baseLayout(title) {
            return {
                title: { text: title, font: { color: '#fff', size: 15 } },
                font: { family: 'Noto Sans SC, Microsoft YaHei, sans-serif', color: '#e6e6e6' },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(10,22,40,0.55)',
                showlegend: true,
                legend: { orientation: 'h', y: 1.1 },
                autosize: true,
                margin: { l: 60, r: 25, t: 60, b: 50 }
            };
        }

        _axis2D(titleText, range, gridColor) {
            return {
                title: titleText,
                range: range,
                gridcolor: gridColor,
                zerolinecolor: 'rgba(255,255,255,.4)'
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
            const traces = [];
            const samplesOut = [];
            const n = 1600;
            const xs = MathCore.linspace(xMin, xMax, n);

            for (let k = 0; k < expressions.length; k++) {
                const expr = expressions[k];
                const f = MathCore.makeFunction(expr, ['x']);
                const xArr = new Array(n);
                const yArr = new Array(n);

                await chunked(n, (i) => {
                    const y = f(xs[i]);
                    if (Number.isFinite(y) && Math.abs(y) < 1e8) {
                        xArr[i] = xs[i];
                        yArr[i] = y;
                    } else {
                        xArr[i] = xs[i];
                        yArr[i] = null; // 断点处断开线条
                    }
                });

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
            layout.xaxis = this._axis2D('x', [xMin, xMax], 'rgba(255,255,255,.12)');
            layout.yaxis = this._axis2D('y', [yMin, yMax], 'rgba(255,255,255,.12)');

            this.lastSamples = { kind: 'explicit', series: samplesOut };
            await this._render(traces, layout, { mode: 'explicit', expressions });
            return samplesOut;
        }

        /* ---------------- 参数方程 ---------------- */

        async plotParametric(exprX, exprY, tMin, tMax, xView, yView) {
            const fx = MathCore.makeFunction(exprX, ['t']);
            const fy = MathCore.makeFunction(exprY, ['t']);
            const n = 2000;
            const ts = MathCore.linspace(tMin, tMax, n);
            const xArr = new Array(n), yArr = new Array(n);

            await chunked(n, (i) => {
                const px = fx(ts[i]);
                const py = fy(ts[i]);
                if (Number.isFinite(px) && Number.isFinite(py) && Math.abs(px) < 1e8 && Math.abs(py) < 1e8) {
                    xArr[i] = px; yArr[i] = py;
                } else {
                    xArr[i] = null; yArr[i] = null;
                }
            });

            const traces = [{
                x: xArr, y: yArr,
                type: 'scattergl', mode: 'lines', connectgaps: false,
                line: { color: PALETTE[0], width: 2.5 },
                name: 'x=' + exprX + ', y=' + exprY
            }];

            const layout = this._baseLayout('参数方程 (t ∈ [' + tMin + ', ' + tMax + '])');
            layout.xaxis = this._axis2D('x', xView, 'rgba(255,255,255,.12)');
            layout.yaxis = this._axis2D('y', yView, 'rgba(255,255,255,.12)');

            this.lastSamples = { kind: 'parametric', t: ts, x: xArr, y: yArr };
            await this._render(traces, layout, { mode: 'parametric' });
        }

        /* ---------------- 极坐标 r = r(θ) ---------------- */

        async plotPolar(exprR, tMin, tMax, view) {
            const fr = MathCore.makeFunction(exprR, ['theta']);
            const n = 2400;
            const ts = MathCore.linspace(tMin, tMax, n);
            const xArr = new Array(n), yArr = new Array(n);

            await chunked(n, (i) => {
                const r = fr(ts[i]);
                if (Number.isFinite(r) && Math.abs(r) < 1e6) {
                    xArr[i] = r * Math.cos(ts[i]);
                    yArr[i] = r * Math.sin(ts[i]);
                } else {
                    xArr[i] = null; yArr[i] = null;
                }
            });

            const traces = [{
                x: xArr, y: yArr,
                type: 'scattergl', mode: 'lines', connectgaps: false,
                line: { color: PALETTE[1], width: 2.5 },
                name: 'r = ' + exprR
            }];

            const layout = this._baseLayout('极坐标 r = r(θ)');
            layout.xaxis = this._axis2D('x', view, 'rgba(255,255,255,.12)');
            layout.yaxis = this._axis2D('y', view, 'rgba(255,255,255,.12)');
            layout.yaxis.scaleanchor = 'x';

            this.lastSamples = { kind: 'polar', theta: ts, x: xArr, y: yArr };
            await this._render(traces, layout, { mode: 'polar' });
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

        async plotImplicit(expr, xMin, xMax, yMin, yMax) {
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

            await chunked(nx * ny, (k) => {
                const i = Math.floor(k / ny), j = k % ny;
                grid[i][j] = f(xs[i], ys[j]);
            });

            const segments = this._marchingSquares(grid, xs, ys);

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

            const layout = this._baseLayout('隐函数 ' + expr + ' = 0');
            layout.xaxis = this._axis2D('x', [xMin, xMax], 'rgba(255,255,255,.12)');
            layout.yaxis = this._axis2D('y', [yMin, yMax], 'rgba(255,255,255,.12)');
            layout.yaxis.scaleanchor = 'x';

            this.lastSamples = { kind: 'implicit', segments: segments.length };
            await this._render(traces, layout, { mode: 'implicit', expression: expr });
            return segments.length;
        }

        /* ---------------- 3D 曲面 z = f(x,y) ---------------- */

        async plotSurface(expr, xMin, xMax, yMin, yMax) {
            const f = MathCore.makeFunction(expr, ['x', 'y']);
            const n = 80;
            const xs = MathCore.linspace(xMin, xMax, n);
            const ys = MathCore.linspace(yMin, yMax, n);
            const zs = new Array(n);
            for (let i = 0; i < n; i++) zs[i] = new Array(n);

            await chunked(n * n, (k) => {
                const i = Math.floor(k / n), j = k % n;
                const z = f(xs[i], ys[j]);
                zs[i][j] = Number.isFinite(z) && Math.abs(z) < 1e6 ? z : null;
            });

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

            const layout = this._baseLayout('z = ' + expr);
            layout.scene = {
                xaxis: { title: 'x', gridcolor: 'rgba(255,255,255,.15)' },
                yaxis: { title: 'y', gridcolor: 'rgba(255,255,255,.15)' },
                zaxis: { title: 'z', gridcolor: 'rgba(255,255,255,.15)' }
            };

            this.lastSamples = { kind: 'surface', x: xs, y: ys, z: zs };
            await this._render(traces, layout, { mode: 'surface', expression: expr });
        }

        /** 清空画布 */
        clear() {
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
