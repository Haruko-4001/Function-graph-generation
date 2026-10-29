/**
 * codegen.js
 * ============================================================
 * 代码导出：把当前分析结果生成为一份可直接运行的 Python 脚本。
 *
 * 这是「看 → 改 → 交」的最后一环：学生拿到的不再是一张图，
 * 而是一段能改参数、能交作业、能离线复现的代码。
 *
 * 生成物必须满足：
 *   1. 自包含（只依赖 numpy + matplotlib）
 *   2. 可运行（`python plot_xxx.py` 直接出图）
 *   3. 可自证（脚本内含 verify()，复算生成时的每条结论）
 *   4. 可审查（交给 codecheck.js 做导入白名单与危险调用检查）
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MathCodegen = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /** mathjs 函数名 → numpy 实现 */
    const FUNC_MAP = {
        sin: 'np.sin',
        cos: 'np.cos',
        tan: 'np.tan',
        asin: 'np.arcsin',
        acos: 'np.arccos',
        atan: 'np.arctan',
        atan2: 'np.arctan2',
        sinh: 'np.sinh',
        cosh: 'np.cosh',
        tanh: 'np.tanh',
        exp: 'np.exp',
        sqrt: 'np.sqrt',
        cbrt: 'np.cbrt',
        abs: 'np.abs',
        log: 'np.log',
        log10: 'np.log10',
        log2: 'np.log2',
        floor: 'np.floor',
        ceil: 'np.ceil',
        round: 'np.round',
        sign: 'np.sign',
        pow: 'np.power'
    };

    /** 把数字写成合法的 Python 字面量 */
    function num(v) {
        if (!Number.isFinite(v)) return 'float("nan")';
        if (Number.isInteger(v)) return v.toFixed(1);
        return String(v);
    }

    /**
     * mathjs 表达式 → Python（numpy）表达式。
     * 只接受已知函数名，遇到未知标识符直接抛错——宁可拒绝生成，也不生成跑不通的代码。
     */
    function translateExpression(expr) {
        let s = String(expr || '').trim();
        if (!s) throw new Error('表达式为空');

        // 常量先替换成占位符，避免与 np.pi / np.e 里的标识符互相干扰
        s = s.replace(/\bpi\b/g, '__PI__').replace(/\be\b/g, '__E__');

        // 函数名
        s = s.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g, function (all, name) {
            if (FUNC_MAP[name]) return FUNC_MAP[name] + '(';
            throw new Error('暂不支持的函数：' + name);
        });

        // 幂运算
        s = s.replace(/\^/g, '**');

        // 占位符还原
        s = s.replace(/__PI__/g, 'np.pi').replace(/__E__/g, 'np.e');

        // 只允许变量 x 与 np.xxx
        const ids = s.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
        ids.forEach(function (id) {
            if (id === 'x' || id === 'np') return;
            if (/^(sin|cos|tan|arcsin|arccos|arctan|arctan2|sinh|cosh|tanh|exp|sqrt|cbrt|abs|log|log10|log2|floor|ceil|round|sign|power|pi|e)$/.test(id)) return;
            throw new Error('暂不支持的符号：' + id);
        });

        return s;
    }

    /** 由表达式生成安全的文件名片段 */
    function slug(expr) {
        const base = String(expr || 'function')
            .replace(/\^/g, 'p')
            .replace(/[^A-Za-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 32);
        return base || 'function';
    }

    /** 把一组数字写成 Python 列表字面量 */
    function listOf(nums, indent) {
        if (!nums.length) return '[]';
        const pad = indent || '    ';
        return '[\n' + nums.map(function (v) { return pad + num(v) + ','; }).join('\n') + '\n]';
    }

    /** 把一组二元组写成 Python 列表字面量 */
    function pairsOf(pairs, indent) {
        if (!pairs.length) return '[]';
        const pad = indent || '    ';
        return '[\n' + pairs.map(function (p) {
            return pad + '(' + num(p[0]) + ', ' + num(p[1]) + '),';
        }).join('\n') + '\n]';
    }

    /**
     * 生成 Python 脚本。
     *
     * @param {object} opts
     *   expression  原始表达式（mathjs 语法）
     *   xMin, xMax  横轴范围
     *   yMin, yMax  纵轴范围
     *   facts       buildFacts 的返回值（用于取出零点/极值/拐点/渐近线）
     * @returns {{filename:string, code:string, bytes:number}}
     */
    function buildPython(opts) {
        opts = opts || {};
        const expr = String(opts.expression || '').trim();
        if (!expr) throw new Error('缺少表达式');

        const facts = opts.facts || null;
        const report = facts ? facts.report : null;
        const xMin = opts.xMin !== undefined ? opts.xMin : (facts ? facts.window.xMin : -10);
        const xMax = opts.xMax !== undefined ? opts.xMax : (facts ? facts.window.xMax : 10);

        let yMin = opts.yMin;
        let yMax = opts.yMax;
        if ((yMin === undefined || yMax === undefined) && report && report.range) {
            const pad = Math.max(1e-6, (report.range.max - report.range.min) * 0.12);
            yMin = report.range.min - pad;
            yMax = report.range.max + pad;
        }
        if (yMin === undefined) yMin = -5;
        if (yMax === undefined) yMax = 5;

        const pyExpr = translateExpression(expr);

        const zeros = report ? report.zeros.map(function (p) { return p.x; }) : [];
        const maxima = report ? report.extrema.maxima.map(function (p) { return [p.x, p.y]; }) : [];
        const minima = report ? report.extrema.minima.map(function (p) { return [p.x, p.y]; }) : [];
        const inflections = report ? report.inflections.slice() : [];
        const vAsym = report ? report.asymptotes.vertical.slice() : [];
        const hAsym = report ? report.asymptotes.horizontal.map(function (h) { return h.y; }) : [];
        const oAsym = report ? report.asymptotes.oblique.map(function (o) { return [o.m, o.c]; }) : [];

        const summary = facts ? facts.summary : { total: 0, passed: 0, failed: 0 };
        const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

        const lines = [];
        lines.push('#!/usr/bin/env python3');
        lines.push('# -*- coding: utf-8 -*-');
        lines.push('"""');
        lines.push('y = ' + pyExpr);
        lines.push('');
        lines.push('由 Math Function Visualizer 自动生成（' + stamp + ' UTC）');
        lines.push('表达式（原始输入）: ' + expr);
        lines.push('分析区间: [' + num(xMin) + ', ' + num(xMax) + ']');
        lines.push('生成时自检: ' + summary.passed + '/' + summary.total + ' 条结论通过');
        lines.push('');
        lines.push('运行方式:  python ' + 'plot_' + slug(expr) + '.py');
        lines.push('依赖:      pip install numpy matplotlib');
        lines.push('"""');
        lines.push('from __future__ import annotations');
        lines.push('');
        lines.push('import math');
        lines.push('');
        lines.push('import numpy as np');
        lines.push('import matplotlib');
        lines.push('');
        lines.push('matplotlib.use("Agg")  # 无图形界面时也能出图');
        lines.push('import matplotlib.pyplot as plt');
        lines.push('from matplotlib import font_manager');
        lines.push('');
        lines.push('# 按可用性挑选中文字体；找不到就退回英文标签，避免图上出现方块');
        lines.push('_CJK_FONTS = ("Microsoft YaHei", "SimHei", "Noto Sans CJK SC", "PingFang SC", "WenQuanYi Zen Hei")');
        lines.push('_available = {f.name for f in font_manager.fontManager.ttflist}');
        lines.push('_cjk = [name for name in _CJK_FONTS if name in _available]');
        lines.push('if _cjk:');
        lines.push('    plt.rcParams["font.sans-serif"] = _cjk + ["DejaVu Sans"]');
        lines.push('    LABELS = {"zero": "零点", "max": "极大值", "min": "极小值", "inflection": "拐点"}');
        lines.push('else:');
        lines.push('    LABELS = {"zero": "zeros", "max": "local max", "min": "local min", "inflection": "inflection"}');
        lines.push('plt.rcParams["axes.unicode_minus"] = False');
        lines.push('');
        lines.push('X_MIN = ' + num(xMin));
        lines.push('X_MAX = ' + num(xMax));
        lines.push('Y_MIN = ' + num(yMin));
        lines.push('Y_MAX = ' + num(yMax));
        lines.push('SAMPLES = 1600');
        lines.push('');
        lines.push('# ---- 生成时记录的结论（verify() 会逐条复算）----');
        lines.push('ZEROS = ' + listOf(zeros));
        lines.push('MAXIMA = ' + pairsOf(maxima));
        lines.push('MINIMA = ' + pairsOf(minima));
        lines.push('INFLECTIONS = ' + listOf(inflections));
        lines.push('VERTICAL_ASYMPTOTES = ' + listOf(vAsym));
        lines.push('HORIZONTAL_ASYMPTOTES = ' + listOf(hAsym));
        lines.push('OBLIQUE_ASYMPTOTES = ' + pairsOf(oAsym));
        lines.push('');
        lines.push('');
        lines.push('def f(x):');
        lines.push('    """目标函数。既接受标量，也接受 numpy 数组。"""');
        lines.push('    x = np.asarray(x, dtype=float)');
        lines.push('    with np.errstate(divide="ignore", invalid="ignore", over="ignore"):');
        lines.push('        return ' + pyExpr);
        lines.push('');
        lines.push('');
        lines.push('def _value(x):');
        lines.push('    return float(np.asarray(f(np.array([x], dtype=float))).ravel()[0])');
        lines.push('');
        lines.push('');
        lines.push('def verify(tol_zero=1e-6, tol_asym=1e-3):');
        lines.push('    """复算生成时的每条结论，返回是否全部通过。"""');
        lines.push('    ok = True');
        lines.push('    print("数值自检（复算生成时的结论）：")');
        lines.push('');
        lines.push('    for z in ZEROS:');
        lines.push('        r = abs(_value(z))');
        lines.push('        good = r <= tol_zero');
        lines.push('        ok = ok and good');
        lines.push('        print("  零点        x=%+.8f  |f(x)|=%.3e  %s" % (z, r, "OK" if good else "FAIL"))');
        lines.push('');
        lines.push('    for (x0, y0) in MAXIMA + MINIMA:');
        lines.push('        h = 1e-6 * (1.0 + abs(x0))');
        lines.push('        d = (_value(x0 + h) - _value(x0 - h)) / (2 * h)');
        lines.push('        good = abs(d) <= 1e-3');
        lines.push('        ok = ok and good');
        lines.push('        print("  极值        x=%+.8f  |f\'(x)|=%.3e  %s" % (x0, abs(d), "OK" if good else "FAIL"))');
        lines.push('');
        lines.push('    for x0 in INFLECTIONS:');
        lines.push('        h = 1e-4 * (1.0 + abs(x0))');
        lines.push('        d2 = (_value(x0 + h) - 2 * _value(x0) + _value(x0 - h)) / (h * h)');
        lines.push('        good = abs(d2) <= 1e-1');
        lines.push('        ok = ok and good');
        lines.push('        print("  拐点        x=%+.8f  |f\'\'(x)|=%.3e  %s" % (x0, abs(d2), "OK" if good else "FAIL"))');
        lines.push('');
        lines.push('    for x0 in VERTICAL_ASYMPTOTES:');
        lines.push('        d = 1e-6 * (1.0 + abs(x0))');
        lines.push('        mag = max(abs(_value(x0 - d)), abs(_value(x0 + d)))');
        lines.push('        good = math.isinf(mag) or mag > 1e3');
        lines.push('        ok = ok and good');
        lines.push('        print("  垂直渐近线  x=%+.8f  max|f|=%.3e  %s" % (x0, mag, "OK" if good else "FAIL"))');
        lines.push('');
        lines.push('    for y0 in HORIZONTAL_ASYMPTOTES:');
        lines.push('        dev = abs(_value(1e7) - y0) / max(1.0, abs(y0))');
        lines.push('        good = dev <= tol_asym');
        lines.push('        ok = ok and good');
        lines.push('        print("  水平渐近线  y=%+.8f  |f(1e7)-y|=%.3e  %s" % (y0, dev, "OK" if good else "FAIL"))');
        lines.push('');
        lines.push('    for (m, c) in OBLIQUE_ASYMPTOTES:');
        lines.push('        dev = abs(_value(1e7) - (m * 1e7 + c)) / max(1.0, abs(c))');
        lines.push('        good = dev <= 1e-2');
        lines.push('        ok = ok and good');
        lines.push('        print("  斜渐近线    y=%.4fx%+.4f  |f-line|=%.3e  %s" % (m, c, dev, "OK" if good else "FAIL"))');
        lines.push('');
        lines.push('    print("小结：%d 条结论，%s" % (len(ZEROS) + len(MAXIMA) + len(MINIMA) + len(INFLECTIONS)');
        lines.push('                                + len(VERTICAL_ASYMPTOTES) + len(HORIZONTAL_ASYMPTOTES)');
        lines.push('                                + len(OBLIQUE_ASYMPTOTES),');
        lines.push('                                "全部通过" if ok else "存在未通过项"))');
        lines.push('    return ok');
        lines.push('');
        lines.push('');
        lines.push('def plot():');
        lines.push('    xs = np.linspace(X_MIN, X_MAX, SAMPLES)');
        lines.push('    ys = f(xs)');
        lines.push('');
        lines.push('    fig, ax = plt.subplots(figsize=(9.2, 5.6), dpi=140)');
        lines.push('    ax.plot(xs, ys, color="#0f9b8e", lw=2.0, label="y = ' + pyExpr.replace(/"/g, '\\"') + '")');
        lines.push('');
        lines.push('    if ZEROS:');
        lines.push('        ax.plot(ZEROS, [0.0] * len(ZEROS), "o", mfc="none", mec="#1f7ae0", ms=7, mew=1.6,');
        lines.push('                label=LABELS["zero"])');
        lines.push('    if MAXIMA:');
        lines.push('        ax.plot([p[0] for p in MAXIMA], [p[1] for p in MAXIMA], "D", color="#e08a1f", ms=6, label=LABELS["max"])');
        lines.push('    if MINIMA:');
        lines.push('        ax.plot([p[0] for p in MINIMA], [p[1] for p in MINIMA], "v", color="#e08a1f", ms=6, label=LABELS["min"])');
        lines.push('    if INFLECTIONS:');
        lines.push('        ax.plot(INFLECTIONS, [_value(x) for x in INFLECTIONS], "d", mfc="none", mec="#c060a0", ms=7, mew=1.5, label=LABELS["inflection"])');
        lines.push('    for x0 in VERTICAL_ASYMPTOTES:');
        lines.push('        ax.axvline(x0, ls="--", lw=1.0, color="#999999")');
        lines.push('    for y0 in HORIZONTAL_ASYMPTOTES:');
        lines.push('        ax.axhline(y0, ls=":", lw=1.0, color="#999999")');
        lines.push('    for (m, c) in OBLIQUE_ASYMPTOTES:');
        lines.push('        ax.plot([X_MIN, X_MAX], [m * X_MIN + c, m * X_MAX + c], ls=":", lw=1.0, color="#999999")');
        lines.push('');
        lines.push('    ax.axhline(0, color="#777777", lw=0.8)');
        lines.push('    ax.axvline(0, color="#777777", lw=0.8)');
        lines.push('    ax.set_xlim(X_MIN, X_MAX)');
        lines.push('    ax.set_ylim(Y_MIN, Y_MAX)');
        lines.push('    ax.set_xlabel("x")');
        lines.push('    ax.set_ylabel("y")');
        lines.push('    ax.set_title("y = ' + pyExpr.replace(/"/g, '\\"') + '")');
        lines.push('    ax.grid(alpha=0.25)');
        lines.push('    ax.legend(loc="best", framealpha=0.9)');
        lines.push('    fig.tight_layout()');
        lines.push('');
        lines.push('    out = "math_function.png"');
        lines.push('    fig.savefig(out)');
        lines.push('    print("已保存图片：" + out)');
        lines.push('    return out');
        lines.push('');
        lines.push('');
        lines.push('def main():');
        lines.push('    plot()');
        lines.push('    ok = verify()');
        lines.push('    print("全部通过" if ok else "存在未通过项")');
        lines.push('    return 0 if ok else 1');
        lines.push('');
        lines.push('');
        lines.push('if __name__ == "__main__":');
        lines.push('    raise SystemExit(main())');
        lines.push('');

        const code = lines.join('\n');

        return {
            filename: 'plot_' + slug(expr) + '.py',
            code: code,
            bytes: code.length,
            pythonExpression: pyExpr,
            counts: {
                zeros: zeros.length,
                extrema: maxima.length + minima.length,
                inflections: inflections.length,
                asymptotes: vAsym.length + hAsym.length + oAsym.length
            }
        };
    }

    return {
        buildPython,
        translateExpression,
        slug,
        FUNC_MAP
    };
}));
