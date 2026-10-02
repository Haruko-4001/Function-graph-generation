/**
 * math-core.js
 * ============================================================
 * 数学核心库：表达式求值与数值/符号分析算法。
 *
 * 提供能力：
 *  - 表达式规范化与校验（兼容中文输入习惯：×、÷、（）、π 等）
 *  - 精确零点求解（扫描 + Brent 方法，含切触零点检测）
 *  - 极值 / 单调区间 / 凹凸区间 / 拐点
 *  - 垂直 / 水平 / 斜渐近线检测
 *  - 自适应 Simpson 定积分（含误差估计）
 *  - 数值极限（含无穷远处、左右极限）
 *  - 泰勒多项式展开（基于符号求导）
 *  - 函数交点、奇偶性、周期性检测
 *
 * 该文件同时支持浏览器（挂载 window.MathCore）与 Node（单元测试）。
 * 依赖 mathjs（浏览器为全局 math，Node 通过 require('mathjs')）。
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('mathjs'));
    } else {
        root.MathCore = factory(root.math);
    }
}(typeof self !== 'undefined' ? self : this, function (math) {
    'use strict';

    if (!math) {
        throw new Error('math-core.js 依赖 mathjs，请先加载 math.min.js');
    }

    /* ---------------------------------------------------------------
     * 基础工具
     * --------------------------------------------------------------- */

    /** 判断值是否为有限实数 */
    function isFiniteNumber(v) {
        return typeof v === 'number' && Number.isFinite(v);
    }

    /**
     * 将 mathjs 的求值结果安全转换为实数。
     * 复数（虚部非 0）、单位量、无穷、NaN 一律返回 NaN。
     */
    function toRealNumber(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
        if (value && typeof value === 'object') {
            // mathjs Complex
            if (typeof value.re === 'number' && Math.abs(value.im || 0) < 1e-9) return value.re;
            if (typeof value.toNumber === 'function') {
                try {
                    const n = value.toNumber();
                    return Number.isFinite(n) ? n : NaN;
                } catch (e) { return NaN; }
            }
            return NaN;
        }
        const n = Number(value);
        return Number.isFinite(n) ? n : NaN;
    }

    /**
     * 规范化表达式：兼容中文输入法与常见手写习惯。
     * 例如：×→*、÷→/、（）→()、π→pi、√x→sqrt(x)
     */
    function normalizeExpression(raw) {
        if (typeof raw !== 'string') return '';
        let s = raw.trim();
        if (!s) return '';
        s = s
            .replace(/[（﹙]/g, '(').replace(/[）﹚]/g, ')')
            .replace(/[，]/g, ',').replace(/[；]/g, ';')
            .replace(/[×✕✖]/g, '*').replace(/[÷]/g, '/')
            .replace(/[−–]/g, '-')
            .replace(/[＀-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角 ASCII → 半角
            .replace(/π/g, 'pi')
            .replace(/√\s*\(/g, 'sqrt(')
            .replace(/√\s*([a-zA-Z0-9])/g, 'sqrt($1)')
            .replace(/\bln\s*\(/g, 'log(');
        // 去掉 y= / f(x)= 前缀
        const eq = s.indexOf('=');
        if (eq > 0 && !/[<>!]=/.test(s.slice(Math.max(0, eq - 1), eq + 1))) {
            const left = s.slice(0, eq).replace(/\s+/g, '');
            if (/^(y|f\(x\)|fx)$/.test(left)) s = s.slice(eq + 1).trim();
        }
        return s;
    }

    /** 编译缓存 */
    const _compileCache = new Map();
    const COMPILE_CACHE_MAX = 300;

    /** 编译表达式（带缓存），失败时抛出带中文提示的错误 */
    function compile(expr) {
        const key = expr;
        if (_compileCache.has(key)) return _compileCache.get(key);
        let compiled;
        try {
            compiled = math.compile(expr);
        } catch (e) {
            throw new Error('表达式语法错误：' + (e && e.message ? e.message : String(e)));
        }
        if (_compileCache.size >= COMPILE_CACHE_MAX) {
            _compileCache.delete(_compileCache.keys().next().value);
        }
        _compileCache.set(key, compiled);
        return compiled;
    }

    /**
     * 校验表达式。返回 { ok, normalized, error }
     * vars：允许出现的自变量名。
     */
    function validateExpression(raw, vars) {
        const allowed = vars || ['x'];
        const normalized = normalizeExpression(raw);
        if (!normalized) {
            return { ok: false, normalized: '', error: '表达式为空' };
        }
        let node;
        try {
            node = math.parse(normalized);
        } catch (e) {
            return { ok: false, normalized, error: '语法无法解析：' + (e && e.message ? e.message : e) };
        }
        // 检查是否引用了未声明的变量
        let unknown = null;
        try {
            node.traverse(function (n) {
                if (n && n.isSymbolNode) {
                    const name = n.name;
                    if (allowed.indexOf(name) >= 0) return;
                    // 函数与常量名：如果存在于 math 命名空间则合法
                    if (name in math) return;
                    const knownConstants = ['pi', 'e', 'i', 'Infinity', 'NaN', 'tau', 'phi', 'E', 'PI'];
                    if (knownConstants.indexOf(name) >= 0) return;
                    unknown = name;
                }
            });
        } catch (e) { /* traverse 失败不阻断 */ }
        if (unknown) {
            return {
                ok: false,
                normalized,
                error: '包含未知符号 "' + unknown + '"（本模式可用变量：' + allowed.join(', ') + '）'
            };
        }
        return { ok: true, normalized, error: null };
    }

    /**
     * 由表达式创建一元/多元数值函数。求值失败或结果为复数/无穷时返回 NaN。
     */
    function makeFunction(expr, vars) {
        const names = vars || ['x'];
        const compiled = compile(expr);
        return function () {
            const scope = {};
            for (let i = 0; i < names.length && i < arguments.length; i++) {
                scope[names[i]] = arguments[i];
            }
            let v;
            try {
                v = compiled.evaluate(scope);
            } catch (e) {
                return NaN;
            }
            return toRealNumber(v);
        };
    }

    /** 生成 [a,b] 上的等距采样点 */
    function linspace(a, b, n) {
        const out = new Array(n);
        const h = (b - a) / (n - 1);
        for (let i = 0; i < n; i++) out[i] = a + i * h;
        return out;
    }

    /** 数值格式化：紧凑且去除浮点尾巴 */
    function fmt(v, digits) {
        if (!Number.isFinite(v)) return String(v);
        if (v !== 0 && Math.abs(v) < 1e-12) return '0';
        const d = digits === undefined ? 6 : digits;
        const r = Number(v.toPrecision(d));
        return String(r);
    }

    /* ---------------------------------------------------------------
     * 数值导数
     * --------------------------------------------------------------- */

    /** 一阶中心差分 */
    function numericDerivative(f, x, h) {
        const hh = h || 1e-6 * (1 + Math.abs(x));
        const fp = f(x + hh), fm = f(x - hh);
        if (!Number.isFinite(fp) || !Number.isFinite(fm)) return NaN;
        return (fp - fm) / (2 * hh);
    }

    /** 二阶导数（中心差分） */
    function secondDerivative(f, x, h) {
        const hh = h || 1e-4 * (1 + Math.abs(x));
        const f0 = f(x), fp = f(x + hh), fm = f(x - hh);
        if (!Number.isFinite(f0) || !Number.isFinite(fp) || !Number.isFinite(fm)) return NaN;
        return (fp - 2 * f0 + fm) / (hh * hh);
    }

    /* ---------------------------------------------------------------
     * 求根：二分法 / Brent 方法
     * --------------------------------------------------------------- */

    /** 二分法求 f 在 [a,b] 上的根（要求 f(a)*f(b) <= 0） */
    function bisect(f, a, b, tol, maxIter) {
        tol = tol || 1e-13;
        let fa = f(a);
        for (let i = 0; i < (maxIter || 200); i++) {
            const m = (a + b) / 2;
            const fm = f(m);
            if (!Number.isFinite(fm)) return NaN;
            if (fm === 0 || b - a < tol) return m;
            if (fa * fm <= 0) { b = m; } else { a = m; fa = fm; }
        }
        return (a + b) / 2;
    }

    /**
     * Brent 求根法：兼具二分法的稳定性与割线/反二次插值的收敛速度。
     * 要求 f(a) 与 f(b) 异号。失败返回 NaN。
     */
    function brent(f, a, b, tol, maxIter) {
        tol = tol || 1e-13;
        maxIter = maxIter || 100;
        let fa = f(a), fb = f(b);
        if (!Number.isFinite(fa) || !Number.isFinite(fb)) return NaN;
        if (fa === 0) return a;
        if (fb === 0) return b;
        if (fa * fb > 0) return NaN;

        if (Math.abs(fa) < Math.abs(fb)) {
            let t = a; a = b; b = t; t = fa; fa = fb; fb = t;
        }
        let c = a, fc = fa, d = a, mflag = true, s = b;

        for (let iter = 0; iter < maxIter; iter++) {
            if (fa !== fc && fb !== fc) {
                // 反二次插值
                s = (a * fb * fc) / ((fa - fb) * (fa - fc))
                  + (b * fa * fc) / ((fb - fa) * (fb - fc))
                  + (c * fa * fb) / ((fc - fa) * (fc - fb));
            } else {
                // 割线法
                s = b - fb * (b - a) / (fb - fa);
            }

            const mid = (a + b) / 2;
            const bound = (3 * a + b) / 4;
            const inRange = (s > Math.min(bound, b)) && (s < Math.max(bound, b));

            if (!inRange ||
                (mflag && Math.abs(s - b) >= Math.abs(b - c) / 2) ||
                (!mflag && Math.abs(s - b) >= Math.abs(c - d) / 2) ||
                (mflag && Math.abs(b - c) < tol) ||
                (!mflag && Math.abs(c - d) < tol)) {
                s = mid;
                mflag = true;
            } else {
                mflag = false;
            }

            const fs = f(s);
            if (!Number.isFinite(fs)) return NaN;
            d = c;
            c = b; fc = fb;

            if (fa * fs < 0) { b = s; fb = fs; } else { a = s; fa = fs; }
            if (Math.abs(fa) < Math.abs(fb)) {
                let t = a; a = b; b = t; t = fa; fa = fb; fb = t;
            }
            if (fb === 0 || Math.abs(b - a) < tol) return b;
        }
        return b;
    }

    /**
     * 在 [a,b] 上查找 f 的全部零点。
     *  - 变号零点：扫描 + Brent 精确化
     *  - 切触零点（如 (x-1)^2 在 x=1 处不变号）：通过 |f| 的局部极小检测
     */
    function findZeros(f, a, b, opts) {
        opts = opts || {};
        if (typeof f === 'string') f = makeFunction(f, ['x']);
        const n = opts.samples || 1000;
        const xs = linspace(a, b, n);
        const ys = new Array(n);
        for (let i = 0; i < n; i++) ys[i] = f(xs[i]);

        const roots = [];
        const relTol = 1e-7 * (b - a) / n;

        for (let i = 0; i < n - 1; i++) {
            const y0 = ys[i], y1 = ys[i + 1];
            if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
            if (y0 === 0) roots.push(xs[i]);
            else if (y0 * y1 < 0) {
                const r = brent(f, xs[i], xs[i + 1]);
                if (Number.isFinite(r) && Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) {
                    roots.push(r);
                }
            }
        }
        if (ys[n - 1] === 0) roots.push(xs[n - 1]);

        // 切触零点：|f| 的局部极小且接近 0
        for (let i = 1; i < n - 1; i++) {
            const v0 = Math.abs(ys[i - 1]), v1 = Math.abs(ys[i]), v2 = Math.abs(ys[i + 1]);
            if (!Number.isFinite(v1)) continue;
            if (v1 <= v0 && v1 <= v2 && v1 < 1e-4 && (v0 > v1 || v2 > v1)) {
                const x = goldenSectionMin(function (t) {
                    const v = f(t);
                    return Number.isFinite(v) ? Math.abs(v) : Infinity;
                }, xs[i - 1], xs[i + 1]);
                const fx = f(x);
                if (Number.isFinite(fx) && Math.abs(fx) < 1e-7) roots.push(x);
            }
        }

        // 去重并排序
        roots.sort((p, q) => p - q);
        const dedup = [];
        for (const r of roots) {
            if (dedup.length === 0 || Math.abs(r - dedup[dedup.length - 1]) > Math.max(relTol * 10, 1e-9)) {
                dedup.push(r);
            }
        }
        return dedup;
    }

    /** 黄金分割法求 [a,b] 上的极小点 */
    function goldenSectionMin(f, a, b, tol, maxIter) {
        tol = tol || 1e-11;
        const gr = (Math.sqrt(5) - 1) / 2;
        let x1 = b - gr * (b - a), x2 = a + gr * (b - a);
        let f1 = f(x1), f2 = f(x2);
        for (let i = 0; i < (maxIter || 200); i++) {
            if (f1 > f2) {
                a = x1; x1 = x2; f1 = f2;
                x2 = a + gr * (b - a); f2 = f(x2);
            } else {
                b = x2; x2 = x1; f2 = f1;
                x1 = b - gr * (b - a); f1 = f(x1);
            }
            if (b - a < tol) break;
        }
        return (a + b) / 2;
    }

    /* ---------------------------------------------------------------
     * 极值 / 单调性 / 凹凸性
     * --------------------------------------------------------------- */

    /**
     * 求 f 在 [a,b] 上的极值点。
     * 返回 { maxima:[{x,y}], minima:[{x,y}], flat:[x] }，flat 为导数为零但非极值的平稳点。
     */
    function findExtrema(f, a, b, opts) {
        opts = opts || {};
        if (typeof f === 'string') f = makeFunction(f, ['x']);

        const d = function (x) { return numericDerivative(f, x); };

        // 常函数保护
        let dMax = 0;
        for (let i = 0; i <= 50; i++) {
            const v = Math.abs(d(a + (b - a) * i / 50));
            if (Number.isFinite(v) && v > dMax) dMax = v;
        }
        if (dMax < 1e-10) {
            return { maxima: [], minima: [], flat: [] };
        }

        const crit = findZeros(d, a, b, { samples: opts.samples || 800 });
        const maxima = [], minima = [], flat = [];
        const h = 1e-4 * (1 + (b - a));

        for (const x0 of crit) {
            const dl = d(x0 - h), dr = d(x0 + h);
            let kind = null;
            if (Number.isFinite(dl) && Number.isFinite(dr)) {
                if (dl > 0 && dr < 0) kind = 'max';
                else if (dl < 0 && dr > 0) kind = 'min';
            }
            if (!kind) {
                const d2 = secondDerivative(f, x0);
                if (Number.isFinite(d2)) {
                    const eps = 1e-6 * Math.max(1, Math.abs(d2));
                    if (d2 > eps) kind = 'min';
                    else if (d2 < -eps) kind = 'max';
                }
            }

            if (kind === 'min') {
                const x = goldenSectionMin(f, x0 - h, x0 + h);
                const y = f(x);
                if (Number.isFinite(y)) minima.push({ x, y });
            } else if (kind === 'max') {
                const x = goldenSectionMin(function (t) { return -f(t); }, x0 - h, x0 + h);
                const y = f(x);
                if (Number.isFinite(y)) maxima.push({ x, y });
            } else {
                flat.push(x0);
            }
        }
        return { maxima, minima, flat };
    }

    /**
     * 由临界点与间断点划分区间，判定每个区间的单调方向。
     * breaks：定义域断点（含渐近线位置）。
     */
    function monotonicIntervals(f, a, b, criticalPoints, breaks) {
        const inner = (breaks || []).concat(criticalPoints || [])
            .filter((v) => Number.isFinite(v) && v > a && v < b)
            .sort((p, q) => p - q);
        const pts = [a].concat(inner, [b]);

        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const l = pts[i], r = pts[i + 1];
            if (r - l < 1e-9) continue;
            // 区间内多点采样取导数中位数，避免恰好命中导数零点（如 x^3 的 x=0）
            const ds = [];
            for (let k = 1; k <= 7; k++) {
                const dv = numericDerivative(f, l + (r - l) * k / 8);
                if (Number.isFinite(dv)) ds.push(dv);
            }
            if (!ds.length) continue;
            ds.sort((p, q) => p - q);
            const med = ds[Math.floor(ds.length / 2)];
            out.push({
                from: l,
                to: r,
                dir: med > 1e-9 ? 1 : (med < -1e-9 ? -1 : 0)
            });
        }
        return out.filter((seg) => seg.dir !== 0);
    }

    /**
     * 凹凸区间与拐点。
     * 返回 { intervals:[{from,to,dir:1|-1}]（1=凹向上/下凸），inflections:[x] }
     */
    function concavity(f, a, b, opts) {
        opts = opts || {};
        const n = opts.samples || 400;
        const xs = linspace(a, b, n);
        const d2 = xs.map((x) => secondDerivative(f, x));

        const intervals = [];
        const inflections = [];
        let curSign = 0, start = a;

        for (let i = 0; i < n; i++) {
            const v = d2[i];
            const sign = !Number.isFinite(v) || Math.abs(v) < 1e-9 ? 0 : (v > 0 ? 1 : -1);
            if (curSign === 0) {
                if (sign !== 0) { curSign = sign; start = xs[i]; }
                continue;
            }
            if (sign !== 0 && sign !== curSign) {
                // 二阶导变号：在前后两点间用二分法精化拐点
                const xInf = brent(function (t) { return secondDerivative(f, t); }, xs[i - 1], xs[i], 1e-10);
                if (Number.isFinite(xInf)) {
                    intervals.push({ from: start, to: xInf, dir: curSign });
                    inflections.push(xInf);
                    start = xInf;
                }
                curSign = sign;
            }
        }
        intervals.push({ from: start, to: b, dir: curSign });
        return {
            intervals: intervals.filter((s) => s.dir !== 0 && s.to - s.from > 1e-8),
            inflections
        };
    }

    /* ---------------------------------------------------------------
     * 渐近线
     * --------------------------------------------------------------- */

    /**
     * 检测垂直渐近线与定义域断点。
     * 返回 { vertical: [x], domainBreaks: [x] }
     */
    function detectVerticalAsymptotes(f, a, b, samples) {
        const n = samples || 800;
        const xs = linspace(a, b, n);
        const ys = xs.map(f);
        const vertical = [];
        const breaks = [];
        const step = (b - a) / n;

        // 判定为极点的幅值下限（与采样密度相关：越靠近极点取值越大）
        const POLE_MAG = Math.max(20, 0.5 / step);

        for (let i = 0; i < n - 1; i++) {
            const y0 = ys[i], y1 = ys[i + 1];
            const f0 = Number.isFinite(y0), f1 = Number.isFinite(y1);

            if (f0 && f1 && y0 * y1 < 0) {
                // 变号：先尝试作为普通零点（连续穿越），失败再按极点处理
                let isRoot = false;
                const xr = brent(f, xs[i], xs[i + 1]);
                if (Number.isFinite(xr)) {
                    const fxr = f(xr);
                    if (Number.isFinite(fxr) && Math.abs(fxr) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) {
                        isRoot = true;
                    }
                }

                if (!isRoot && Math.max(Math.abs(y0), Math.abs(y1)) > POLE_MAG) {
                    // 极点：对 g = 1/f 用 Brent 精化位置。
                    // 注意 f 把非有限值映射为 NaN，而极点附近 f→±∞ 即 g→0，
                    // 因此 g 遇到非有限值时返回 0（恰好落在极点上的情形）。
                    const g = function (t) {
                        const v = f(t);
                        if (!Number.isFinite(v)) return 0;
                        return v === 0 ? Infinity : 1 / v;
                    };
                    let x0 = brent(g, xs[i], xs[i + 1]);
                    if (!Number.isFinite(x0)) x0 = (xs[i] + xs[i + 1]) / 2;
                    const check = Math.max(Math.abs(f(x0 - step * 0.01)), Math.abs(f(x0 + step * 0.01)));
                    if (Number.isFinite(check) && check > POLE_MAG) vertical.push(x0);
                }
            } else if (f0 !== f1) {
                // 进入/离开未定义区域：判断是发散（渐近线）还是定义域边界
                const side = f0 ? -1 : 1; // f0 有限则边界在右侧，向外为 +1
                const xEdge = f0 ? xs[i] : xs[i + 1];
                const v1 = Math.abs(f(xEdge + side * step));
                const v2 = Math.abs(f(xEdge + side * step * 0.01));
                if (Number.isFinite(v1) && Number.isFinite(v2) && v2 > 100 * Math.max(v1, 1) && v2 > POLE_MAG) {
                    vertical.push(xEdge);
                } else {
                    breaks.push(xEdge);
                }
            }
        }

        // 去重
        const dedup = (arr) => {
            arr.sort((p, q) => p - q);
            const out = [];
            for (const v of arr) {
                if (!Number.isFinite(v)) continue;
                if (out.length === 0 || Math.abs(v - out[out.length - 1]) > (b - a) / n * 2) out.push(v);
            }
            return out;
        };
        return { vertical: dedup(vertical), domainBreaks: dedup(breaks) };
    }

    /** 求 x→±Infinity 时 f 的极限（不收敛返回 null） */
    function limitAtInfinity(f, sign) {
        const v1 = f(sign * 1e6);
        const v2 = f(sign * 1e7);
        const v3 = f(sign * 1e8);
        if (Number.isFinite(v2) && Number.isFinite(v3) &&
            Math.abs(v2 - v3) < 1e-6 * Math.max(1, Math.abs(v3))) {
            return v3;
        }
        if (Number.isFinite(v1) && Number.isFinite(v2) &&
            Math.abs(v1 - v2) < 1e-5 * Math.max(1, Math.abs(v2))) {
            return v2;
        }
        return null;
    }

    /**
     * 检测水平与斜渐近线。
     * 返回 { horizontal: [{y, side}], oblique: [{m, c, side}] }
     */
    function detectEndBehavior(f) {
        const horizontal = [];
        const oblique = [];

        for (const sign of [1, -1]) {
            const label = sign > 0 ? '+∞' : '-∞';
            const L = limitAtInfinity(f, sign);
            if (L !== null) {
                horizontal.push({ y: L, side: label });
                continue;
            }
            // 斜渐近线：m = f(x)/x, c = f(x) - m*x
            const m1 = f(sign * 1e6) / (sign * 1e6);
            const m2 = f(sign * 1e7) / (sign * 1e7);
            if (Number.isFinite(m1) && Number.isFinite(m2) &&
                Math.abs(m1 - m2) < 1e-6 * Math.max(1, Math.abs(m2)) &&
                Math.abs(m2) > 1e-9 && Math.abs(m2) < 1e6) {
                const c1 = f(sign * 1e6) - m2 * sign * 1e6;
                const c2 = f(sign * 1e7) - m2 * sign * 1e7;
                if (Number.isFinite(c1) && Number.isFinite(c2) &&
                    Math.abs(c1 - c2) < 1e-5 * Math.max(1, Math.abs(c2))) {
                    oblique.push({ m: m2, c: c2, side: label });
                }
            }
        }
        return { horizontal, oblique };
    }

    /* ---------------------------------------------------------------
     * 定积分：自适应 Simpson
     * --------------------------------------------------------------- */

    /**
     * 自适应 Simpson 积分。
     * 返回 { value, error, converged, note }
     */
    function adaptiveSimpson(f, a, b, eps, maxDepth) {
        if (typeof f === 'string') f = makeFunction(f, ['x']);
        eps = eps || 1e-9;
        maxDepth = maxDepth || 20;

        if (!Number.isFinite(a) || !Number.isFinite(b)) {
            return { value: NaN, error: Infinity, converged: false, note: '积分限必须为有限值' };
        }
        if (a === b) return { value: 0, error: 0, converged: true, note: null };

        const sign = a < b ? 1 : -1;
        if (a > b) { const t = a; a = b; b = t; }

        const S = function (l, r) {
            const m = (l + r) / 2;
            return (r - l) / 6 * (f(l) + 4 * f(m) + f(r));
        };

        const whole = S(a, b);
        if (!Number.isFinite(whole)) {
            return { value: NaN, error: Infinity, converged: false, note: '被积函数在积分区间内存在奇点或不可求值点' };
        }

        let evals = 3;
        function rec(l, r, tol, wholeEst, depth) {
            const m = (l + r) / 2;
            const left = S(l, m), right = S(m, r);
            evals += 4;
            const delta = left + right - wholeEst;
            if (depth <= 0 || Math.abs(delta) <= 15 * tol) {
                return { value: left + right + delta / 15, error: Math.abs(delta) / 15, converged: depth > 0 };
            }
            if (!Number.isFinite(left + right)) {
                return { value: NaN, error: Infinity, converged: false };
            }
            const L = rec(l, m, tol / 2, left, depth - 1);
            const R = rec(m, r, tol / 2, right, depth - 1);
            return {
                value: L.value + R.value,
                error: L.error + R.error,
                converged: L.converged && R.converged
            };
        }

        const res = rec(a, b, eps, whole, maxDepth);
        res.value *= sign;
        res.evaluations = evals;
        res.note = res.converged ? null : '积分未完全收敛（可能存在尖点或振荡），结果仅供参考';
        return res;
    }

    /* ---------------------------------------------------------------
     * 极限
     * --------------------------------------------------------------- */

    /**
     * 数值极限。point 可为有限数或 ±Infinity。
     * 返回 { value, converged, left, right, note }
     */
    function numericLimit(f, point, opts) {
        opts = opts || {};
        if (typeof f === 'string') f = makeFunction(f, ['x']);

        const converge = (seq) => {
            let best = NaN;
            for (let i = 1; i < seq.length; i++) {
                const a = seq[i - 1], b = seq[i];
                if (Number.isFinite(a) && Number.isFinite(b)) {
                    best = b;
                    if (Math.abs(a - b) < (opts.tol || 1e-7) * Math.max(1, Math.abs(b))) {
                        return { value: b, converged: true };
                    }
                }
            }
            return { value: best, converged: false };
        };

        if (point === Infinity || point === -Infinity) {
            const sign = point === Infinity ? 1 : -1;
            const seq = [1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8].map((k) => f(sign * k));
            const r = converge(seq);
            return {
                value: r.value,
                converged: r.converged,
                left: null,
                right: null,
                note: r.converged ? null : '极限未收敛或不存在'
            };
        }

        const leftSeq = [], rightSeq = [];
        for (let k = 1; k <= 9; k++) {
            const h = Math.pow(10, -k);
            leftSeq.push(f(point - h));
            rightSeq.push(f(point + h));
        }
        const L = converge(leftSeq);
        const R = converge(rightSeq);

        const bothOk = L.converged && R.converged &&
            Math.abs(L.value - R.value) < 1e-4 * Math.max(1, Math.abs(L.value), Math.abs(R.value));

        return {
            value: bothOk ? (L.value + R.value) / 2 : (L.converged ? L.value : R.value),
            converged: bothOk,
            left: L.value,
            right: R.value,
            note: bothOk ? null : (L.converged && R.converged ? '左右极限不相等，极限不存在' : '极限未收敛，结果仅供参考')
        };
    }

    /* ---------------------------------------------------------------
     * 符号求导与泰勒展开
     * --------------------------------------------------------------- */

    /**
     * 符号求导。n 阶。失败返回 null。
     * 返回 { expression, tex? } 的字符串形式。
     */
    function symbolicDerivative(expr, variable, n) {
        variable = variable || 'x';
        n = n || 1;
        try {
            let node = math.parse(normalizeExpression(expr));
            for (let i = 0; i < n; i++) {
                node = math.derivative(node, variable);
            }
            let simplified = node;
            try {
                simplified = math.simplify(node);
            } catch (e) { /* 化简失败就用原式 */ }
            return simplified.toString();
        } catch (e) {
            return null;
        }
    }

    /**
     * 泰勒展开：返回 { coefficients: [c0..cn], polynomial, point, degree, evaluate }
     * coefficients[k] = f^(k)(a) / k!
     */
    function taylor(expr, a, degree, variable) {
        variable = variable || 'x';
        degree = Math.max(1, Math.min(12, degree || 4));

        const coefficients = [];
        const terms = [];
        let factorial = 1;
        let derivExpr = normalizeExpression(expr);

        for (let k = 0; k <= degree; k++) {
            if (k > 0) factorial *= k;
            let val;
            try {
                val = toRealNumber(compile(derivExpr).evaluate(
                    variable === 'x' ? { x: a } : (function () { const s = {}; s[variable] = a; return s; }())
                ));
            } catch (e) {
                return { error: '第 ' + k + ' 阶导数在 x = ' + fmt(a) + ' 处不可求值', coefficients: null };
            }
            if (!Number.isFinite(val)) {
                return { error: '第 ' + k + ' 阶导数在 x = ' + fmt(a) + ' 处不存在', coefficients: null };
            }
            coefficients.push(val / factorial);

            if (Math.abs(val / factorial) > 1e-12) {
                let term = fmt(val / factorial, 8);
                if (k > 0) term += '·(x' + (a !== 0 ? ' - ' + fmt(a) : '') + ')' + (k > 1 ? '^' + k : '');
                terms.push(term);
            }

            // 求下一阶导数
            try {
                derivExpr = math.derivative(math.parse(derivExpr), variable).toString();
            } catch (e) {
                if (k < degree) {
                    return { error: '符号求导在第 ' + (k + 1) + ' 阶失败', coefficients: null };
                }
            }
        }

        const scopeVar = variable;
        return {
            coefficients,
            point: a,
            degree,
            polynomial: terms.length ? terms.join(' + ') : '0',
            evaluate: function (x) {
                let sum = 0, pow = 1;
                for (let k = 0; k < coefficients.length; k++) {
                    sum += coefficients[k] * pow;
                    pow *= (x - a);
                }
                return sum;
            }
        };
    }

    /* ---------------------------------------------------------------
     * 其他分析
     * --------------------------------------------------------------- */

    /** 两函数交点：f1 - f2 的零点 */
    function intersections(expr1, expr2, a, b) {
        const f1 = makeFunction(expr1, ['x']);
        const f2 = makeFunction(expr2, ['x']);
        const diff = function (x) {
            const v1 = f1(x), v2 = f2(x);
            return (Number.isFinite(v1) && Number.isFinite(v2)) ? v1 - v2 : NaN;
        };
        return findZeros(diff, a, b).map((x) => ({ x, y: f1(x) }));
    }

    /** 奇偶性：'even' | 'odd' | 'none' */
    function parity(f, a, b) {
        if (typeof f === 'string') f = makeFunction(f, ['x']);
        const m = Math.min(Math.abs(a), Math.abs(b));
        if (m === 0) return 'none';
        let even = true, odd = true;
        for (let i = 1; i <= 30; i++) {
            const x = -m + 2 * m * i / 31;
            const f1 = f(x), f2 = f(-x);
            if (!Number.isFinite(f1) || !Number.isFinite(f2)) { continue; }
            const scale = Math.max(1, Math.abs(f1), Math.abs(f2));
            if (Math.abs(f1 - f2) > 1e-6 * scale) even = false;
            if (Math.abs(f1 + f2) > 1e-6 * scale) odd = false;
        }
        return even ? 'even' : (odd ? 'odd' : 'none');
    }

    /**
     * 周期性检测：尝试常见周期并验证。
     * 返回最小正周期或 null（常函数返回 { constant: true }）。
     */
    function findPeriod(f, a, b) {
        if (typeof f === 'string') f = makeFunction(f, ['x']);
        // 常函数检测
        let mn = Infinity, mx = -Infinity;
        for (let i = 0; i <= 40; i++) {
            const v = f(a + (b - a) * i / 40);
            if (Number.isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; }
        }
        if (mx - mn < 1e-9) return { constant: true, period: null };

        const candidates = [
            Math.PI / 2, Math.PI, 2 * Math.PI, 4 * Math.PI,
            0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10
        ];
        for (const T of candidates) {
            if (T >= (b - a) * 0.9) continue;
            let ok = true;
            for (let i = 0; i < 60; i++) {
                const x = a + (b - a - T) * i / 59;
                const v1 = f(x), v2 = f(x + T);
                if (!Number.isFinite(v1) || !Number.isFinite(v2)) { ok = false; break; }
                if (Math.abs(v1 - v2) > 1e-5 * Math.max(1, Math.abs(v1))) { ok = false; break; }
            }
            if (ok) return { constant: false, period: T };
        }
        return { constant: false, period: null };
    }

    /* ---------------------------------------------------------------
     * 综合分析
     * --------------------------------------------------------------- */

    /**
     * 对 y = f(x) 做全面性质分析。
     * 返回结构化报告（全部数值，展示层负责格式化）。
     */
    function analyzeFunction(expr, opts) {
        opts = opts || {};
        const xMin = opts.xMin !== undefined ? opts.xMin : -10;
        const xMax = opts.xMax !== undefined ? opts.xMax : 10;
        const samples = opts.samples || 800;

        const f = makeFunction(expr, ['x']);
        const xs = linspace(xMin, xMax, samples);
        const ys = xs.map(f);

        let rMin = Infinity, rMax = -Infinity, finiteCount = 0;
        for (const v of ys) {
            if (Number.isFinite(v)) {
                finiteCount++;
                if (v < rMin) rMin = v;
                if (v > rMax) rMax = v;
            }
        }

        const { vertical, domainBreaks } = detectVerticalAsymptotes(f, xMin, xMax, samples);
        const zeros = findZeros(f, xMin, xMax);
        const extrema = findExtrema(f, xMin, xMax);
        const critXs = extrema.maxima.map((p) => p.x).concat(extrema.minima.map((p) => p.x));
        const monotonic = monotonicIntervals(f, xMin, xMax, critXs, vertical.concat(domainBreaks));
        const conc = concavity(f, xMin, xMax);
        const endBehavior = detectEndBehavior(f);
        const par = parity(f, xMin, xMax);
        const periodInfo = findPeriod(f, xMin, xMax);

        return {
            expression: expr,
            xRange: [xMin, xMax],
            definedRatio: finiteCount / samples,
            range: finiteCount ? { min: rMin, max: rMax } : null,
            zeros: zeros.map((x) => ({ x, y: f(x) })),
            extrema,
            monotonic,
            concavity: conc.intervals,
            inflections: conc.inflections,
            asymptotes: {
                vertical,
                horizontal: endBehavior.horizontal,
                oblique: endBehavior.oblique
            },
            domainBreaks,
            parity: par,
            period: periodInfo.period,
            constant: periodInfo.constant
        };
    }

    /* ---------------------------------------------------------------
     * 导出
     * --------------------------------------------------------------- */

    return {
        normalizeExpression,
        validateExpression,
        compile,
        makeFunction,
        toRealNumber,
        linspace,
        fmt,
        numericDerivative,
        secondDerivative,
        bisect,
        brent,
        findZeros,
        goldenSectionMin,
        findExtrema,
        monotonicIntervals,
        concavity,
        detectVerticalAsymptotes,
        detectEndBehavior,
        limitAtInfinity,
        adaptiveSimpson,
        numericLimit,
        symbolicDerivative,
        taylor,
        intersections,
        parity,
        findPeriod,
        analyzeFunction
    };
}));
