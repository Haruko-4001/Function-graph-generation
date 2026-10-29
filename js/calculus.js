/**
 * calculus.js
 * ============================================================
 * 导数工具内核：切线、法线、过点切线、单调表、闭区间最值。
 *
 * 与 math-core 的分工：
 *   math-core  提供导数、极值、单调区间等基础能力
 *   calculus   把它们组织成课堂上真正会问的四个问题
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./math-core.js'));
    } else {
        root.MathCalculus = factory(root.MathCore);
    }
}(typeof self !== 'undefined' ? self : this, function (MathCore) {
    'use strict';

    if (!MathCore) throw new Error('calculus.js 依赖 math-core.js，请先加载');

    const EPS = 1e-9;

    function fmt(v, d) { return MathCore.fmt(v, d === undefined ? 6 : d); }

    function lineText(slope, x0, y0) {
        if (!Number.isFinite(slope)) return 'x = ' + fmt(x0);
        if (Math.abs(slope) < EPS) return 'y = ' + fmt(y0);
        const c = y0 - slope * x0;
        const mPart = Math.abs(slope) < EPS ? '' : (Math.abs(slope - 1) < EPS ? 'x' : (Math.abs(slope + 1) < EPS ? '−x' : fmt(slope) + 'x'));
        const cPart = Math.abs(c) < 1e-10 ? '' : (c > 0 ? ' + ' : ' − ') + fmt(Math.abs(c));
        return 'y = ' + (mPart || '0') + cPart;
    }

    /**
     * 曲线在 x0 处的切线与法线。
     * @returns {{slope:number, y0:number, tangent:string, normal:string, point:{x,y}}}
     */
    function tangentAt(expr, x0) {
        if (!Number.isFinite(x0)) throw new Error('切点 x₀ 必须是数字');
        const f = MathCore.makeFunction(expr, ['x']);
        const y0 = f(x0);
        if (!Number.isFinite(y0)) throw new Error('函数在 x = ' + fmt(x0) + ' 处不可求值');
        const slope = MathCore.numericDerivative(f, x0);
        if (!Number.isFinite(slope)) throw new Error('函数在 x = ' + fmt(x0) + ' 处不可导');

        const tangent = lineText(slope, x0, y0);
        let normal;
        if (Math.abs(slope) < 1e-8) normal = 'x = ' + fmt(x0);
        else if (!Number.isFinite(slope)) normal = 'y = ' + fmt(y0);
        else normal = lineText(-1 / slope, x0, y0);

        return {
            slope,
            y0,
            point: { x: x0, y: y0 },
            tangent,
            normal,
            tangentCoef: { m: slope, c: y0 - slope * x0 }
        };
    }

    /**
     * 过点 P(a,b) 的切线。设切点 t：
     *   b − f(t) = f'(t)·(a − t)
     * 解出 t 后回代。
     * @returns {{count:number, lines:Array}}
     */
    function tangentThrough(expr, a, b) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('过点坐标必须是数字');
        const f = MathCore.makeFunction(expr, ['x']);
        const g = function (t) {
            const y = f(t);
            const d = MathCore.numericDerivative(f, t);
            if (!Number.isFinite(y) || !Number.isFinite(d)) return NaN;
            return b - y - d * (a - t);
        };

        const span = Math.max(10, Math.abs(a) * 2 + 4, Math.abs(b) + 4);
        const roots = MathCore.findZeros(g, a - span, a + span, { samples: 1600 });

        const lines = [];
        roots.forEach(function (t) {
            const ft = f(t);
            const d = MathCore.numericDerivative(f, t);
            if (!Number.isFinite(ft) || !Number.isFinite(d)) return;
            // 过点必须真的在切线上（避免数值伪根）
            if (Math.abs(b - ft - d * (a - t)) > 1e-5 * Math.max(1, Math.abs(b))) return;
            if (lines.some(function (l) { return Math.abs(l.t - t) < 1e-6; })) return;
            lines.push({
                t,
                point: { x: t, y: ft },
                slope: d,
                equation: lineText(d, t, ft)
            });
        });
        lines.sort(function (p, q) { return p.t - q.t; });
        return { count: lines.length, lines: lines };
    }

    /**
     * 单调表：区间 + 导数符号。
     */
    function monotonicTable(expr, a, b) {
        const report = MathCore.analyzeFunction(expr, { xMin: a, xMax: b });
        return {
            rows: report.monotonic.map(function (seg) {
                return {
                    from: seg.from,
                    to: seg.to,
                    dir: seg.dir,
                    sign: seg.dir > 0 ? '+' : '−',
                    text: '[' + fmt(seg.from) + ', ' + fmt(seg.to) + '] ' + (seg.dir > 0 ? '↗ 递增' : '↘ 递减')
                };
            }),
            critical: report.extrema.maxima.map(function (p) { return { x: p.x, y: p.y, kind: 'max' }; })
                .concat(report.extrema.minima.map(function (p) { return { x: p.x, y: p.y, kind: 'min' }; }))
                .sort(function (p, q) { return p.x - q.x; })
        };
    }

    /**
     * 闭区间 [a,b] 上的最大值与最小值。
     * 端点与驻点一起比较。
     */
    function globalExtrema(expr, a, b) {
        if (!(b > a)) throw new Error('区间无效：右端点必须大于左端点');
        const f = MathCore.makeFunction(expr, ['x']);
        const report = MathCore.analyzeFunction(expr, { xMin: a, xMax: b });

        const candidates = [];
        const push = function (x, kind) {
            const y = f(x);
            if (Number.isFinite(y)) candidates.push({ x: x, y: y, kind: kind });
        };
        report.extrema.maxima.forEach(function (p) { push(p.x, '驻点（极大）'); });
        report.extrema.minima.forEach(function (p) { push(p.x, '驻点（极小）'); });
        push(a, '左端点');
        push(b, '右端点');

        if (!candidates.length) throw new Error('区间内没有可求值点');

        let max = candidates[0], min = candidates[0];
        candidates.forEach(function (p) {
            if (p.y > max.y) max = p;
            if (p.y < min.y) min = p;
        });
        return { max, min, candidates };
    }

    return {
        tangentAt,
        tangentThrough,
        monotonicTable,
        globalExtrema,
        lineText
    };
}));
