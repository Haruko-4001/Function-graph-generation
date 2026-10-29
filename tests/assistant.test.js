/**
 * assistant.test.js
 * ============================================================
 * 智能助手的单元测试（Node 环境运行）。
 *
 * 重点覆盖「积分限解析」——这里曾经因为正则要求数字开头，导致
 * 「积分从 0 到 pi」整条失配、静默退化成整个可视区间，答案错误却不报错。
 *
 * 运行方式：
 *   npm test
 * ============================================================
 */
'use strict';

const MathAssistant = require('../js/assistant.js').MathAssistant;

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

/** 构造一个最小运行上下文 */
function makeCtx(overrides) {
    const base = {
        expression: 'sin(x)',
        report: null,
        getExpression() { return this.expression; },
        getRange() { return { xMin: -10, xMax: 10, yMin: -5, yMax: 5 }; },
        getMode() { return 'explicit'; },
        setExpression(e) { this.expression = e; },
        getReport() { return this.report; },
        refreshReport() { return this.report; },
        say() {}
    };
    return Object.assign(base, overrides || {});
}

function newAssistant(overrides) {
    return new MathAssistant(makeCtx(overrides));
}

/* ---------------- 数字片段 ---------------- */
console.log('\n[数字片段解析]');

test('普通小数与负数', () => {
    near(MathAssistant.parseConst('3.14'), 3.14, 1e-12);
    near(MathAssistant.parseConst('-1'), -1, 1e-12);
    near(MathAssistant.parseConst('.5'), 0.5, 1e-12);
});

test('pi 单独出现', () => {
    near(MathAssistant.parseConst('pi'), Math.PI, 1e-12);
});

test('带系数的 pi', () => {
    near(MathAssistant.parseConst('2pi'), 2 * Math.PI, 1e-12);
    near(MathAssistant.parseConst('-pi'), -Math.PI, 1e-12);
});

test('自然常数 e', () => {
    near(MathAssistant.parseConst('e'), Math.E, 1e-12);
    near(MathAssistant.parseConst('-e'), -Math.E, 1e-12);
});

test('无法解析时返回 null', () => {
    assert(MathAssistant.parseConst('') === null);
    assert(MathAssistant.parseConst('abc') === null);
});

/* ---------------- 积分限解析 ---------------- */
console.log('\n[积分限解析]');

const LIMIT_CASES = [
    { text: '积分从 0 到 pi', a: 0, b: Math.PI },
    { text: '积分从 0 到 2pi', a: 0, b: 2 * Math.PI },
    { text: '0 到 pi 的积分', a: 0, b: Math.PI },
    { text: '[0, pi]', a: 0, b: Math.PI },
    { text: '积分从 0 到 3.14', a: 0, b: 3.14 },
    { text: '积分从 -1 到 1', a: -1, b: 1 }
];

LIMIT_CASES.forEach((c) => {
    test('识别「' + c.text + '」', () => {
        const r = newAssistant()._parseLimits(c.text);
        assert(r.explicit === true, '应识别为显式积分限');
        near(r.a, c.a, 1e-12);
        near(r.b, c.b, 1e-12);
    });
});

test('表达式里的指数不会被误当成积分限', () => {
    const r = newAssistant()._parseLimits('x^2 从 0 到 1');
    assert(r.explicit === true);
    near(r.a, 0, 1e-12);
    near(r.b, 1, 1e-12);
});

test('未写积分限时 explicit 为 false', () => {
    const r = newAssistant()._parseLimits('积分');
    assert(r.explicit === false);
    assert(r.a === null && r.b === null);
});

/* ---------------- 意图路由 ---------------- */
console.log('\n[意图路由]');

test('定积分走数值积分并给出结果', () => {
    const out = newAssistant()._route('积分从 0 到 pi');
    assert(out.indexOf('【定积分】') === 0, '输出头部不正确');
    assert(out.indexOf('结果：≈ 2') >= 0, '应得到 ≈ 2，实际输出：' + out);
});

test('整周期积分结果归零', () => {
    const out = newAssistant()._route('积分从 0 到 2pi');
    assert(out.indexOf('结果：≈ 0') >= 0, 'sin 在整周期上积分应为 0，实际：' + out);
});

test('未指定积分限时明确提示使用了可视区间', () => {
    const out = newAssistant()._route('积分');
    assert(out.indexOf('未识别到积分限') >= 0, '应提示积分限缺失，实际：' + out);
    assert(out.indexOf('[-10, 10]') >= 0, '应说明实际使用的区间');
});

test('求导意图', () => {
    const out = newAssistant()._route('导数');
    assert(out.indexOf('cos(x)') >= 0, 'sin(x) 的导数应为 cos(x)，实际：' + out);
});

test('直接输入表达式触发绘图', () => {
    const ctx = makeCtx();
    const a = new MathAssistant(ctx);
    const out = a._route('画 x^2 - 4');
    assert(out.indexOf('已为你绘制') >= 0, '应切换到绘图，实际：' + out);
    assert(ctx.expression === 'x^2-4', '表达式未写回输入框: ' + ctx.expression);
});

test('无法识别时退回帮助文本', () => {
    const out = newAssistant()._route('今天天气怎么样');
    assert(out.indexOf('我可以帮你做这些事') >= 0, '应返回帮助文本');
});

/* ---------------- 无穷方向判定 ---------------- */
console.log('\n[极限方向]');

test('「负无穷」判为 -∞', () => {
    const out = newAssistant({ expression: '1/x' })._route('x 趋向于负无穷 的极限');
    assert(out.indexOf('lim(x→-∞)') >= 0, '应判为 -∞，实际：' + out);
});

test('箭头「->」不会被误判成负号', () => {
    const out = newAssistant({ expression: '1/x' })._route('x->无穷 的极限');
    assert(out.indexOf('lim(x→+∞)') >= 0, '应判为 +∞，实际：' + out);
});

/* ---------------- 性质报告 ---------------- */
console.log('\n[性质报告查询]');

test('未绘图时提示先绘制', () => {
    const out = newAssistant({ report: null })._route('极值');
    assert(out.indexOf('请先在左侧绘制') >= 0, '应提示先绘制，实际：' + out);
});

test('值域带无界警告', () => {
    const report = {
        expression: '1/x',
        range: { min: -16, max: 16, bounded: false },
        xRange: [-10, 10],
        definedRatio: 1,
        undefinedPoints: [0]
    };
    const out = newAssistant({ expression: '1/x', report })._route('值域');
    assert(out.indexOf('值域（区间采样）') >= 0, '值域标题应注明采样');
    assert(out.indexOf('可能无界') >= 0, '应提示可能无界，实际：' + out);
});

test('定义域查询包含极点', () => {
    const report = {
        expression: '1/x',
        range: { min: -16, max: 16, bounded: false },
        xRange: [-10, 10],
        definedRatio: 1,
        undefinedPoints: [0],
        domainBreaks: []
    };
    const out = newAssistant({ expression: '1/x', report })._route('定义域');
    assert(out.indexOf('未定义点（含极点）') >= 0, '应把极点算进未定义点，实际：' + out);
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
