/**
 * player.js
 * ============================================================
 * 分镜播放器：把 04_storyboard 渲染成一段可看的分步讲解。
 *
 * 设计要点：
 *  - 只消费分镜数据，不关心分镜怎么来（未来可换成别的渲染器）
 *  - 每一帧都是「重放 beats[0..i] 的累积状态」，因此天然支持跳步与重播
 *  - 自检未通过（ok=false）的标注用红色 ✕ 画出来，不掩盖问题
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./math-core.js'));
    } else {
        root.MathStoryboardPlayer = factory(root.MathCore);
    }
}(typeof self !== 'undefined' ? self : this, function (MathCore) {
    'use strict';

    if (!MathCore) throw new Error('player.js 依赖 math-core.js，请先加载');

    const COLOR = {
        curve: '#64ffda',
        zero: '#8be9fd',
        max: '#ffb86c',
        min: '#ffb86c',
        inflection: '#ff79c6',
        fail: '#ff5555',
        asym: 'rgba(255,255,255,.42)',
        band: 'rgba(100,255,218,.07)',
        dot: '#f1fa8c'
    };

    const CONFIG = {
        displayModeBar: false,
        responsive: true,
        staticPlot: true
    };

    class StoryboardPlayer {
        /**
         * @param {string} containerId Plotly 容器 id
         */
        constructor(containerId) {
            this.containerId = containerId;
            this.sb = null;
            this.index = -1;
            this.playing = false;
            this.timer = null;
            this.raf = null;
            this.samples = null;
            this._onStep = null;
            this._onEnd = null;
        }

        /**
         * 开始播放。
         * @param {object} storyboard buildStoryboard 的返回值
         * @param {{onStep?:Function, onEnd?:Function}} [cbs]
         */
        play(storyboard, cbs) {
            this.stop();
            if (!storyboard || !storyboard.beats || !storyboard.beats.length) return false;
            this.sb = storyboard;
            this._onStep = (cbs && cbs.onStep) || null;
            this._onEnd = (cbs && cbs.onEnd) || null;
            this._prepareSamples(storyboard);
            this.index = -1;
            this.playing = true;
            this._advance();
            return true;
        }

        /** 停止播放（保留最后一帧，由调用方决定是否重绘） */
        stop() {
            this.playing = false;
            if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        }

        /** 直接画到第 i 个镜头（用于调试或“跳到最后”） */
        seek(index) {
            if (!this.sb) return;
            const i = Math.max(0, Math.min(this.sb.beats.length - 1, index));
            this.index = i;
            this._draw(i, 1);
        }

        /* ---------------- 采样 ---------------- */

        _prepareSamples(sb) {
            const plot = sb.beats.find(function (b) { return b.verb === 'PLOT'; });
            const range = (plot && plot.params.xRange) || [-10, 10];
            const n = 1400;
            const xs = MathCore.linspace(range[0], range[1], n);
            const f = MathCore.makeFunction(sb.expression, ['x']);
            const ys = xs.map(function (x) {
                const y = f(x);
                return (Number.isFinite(y) && Math.abs(y) < 1e8) ? y : null;
            });
            this.samples = { xs: xs, ys: ys, xRange: range };
        }

        /* ---------------- 播放循环 ---------------- */

        _advance() {
            if (!this.playing) return;
            this.index++;
            if (this.index >= this.sb.beats.length) { this._finish(); return; }

            const beat = this.sb.beats[this.index];
            if (this._onStep) this._onStep(this.index, beat, this.sb);

            const ms = Math.max(120, beat.seconds * 1000);
            if (beat.verb === 'PLOT' || beat.verb === 'TRACE') {
                this._animate(ms, (p) => this._draw(this.index, p));
            } else {
                this._draw(this.index, 1);
            }
            this.timer = setTimeout(() => this._advance(), ms);
        }

        _finish() {
            this.playing = false;
            if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            if (this._onEnd) this._onEnd(this.sb);
        }

        /** 按时间推进进度，最多约 20 帧 */
        _animate(ms, draw) {
            const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            let last = -1;
            const step = (now) => {
                if (!this.playing) return;
                const p = Math.min(1, (now - start) / ms);
                if (p === 1 || p - last >= 0.05) {
                    last = p;
                    draw(p);
                }
                if (p < 1) this.raf = requestAnimationFrame(step);
            };
            this.raf = requestAnimationFrame(step);
        }

        /* ---------------- 状态重建 ---------------- */

        /**
         * 把 beats[0..index] 折叠成一个可渲染状态。
         * 这样任意一步都能独立重绘，不依赖上一帧。
         */
        _stateAt(index) {
            const st = {
                curve: false,
                title: null,
                zeros: [],
                extrema: [],
                inflections: [],
                bands: [],
                asyms: [],
                window: null,
                zoom: null,
                traceRange: null
            };
            for (let i = 0; i <= index; i++) {
                const b = this.sb.beats[i];
                const p = b.params || {};
                switch (b.verb) {
                    case 'TITLE':
                        st.title = p.text;
                        break;
                    case 'PLOT':
                        st.curve = true;
                        st.window = { xRange: p.xRange, yRange: p.yRange };
                        break;
                    case 'TRACE':
                        st.curve = true;
                        st.window = { xRange: p.xRange, yRange: p.yRange };
                        st.traceRange = p.xRange;
                        break;
                    case 'MARK_ZERO':
                        st.curve = true;
                        st.zeros.push({ x: p.x, ok: p.ok !== false });
                        break;
                    case 'MARK_EXTREMUM':
                        st.curve = true;
                        st.extrema.push({ x: p.x, y: p.y, kind: p.kind, ok: p.ok !== false });
                        break;
                    case 'MARK_INFLECTION':
                        st.curve = true;
                        st.inflections.push({ x: p.x, ok: p.ok !== false });
                        break;
                    case 'SHADE_MONOTONIC':
                        st.curve = true;
                        st.bands.push({ from: p.from, to: p.to, dir: p.dir });
                        break;
                    case 'ASYMPTOTE':
                        st.asyms.push(p);
                        break;
                    case 'ZOOM':
                        st.zoom = { xRange: p.xRange, yRange: p.yRange };
                        break;
                    default:
                        break;
                }
            }
            return st;
        }

        /* ---------------- 绘制 ---------------- */

        _draw(index, progress) {
            if (!this.sb || !this.samples) return;
            const st = this._stateAt(index);
            const beat = this.sb.beats[index];
            const win = st.zoom || st.window || {
                xRange: this.samples.xRange,
                yRange: this._autoYRange()
            };
            const xRange = win.xRange;
            const yRange = win.yRange;

            const traces = [];
            const shapes = [];
            const annotations = [];

            /* 曲线 */
            if (st.curve) {
                const n = this.samples.xs.length;
                const cut = (beat.verb === 'PLOT' && progress < 1)
                    ? Math.max(2, Math.floor(n * progress))
                    : n;
                traces.push({
                    x: this.samples.xs.slice(0, cut),
                    y: this.samples.ys.slice(0, cut),
                    type: 'scattergl',
                    mode: 'lines',
                    connectgaps: false,
                    line: { color: COLOR.curve, width: 2.6 },
                    hoverinfo: 'skip'
                });
            }

            /* 单调区间色带 */
            st.bands.forEach(function (b) {
                shapes.push({
                    type: 'rect',
                    xref: 'x', yref: 'y',
                    x0: b.from, x1: b.to, y0: yRange[0], y1: yRange[1],
                    fillcolor: COLOR.band,
                    line: { width: 0 },
                    layer: 'below'
                });
            });

            /* 渐近线 */
            st.asyms.forEach(function (a) {
                if (a.kind === 'vertical') {
                    shapes.push({
                        type: 'line', xref: 'x', yref: 'y',
                        x0: a.value, x1: a.value, y0: yRange[0], y1: yRange[1],
                        line: { color: COLOR.asym, width: 1.4, dash: 'dash' }
                    });
                } else if (a.kind === 'horizontal') {
                    shapes.push({
                        type: 'line', xref: 'x', yref: 'y',
                        x0: xRange[0], x1: xRange[1], y0: a.value, y1: a.value,
                        line: { color: COLOR.asym, width: 1.4, dash: 'dot' }
                    });
                } else if (a.kind === 'oblique') {
                    shapes.push({
                        type: 'line', xref: 'x', yref: 'y',
                        x0: xRange[0], x1: xRange[1],
                        y0: a.m * xRange[0] + a.c, y1: a.m * xRange[1] + a.c,
                        line: { color: COLOR.asym, width: 1.4, dash: 'dot' }
                    });
                }
            });

            /* 零点 */
            if (st.zeros.length) {
                traces.push({
                    x: st.zeros.map(function (z) { return z.x; }),
                    y: st.zeros.map(function () { return 0; }),
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        color: st.zeros.map(function (z) { return z.ok ? COLOR.zero : COLOR.fail; }),
                        size: 12,
                        symbol: st.zeros.map(function (z) { return z.ok ? 'circle-open' : 'x'; }),
                        line: { width: 2.4 }
                    },
                    hoverinfo: 'skip'
                });
            }

            /* 极值 */
            if (st.extrema.length) {
                traces.push({
                    x: st.extrema.map(function (e) { return e.x; }),
                    y: st.extrema.map(function (e) { return e.y; }),
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        color: st.extrema.map(function (e) { return e.ok ? COLOR.max : COLOR.fail; }),
                        size: 11,
                        symbol: st.extrema.map(function (e) { return e.ok ? 'diamond' : 'x'; })
                    },
                    hoverinfo: 'skip'
                });
                st.extrema.forEach(function (e) {
                    annotations.push({
                        x: e.x, y: e.y, xref: 'x', yref: 'y',
                        text: (e.kind === 'max' ? '极大' : '极小') + ' (' + MathCore.fmt(e.x, 4) + ', ' + MathCore.fmt(e.y, 4) + ')',
                        showarrow: true, arrowhead: 2, ax: 0, ay: e.kind === 'max' ? -26 : 26,
                        font: { size: 11, color: e.ok ? '#ffd8a8' : COLOR.fail },
                        bgcolor: 'rgba(10,22,40,.75)'
                    });
                });
            }

            /* 拐点 */
            if (st.inflections.length) {
                traces.push({
                    x: st.inflections.map(function (p) { return p.x; }),
                    y: st.inflections.map((p) => {
                        const idx = Math.round((p.x - this.samples.xRange[0]) /
                            (this.samples.xRange[1] - this.samples.xRange[0]) * (this.samples.xs.length - 1));
                        const v = this.samples.ys[Math.max(0, Math.min(this.samples.ys.length - 1, idx))];
                        return Number.isFinite(v) ? v : 0;
                    }),
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        color: st.inflections.map(function (p) { return p.ok ? COLOR.inflection : COLOR.fail; }),
                        size: 10,
                        symbol: st.inflections.map(function (p) { return p.ok ? 'diamond-open' : 'x'; }),
                        line: { width: 2 }
                    },
                    hoverinfo: 'skip'
                });
            }

            /* 扫掠光点 */
            if (beat.verb === 'TRACE' && progress < 1 && this.samples.xs.length) {
                const n = this.samples.xs.length;
                const idx = Math.min(n - 1, Math.floor(n * progress));
                const y = this.samples.ys[idx];
                if (Number.isFinite(y)) {
                    traces.push({
                        x: [this.samples.xs[idx]],
                        y: [y],
                        type: 'scatter',
                        mode: 'markers',
                        marker: { color: COLOR.dot, size: 13, symbol: 'circle', line: { color: '#fff', width: 1 } },
                        hoverinfo: 'skip'
                    });
                }
            }

            /* 标题 */
            if (st.title) {
                const centered = !st.curve;
                annotations.push({
                    text: st.title,
                    xref: 'paper', yref: 'paper',
                    x: centered ? 0.5 : 0.015,
                    y: centered ? 0.5 : 1.08,
                    xanchor: centered ? 'center' : 'left',
                    showarrow: false,
                    font: { size: centered ? 30 : 13, color: centered ? '#ffffff' : '#9fb3c8' }
                });
            }

            const layout = {
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(10,22,40,0.55)',
                font: { family: 'Noto Sans SC, Microsoft YaHei, sans-serif', color: '#e6e6e6' },
                // 底部留出字幕条的位置，避免遮住 x 轴刻度
                margin: { l: 56, r: 20, t: 54, b: 74 },
                showlegend: false,
                hovermode: false,
                shapes: shapes,
                annotations: annotations,
                xaxis: {
                    range: xRange,
                    visible: st.curve,
                    gridcolor: 'rgba(255,255,255,.10)',
                    zerolinecolor: 'rgba(255,255,255,.35)',
                    zerolinewidth: 1
                },
                yaxis: {
                    range: yRange,
                    visible: st.curve,
                    gridcolor: 'rgba(255,255,255,.10)',
                    zerolinecolor: 'rgba(255,255,255,.35)',
                    zerolinewidth: 1
                }
            };

            if (typeof Plotly !== 'undefined') {
                Plotly.react(this.containerId, traces, layout, CONFIG);
            }
            this.lastState = st;
        }

        _autoYRange() {
            let lo = Infinity, hi = -Infinity;
            const ys = this.samples.ys;
            for (let i = 0; i < ys.length; i++) {
                const v = ys[i];
                if (!Number.isFinite(v)) continue;
                if (v < lo) lo = v;
                if (v > hi) hi = v;
            }
            if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [-5, 5];
            // 用分位数避免极点把窗口撑爆
            const sorted = ys.filter(Number.isFinite).sort((a, b) => a - b);
            const q = (t) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * t)))];
            const l = q(0.02), h = q(0.98);
            const pad = Math.max(1e-6, (h - l) * 0.15);
            return [l - pad, h + pad];
        }
    }

    // 直接把类作为导出（调用方 new root.MathStoryboardPlayer(...)）
    StoryboardPlayer.COLOR = COLOR;
    return StoryboardPlayer;
}));
