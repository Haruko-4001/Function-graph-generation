/**
 * storyboard.test.js
 * ============================================================
 * 数值事实层（facts）与分镜层（storyboard）的单元测试。
 *
 * 这两层是「分析结果」与「呈现」之间的中间表示，
 * 一旦契约破了，动画就会在最后一步才炸——所以要在入口处卡住。
 * ============================================================
 */
'use strict';

const MathFacts = require('../js/facts.js');
const MathStoryboard = require('../js/storyboard.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        failures.push({ name, error: e.message });
        console.log('  ✗ ' + name + '\n      ' + e.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || '断言失败');
}

function near(actual, expected, tol, msg) {
    assert(
        Number.isFinite(actual) && Math.abs(actual - expected) <= tol,
        (msg || '数值不符') + '：期望 ' + expected + '，实际 ' + actual
    );
}

/* ---------------- 数值事实 ---------------- */
console.log('\n[facts：带残差的断言集]');

test('x^2-4 的两条零点断言全部通过', () => {
    const facts = MathFacts.buildFacts('x^2 - 4', { xMin: -10, xMax: 10 });
    const zeros = facts.claims.filter((c) => c.kind === 'zero');
    assert(zeros.length === 2, '应有 2 条零点断言，实际 ' + zeros.length);
    zeros.forEach((c) => {
        assert(c.verification.ok, c.label + ' 未通过，残差 ' + c.verification.residual);
        assert(c.verification.residual < 1e-6, '残差过大：' + c.verification.residual);
    });
});

test('每条断言都带 residual / tol / ok', () => {
    const facts = MathFacts.buildFacts('sin(x)', { xMin: -10, xMax: 10 });
    assert(facts.claims.length > 0, '没有断言');
    facts.claims.forEach((c) => {
        assert(typeof c.verification.residual === 'number', c.id + ' 缺 residual');
        assert(typeof c.verification.tol === 'number', c.id + ' 缺 tol');
        assert(typeof c.verification.ok === 'boolean', c.id + ' 缺 ok');
    });
    assert(facts.summary.total === facts.claims.length, 'summary.total 与 claims 不一致');
    assert(facts.summary.passed + facts.summary.failed === facts.summary.total);
});

test('sin(x) 的奇函数断言通过', () => {
    const facts = MathFacts.buildFacts('sin(x)', { xMin: -10, xMax: 10 });
    const par = facts.claims.find((c) => c.kind === 'parity');
    assert(par, '缺少奇偶性断言');
    assert(par.label === '奇函数', '应为奇函数，实际 ' + par.label);
    assert(par.verification.ok, '奇函数断言未通过');
});

test('1/x 的垂直渐近线与水平渐近线断言通过', () => {
    const facts = MathFacts.buildFacts('1/x', { xMin: -10, xMax: 10 });
    const vertical = facts.claims.filter((c) => c.asymptoteKind === 'vertical');
    assert(vertical.length === 1, '应有 1 条垂直渐近线断言，实际 ' + vertical.length);
    assert(vertical[0].verification.ok, '垂直渐近线未通过');

    const horizontal = facts.claims.filter((c) => String(c.asymptoteKind).indexOf('horizontal') === 0);
    assert(horizontal.length === 2, '应有 2 条水平渐近线断言，实际 ' + horizontal.length);
    horizontal.forEach((c) => {
        assert(c.verification.ok, c.label + ' 未通过');
        near(c.value, 0, 1e-6);
    });
});

test('定积分双精度交叉验证（∫₀^π sin = 2）', () => {
    const facts = MathFacts.buildFacts('sin(x)', {
        xMin: -10, xMax: 10,
        integral: { a: 0, b: Math.PI }
    });
    const it = facts.claims.find((c) => c.kind === 'integral');
    assert(it, '缺少积分断言');
    near(it.value, 2, 1e-8);
    assert(it.verification.ok, '积分交叉验证未通过，残差 ' + it.verification.residual);
    assert(it.verification.method === 'cross-eps');
});

test('常函数给出周期断言', () => {
    const facts = MathFacts.buildFacts('5', { xMin: -10, xMax: 10 });
    const p = facts.claims.find((c) => c.kind === 'period');
    assert(p, '缺少周期断言');
    assert(p.verification.ok, '常函数周期断言未通过');
});

/* ---------------- 分镜 ---------------- */
console.log('\n[storyboard：动词表与契约]');

function build(expr, opts) {
    const facts = MathFacts.buildFacts(expr, opts);
    return { facts, sb: MathStoryboard.buildStoryboard(facts, opts) };
}

test('sin(x) 的分镜通过全部契约校验', () => {
    const { sb } = build('sin(x)');
    const v = MathStoryboard.validateStoryboard(sb);
    assert(v.ok, '校验失败：' + v.errors.join('；'));
    assert(v.totalSeconds >= 15 && v.totalSeconds <= 60, '总时长越界：' + v.totalSeconds);
});

test('所有动词都在白名单内', () => {
    const { sb } = build('x^3 - 3*x');
    sb.beats.forEach((b) => {
        assert(MathStoryboard.VERBS[b.verb], '未知动词 ' + b.verb);
    });
});

test('每个镜头都有非空字幕', () => {
    const { sb } = build('x^2 - 4');
    sb.beats.forEach((b, i) => {
        assert(b.caption && b.caption.trim().length > 0, '第 ' + (i + 1) + ' 个镜头缺字幕');
    });
});

test('开场是 TITLE，随后是 PLOT', () => {
    const { sb } = build('x^2 - 4');
    assert(sb.beats[0].verb === 'TITLE', '首个镜头应为 TITLE');
    assert(sb.beats[1].verb === 'PLOT', '第二个镜头应为 PLOT');
});

test('x^2-4 的分镜包含零点与极值镜头', () => {
    const { sb } = build('x^2 - 4');
    const verbs = sb.beats.map((b) => b.verb);
    assert(verbs.indexOf('MARK_ZERO') >= 0, '缺少零点镜头');
    assert(verbs.indexOf('MARK_EXTREMUM') >= 0, '缺少极值镜头');
});

test('1/x 的分镜包含渐近线镜头', () => {
    const { sb } = build('1/x');
    const asy = sb.beats.filter((b) => b.verb === 'ASYMPTOTE');
    assert(asy.length >= 1, '缺少渐近线镜头');
});

test('同一输入产生完全相同的分镜（可复现）', () => {
    const a = build('sin(x)').sb;
    const b = build('sin(x)').sb;
    assert(JSON.stringify(a) === JSON.stringify(b), '两次生成的分镜不一致');
});

test('maxSeconds 能压住时长', () => {
    const facts = MathFacts.buildFacts('tan(x)', { xMin: -10, xMax: 10 });
    const sb = MathStoryboard.buildStoryboard(facts, { maxSeconds: 18 });
    const total = MathStoryboard.sumSeconds(sb.beats);
    assert(total <= 18, '裁剪后仍超长：' + total.toFixed(2));
});

/* ---------------- 契约校验的反例 ---------------- */
console.log('\n[storyboard：校验应拦住坏数据]');

function baseSb() {
    return {
        expression: 'x',
        beats: [
            { verb: 'TITLE', target: 'stage', params: { text: 'y = x' }, seconds: 10, caption: '标题' },
            { verb: 'PLOT', target: 'curve', params: { xRange: [-1, 1], yRange: [-1, 1] }, seconds: 10, caption: '画图' }
        ],
        totalSeconds: 20
    };
}

test('未知动词被拦住', () => {
    const sb = baseSb();
    sb.beats[1].verb = 'EXPLODE';
    const v = MathStoryboard.validateStoryboard(sb);
    assert(!v.ok && v.errors.some((e) => e.indexOf('未知动词') >= 0), '应报未知动词');
});

test('缺字幕被拦住', () => {
    const sb = baseSb();
    sb.beats[0].caption = '';
    const v = MathStoryboard.validateStoryboard(sb);
    assert(!v.ok && v.errors.some((e) => e.indexOf('字幕') >= 0), '应报缺字幕');
});

test('缺参数被拦住', () => {
    const sb = baseSb();
    delete sb.beats[1].params.yRange;
    const v = MathStoryboard.validateStoryboard(sb);
    assert(!v.ok && v.errors.some((e) => e.indexOf('yRange') >= 0), '应报缺参数');
});

test('时长过短被拦住', () => {
    const sb = baseSb();
    sb.beats[0].seconds = 2;
    sb.beats[1].seconds = 2;
    const v = MathStoryboard.validateStoryboard(sb);
    assert(!v.ok && v.errors.some((e) => e.indexOf('短于') >= 0), '应报时长过短');
});

test('自检未通过的断言会传到镜头参数上', () => {
    const fakeFacts = {
        expression: 'x',
        window: { xMin: -1, xMax: 1 },
        claims: [{ kind: 'zero', x: 0, verification: { ok: false, residual: 0.5, tol: 0.1 } }],
        summary: { total: 1, passed: 0, failed: 1, worstRatio: 5, worstClaim: 'zero-1' },
        report: {
            expression: 'x',
            range: { min: -1, max: 1, bounded: true },
            zeros: [{ x: 0, y: 0 }],
            extrema: { maxima: [], minima: [] },
            monotonic: [],
            inflections: [],
            asymptotes: { vertical: [], horizontal: [], oblique: [] }
        }
    };
    const sb = MathStoryboard.buildStoryboard(fakeFacts);
    const zeroBeat = sb.beats.find((b) => b.verb === 'MARK_ZERO');
    assert(zeroBeat, '缺少零点镜头');
    assert(zeroBeat.params.ok === false, '未把 ok=false 传下去');
    assert(zeroBeat.caption.indexOf('自检未通过') >= 0, '字幕未提示自检失败');
});

/* ---------------- 汇总 ---------------- */
console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
    console.log('失败用例:');
    failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error));
    process.exit(1);
}
console.log('全部测试通过 ✓');
