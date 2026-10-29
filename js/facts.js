/**
 * facts.js
 * ============================================================
 * 数值事实层（Facts）。
 *
 * 设计参考 Math-To-Manim 的 `execute_math_check`：
 * 报告的每条结论都不应只是「算出来的数」，而应附带**独立复算的残差**，
 * 让使用者能判断这条结论可不可信。
 *
 * 与 math-core 的分工：
 *   math-core  负责「算出结果」
 *   facts.js   负责「验证结果」并组织成可校验的断言集
 *
 * 产出的结构即流水线的 03_facts：
 *   { expression, window, scale, claims: [...], summary: {...}, report }
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./math-core.js'));
    } else {
        root.MathFacts = factory(root.MathCore);
    }
}(typeof self !== 'undefined' ? self : this, function (MathCore) {
    'use strict';

    if (!MathCore) throw new Error('facts.js 依赖 math-core.js，请先加载');

    /** 各类断言的相对/绝对容差 */
    const TOL = {
        zero: 1e-6,        // 相对 scale
        extremum: 1e-4,    // 一阶导绝对值
        inflection: 1e-2,  // 二阶导绝对值
        parity: 1e-6,      // 相对 scale
        period: 1e-5,      // 相对 scale
        asymptote: 1e-3,   // 相对量级
        integral: 1e-6     // 两种精度之差，相对积分值
    };

    function fmt(v, digits) {
        return MathCore.fmt(v, digits === undefined ? 6 : digits);
    }

    /** 取 |y| 的中位数作为特征尺度，避免被极点附近的爆炸值带偏 */
    function medianAbsScale(f, a, b, n) {
        const vals = [];
        for (let i = 0; i <= n; i++) {
            const v = f(a + (b - a) * i / n);
            if (Number.isFinite(v)) vals.push(Math.abs(v));
        }
        if (!vals.length) return 1;
        vals.sort((p, q) => p - q);
        return Math.max(1, vals[Math.floor(vals.length / 2)]);
    }

    /** 采样比较 f(x) 与 f(-x) 的最大偏差 */
    function parityResidual(f, a, b) {
        const m = Math.min(Math.abs(a), Math.abs(b));
        let even = 0, odd = 0;
        for (let i = 1; i <= 30; i++) {
            const x = -m + 2 * m * i / 31;
            const f1 = f(x), f2 = f(-x);
            if (!Number.isFinite(f1) || !Number.isFinite(f2)) continue;
            even = Math.max(even, Math.abs(f1 - f2));
            odd = Math.max(odd, Math.abs(f1 + f2));
        }
        return { even, odd };
    }

    /** 采样比较 f(x+T) 与 f(x) 的最大偏差 */
    function periodResidual(f, a, b, T) {
        let worst = 0;
        for (let i = 0; i < 40; i++) {
            const x = a + (b - a - T) * i / 39;
            const v1 = f(x), v2 = f(x + T);
            if (!Number.isFinite(v1) || !Number.isFinite(v2)) continue;
            worst = Math.max(worst, Math.abs(v1 - v2));
        }
        return worst;
    }

    /**
     * 对 y = f(x) 生成「带验证的断言集」。
     *
     * @param {string} expr 表达式
     * @param {object} [opts]
     *   xMin / xMax   分析区间（默认 -10 ~ 10）
     *   samples       采样点数
     *   integral      {a, b} 可选：额外做一次定积分的双精度交叉验证
     * @returns {object} 03_facts 结构
     */
    function buildFacts(expr, opts) {
        opts = opts || {};
        const xMin = opts.xMin !== undefined ? opts.xMin : -10;
        const xMax = opts.xMax !== undefined ? opts.xMax : 10;

        const report = MathCore.analyzeFunction(expr, { xMin, xMax, samples: opts.samples });
        const f = MathCore.makeFunction(expr, ['x']);
        const scale = medianAbsScale(f, xMin, xMax, 200);

        const claims = [];
        const push = (claim) => claims.push(claim);

        /* ---- 零点：代回求残差 ---- */
        report.zeros.forEach((p, i) => {
            const residual = Math.abs(f(p.x));
            const tol = TOL.zero * scale;
            push({
                id: 'zero-' + (i + 1),
                kind: 'zero',
                label: '零点 x ≈ ' + fmt(p.x, 8),
                value: p.x,
                x: p.x,
                y: 0,
                verification: { method: 'substitute', residual, tol, expect: 'near-zero', ok: residual <= tol }
            });
        });

        /* ---- 极值：一阶导为零 ---- */
        [['max', '极大值', report.extrema.maxima], ['min', '极小值', report.extrema.minima]].forEach((group) => {
            const kind = group[0], name = group[1], list = group[2];
            list.forEach((p, i) => {
                const residual = Math.abs(MathCore.numericDerivative(f, p.x));
                const tol = TOL.extremum * scale;
                push({
                    id: kind + '-' + (i + 1),
                    kind: 'extremum',
                    label: name + ' (' + fmt(p.x, 5) + ', ' + fmt(p.y, 5) + ')',
                    value: p.y,
                    x: p.x,
                    y: p.y,
                    extremumKind: kind,
                    verification: { method: 'first-derivative', residual, tol, expect: 'near-zero', ok: residual <= tol }
                });
            });
        });

        /* ---- 拐点：二阶导为零 ---- */
        report.inflections.forEach((x, i) => {
            const residual = Math.abs(MathCore.secondDerivative(f, x));
            const tol = TOL.inflection * scale;
            push({
                id: 'inflection-' + (i + 1),
                kind: 'inflection',
                label: '拐点 x ≈ ' + fmt(x, 6),
                value: x,
                x,
                verification: { method: 'second-derivative', residual, tol, expect: 'near-zero', ok: residual <= tol }
            });
        });

        /* ---- 奇偶性：对称性抽样 ---- */
        const par = parityResidual(f, xMin, xMax);
        if (report.parity === 'even' || report.parity === 'odd') {
            const residual = report.parity === 'even' ? par.even : par.odd;
            const tol = TOL.parity * scale;
            push({
                id: 'parity',
                kind: 'parity',
                label: report.parity === 'even' ? '偶函数' : '奇函数',
                value: report.parity,
                verification: { method: 'symmetry-sample', residual, tol, expect: 'near-zero', ok: residual <= tol }
            });
        } else if (report.parity === 'none') {
            const residual = Math.min(par.even, par.odd);
            const tol = TOL.parity * scale;
            push({
                id: 'parity',
                kind: 'parity',
                label: '非奇非偶',
                value: 'none',
                verification: {
                    method: 'symmetry-sample', residual, tol, expect: 'not-small',
                    ok: residual > tol
                }
            });
        }

        /* ---- 周期性 ---- */
        if (report.constant) {
            push({
                id: 'period',
                kind: 'period',
                label: '常函数（任意正数都是周期）',
                value: null,
                verification: { method: 'constant-scan', residual: 0, tol: 0, expect: 'near-zero', ok: true }
            });
        } else if (report.period) {
            const residual = periodResidual(f, xMin, xMax, report.period);
            const tol = TOL.period * scale;
            push({
                id: 'period',
                kind: 'period',
                label: '最小正周期 T ≈ ' + fmt(report.period, 8),
                value: report.period,
                verification: { method: 'shift-compare', residual, tol, expect: 'near-zero', ok: residual <= tol }
            });
        }

        /* ---- 单调区间：区间内导数是否同号 ---- */
        report.monotonic.slice(0, 6).forEach((seg, i) => {
            let bad = 0, total = 0;
            for (let k = 1; k <= 9; k++) {
                const x = seg.from + (seg.to - seg.from) * k / 10;
                const d = MathCore.numericDerivative(f, x);
                if (!Number.isFinite(d)) continue;
                total++;
                if (d * seg.dir <= 0) bad++;
            }
            const residual = total ? bad / total : 1;
            push({
                id: 'monotonic-' + (i + 1),
                kind: 'monotonic',
                label: (seg.dir > 0 ? '递增' : '递减') + ' [' + fmt(seg.from, 3) + ', ' + fmt(seg.to, 3) + ']',
                value: seg.dir,
                from: seg.from,
                to: seg.to,
                dir: seg.dir,
                verification: { method: 'sign-consistency', residual, tol: 0, expect: 'near-zero', ok: residual === 0 }
            });
        });

        /* ---- 垂直渐近线：邻域幅值应当发散 ---- */
        report.asymptotes.vertical.slice(0, 6).forEach((x, i) => {
            const delta = 1e-6 * (1 + Math.abs(x));
            let mag = 0;
            [x - delta, x + delta].forEach((t) => {
                const v = Math.abs(f(t));
                if (v === Infinity) mag = Infinity;
                else if (Number.isFinite(v)) mag = Math.max(mag, v);
            });
            // 用 1/幅值 作为残差：幅值越大，残差越接近 0
            const residual = mag === Infinity ? 0 : (mag > 0 ? 1 / mag : 1);
            push({
                id: 'asym-v-' + (i + 1),
                kind: 'asymptote',
                label: '垂直渐近线 x ≈ ' + fmt(x, 6),
                value: x,
                x,
                asymptoteKind: 'vertical',
                verification: { method: 'divergence', residual, tol: TOL.asymptote, expect: 'near-zero', ok: residual <= TOL.asymptote }
            });
        });

        /* ---- 水平 / 斜渐近线：大 x 处与直线的偏差 ---- */
        const checkLine = (label, kind, x0, lineFn, y) => {
            let worst = 0;
            [1e5, 1e7].forEach((R) => {
                const t = x0 * R;
                const v = f(t);
                if (!Number.isFinite(v)) return;
                worst = Math.max(worst, Math.abs(v - lineFn(t)) / Math.max(1, Math.abs(y)));
            });
            push({
                id: 'asym-' + kind,
                kind: 'asymptote',
                label,
                value: y,
                asymptoteKind: kind,
                verification: { method: 'far-field', residual: worst, tol: TOL.asymptote, expect: 'near-zero', ok: worst <= TOL.asymptote }
            });
        };

        report.asymptotes.horizontal.forEach((h) => {
            const x0 = h.side === '+∞' ? 1 : -1;
            checkLine('水平渐近线 y = ' + fmt(h.y, 6) + '（x→' + h.side + '）', 'horizontal-' + h.side, x0, () => h.y, h.y);
        });
        report.asymptotes.oblique.forEach((o) => {
            const x0 = o.side === '+∞' ? 1 : -1;
            checkLine('斜渐近线 y = ' + fmt(o.m, 4) + 'x + ' + fmt(o.c, 4) + '（x→' + o.side + '）',
                'oblique-' + o.side, x0, (t) => o.m * t + o.c, o.c);
        });

        /* ---- 定积分：双精度交叉验证（可选）---- */
        if (opts.integral) {
            const a = opts.integral.a, b = opts.integral.b;
            const loose = MathCore.adaptiveSimpson(f, a, b, 1e-9, 22);
            const tight = MathCore.adaptiveSimpson(f, a, b, 1e-12, 28);
            const residual = Math.abs(loose.value - tight.value);
            const tol = TOL.integral * Math.max(1, Math.abs(tight.value));
            push({
                id: 'integral',
                kind: 'integral',
                label: '∫[' + fmt(a, 4) + ', ' + fmt(b, 4) + '] ' + expr + ' dx ≈ ' + fmt(tight.value, 10),
                value: tight.value,
                verification: {
                    method: 'cross-eps', residual, tol, expect: 'near-zero',
                    ok: residual <= tol && loose.converged && tight.converged
                }
            });
        }

        const passed = claims.filter((c) => c.verification.ok).length;
        const worst = claims.reduce((acc, c) => {
            const ratio = c.verification.tol > 0 ? c.verification.residual / c.verification.tol : (c.verification.ok ? 0 : 1);
            return ratio > acc.ratio ? { ratio, claim: c } : acc;
        }, { ratio: 0, claim: null });

        return {
            expression: expr,
            window: { xMin, xMax },
            scale,
            claims,
            summary: {
                total: claims.length,
                passed,
                failed: claims.length - passed,
                worstRatio: worst.ratio,
                worstClaim: worst.claim ? worst.claim.id : null
            },
            report
        };
    }

    return { buildFacts, TOL, fmt };
}));
