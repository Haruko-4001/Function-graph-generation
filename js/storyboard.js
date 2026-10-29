/**
 * storyboard.js
 * ============================================================
 * 分镜层（Storyboard）—— 本项目最重要的中间表示（IR）。
 *
 * 设计参考 Math-To-Manim 的 shot list：镜头不用「自由代码」描述，
 * 而是用一张**固定动词表**描述成数据。好处：
 *   1. 可校验（未知动词 / 缺参数 / 时长异常立刻发现）
 *   2. 可统计（总时长、镜头数）
 *   3. 可换渲染器（同一份分镜可由 Plotly / SVG / Manim 脚本消费）
 *   4. 可复现（同样的 facts 必然产出同样的分镜）
 *
 * 产出结构即流水线的 04_storyboard：
 *   { expression, beats: [{verb, target, params, seconds, caption}], totalSeconds }
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MathStoryboard = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * 动词表：唯一合法的镜头类型。
     * params 列出该动词的必填参数，校验时逐项检查。
     */
    const VERBS = {
        TITLE: { params: ['text'], desc: '标题卡' },
        PLOT: { params: ['xRange', 'yRange'], desc: '绘制曲线' },
        TRACE: { params: ['xRange'], desc: '光点沿曲线扫过' },
        MARK_ZERO: { params: ['x'], desc: '标注零点' },
        MARK_EXTREMUM: { params: ['x', 'y', 'kind'], desc: '标注极值' },
        SHADE_MONOTONIC: { params: ['from', 'to', 'dir'], desc: '单调区间着色' },
        MARK_INFLECTION: { params: ['x'], desc: '标注拐点' },
        ASYMPTOTE: { params: ['kind'], desc: '绘制渐近线' },
        ZOOM: { params: ['xRange', 'yRange'], desc: '视窗推近' },
        CAPTION: { params: ['text'], desc: '字幕' },
        HOLD: { params: [], desc: '停留' }
    };

    const MIN_SECONDS = 15;
    const MAX_SECONDS = 60;

    /** 超时长时的丢弃顺序：从最不关键的开始 */
    const DROP_ORDER = [
        'MARK_INFLECTION',
        'SHADE_MONOTONIC',
        'ASYMPTOTE',
        'MARK_EXTREMUM',
        'MARK_ZERO'
    ];

    const MAX_ZEROS = 6;
    const MAX_EXTREMA = 4;
    const MAX_MONOTONIC = 3;
    const MAX_INFLECTIONS = 3;
    const MAX_ASYMPTOTES = 4;

    function fmt(v, digits) {
        if (!Number.isFinite(v)) return '—';
        return String(Number(v.toPrecision(digits === undefined ? 6 : digits)));
    }

    function sumSeconds(beats) {
        return beats.reduce((acc, b) => acc + b.seconds, 0);
    }

    /** 由值域推出绘图窗口，四周留 12% 余量 */
    function deriveYRange(report) {
        if (!report.range) return [-5, 5];
        const lo = report.range.min, hi = report.range.max;
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [-5, 5];
        const pad = (hi - lo) * 0.12;
        return [lo - pad, hi + pad];
    }

    /**
     * facts → 分镜。
     *
     * @param {object} facts buildFacts 的返回值
     * @param {object} [opts] { yRange:[lo,hi], maxSeconds }
     */
    function buildStoryboard(facts, opts) {
        opts = opts || {};
        if (!facts || !facts.expression || !facts.report) {
            throw new Error('buildStoryboard 需要 buildFacts 的返回值');
        }
        const expr = facts.expression;
        const xMin = facts.window.xMin;
        const xMax = facts.window.xMax;
        const report = facts.report;
        const yRange = opts.yRange || deriveYRange(report);
        const maxSeconds = opts.maxSeconds || MAX_SECONDS;

        const beats = [];
        const add = (verb, target, params, seconds, caption) => {
            beats.push({ verb, target, params, seconds, caption });
        };

        /* ---- 开场：这是什么函数 ---- */
        add('TITLE', 'stage', { text: 'y = ' + expr }, 1.2,
            '先看整体形状，再逐项读它的性质。');

        add('PLOT', 'curve', { xRange: [xMin, xMax], yRange: yRange }, 1.6,
            '在 [' + fmt(xMin, 4) + ', ' + fmt(xMax, 4) + '] 上的图像。');

        add('TRACE', 'curve', { xRange: [xMin, xMax], yRange: yRange }, 2.4,
            '从左到右扫一遍：注意它在哪里穿过 x 轴、在哪里转弯、哪里有断点。');

        /* ---- 零点 ---- */
        report.zeros.slice(0, MAX_ZEROS).forEach((p) => {
            const claim = findClaim(facts, function (c) { return c.kind === 'zero' && Math.abs(c.x - p.x) < 1e-6; });
            const ok = !claim || claim.verification.ok;
            add('MARK_ZERO', 'zeros', { x: p.x, ok: ok }, 1.0,
                'x ≈ ' + fmt(p.x, 7) + ' 处 f(x) = 0' + (ok ? '' : '（自检未通过）'));
        });

        /* ---- 极值 ---- */
        const extrema = []
            .concat(report.extrema.maxima.slice(0, 2).map((p) => ({ p, kind: 'max' })))
            .concat(report.extrema.minima.slice(0, 2).map((p) => ({ p, kind: 'min' })))
            .sort((a, b) => a.p.x - b.p.x)
            .slice(0, MAX_EXTREMA);

        extrema.forEach((item) => {
            const p = item.p;
            const claim = findClaim(facts, function (c) { return c.kind === 'extremum' && Math.abs(c.x - p.x) < 1e-6; });
            const ok = !claim || claim.verification.ok;
            add('MARK_EXTREMUM', 'extrema', { x: p.x, y: p.y, kind: item.kind, ok: ok }, 1.2,
                (item.kind === 'max' ? '极大值' : '极小值') + ' (' + fmt(p.x, 5) + ', ' + fmt(p.y, 5) + ')'
                + '：这里 f\'(x) = 0' + (ok ? '' : '（自检未通过）'));
        });

        /* ---- 单调区间 ---- */
        report.monotonic.slice(0, MAX_MONOTONIC).forEach((seg) => {
            add('SHADE_MONOTONIC', 'monotonic', { from: seg.from, to: seg.to, dir: seg.dir }, 1.4,
                '在 [' + fmt(seg.from, 3) + ', ' + fmt(seg.to, 3) + '] 上单调'
                + (seg.dir > 0 ? '递增' : '递减') + '。');
        });

        /* ---- 拐点 ---- */
        report.inflections.slice(0, MAX_INFLECTIONS).forEach((x) => {
            const claim = findClaim(facts, function (c) { return c.kind === 'inflection' && Math.abs(c.x - x) < 1e-6; });
            const ok = !claim || claim.verification.ok;
            add('MARK_INFLECTION', 'inflections', { x: x, ok: ok }, 1.1,
                'x ≈ ' + fmt(x, 6) + ' 处凹凸性改变（f\'\'(x) = 0）' + (ok ? '' : '（自检未通过）'));
        });

        /* ---- 渐近线 ---- */
        const asym = [];
        report.asymptotes.vertical.slice(0, 2).forEach((x) => {
            asym.push({ kind: 'vertical', value: x, caption: '垂直渐近线 x ≈ ' + fmt(x, 6) + '：曲线在这里发散' });
        });
        report.asymptotes.horizontal.slice(0, 2).forEach((h) => {
            asym.push({ kind: 'horizontal', value: h.y, caption: '水平渐近线 y ≈ ' + fmt(h.y, 6) + '（x→' + h.side + '）' });
        });
        report.asymptotes.oblique.slice(0, 2).forEach((o) => {
            asym.push({ kind: 'oblique', m: o.m, c: o.c, caption: '斜渐近线 y ≈ ' + fmt(o.m, 4) + 'x + ' + fmt(o.c, 4) + '（x→' + o.side + '）' });
        });
        asym.slice(0, MAX_ASYMPTOTES).forEach((a) => {
            add('ASYMPTOTE', 'asymptotes', a, 1.1, a.caption);
        });

        /* ---- 收尾：把自检结果讲出来 ---- */
        const s = facts.summary;
        add('CAPTION', 'stage', {
            text: s.failed === 0
                ? '共 ' + s.passed + ' 条结论，全部通过数值自检。'
                : '共 ' + s.total + ' 条结论，' + s.failed + ' 条未通过自检。'
        }, 1.6,
            '本图有 ' + report.zeros.length + ' 个零点、'
            + (report.extrema.maxima.length + report.extrema.minima.length) + ' 个极值点；'
            + s.passed + '/' + s.total + ' 条结论通过数值自检。');

        /* ---- 时长控制 ---- */
        trimTo(beats, maxSeconds);
        padTo(beats, MIN_SECONDS);

        return {
            expression: expr,
            beats,
            totalSeconds: Number(sumSeconds(beats).toFixed(2))
        };
    }

    function findClaim(facts, predicate) {
        const claims = facts.claims || [];
        for (let i = 0; i < claims.length; i++) if (predicate(claims[i])) return claims[i];
        return null;
    }

    /** 超时长时按 DROP_ORDER 从后往前删镜头 */
    function trimTo(beats, maxSeconds) {
        let guard = 0;
        while (sumSeconds(beats) > maxSeconds && guard++ < 200) {
            let dropped = false;
            for (const verb of DROP_ORDER) {
                for (let i = beats.length - 1; i >= 0; i--) {
                    if (beats[i].verb === verb) {
                        beats.splice(i, 1);
                        dropped = true;
                        break;
                    }
                }
                if (dropped) break;
            }
            if (!dropped) break;
        }
        // 仍然超长：压缩 PLOT / TRACE
        let i = 0;
        while (sumSeconds(beats) > maxSeconds && i < beats.length) {
            const b = beats[i];
            if ((b.verb === 'PLOT' || b.verb === 'TRACE') && b.seconds > 0.6) {
                b.seconds = Number((b.seconds - 0.4).toFixed(2));
            } else {
                i++;
            }
        }
    }

    /** 不足最短时长时，先延长画面，再补 HOLD */
    function padTo(beats, minSeconds) {
        const grow = (verb, max) => {
            const b = beats.find((x) => x.verb === verb);
            if (!b || b.seconds >= max) return false;
            b.seconds = Number(Math.min(max, b.seconds + 0.5).toFixed(2));
            return true;
        };
        let guard = 0;
        while (sumSeconds(beats) < minSeconds && guard++ < 100) {
            if (grow('PLOT', 4.0)) continue;
            if (grow('TRACE', 6.0)) continue;
            const last = beats[beats.length - 1];
            if (last && last.verb === 'HOLD') { last.seconds = Number((last.seconds + 0.5).toFixed(2)); continue; }
            beats.push({
                verb: 'HOLD', target: 'stage', params: {},
                seconds: Math.min(2.0, Math.max(0.8, minSeconds - sumSeconds(beats))),
                caption: '停留观察。'
            });
        }
    }

    /**
     * 契约校验：不通过就不该进入渲染阶段。
     * @returns {{ok:boolean, errors:string[], totalSeconds:number}}
     */
    function validateStoryboard(sb) {
        const errors = [];
        if (!sb || typeof sb !== 'object') {
            return { ok: false, errors: ['分镜为空'], totalSeconds: 0 };
        }
        if (!sb.expression) errors.push('缺少 expression');
        if (!Array.isArray(sb.beats) || sb.beats.length === 0) {
            errors.push('beats 为空');
            return { ok: false, errors, totalSeconds: 0 };
        }

        sb.beats.forEach(function (b, i) {
            const where = '第 ' + (i + 1) + ' 个镜头';
            const rule = VERBS[b.verb];
            if (!rule) {
                errors.push(where + '：未知动词 ' + b.verb);
                return;
            }
            if (!(b.seconds > 0)) errors.push(where + '：时长必须为正数');
            if (!b.caption || !String(b.caption).trim()) errors.push(where + '：缺少字幕');
            rule.params.forEach(function (key) {
                if (b.params === undefined || b.params[key] === undefined) {
                    errors.push(where + '（' + b.verb + '）：缺少参数 ' + key);
                }
            });
        });

        const total = Number(sumSeconds(sb.beats).toFixed(2));
        if (total < MIN_SECONDS) errors.push('总时长 ' + total + 's 短于 ' + MIN_SECONDS + 's');
        if (total > MAX_SECONDS) errors.push('总时长 ' + total + 's 超过 ' + MAX_SECONDS + 's');

        return { ok: errors.length === 0, errors, totalSeconds: total };
    }

    return {
        VERBS,
        buildStoryboard,
        validateStoryboard,
        sumSeconds,
        MIN_SECONDS,
        MAX_SECONDS
    };
}));
