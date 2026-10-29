/**
 * conic.js
 * ============================================================
 * 圆锥曲线内核：识别、标准化、几何性质与切线。
 *
 * 支持输入：
 *   x^2/4 + y^2/9 = 1
 *   x^2 + y^2 - 4*x = 0
 *   y^2 - 4*x = 0
 *   x^2/4 - y^2/9 - 1 = 0
 *
 * 做法：先用数值采样拟合一般二次式 Ax²+Bxy+Cy²+Dx+Ey+F=0，
 * 再用不变量判别类型；轴对齐情形给出完整性质，含 xy 项时只给
 * 类型、中心、轴长与离心率，并明确标注「旋转情形」。
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./math-core.js'));
    } else {
        root.MathConic = factory(root.MathCore);
    }
}(typeof self !== 'undefined' ? self : this, function (MathCore) {
    'use strict';

    if (!MathCore) throw new Error('conic.js 依赖 math-core.js，请先加载');

    const EPS = 1e-9;

    function fmt(v, d) { return MathCore.fmt(v, d === undefined ? 6 : d); }

    /** 把「左边 = 右边」变成隐函数表达式「左边 - (右边)」 */
    function toBody(expr) {
        let s = MathCore.normalizeExpression(String(expr || ''), { stripPrefix: false });
        const eq = s.indexOf('=');
        if (eq > 0) {
            const lhs = s.slice(0, eq);
            const rhs = s.slice(eq + 1);
            if (!lhs.trim() || !rhs.trim()) throw new Error('方程格式不完整');
            s = '(' + lhs + ')-(' + rhs + ')';
        }
        return s;
    }

    /** 高斯消元求解 M c = v */
    function solveLinear(M, v) {
        const n = v.length;
        const a = M.map((row, i) => row.concat([v[i]]));
        for (let col = 0; col < n; col++) {
            let pivot = col;
            for (let r = col + 1; r < n; r++) {
                if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
            }
            if (Math.abs(a[pivot][col]) < 1e-14) throw new Error('方程退化，无法拟合二次曲线');
            if (pivot !== col) { const t = a[pivot]; a[pivot] = a[col]; a[col] = t; }
            const p = a[col][col];
            for (let j = col; j <= n; j++) a[col][j] /= p;
            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const factor = a[r][col];
                if (Math.abs(factor) < 1e-18) continue;
                for (let j = col; j <= n; j++) a[r][j] -= factor * a[col][j];
            }
        }
        return a.map((row) => row[n]);
    }

    /** 数值拟合一般二次式系数 [A,B,C,D,E,F] */
    function fitCoefficients(f) {
        const pts = [];
        for (let x = -2; x <= 2; x++) {
            for (let y = -2; y <= 2; y++) pts.push([x, y]);
        }
        const M = new Array(6).fill(0).map(() => new Array(6).fill(0));
        const v = new Array(6).fill(0);
        let used = 0;
        pts.forEach(function (p) {
            const x = p[0], y = p[1];
            const val = f(x, y);
            if (!Number.isFinite(val)) return;
            const row = [x * x, x * y, y * y, x, y, 1];
            used++;
            for (let i = 0; i < 6; i++) {
                v[i] += row[i] * val;
                for (let j = 0; j < 6; j++) M[i][j] += row[i] * row[j];
            }
        });
        if (used < 6) throw new Error('可求值点不足，无法识别曲线');
        return solveLinear(M, v);
    }

    /** 拟合残差，确认输入确实是二次曲线 */
    function verifyFit(f, c) {
        let worst = 0;
        for (let x = -3; x <= 3; x++) {
            for (let y = -3; y <= 3; y++) {
                const val = f(x, y);
                if (!Number.isFinite(val)) continue;
                const model = c[0] * x * x + c[1] * x * y + c[2] * y * y + c[3] * x + c[4] * y + c[5];
                worst = Math.max(worst, Math.abs(model - val) / Math.max(1, Math.abs(val)));
            }
        }
        // 注：拟合的是 f 的系数，模型与 f 应处处一致
        if (worst > 1e-6) {
            throw new Error('输入不是二次曲线（拟合残差 ' + worst.toExponential(2) + '）');
        }
    }

    function roundZero(v, scale) {
        return Math.abs(v) <= 1e-9 * Math.max(1, scale) ? 0 : v;
    }

    /** 轴对齐情形的完整性质 */
    function analyzeAxisAligned(c, f) {
        let A = c[0], B = c[1], C = c[2], D = c[3], E = c[4], F = c[5];
        const scale = Math.max(Math.abs(A), Math.abs(B), Math.abs(C), Math.abs(D), Math.abs(E), Math.abs(F), 1);
        const eps = 1e-8 * scale;
        A = roundZero(A, scale); B = roundZero(B, scale); C = roundZero(C, scale);
        D = roundZero(D, scale); E = roundZero(E, scale); F = roundZero(F, scale);

        if (Math.abs(A) <= eps && Math.abs(C) <= eps) {
            if (Math.abs(D) > eps || Math.abs(E) > eps) {
                return base('line', '直线（退化二次曲线）', c, { note: '一次方程，不是圆锥曲线' });
            }
            return base('empty', '无轨迹', c, { note: '常数方程，无解' });
        }

        // 统一让 A>=0，便于后续判断
        if (A < -eps || (Math.abs(A) <= eps && C < 0)) {
            A = -A; C = -C; D = -D; E = -E; F = -F;
        }

        // 抛物线
        if (Math.abs(A) <= eps || Math.abs(C) <= eps) {
            return analyzeParabola(A, C, D, E, F, c, f);
        }

        const h = -D / (2 * A);
        const k = -E / (2 * C);
        const R = A * h * h + C * k * k - F;

        if (Math.abs(A - C) <= 1e-7 * scale && R > 0) {
            const r2 = R / A;
            return {
                type: 'circle',
                typeLabel: '圆',
                equation: shifted('x', h) + '^2 + ' + shifted('y', k) + '^2 = ' + fmt(r2, 6),
                center: { x: h, y: k },
                radius: Math.sqrt(r2),
                a: Math.sqrt(r2),
                b: Math.sqrt(r2),
                c: 0,
                e: 0,
                foci: [],
                vertices: [],
                coVertices: [],
                directrices: [],
                asymptotes: [],
                markers: [{ x: h, y: k, label: 'O', kind: 'center' }],
                coefficients: c,
                warnings: []
            };
        }

        if (A * C > 0) {
            if (R > 0) {
                const ax = Math.sqrt(R / A);
                const ay = Math.sqrt(R / C);
                const majorX = ax >= ay;
                const a = Math.max(ax, ay);
                const b = Math.min(ax, ay);
                const cc = Math.sqrt(Math.max(0, a * a - b * b));
                const e = cc / a;
                const foci = majorX
                    ? [{ x: h - cc, y: k }, { x: h + cc, y: k }]
                    : [{ x: h, y: k - cc }, { x: h, y: k + cc }];
                const vertices = majorX
                    ? [{ x: h - a, y: k }, { x: h + a, y: k }]
                    : [{ x: h, y: k - a }, { x: h, y: k + a }];
                const coVertices = majorX
                    ? [{ x: h, y: k - b }, { x: h, y: k + b }]
                    : [{ x: h - b, y: k }, { x: h + b, y: k }];
                const dd = a / e;
                const directrices = majorX
                    ? ['x = ' + fmt(h - dd), 'x = ' + fmt(h + dd)]
                    : ['y = ' + fmt(k - dd), 'y = ' + fmt(k + dd)];
                return {
                    type: 'ellipse',
                    typeLabel: '椭圆',
                    equation: shifted('x', h) + '^2/' + fmt(ax * ax, 6) + ' + ' + shifted('y', k) + '^2/' + fmt(ay * ay, 6) + ' = 1',
                    center: { x: h, y: k },
                    a, b, c: cc, e,
                    majorAxis: majorX ? 'x' : 'y',
                    foci, vertices, coVertices, directrices,
                    asymptotes: [],
                    markers: [{ x: h, y: k, label: 'O', kind: 'center' }]
                        .concat(foci.map(function (p, i) { return { x: p.x, y: p.y, label: 'F' + (i + 1), kind: 'focus' }; }))
                        .concat(vertices.map(function (p, i) { return { x: p.x, y: p.y, label: 'A' + (i + 1), kind: 'vertex' }; })),
                    coefficients: c,
                    warnings: []
                };
            }
            if (Math.abs(R) <= 1e-9 * scale) {
                return base('point', '点（退化椭圆）', c, { center: { x: h, y: k }, note: '只有一点满足方程' });
            }
            return base('imaginary', '无实轨迹（虚椭圆）', c, { center: { x: h, y: k }, note: '配方后右边为负' });
        }

        // 双曲线 A>0, C<0
        const Cabs = Math.abs(C);
        let a2, b2, transverse, hh = h, kk = k;
        if (R > 0) {
            a2 = R / A; b2 = R / Cabs; transverse = 'x';
        } else if (R < 0) {
            a2 = (-R) / Cabs; b2 = (-R) / A; transverse = 'y';
        } else {
            return base('crossing-lines', '两条相交直线（退化双曲线）', c, { center: { x: h, y: k } });
        }
        const a = Math.sqrt(a2), b = Math.sqrt(b2);
        const cc = Math.sqrt(a2 + b2);
        const e = cc / a;
        const foci = transverse === 'x'
            ? [{ x: hh - cc, y: kk }, { x: hh + cc, y: kk }]
            : [{ x: hh, y: kk - cc }, { x: hh, y: kk + cc }];
        const vertices = transverse === 'x'
            ? [{ x: hh - a, y: kk }, { x: hh + a, y: kk }]
            : [{ x: hh, y: kk - a }, { x: hh, y: kk + a }];
        const slope = transverse === 'x' ? b / a : a / b;
        const asymptotes = [
            shiftedLhs('y', kk) + ' = ' + fmt(slope, 6) + shifted('x', hh),
            shiftedLhs('y', kk) + ' = ' + fmt(-slope, 6) + shifted('x', hh)
        ];
        const dd = a / e;
        const directrices = transverse === 'x'
            ? ['x = ' + fmt(hh - dd), 'x = ' + fmt(hh + dd)]
            : ['y = ' + fmt(kk - dd), 'y = ' + fmt(kk + dd)];
        return {
            type: 'hyperbola',
            typeLabel: '双曲线',
            equation: shifted('x', hh) + '^2/' + fmt(a2, 6) + ' − ' + shifted('y', kk) + '^2/' + fmt(b2, 6) + ' = 1',
            center: { x: hh, y: kk },
            a, b, c: cc, e,
            transverseAxis: transverse,
            foci, vertices, coVertices: [], directrices, asymptotes,
            markers: [{ x: hh, y: kk, label: 'O', kind: 'center' }]
                .concat(foci.map(function (p, i) { return { x: p.x, y: p.y, label: 'F' + (i + 1), kind: 'focus' }; }))
                .concat(vertices.map(function (p, i) { return { x: p.x, y: p.y, label: 'A' + (i + 1), kind: 'vertex' }; })),
            coefficients: c,
            warnings: []
        };
    }

    /** 抛物线 */
    function analyzeParabola(A, C, D, E, F, c, f) {
        if (Math.abs(A) <= EPS && Math.abs(C) > EPS) {
            const k = -E / (2 * C);
            const F0 = F - E * E / (4 * C);
            if (Math.abs(D) < 1e-12) {
                return base('parallel-lines', '两条平行直线（退化抛物线）', c, { note: '缺 x 的一次项' });
            }
            const p = -D / (2 * C);
            const h = -F0 / D;
            return {
                type: 'parabola',
                typeLabel: '抛物线',
                equation: shifted('y', k) + '^2 = ' + fmt(-D / C, 6) + shifted('x', h),
                center: null,
                vertex: { x: h, y: k },
                p,
                a: null, b: null, c: null, e: 1,
                focus: { x: h + p / 2, y: k },
                directrix: 'x = ' + fmt(h - p / 2),
                axis: 'x',
                foci: [{ x: h + p / 2, y: k }],
                vertices: [{ x: h, y: k }],
                coVertices: [], asymptotes: [], directrices: ['x = ' + fmt(h - p / 2)],
                markers: [
                    { x: h, y: k, label: '顶点', kind: 'vertex' },
                    { x: h + p / 2, y: k, label: 'F', kind: 'focus' }
                ],
                coefficients: c,
                warnings: []
            };
        }
        if (Math.abs(C) <= EPS && Math.abs(A) > EPS) {
            const h = -D / (2 * A);
            const F0 = F - D * D / (4 * A);
            if (Math.abs(E) < 1e-12) {
                return base('parallel-lines', '两条平行直线（退化抛物线）', c, { note: '缺 y 的一次项' });
            }
            const p = -E / (2 * A);
            const k = -F0 / E;
            return {
                type: 'parabola',
                typeLabel: '抛物线',
                equation: shifted('x', h) + '^2 = ' + fmt(-E / A, 6) + shifted('y', k),
                center: null,
                vertex: { x: h, y: k },
                p,
                a: null, b: null, c: null, e: 1,
                focus: { x: h, y: k + p / 2 },
                directrix: 'y = ' + fmt(k - p / 2),
                axis: 'y',
                foci: [{ x: h, y: k + p / 2 }],
                vertices: [{ x: h, y: k }],
                coVertices: [], asymptotes: [], directrices: ['y = ' + fmt(k - p / 2)],
                markers: [
                    { x: h, y: k, label: '顶点', kind: 'vertex' },
                    { x: h, y: k + p / 2, label: 'F', kind: 'focus' }
                ],
                coefficients: c,
                warnings: []
            };
        }
        return base('unknown', '无法识别', c, { note: '二次项均为零' });
    }

    /** 生成「(x − h)」；h 为 0 时只返回 x */
    function shifted(name, offset) {
        if (Math.abs(offset) < 1e-10) return name;
        return '(' + name + ' ' + (offset > 0 ? '− ' : '+ ') + fmt(Math.abs(offset)) + ')';
    }

    /** 生成「y − k」；k 为 0 时只返回 y */
    function shiftedLhs(name, offset) {
        if (Math.abs(offset) < 1e-10) return name;
        return name + ' ' + (offset > 0 ? '− ' : '+ ') + fmt(Math.abs(offset));
    }

    function base(type, typeLabel, coefficients, extra) {
        return Object.assign({
            type, typeLabel, coefficients,
            equation: '',
            center: null,
            a: null, b: null, c: null, e: null,
            foci: [], vertices: [], coVertices: [],
            directrices: [], asymptotes: [], markers: [],
            warnings: []
        }, extra || {});
    }

    /** 含 xy 项：只识别类型并给中心/轴长/离心率 */
    function analyzeRotated(c) {
        const A = c[0], B = c[1], C = c[2], D = c[3], E = c[4], F = c[5];
        const disc = B * B - 4 * A * C;
        const type = Math.abs(disc) < 1e-7 * Math.max(1, Math.abs(A), Math.abs(C))
            ? 'parabola' : (disc < 0 ? 'ellipse' : 'hyperbola');
        const det = 4 * A * C - B * B;
        if (Math.abs(det) < 1e-9) {
            return base(type, type === 'parabola' ? '抛物线（旋转）' : '退化为直线', c, {
                warnings: ['含 xy 项且退化：暂不提供焦点/准线计算']
            });
        }
        const h = (-2 * C * D + B * E) / det;
        const k = (B * D - 2 * A * E) / det;
        const K = A * h * h + B * h * k + C * k * k + D * h + E * k + F;
        const root = Math.sqrt(Math.pow(A - C, 2) + B * B);
        const l1 = (A + C + root) / 2;
        const l2 = (A + C - root) / 2;
        let a = null, b = null, e = null;
        if (Math.abs(l1) > 1e-12 && Math.abs(l2) > 1e-12 && K !== 0) {
            const s1 = -K / l1, s2 = -K / l2;
            if (type === 'ellipse' && s1 > 0 && s2 > 0) {
                a = Math.sqrt(Math.max(s1, s2));
                b = Math.sqrt(Math.min(s1, s2));
                e = Math.sqrt(Math.max(0, 1 - (b * b) / (a * a)));
            } else if (type === 'hyperbola' && s1 * s2 < 0) {
                a = Math.sqrt(Math.max(Math.abs(s1), Math.abs(s2)));
                b = Math.sqrt(Math.min(Math.abs(s1), Math.abs(s2)));
                e = Math.sqrt(1 + (b * b) / (a * a));
            }
        }
        return base(type, type === 'ellipse' ? '椭圆（旋转）' : (type === 'hyperbola' ? '双曲线（旋转）' : '抛物线（旋转）'), c, {
            center: { x: h, y: k },
            a, b, c: type === 'ellipse' || type === 'hyperbola' ? a * e : null,
            e,
            angle: 0.5 * Math.atan2(B, A - C) * 180 / Math.PI,
            warnings: ['含 xy 项：仅提供类型、中心、轴长与离心率，焦点/准线/切线暂不支持']
        });
    }

    /**
     * 分析圆锥曲线。
     * @returns {object} 类型、中心、a/b/c/e、焦点、顶点、准线、渐近线、绘图标记
     */
    function analyze(expr) {
        const body = toBody(expr);
        const f = MathCore.makeFunction(body, ['x', 'y']);
        const c = fitCoefficients(f);
        verifyFit(f, c);
        const scale = Math.max.apply(null, c.map(Math.abs).concat([1]));
        const B = c[1];
        if (Math.abs(B) > 1e-7 * scale) return analyzeRotated(c);
        return analyzeAxisAligned(c, f);
    }

    /** 曲线上一点的切线 */
    function tangentAt(expr, x0, y0) {
        const info = analyze(expr);
        const c = info.coefficients;
        const A = c[0], B = c[1], C = c[2], D = c[3], E = c[4], F = c[5];
        const residual = A * x0 * x0 + B * x0 * y0 + C * y0 * y0 + D * x0 + E * y0 + F;
        const scale = Math.max(1, Math.abs(A * x0 * x0), Math.abs(C * y0 * y0), Math.abs(D * x0), Math.abs(E * y0), Math.abs(F));
        if (Math.abs(residual) > 1e-6 * scale) {
            throw new Error('点 (' + fmt(x0) + ', ' + fmt(y0) + ') 不在曲线上（残差 ' + residual.toExponential(2) + '）');
        }
        let a = 2 * A * x0 + B * y0 + D;
        let b = B * x0 + 2 * C * y0 + E;
        const norm = Math.max(Math.abs(a), Math.abs(b));
        if (!(norm > 1e-12)) throw new Error('该点处切线退化');
        a /= norm; b /= norm;
        const cc = -(a * x0 + b * y0);
        return {
            a, b, c: cc,
            slope: Math.abs(b) > 1e-9 ? -a / b : Infinity,
            equation: linearToString(a, b, cc),
            point: { x: x0, y: y0 },
            residual
        };
    }

    function linearToString(a, b, c) {
        const ax = Math.abs(a) < 1e-9 ? '' : (Math.abs(a - 1) < 1e-9 ? 'x' : (Math.abs(a + 1) < 1e-9 ? '−x' : fmt(a) + 'x'));
        const by = Math.abs(b) < 1e-9 ? '' : (b > 0 ? (ax ? ' + ' : '') : ' − ')
            + (Math.abs(b - 1) < 1e-9 ? 'y' : (Math.abs(b + 1) < 1e-9 ? 'y' : fmt(Math.abs(b)) + 'y'));
        const cx = Math.abs(c) < 1e-9 ? '' : (c > 0 ? ' + ' : ' − ') + fmt(Math.abs(c));
        return (ax || by || '0') + by + cx + ' = 0';
    }

    return {
        analyze,
        tangentAt,
        toBody,
        fitCoefficients
    };
}));
