/**
 * math-core.test.js
 * ============================================================
 * 数学核心库的单元测试（Node 环境运行）。
 *
 * 运行方式：
 *   npm install   # 安装 mathjs
 *   npm test
 * ============================================================
 */
'use strict';

const MathCore = require('../js/math-core.js');

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
        (msg || '数值不符') + '：期望 ' + expected + '，实际 ' + actual + '（容差 ' + tol + '）'
    );
}

/* ---------------- 表达式处理 ---------------- */
console.log('\n[表达式规范化与校验]');

test('规范化中文符号 ×、÷、（）、π', () => {
    const s = MathCore.normalizeExpression('2×（π＋1）÷3');
    assert(s === '2*(pi+1)/3', '规范化结果错误: ' + s);
});

test('去除 y= 前缀', () => {
    assert(MathCore.normalizeExpression('y = x^2') === 'x^2');
});

test('校验未知符号', () => {
    const r = MathCore.validateExpression('sin(w)', ['x']);
    assert(!r.ok && /w/.test(r.error), '应当识别未知符号 w');
});

test('校验合法表达式', () => {
    const r = MathCore.validateExpression('sin(x) + exp(-x^2)', ['x']);
    assert(r.ok, r.error);
});

/* ---------------- 求根 ---------------- */
console.log('\n[零点求解]');

test('x^2 - 4 的根为 ±2', () => {
    const roots = MathCore.findZeros('x^2 - 4', -10, 10);
    assert(roots.length === 2, '应找到 2 个根，实际 ' + roots.length);
    near(roots[0], -2, 1e-8);
    near(roots[1], 2, 1e-8);
});

test('sin(x) 在 [-10,10] 有 7 个根', () => {
    const roots = MathCore.findZeros('sin(x)', -10, 10);
    assert(roots.length === 7, '应为 7 个，实际 ' + roots.length + ': ' + roots);
    near(roots[3], 0, 1e-8);
    near(roots[6], Math.PI * 3, 1e-6);
});

test('切触零点 (x-1)^2 在 x=1 处', () => {
    const roots = MathCore.findZeros('(x-1)^2', -5, 5);
    assert(roots.length >= 1, '应检测到切触零点');
    near(roots[0], 1, 1e-4);
});

test('Brent 解 cos(x) = x', () => {
    const f = MathCore.makeFunction('cos(x) - x', ['x']);
    near(MathCore.brent(f, 0, 1), 0.7390851332, 1e-9);
});

/* ---------------- 极值与单调性 ---------------- */
console.log('\n[极值 / 单调性 / 凹凸性]');

test('x^2 - 4 的极小值在 (0, -4)', () => {
    const e = MathCore.findExtrema('x^2 - 4', -10, 10);
    assert(e.minima.length === 1, '应有 1 个极小值');
    near(e.minima[0].x, 0, 1e-4);
    near(e.minima[0].y, -4, 1e-4);
});

test('sin(x) 极值点位置', () => {
    const e = MathCore.findExtrema('sin(x)', -10, 10);
    assert(e.maxima.length >= 2 && e.minima.length >= 2, '极值数量不足');
    near(e.maxima[0].y, 1, 1e-4);
    near(e.minima[0].y, -1, 1e-4);
});

test('x^3 整体单调递增', () => {
    const f = MathCore.makeFunction('x^3', ['x']);
    const mono = MathCore.monotonicIntervals(f, -10, 10, []);
    assert(mono.length === 1 && mono[0].dir === 1, '应为单一递增区间: ' + JSON.stringify(mono));
});

test('x^3 在 x=0 处有拐点', () => {
    const f = MathCore.makeFunction('x^3', ['x']);
    const c = MathCore.concavity(f, -10, 10);
    assert(c.inflections.length >= 1, '应检测到拐点');
    near(c.inflections[0], 0, 1e-2);
});

/* ---------------- 积分 ---------------- */
console.log('\n[定积分]');

test('∫ sin(x) dx [0, π] = 2', () => {
    const r = MathCore.adaptiveSimpson('sin(x)', 0, Math.PI);
    near(r.value, 2, 1e-8);
    assert(r.converged, '应收敛');
});

test('∫ 1/(1+x^2) dx [0, 1] = π/4', () => {
    const r = MathCore.adaptiveSimpson('1/(1+x^2)', 0, 1);
    near(r.value, Math.PI / 4, 1e-8);
});

test('∫ x^3 dx [0, 2] = 4', () => {
    near(MathCore.adaptiveSimpson('x^3', 0, 2).value, 4, 1e-9);
});

test('反转积分限自动取负', () => {
    near(MathCore.adaptiveSimpson('sin(x)', Math.PI, 0).value, -2, 1e-8);
});

/* ---------------- 极限 ---------------- */
console.log('\n[极限]');

test('lim(x→0) sin(x)/x = 1', () => {
    const r = MathCore.numericLimit('sin(x)/x', 0);
    assert(r.converged, '应收敛: ' + JSON.stringify(r));
    near(r.value, 1, 1e-4);
});

test('lim(x→∞) (1+1/x)^x = e', () => {
    const r = MathCore.numericLimit('(1+1/x)^x', Infinity);
    near(r.value, Math.E, 1e-3);
});

test('lim(x→0) 1/x 左右不等（不存在）', () => {
    const r = MathCore.numericLimit('1/x', 0);
    assert(!r.converged, '1/x 在 0 处极限不应收敛');
});

/* ---------------- 导数与泰勒 ---------------- */
console.log('\n[符号求导与泰勒展开]');

test('d/dx x^3 = 3x^2（数值验证）', () => {
    const d = MathCore.symbolicDerivative('x^3', 'x');
    assert(d, '符号求导失败');
    const df = MathCore.makeFunction(d, ['x']);
    near(df(2), 12, 1e-9);
    near(df(-1), 3, 1e-9);
});

test('e^x 在 0 处 4 阶泰勒系数', () => {
    const t = MathCore.taylor('e^x', 0, 4);
    assert(!t.error, t.error);
    const expected = [1, 1, 0.5, 1 / 6, 1 / 24];
    t.coefficients.forEach((c, i) => near(c, expected[i], 1e-9, '系数 c' + i));
    near(t.evaluate(1), 2.7083333, 1e-5);
});

/* ---------------- 渐近线 ---------------- */
console.log('\n[渐近线]');

test('1/x 的垂直与水平渐近线', () => {
    const f = MathCore.makeFunction('1/x', ['x']);
    const v = MathCore.detectVerticalAsymptotes(f, -10, 10);
    assert(v.vertical.length >= 1, '应检测到垂直渐近线');
    near(v.vertical[0], 0, 1e-3);
    const h = MathCore.detectEndBehavior(f);
    assert(h.horizontal.length >= 1, '应检测到水平渐近线');
    near(h.horizontal[0].y, 0, 1e-4);
});

test('(2x+1)/(x-1) 的渐近线', () => {
    const f = MathCore.makeFunction('(2*x+1)/(x-1)', ['x']);
    const v = MathCore.detectVerticalAsymptotes(f, -10, 10);
    assert(v.vertical.length >= 1, '应有垂直渐近线 x=1');
    near(v.vertical[0], 1, 1e-3);
    const h = MathCore.detectEndBehavior(f);
    assert(h.horizontal.length >= 1);
    near(h.horizontal[0].y, 2, 1e-3);
});

test('x + 1/x 的斜渐近线 y = x', () => {
    const f = MathCore.makeFunction('x + 1/x', ['x']);
    const h = MathCore.detectEndBehavior(f);
    assert(h.oblique.length >= 1, '应有斜渐近线');
    near(h.oblique[0].m, 1, 1e-3);
    near(h.oblique[0].c, 0, 1e-3);
});

/* ---------------- 其他分析 ---------------- */
console.log('\n[交点 / 奇偶性 / 周期性 / 综合分析]');

test('x^2 与 x 的交点为 (0,0) 与 (1,1)', () => {
    const pts = MathCore.intersections('x^2', 'x', -10, 10);
    assert(pts.length === 2, '应有 2 个交点，实际 ' + pts.length);
    near(pts[0].x, 0, 1e-7);
    near(pts[1].x, 1, 1e-7);
    near(pts[1].y, 1, 1e-7);
});

test('奇偶性判定', () => {
    assert(MathCore.parity('x^2', -10, 10) === 'even');
    assert(MathCore.parity('x^3', -10, 10) === 'odd');
    assert(MathCore.parity('x^2 + x', -10, 10) === 'none');
});

test('sin(x) 周期为 2π', () => {
    const p = MathCore.findPeriod('sin(x)', -10, 10);
    near(p.period, 2 * Math.PI, 1e-4);
});

test('常函数周期检测', () => {
    const p = MathCore.findPeriod('5', -10, 10);
    assert(p.constant === true);
});

test('综合分析 x^2 - 4', () => {
    const r = MathCore.analyzeFunction('x^2 - 4', { xMin: -10, xMax: 10 });
    assert(r.zeros.length === 2);
    assert(r.extrema.minima.length === 1);
    assert(r.parity === 'even');
    assert(r.range.max > 90 && r.range.min < -3.9);
    assert(r.monotonic.length === 2, '应有两段单调区间');
});

/* ---------------- 报告边界（值域 / 断点 / 渐近线） ---------------- */
console.log('\n[报告边界：值域与断点]');

test('水平渐近线近零归零（1/x 应给 y = 0 而非 1e-8）', () => {
    const eb = MathCore.detectEndBehavior(MathCore.makeFunction('1/x'));
    assert(eb.horizontal.length === 2, '应有两个方向的水平渐近线');
    eb.horizontal.forEach((h) => assert(h.y === 0, '水平渐近线应为 0，实际 ' + h.y));
});

test('1/x 的值域标记为无界，且极点在未定义点列表中', () => {
    const r = MathCore.analyzeFunction('1/x', { xMin: -10, xMax: 10 });
    assert(r.range && r.range.bounded === false, '存在极点时应标记 bounded=false');
    assert(r.undefinedPoints.length === 1, '应有一个未定义点');
    near(r.undefinedPoints[0], 0, 1e-6);
    // 极点邻域被剔除后，不应再出现 ±80 这种爆炸值
    assert(Math.abs(r.range.max) < 30, '值域上限不应被极点污染，实际 ' + r.range.max);
});

test('无极点函数的值域标记为有界', () => {
    const r = MathCore.analyzeFunction('x^2 - 4', { xMin: -10, xMax: 10 });
    assert(r.range.bounded === true);
    assert(r.undefinedPoints.length === 0);
});

test('拐点检测不把极点当拐点（1/x 无拐点）', () => {
    const r = MathCore.analyzeFunction('1/x', { xMin: -10, xMax: 10 });
    assert(r.inflections.length === 0, '1/x 不应有拐点，实际 ' + JSON.stringify(r.inflections));
    // 凹凸区间仍应被极点切成两段
    assert(r.concavity.length === 2, '应有两段凹凸区间，实际 ' + r.concavity.length);
});

test('真拐点仍然能检测到（x^3 在 0 处）', () => {
    const r = MathCore.analyzeFunction('x^3', { xMin: -10, xMax: 10 });
    assert(r.inflections.length === 1, '应检测到 1 个拐点，实际 ' + r.inflections.length);
    near(r.inflections[0], 0, 1e-4);
});

test('全区间不可求值时奇偶性不误判为偶函数', () => {
    assert(MathCore.parity('sqrt(-1 - x^2)', -10, 10) === 'none');
});

test('全区间不可求值时值域为 null', () => {
    const r = MathCore.analyzeFunction('sqrt(-1 - x^2)', { xMin: -10, xMax: 10 });
    assert(r.range === null, '值域应为 null');
    assert(r.definedRatio === 0, '可求值率应为 0');
});

test('x 范围非法时抛出中文错误', () => {
    let msg = '';
    try { MathCore.analyzeFunction('x', { xMin: 5, xMax: 1 }); } catch (e) { msg = e.message; }
    assert(msg.indexOf('x 范围无效') === 0, '错误信息不正确: ' + msg);
});

/* ---------------- 表达式规范化选项 ---------------- */
console.log('\n[规范化选项 stripPrefix]');

test('默认剥离 y= 前缀', () => {
    assert(MathCore.normalizeExpression('y = x^2') === 'x^2');
});

test('stripPrefix:false 时保留等号（隐函数场景）', () => {
    assert(MathCore.normalizeExpression('y=x^2', { stripPrefix: false }) === 'y=x^2');
    assert(MathCore.normalizeExpression('x^2+y^2=9', { stripPrefix: false }) === 'x^2+y^2=9');
});

test('stripPrefix:false 仍然规范化全角符号', () => {
    const s = MathCore.normalizeExpression('x＾2＋y＾2＝9', { stripPrefix: false });
    assert(s === 'x^2+y^2=9', '全角规范化失败: ' + s);
});

/* ---------------- 参数代入 / 多函数对比 ---------------- */
console.log('\n[参数、切片与对比]');

test('识别自由参数', () => {
    assert(JSON.stringify(MathCore.freeSymbols('a*x^2 + b*x + c')) === '["a","b","c"]');
    assert(JSON.stringify(MathCore.freeSymbols('sin(w*x)')) === '["w"]');
    assert(MathCore.freeSymbols('2*x + 1').length === 0, '无参数时不应识别出参数');
});

test('符号代入并化简', () => {
    const s1 = MathCore.substituteVariable('x^2 + y^2', 'y', 2);
    assert(s1.replace(/\s/g, '') === 'x^2+4', '代入结果不对: ' + s1);
    const s2 = MathCore.substituteVariable('a*sin(x)', 'a', 3);
    assert(s2.replace(/\s/g, '') === '3*sin(x)', '代入结果不对: ' + s2);
});

test('两函数对比：交点、上下关系与面积差', () => {
    const r = MathCore.compareFunctions('x^2', '2*x', -10, 10);
    assert(r.intersections.length === 2, '应有 2 个交点');
    near(r.intersections[0].x, 0, 1e-7);
    near(r.intersections[1].x, 2, 1e-7);
    // ∫(x²-2x) 在 [-10,10] 上 = 2000/3
    near(r.totalArea, 2000 / 3, 1e-3);
    // 中间那一段 0~2 上 2x 在上方
    const middle = r.intervals.find((s) => s.from < 0.1 && s.to > 1.9);
    assert(middle && middle.dir === -1, '0~2 区间应判为 f2 在上方');
});

test('对比：平行无交点时给出单区间', () => {
    const r = MathCore.compareFunctions('x^2', 'x^2 + 1', -5, 5);
    assert(r.intersections.length === 0);
    assert(r.intervals.length === 1 && r.intervals[0].dir === -1);
    near(r.totalArea, -10, 1e-6);
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
